import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const pairingSchema = z.object({
  phoneNumber: z.string().min(10, "Nomor telepon minimal 10 digit"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = pairingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Nomor WhatsApp tidak valid" },
        { status: 400 }
      );
    }

    const botPort = process.env.BOT_SERVICE_PORT || "4000";
    const botServiceUrl = `http://127.0.0.1:${botPort}`;

    const botRes = await fetch(`${botServiceUrl}/api/internal/request-pairing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY || "",
      },
      body: JSON.stringify({ phoneNumber: validation.data.phoneNumber }),
      cache: "no-store",
    });

    const data = await botRes.json();
    if (!botRes.ok) {
      throw new Error(data.message || "Gagal meminta pairing code");
    }

    return NextResponse.json({
      success: true,
      pairingCode: data.pairingCode,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.cause?.code === "ECONNREFUSED"
            ? "Service WhatsApp Bot (Port 4000) belum menyala. Pastikan menjalankan npm run dev terbaru."
            : error.message,
      },
      { status: 500 }
    );
  }
}
