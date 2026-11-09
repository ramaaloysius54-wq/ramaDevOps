import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const botPort = process.env.BOT_SERVICE_PORT || "4000";
  const botServiceUrl = `http://127.0.0.1:${botPort}`;

  try {
    // Ambil state langsung dari memory Bot Service agar selalu akurat
    const liveRes = await fetch(`${botServiceUrl}/api/internal/status`, {
      cache: "no-store",
    });
    if (liveRes.ok) {
      const liveData = await liveRes.json();
      if (liveData.success && liveData.data) {
        return NextResponse.json({
          success: true,
          data: liveData.data,
        });
      }
    }
  } catch {
    // Jika service bot mati, otomatis tampilkan DISCONNECTED
    return NextResponse.json({
      success: true,
      data: {
        status: "DISCONNECTED",
        phone: null,
        qrCode: null,
        pairingCode: null,
      },
    });
  }

  try {
    const connection = await prisma.whatsappConnection.findUnique({
      where: { sessionId: "primary" },
    });

    return NextResponse.json({
      success: true,
      data: connection || {
        status: "DISCONNECTED",
        phone: null,
        qrCode: null,
        pairingCode: null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const botPort = process.env.BOT_SERVICE_PORT || "4000";
    const botServiceUrl = `http://127.0.0.1:${botPort}`;

    await fetch(`${botServiceUrl}/api/internal/disconnect`, {
      method: "POST",
      cache: "no-store",
    });

    return NextResponse.json({
      success: true,
      message: "Koneksi WhatsApp berhasil diputus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
