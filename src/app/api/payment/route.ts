import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payment = await prisma.paymentConfig.findUnique({
      where: { id: "default-payment" },
    });
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { gopay, qrisBase64 } = await req.json();
    const payment = await prisma.paymentConfig.upsert({
      where: { id: "default-payment" },
      update: { gopay, qrisBase64 },
      create: { id: "default-payment", gopay, qrisBase64 },
    });
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
