import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  proto,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { PrismaClient, ConnectionStatus } from "@prisma/client";
import pino from "pino";
import os from "os";

const prisma = new PrismaClient();
prisma.$connect().catch(() => {});
const logger = pino({ level: "fatal" }); 
const myLogger = pino({ level: "info" });

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let sock: any = null;
let currentQrDataUrl: string | null = null;
let currentPairingCode: string | null = null;
let currentStatus: string = "DISCONNECTED";
let currentPhone: string | null = null;
let isConnecting = false;
const AUTH_DIR = path.join(process.cwd(), "baileys_auth_info");

const botSentMessageIds = new Set<string>();
const recentBotReplies = new Set<string>();
const callSpamTracker = new Map<string, { count: number }>();
const msgRetryCounterMap = new Map<string, number>();

// Cache pesan di RAM untuk mencegah "Menunggu pesan ini" saat WhatsApp meminta retry enkripsi
const messageCache = new Map<string, proto.IMessage>();

function cacheMessage(id?: string | null, message?: proto.IMessage | null) {
  if (id && message) {
    messageCache.set(id, message);
    setTimeout(() => messageCache.delete(id), 600000);
  }
}

function registerBotOutbox(messageId?: string, text?: string) {
  if (messageId) { botSentMessageIds.add(messageId); setTimeout(() => botSentMessageIds.delete(messageId), 60000); }
  if (text) { const c = text.trim(); recentBotReplies.add(c); setTimeout(() => recentBotReplies.delete(c), 15000); }
}

function getDynamicGreetingAndDate() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Pagi 🌅";
  if (hour >= 11 && hour < 15) greeting = "Siang 🌝";
  else if (hour >= 15 && hour < 18) greeting = "Sore 🌇";
  else if (hour >= 18 || hour < 3) greeting = "Malam 🌙";

  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + " WIB";
  return { greeting, dateStr, timeStr };
}

async function cleanupOldCommands() {
  try {
    await prisma.botCommand.deleteMany({
      where: {
        OR: [
          { command: { startsWith: "!" } },
          { command: { in: ["!menu", "!premium", "!website", "!bot", "!order", "!admin"] } }
        ]
      }
    });
  } catch (e) {}
}

async function getSafeWaVersion(): Promise<[number, number, number]> {
  try {
    const res = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (res && res.version) return res.version;
  } catch (e) {}
  return [2, 3000, 1015901307];
}

async function startWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;
  try {
    cleanupOldCommands().catch(() => {});
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const version = await getSafeWaVersion();

    if (sock) {
      sock.ev.removeAllListeners();
    }

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.ubuntu("Chrome"),
      syncFullHistory: false, 
      shouldSyncHistoryMessage: () => false, 
      markOnlineOnConnect: true,
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      generateHighQualityLinkPreview: false,
      msgRetryCounterCache: {
        get: (key) => msgRetryCounterMap.get(key),
        set: (key, value) => msgRetryCounterMap.set(key, value),
        del: (key) => msgRetryCounterMap.delete(key),
        flushAll: () => msgRetryCounterMap.clear(),
      },
      getMessage: async (key) => {
        if (key.id) {
          const cached = messageCache.get(key.id);
          if (cached) return cached;

          try {
            const msg = await prisma.message.findUnique({ where: { waMessageId: key.id } });
            if (msg) return { conversation: msg.content };
          } catch(e) {}
        }
        return undefined;
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 280 });
          currentStatus = "QR_READY";
          io.emit("whatsapp:qr", { qr: currentQrDataUrl });
          io.emit("whatsapp:status", { status: "QR_READY" });
        } catch (e) {}
      }

      if (connection === "close") {
        isConnecting = false;
        const code = (lastDisconnect?.error as any)?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          currentStatus = "DISCONNECTED";
          currentQrDataUrl = null;
          currentPhone = null;
          io.emit("whatsapp:status", { status: "DISCONNECTED", phone: null });
          setTimeout(startWhatsApp, 1500);
        } else {
          currentStatus = "RECONNECTING";
          currentQrDataUrl = null;
          io.emit("whatsapp:status", { status: "RECONNECTING" });
          setTimeout(startWhatsApp, 1500);
        }
      } else if (connection === "open") {
        isConnecting = false;
        currentStatus = "CONNECTED";
        currentPairingCode = null;
        const botJid = sock.user?.id || "";
        currentPhone = botJid.split(":")[0] || botJid.split("@")[0];
        
        myLogger.info(`WhatsApp Bot Terhubung 24/7 ke nomor: +${currentPhone}`);
        prisma.whatsappConnection.upsert({
          where: { sessionId: "primary" },
          update: { status: ConnectionStatus.CONNECTED, phone: currentPhone, lastActive: new Date() },
          create: { sessionId: "primary", status: ConnectionStatus.CONNECTED, phone: currentPhone },
        }).catch(() => {});
        
        io.emit("whatsapp:status", { status: "CONNECTED", phone: currentPhone });
      }
    });

    sock.ev.on("call", async (calls: any[]) => {
      let isAutoRejectActive = true;
      try {
        const config = await prisma.botConfig.findUnique({ where: { id: "default-config" } });
        if (config) isAutoRejectActive = config.isAutoRejectCalls;
      } catch (e) {}

      for (const call of calls) {
        if (call.status === "offer") {
          if (!isAutoRejectActive) continue;

          const callerJid = call.from;
          const callerPhone = callerJid.split("@")[0].split(":")[0];
          try {
            await sock.rejectCall(call.id, callerJid);
            let record = callSpamTracker.get(callerPhone) || { count: 0 };
            record.count += 1;
            callSpamTracker.set(callerPhone, record);

            if (record.count === 1) {
              const warningText = `⚠️ *PERINGATAN SISTEM RAMA STORE*\n\nMohon maaf, nomor bot ini diset *AUTO-REJECT* untuk semua panggilan.\n\nSilakan sampaikan keperluan melalui chat teks. Admin akan menelepon balik jika diperlukan.\n\n*Catatan:* Jangan melakukan spam panggilan, sekali telepon lagi sistem akan memblokir nomor Anda secara otomatis!`;
              const sentWarn = await sock.sendMessage(callerJid, { text: warningText });
              if (sentWarn?.key?.id) cacheMessage(sentWarn.key.id, sentWarn.message || { conversation: warningText });
            } else if (record.count >= 2) {
              const blockText = `❌ *NOMOR DIBLOKIR OTOMATIS*\n\nAnda telah diperingatkan agar tidak melakukan spam panggilan. Sistem keamanan Rama Store telah memblokir nomor Anda.`;
              const sentBlock = await sock.sendMessage(callerJid, { text: blockText });
              if (sentBlock?.key?.id) cacheMessage(sentBlock.key.id, sentBlock.message || { conversation: blockText });
              try {
                await prisma.customer.upsert({
                  where: { phone: callerPhone },
                  update: { isBlocked: true },
                  create: { phone: callerPhone, name: "Spam Caller", isBlocked: true },
                });
              } catch(e) {}
              await sock.updateBlockStatus(callerJid, "block");
            }
          } catch (callErr) {}
        }
      }
    });

    sock.ev.on("messages.upsert", async (m: any) => {
      if (m.type !== "notify") return;

      let isGlobalBotEnabled = true;
      try {
        const config = await prisma.botConfig.findUnique({ where: { id: "default-config" } });
        if (config) isGlobalBotEnabled = config.isEnabled;
      } catch (e) {}
      
      if (!isGlobalBotEnabled) return;

      for (const msg of m.messages) {
        if (!msg.message) continue;
        if (msg.key?.id) cacheMessage(msg.key.id, msg.message);

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid === "status@broadcast") continue;
        if (msg.key.id && botSentMessageIds.has(msg.key.id)) continue;

        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        if (!text) continue;

        // =========================================================================
        // FITUR TAMBAHAN: ADMIN REPLY BUKTI TRANSFER DENGAN KATA "PROSES"
        // =========================================================================
        if (msg.key.fromMe && text.toLowerCase() === "proses") {
          const quotedInfo = msg.message.extendedTextMessage?.contextInfo;
          const quotedMsg = quotedInfo?.quotedMessage;

          if (quotedMsg) {
            // Ambil teks baik dari percakapan teks biasa, extended, atau caption gambar bukti transfer
            const quotedContent = (
              quotedMsg.conversation ||
              quotedMsg.extendedTextMessage?.text ||
              quotedMsg.imageMessage?.caption ||
              ""
            ).toLowerCase();

            let matchedProduct: any = null;
            let finalPrice = 25000; // Nilai default bila tidak terdeteksi
            let finalName = "Layanan Premium";

            try {
              const allProducts = await prisma.product.findMany();
              for (const p of allProducts) {
                if (
                  (p.sku && quotedContent.includes(p.sku.toLowerCase())) ||
                  quotedContent.includes(p.name.toLowerCase())
                ) {
                  matchedProduct = p;
                  finalPrice = Number(p.price);
                  finalName = p.name;
                  break;
                }
              }
            } catch (e) {}

            // Fallback pencocokan keyword bila belum ada di tabel Product
            if (!matchedProduct) {
              if (quotedContent.includes("capcut")) { finalName = "CapCut Pro"; finalPrice = 25000; }
              else if (quotedContent.includes("netflix")) { finalName = "Netflix Premium"; finalPrice = 40000; }
              else if (quotedContent.includes("canva")) { finalName = "Canva Pro"; finalPrice = 15000; }
              else if (quotedContent.includes("bot") || quotedContent.includes("web")) { finalName = "Jasa Pembuatan Bot/Web"; finalPrice = 100000; }
            }

            // Dapatkan nomor WA pelanggan dari quoted context
            const targetJid = quotedInfo?.participant || remoteJid;
            const targetPhone = targetJid.split("@")[0].split(":")[0];

            try {
              // 1. Simpan ke database Customer jika belum ada
              const customerRecord = await prisma.customer.upsert({
                where: { phone: targetPhone },
                update: {},
                create: { phone: targetPhone, name: "Pelanggan Rama Store", isBlocked: false }
              });

              // 2. Buat record Order / Pesanan
              const orderNum = `RS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
              await prisma.order.create({
                data: {
                  orderNumber: orderNum,
                  customerId: customerRecord.id,
                  subtotal: finalPrice,
                  totalAmount: finalPrice,
                  status: "PROCESSING",
                  customerNotes: `Bukti transfer diverifikasi admin (${finalName})`,
                  items: matchedProduct ? {
                    create: {
                      productId: matchedProduct.id,
                      productName: matchedProduct.name,
                      unitPrice: finalPrice,
                      quantity: 1,
                      subtotal: finalPrice
                    }
                  } : undefined
                }
              });

              // 3. Catat / Update Omset
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);

              try {
                if ((prisma as any).omset) {
                  await (prisma as any).omset.upsert({
                    where: { tanggal: todayDate },
                    update: { total: { increment: finalPrice } },
                    create: { tanggal: todayDate, total: finalPrice }
                  });
                }
              } catch (omsetErr) {}

              // 4. Balas otomatis: Transaksi Sedang Diproses
              const prosesText = `⏳ *TRANSAKSI SEDANG DIPROSES*

Halo Kak! Bukti pembayaran telah kami terima dan diverifikasi.

📦 Layanan: *${finalName}*
💰 Total: *Rp ${finalPrice.toLocaleString("id-ID")}*
Status: *SEDANG DIPROSES* ⚙️

Pesanan/akun Anda sedang disiapkan oleh admin. Mohon ditunggu 5-10 menit, ya!`;

              await sendTextMessage(remoteJid, null, prosesText);
              io.emit("dashboard:stats_update");
            } catch (err) {
              console.error("Gagal memproses pesanan otomatis:", err);
            }
            continue; // Lanjut ke pesan berikutnya
          }
        }
        // =========================================================================

        if (msg.key.fromMe && recentBotReplies.has(text)) continue;

        const senderPhone = remoteJid.split("@")[0].split(":")[0];
        const customerName = msg.pushName || "Sobat Premium";
        handleIncomingMessage(remoteJid, senderPhone, customerName, text, msg).catch(() => {});
      }
    });
  } catch (error) {
    isConnecting = false;
    setTimeout(startWhatsApp, 1500);
  }
}

io.on("connection", (socket) => {
  socket.emit("whatsapp:status", { status: currentStatus, phone: currentPhone });
  if (currentQrDataUrl && currentStatus === "QR_READY") socket.emit("whatsapp:qr", { qr: currentQrDataUrl });
  if (currentPairingCode && currentStatus === "PAIRING_CODE_READY") socket.emit("whatsapp:pairing-code", { code: currentPairingCode });
});

async function handleIncomingMessage(jid: string, phone: string, name: string, text: string, rawMsg: proto.IWebMessageInfo) {
  try {
    let customer = await prisma.customer.findUnique({ where: { phone } });

    if (!customer) {
      const temporaryCustomer = { id: "UNREGISTERED", name, phone, isBlocked: false };
      await processBotAutomations(jid, null, text.trim(), temporaryCustomer);
      return; 
    }

    if (customer.isBlocked) return;

    let conversation = await prisma.conversation.findFirst({ where: { customerId: customer.id, isArchived: false } });
    if (!conversation) {
      conversation = await prisma.conversation.create({ data: { customerId: customer.id, isBotActive: true, unreadCount: 1 } });
    } else {
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } }
      }).catch(() => {});
    }

    prisma.message.create({
      data: { conversationId: conversation.id, senderType: "CUSTOMER", type: "TEXT", content: text, waMessageId: rawMsg.key.id || undefined, status: "DELIVERED" },
    }).then(() => {
      io.emit("message:incoming", { conversationId: conversation.id }); 
      io.emit("dashboard:stats_update");
    }).catch(() => {});

    if (conversation.isBotActive === false && text.toLowerCase().trim() !== "menu") {
      return;
    }

    await processBotAutomations(jid, conversation.id, text.trim(), customer);
  } catch (err) {}
}

async function processBotAutomations(jid: string, convId: string | null, text: string, customer: any) {
  const upperText = text.toUpperCase().trim();
  const cleanText = text.toLowerCase().trim();

  // 1. COMMAND: MENU
  if (cleanText === "menu" || cleanText === "premium") {
    if (convId) {
      prisma.conversation.update({ where: { id: convId }, data: { isBotActive: true } }).catch(() => {});
    }
    const { greeting, dateStr, timeStr } = getDynamicGreetingAndDate();
    
    const reply = `Halo, Kak *${customer.name}*! 👋
Selamat ${greeting}

Selamat datang di *Rama Store* (Aplikasi Premium Murah).

📅 ${dateStr}
⏰ ${timeStr}

📌 *MAIN MENU*
▪️ *list* ─ Lihat katalog produk
▪️ *sewa bot* ─ Jasa pembuatan bot
▪️ *payment* ─ Info pembayaran
▪️ *orderan* ─ Cek status pesanan
▪️ *admin* ─ Chat dengan CS

⚠️ *Syarat & Ketentuan:*
• Ketik salah satu menu di atas untuk akses.
• Dilarang spam pesan/telepon (Auto-Block).
• Transaksi pembayaran 100% aman.`;
    
    await sendTextMessage(jid, convId, reply);
    return;
  }

  // 2. COMMAND: LAYANAN / PRODUK / LIST
  if (cleanText === "layanan" || cleanText === "produk" || cleanText === "list") {
    if (convId) {
      prisma.conversation.update({ where: { id: convId }, data: { isBotActive: true } }).catch(() => {});
    }
    
    let keywords: any[] = [];
    try {
      keywords = await prisma.botKeyword.findMany({ where: { isActive: true }, orderBy: { keyword: "asc" } });
    } catch(e) {}
    
    const productItems = keywords.map((k: any) => {
      const cleanKeyword = k.keyword.replace(/[^\w\s]/gi, '').trim().toUpperCase();
      return ` ✦  *${cleanKeyword}*`;
    }).join("\n");

    const replyLayanan = `🛒 *LIST MENU RAMA STORE*
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
Berikut adalah daftar layanan & produk digital kami:

${productItems || " ✦  _Belum ada produk di katalog_"}

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
💡 *Cara Melihat Harga & Detail:*
Silakan ketik nama menu di atas dengan huruf kapital (Contoh: *WEBSITE*) untuk melihat informasi lengkap dan cara order.`;

    await sendTextMessage(jid, convId, replyLayanan);
    return;
  }

  // 3. COMMAND: SEWA BOT
  if (cleanText === "sewa" || cleanText === "bot" || cleanText === "order bot" || cleanText === "sewa bot") {
    const replyBotOrder = `🤖 *JASA PEMBUATAN & SEWA BOT WHATSAPP*
> Profesional, Otomatis, & Bergaransi!

Ingin memiliki bot WhatsApp otomatis untuk bisnis Anda? 
Fitur: Auto-reply 24/7, manajemen pesanan, broadcast, & integrasi database.\n
💳 *Cara Order Layanan Bot:*
1. Ketik *payment* untuk melihat informasi pembayaran.
2. Lakukan transfer pembayaran.
3. Screenshot bukti pembayaran & kirim ke chat ini.
4. Kirim format order (Hanya untuk Bot/Website):
   \`ORDER#[SKU_PRODUK]#Nama Bisnis#Fitur yang diinginkan\`

📞 Atau ketik *admin* untuk konsultasi langsung dengan developer!`;
    await sendTextMessage(jid, convId, replyBotOrder);
    return;
  }

  // 4. COMMAND: PAYMENT
  if (cleanText === "payment" || cleanText === "bayar") {
    let paymentConfig: any = null;
    try {
      paymentConfig = await prisma.paymentConfig.findUnique({ where: { id: "default-payment" } });
    } catch(e) {}
    const gopay = paymentConfig?.gopay || "088227142563";
    
    const paymentText = `💳 *INFORMASI PEMBAYARAN RESMI*
MUHAMMAD SYAFIQ RAMADANI DIGITAL & CREATIV

Silakan lakukan transfer pembayaran melalui:

📱 *GOPAY / DANA / OVO / SHOPEEPAY:*
• Nomor: *${gopay}*
• Atas Nama: MUHAMMAD SYAFIQ RAMADANI DIGITAL & CREATIV

🏦 *TRANSFER BANK / QRIS:*
• Scan QR Gambar QRIS di atas.

━━━━━━━━━━━━━━━━━━━━━
🛒 *CARA ORDER APLIKASI PREMIUM:*
Ketik: \`ORDER#NAMA_PRODUK\` (Contoh: ORDER#CAPCUT)

🛒 *CARA ORDER KHUSUS WEBSITE:*
Ketik: \`ORDER#WEBSITE#NAMA_BISNIS#FITUR_YANG_DIINGINKAN\``;

    if (paymentConfig?.qrisBase64) {
      try {
        const base64Data = paymentConfig.qrisBase64.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const sentImg = await sock.sendMessage(jid, { image: buffer, caption: paymentText });
        if (sentImg?.key?.id) cacheMessage(sentImg.key.id, sentImg.message);
        return;
      } catch (e) {}
    }
    await sendTextMessage(jid, convId, paymentText);
    return;
  }

  // 5. COMMAND: ORDERAN
  if (cleanText === "orderan" || cleanText === "cek order" || cleanText === "pesanan") {
    if (customer.id === "UNREGISTERED") {
      await sendTextMessage(jid, convId, `📦 Anda belum terdaftar di sistem kami dan belum memiliki riwayat pesanan aktif.`);
      return;
    }
    let orders: any[] = [];
    try {
      orders = await prisma.order.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { items: true },
      });
    } catch(e) {}

    if (orders.length === 0) {
      await sendTextMessage(jid, convId, `📦 Anda belum memiliki riwayat pesanan aktif.\n\nSilakan ketik *menu* atau *layanan* untuk melihat produk kami.`);
      return;
    }

    const orderList = orders.map((o: any) => 
      `• No: *${o.orderNumber}*\n  Status: *${o.status}*\n  Total: Rp ${Number(o.totalAmount).toLocaleString("id-ID")}`
    ).join("\n\n");

    await sendTextMessage(jid, convId, `📦 *RIWAYAT PESANAN TERAKHIR ANDA*\n\n${orderList}\n\nPastikan Anda sudah mengirimkan screenshot bukti pembayaran ke chat ini.`);
    return;
  }

  // 6. COMMAND: ADMIN
  if (cleanText === "admin" || cleanText === "cs") {
    if (convId) {
      prisma.conversation.update({
        where: { id: convId },
        data: { isBotActive: false },
      }).catch(() => {});
    }
    await sendTextMessage(jid, convId, "👨‍💻 Anda telah terhubung ke Live Agent (Admin). Silakan sampaikan pesan Anda, admin akan segera membalas.");
    return;
  }

  // 7. DINAMIS KEYWORD DARI KATALOG MENU (Hanya merespons jika diketik persis nama produknya)
  let keywords: any[] = [];
  try {
    keywords = await prisma.botKeyword.findMany({ where: { isActive: true } });
  } catch(e) {}
  
  for (const kw of keywords) {
    const dbKeyClean = kw.keyword.replace(/[^\w\s]/gi, '').trim().toUpperCase();
    if (upperText === kw.keyword.toUpperCase() || upperText === dbKeyClean) {
      
      let customResponse = kw.response;
      
      if (dbKeyClean.includes("WEB") || dbKeyClean.includes("BOT")) {
        customResponse += `\n\n━━━━━━━━━━━━━━━━━━━━━\n🛒 *CARA ORDER KHUSUS LAYANAN INI:*\n1. Ketik *payment* dan lakukan pembayaran.\n2. Screenshot bukti pembayaran.\n3. Kirim format order:\n   \`ORDER#${dbKeyClean}#Nama Bisnis#Catatan Fitur\``;
      } else {
        customResponse += `\n\n━━━━━━━━━━━━━━━━━━━━━\n🛒 *CARA ORDER CEPAT:*\n1. Ketik *payment* dan lakukan pembayaran.\n2. Screenshot bukti transfer.\n3. Ketik format order: \`ORDER#${dbKeyClean}\``;
      }

      await sendTextMessage(jid, convId, customResponse);
      return;
    }
  }

  // 8. ORDER FORMAT CHECKOUT (SMART SYSTEM)
  if (upperText.startsWith("ORDER#")) {
    if (customer.id === "UNREGISTERED") {
      await sendTextMessage(jid, convId, `❌ *GAGAL ORDER*\n\nMaaf kak, nomor WhatsApp Anda belum terdaftar di database Rama Store.\n\nSilakan ketik *admin* untuk meminta admin kami mendaftarkan nomor Anda terlebih dahulu.`);
      return;
    }

    const parts = text.split("#");
    if (parts.length >= 2) {
      const sku = parts[1].trim().toUpperCase();
      let customerInputName = customer.name; 
      let notes = "Pemesanan Produk Digital via Bot";

      if (parts.length >= 4) {
         customerInputName = parts[2].trim();
         notes = parts[3].trim();
      } else if (parts.length === 3) {
         notes = parts[2].trim();
      }

      let product: any = null;
      try {
        product = await prisma.product.findFirst({
          where: { OR: [{ sku: { equals: sku, mode: "insensitive" } }, { name: { contains: sku, mode: "insensitive" } }] },
        });
      } catch(e) {}

      if (product) {
        const orderNumber = `RS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        try {
          const newOrder = await prisma.order.create({
            data: {
              orderNumber, 
              customerId: customer.id, 
              subtotal: product.price, 
              totalAmount: product.price, 
              status: "PENDING", 
              customerNotes: `${customerInputName} - ${notes}`,
              items: { create: { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, subtotal: product.price } },
            },
          });
          io.emit("dashboard:stats_update");
          
          const invoiceReply = `🎉 *INVOICE PESANAN BERHASIL DIBUAT*

Nomor Invoice: *${newOrder.orderNumber}*
Pemesan: ${customerInputName}
Layanan: ${product.name}
Total Tagihan: *Rp ${Number(product.price).toLocaleString("id-ID")}*
Status: *MENUNGGU PEMBAYARAN & BUKTI TRANSFER*
Catatan: ${notes}

━━━━━━━━━━━━━━━━━━━━━
📌 *LANGKAH TERAKHIR:*
Jika Anda belum mengirimkan bukti transfer, silakan ketik *payment* lalu screenshot dan kirim buktinya ke sini. Admin akan memproses pesanan Anda maksimal 5-10 menit!`;

          await sendTextMessage(jid, convId, invoiceReply);
        } catch(e) {}
        return;
      }
    }
  }

  // TANPA FALLBACK OTOMATIS:
  // Jika pesan yang masuk adalah chat biasa (bukan command di atas), bot akan diam dan tidak mengganggu obrolan.
}

async function sendTextMessage(jid: string, conversationId: string | null, text: string) {
  if (!sock) return;
  registerBotOutbox(undefined, text);
  try {
    const sent = await sock.sendMessage(jid, { text });
    if (sent?.key?.id) {
      registerBotOutbox(sent.key.id, text);
      cacheMessage(sent.key.id, sent.message || { conversation: text });
    }
    
    if (conversationId) {
      prisma.message.create({ data: { conversationId, senderType: "BOT", type: "TEXT", content: text, waMessageId: sent?.key?.id || undefined, status: "SENT" } })
        .then(() => {
          io.emit("message:outgoing", { conversationId }); 
          io.emit("dashboard:stats_update");
        })
        .catch(() => {});
    } else {
      io.emit("dashboard:stats_update");
    }
  } catch(e) {}
}

app.get("/api/internal/status", (req, res) => res.json({ success: true, data: { status: currentStatus, phone: currentPhone } }));
app.post("/api/internal/request-pairing", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ success: false, message: "Nomor wajib diisi" });
  try {
    if (currentStatus !== "CONNECTED") {
      if (sock) {
        sock.ev.removeAllListeners();
        try { sock.ws?.close(); } catch (e) {}
        sock = null;
      }
      isConnecting = false;
      try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
      await startWhatsApp();
    }

    let attempts = 0;
    while (!sock && attempts < 10) { await new Promise((r) => setTimeout(r, 500)); attempts++; }
    if (!sock) return res.status(500).json({ success: false, message: "Engine belum siap" });

    let cleanedNumber = phoneNumber.replace(/\D/g, "");
    if (cleanedNumber.startsWith("0")) cleanedNumber = "62" + cleanedNumber.substring(1);
    await new Promise((r) => setTimeout(r, 1500));

    const rawCode = await sock.requestPairingCode(cleanedNumber);
    const formattedCode = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
    currentStatus = "PAIRING_CODE_READY";
    currentPairingCode = formattedCode;

    try {
      await prisma.whatsappConnection.upsert({
        where: { sessionId: "primary" },
        update: { status: ConnectionStatus.PAIRING_CODE_READY, pairingCode: formattedCode },
        create: { sessionId: "primary", status: ConnectionStatus.PAIRING_CODE_READY, pairingCode: formattedCode },
      });
    } catch (e) {}

    io.emit("whatsapp:pairing-code", { code: formattedCode });
    io.emit("whatsapp:status", { status: "PAIRING_CODE_READY", phone: currentPhone });
    return res.json({ success: true, pairingCode: formattedCode });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Gagal meminta pairing code." });
  }
});

app.post("/api/internal/disconnect", async (req, res) => {
  if (sock) await sock.logout();
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch(e) {}
  currentStatus = "DISCONNECTED";
  currentPairingCode = null;
  currentPhone = null;
  return res.json({ success: true });
});

server.listen(4000, "0.0.0.0", () => {
  myLogger.info(`WhatsApp Bot Engine berjalan pada http://127.0.0.1:4000`);
  startWhatsApp();
});
