import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PENAMBAHAN WAJIB: Baris ini untuk mematikan sistem cache (ingatan palsu) Next.js
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let config = await prisma.botConfig.findUnique({ where: { id: "default-config" } });
    
    // TAMBAHAN: Buat data default jika belum ada di database agar dashboard tidak error (blank)
    if (!config) {
      config = await prisma.botConfig.create({
        data: { id: "default-config", welcomeMessage: "", outOfOfficeMessage: "", fallbackMessage: "" },
      });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await prisma.botConfig.update({
      where: { id: "default-config" },
      data: body,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// TAMBAHAN: Method PATCH khusus untuk menerima sinyal dari tombol sakelar (On/Off) di halaman Settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await prisma.botConfig.update({
      where: { id: "default-config" },
      data: body,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
