import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: false, message: "Conversation ID diperlukan" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, text } = await req.json();
    if (!conversationId || !text) {
      return NextResponse.json({ success: false, message: "Data tidak lengkap" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: true },
    });

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Percakapan tidak ditemukan" }, { status: 404 });
    }

    const botPort = process.env.BOT_SERVICE_PORT || "4000";
    const botServiceUrl = `http://127.0.0.1:${botPort}`;

    const botRes = await fetch(`${botServiceUrl}/api/internal/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        jid: conversation.customer.phone,
        text,
        conversationId,
      }),
      cache: "no-store",
    });

    const d = await botRes.json();
    if (!botRes.ok) throw new Error(d.message || "Gagal mengirim pesan via Baileys");

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), isBotActive: false },
    });

    return NextResponse.json({ success: true, data: d.message });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
