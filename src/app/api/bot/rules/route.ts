import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Mengambil data commands, keywords, dan bot config
export async function GET() {
  try {
    const commands = await prisma.botCommand.findMany({ orderBy: { command: "asc" } });
    const keywords = await prisma.botKeyword.findMany({ orderBy: { keyword: "asc" } });
    
    // Ambil atau buat default config jika belum ada
    let config = await prisma.botConfig.findUnique({ where: { id: "default-config" } });
    if (!config) {
      config = await prisma.botConfig.create({
        data: {
          id: "default-config",
          welcomeMessage: "Halo! Selamat datang di Rama Store.",
          outOfOfficeMessage: "Mohon maaf, kami sedang di luar jam operasional.",
          fallbackMessage: "Halo Kak! Perintah tidak dikenali.\n\nSilakan ketik *menu* atau *layanan* untuk melihat daftar menu kami di Rama Store.",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { commands, keywords, config },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Menambah keyword baru ATAU menyimpan BotConfig (fallback message)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type } = body;

    // TAMBAHAN: Menyimpan Pesan Otomatis / BotConfig (Fallback Message)
    if (type === "config") {
      const { fallbackMessage } = body;
      const updatedConfig = await prisma.botConfig.upsert({
        where: { id: "default-config" },
        update: { fallbackMessage: fallbackMessage || "" },
        create: {
          id: "default-config",
          welcomeMessage: "Halo! Selamat datang di Rama Store.",
          outOfOfficeMessage: "Mohon maaf, kami sedang di luar jam operasional.",
          fallbackMessage: fallbackMessage || "",
        },
      });

      return NextResponse.json({ success: true, data: updatedConfig });
    }

    // Menambah Keyword Baru
    if (type === "keyword") {
      const { keyword, response, isActive } = body;
      const newKeyword = await prisma.botKeyword.create({
        data: {
          keyword: keyword.trim().toUpperCase(),
          response: response.trim(),
          isActive: isActive ?? true,
        },
      });

      return NextResponse.json({ success: true, data: newKeyword });
    }

    return NextResponse.json({ success: false, message: "Tipe aksi tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
