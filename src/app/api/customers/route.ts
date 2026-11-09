import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: { 
        _count: { select: { orders: true, conversations: true } },
        conversations: { select: { id: true, isBotActive: true }, orderBy: { updatedAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" },
    });

    const data = customers.map(c => ({
      ...c,
      isBotActive: c.conversations[0]?.isBotActive ?? true
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { phone, action, value, oldPhone, newName, newPhone } = body;

    if (action === "block") {
      await prisma.customer.update({ where: { phone }, data: { isBlocked: value } });
    } else if (action === "bot") {
      const customer = await prisma.customer.findUnique({
        where: { phone }, include: { conversations: { orderBy: { updatedAt: "desc" }, take: 1 } },
      });
      if (customer && customer.conversations.length > 0) {
        await prisma.conversation.update({
          where: { id: customer.conversations[0].id }, data: { isBotActive: value },
        });
      }
    } else if (action === "edit") {
      await prisma.customer.update({
        where: { phone: oldPhone }, data: { name: newName, phone: newPhone },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PENAMBAHAN: Fungsi POST untuk Menambah Pelanggan Manual
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone } = body;

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Nomor ini sudah terdaftar." }, { status: 400 });
    }

    const newCustomer = await prisma.customer.create({
      data: { name, phone }
    });

    return NextResponse.json({ success: true, data: newCustomer });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
