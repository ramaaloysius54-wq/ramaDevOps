import { PrismaClient, Role, ProductCategoryType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Menjalankan seeder Rama Store (Supabase PostgreSQL)...");

  // 1. Inisialisasi Admin Utama
  const hashedPassword = await bcrypt.hash("AdminRama2026!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ramastore.com" },
    update: {},
    create: {
      email: "admin@ramastore.com",
      name: "Rama Admin Enterprise",
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      phone: "6281234567890",
    },
  });
  console.log(`Admin dibuat: ${adminUser.email}`);

  // 2. Default Configuration Bot
  await prisma.botConfig.upsert({
    where: { id: "default-config" },
    update: {},
    create: {
      id: "default-config",
      isEnabled: true,
      botName: "Rama Store Smart Automation",
      prefix: "!",
      welcomeMessage:
        "Halo! Selamat datang di *Rama Store*.\nSolusi Resmi Kebutuhan Digital Anda.\n\nSilakan ketik *!menu* untuk melihat daftar layanan dan perintah bot yang tersedia.",
      outOfOfficeMessage:
        "Terima kasih telah menghubungi *Rama Store*. Saat ini kami berada di luar jam operasional (08:00 - 21:00 WIB). Pesan Anda akan dibalas oleh tim kami saat toko buka kembali.",
      fallbackMessage:
        "Perintah tidak dikenali. Ketik *!menu* untuk melihat opsi bantuan atau ketik *!admin* untuk berbicara langsung dengan Customer Support kami.",
      adminPhoneNotification: "6281234567890",
      operatingHourStart: "08:00",
      operatingHourEnd: "21:00",
      isOperatingHoursActive: true,
    },
  });

  // 3. Command Default Bot
  const defaultCommands = [
    {
      command: "!menu",
      description: "Menampilkan menu layanan dan perintah utama",
      response:
        "*MENU UTAMA RAMA STORE*\n\n1. *!premium* - Layanan Aplikasi Premium\n2. *!website* - Jasa Pembuatan Website\n3. *!bot* - Jasa Pembuatan WhatsApp Bot\n4. *!order* - Format Pemesanan Layanan\n5. *!status [No-Order]* - Cek Status Pesanan\n6. *!admin* - Hubungkan ke Live Customer Service",
    },
    {
      command: "!premium",
      description: "Daftar harga dan paket aplikasi premium",
      response:
        "*KATALOG APLIKASI PREMIUM*\n\n- Spotify Premium 1 Bulan: Rp 25.000\n- YouTube Premium 1 Bulan: Rp 20.000\n- Netflix Premium UHD 1 Bulan: Rp 45.000\n- Canva Pro 1 Tahun: Rp 35.000\n\nKetik *!order* untuk petunjuk transaksi.",
    },
    {
      command: "!website",
      description: "Daftar paket jasa pembuatan website",
      response:
        "*JASA PEMBUATAN WEBSITE*\n\n1. Landing Page Pro (Mulai Rp 499.000)\n2. Company Profile Bisnis (Mulai Rp 999.000)\n3. Toko Online E-Commerce (Mulai Rp 1.750.000)\n4. Web Aplikasi Custom (Mulai Rp 3.500.000)\n\nHubungi *!admin* untuk konsultasi arsitektur & portofolio.",
    },
    {
      command: "!bot",
      description: "Jasa bot otomasi bisnis WhatsApp",
      response:
        "*JASA BOT WHATSAPP & AUTOMATION*\n\n- Bot Auto Reply CS 24/7\n- Bot Notifikasi Order & Resi Otomatis\n- Bot Integrasi Database & API Webhook\n- Custom Enterprise Bot Multi-Device\n\nKetik *!admin* untuk demo fungsional.",
    },
    {
      command: "!order",
      description: "Panduan alur pemesanan",
      response:
        "*FORMAT PEMESANAN RAMA STORE*\n\nSilakan balas dengan format:\n`ORDER#[KODE_PRODUK]#[NAMA_ANDA]#[CATATAN]`\n\nContoh:\n`ORDER#APP-SPOT-01#Budi Santoso#Akun Baru`",
    },
    {
      command: "!admin",
      description: "Menghubungkan ke Customer Service",
      response:
        "Permintaan Anda diteruskan ke Customer Service. Bot dinonaktifkan sementara untuk chat ini. Mohon tunggu balasan agen kami.",
    },
  ];

  for (const cmd of defaultCommands) {
    await prisma.botCommand.upsert({
      where: { command: cmd.command },
      update: {},
      create: cmd,
    });
  }

  // 4. Default Catalog Products
  const sampleProducts = [
    {
      sku: "APP-SPOT-01",
      name: "Spotify Premium 1 Bulan (Private)",
      description: "Akun individual private garansi full 30 hari tanpa kendala.",
      price: 25000,
      stock: 100,
      category: ProductCategoryType.APLIKASI_PREMIUM,
      isActive: true,
    },
    {
      sku: "APP-NFLX-01",
      name: "Netflix Premium UHD 4K (1 Profil)",
      description: "Kualitas streaming 4K Ultra HD, anti-screen limit, legal.",
      price: 45000,
      stock: 50,
      category: ProductCategoryType.APLIKASI_PREMIUM,
      isActive: true,
    },
    {
      sku: "WEB-COMP-01",
      name: "Website Company Profile Express",
      description: "Desain responsif, domain .com, SSL gratis, SEO friendly.",
      price: 999000,
      stock: 10,
      category: ProductCategoryType.JASA_WEBSITE,
      isActive: true,
    },
    {
      sku: "BOT-CS-01",
      name: "Bot WhatsApp CS Auto Responder",
      description: "Sistem bot auto-reply berbasis WhatsApp Web, dashboard web included.",
      price: 750000,
      stock: 20,
      category: ProductCategoryType.JASA_BOT_WA,
      isActive: true,
    },
  ];

  for (const prod of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }

  // 5. Connection State Record
  await prisma.whatsappConnection.upsert({
    where: { sessionId: "primary" },
    update: {},
    create: {
      sessionId: "primary",
    },
  });

  console.log("Seeding Rama Store Database selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
