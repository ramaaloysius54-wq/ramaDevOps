import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const keywords = await prisma.botKeyword.findMany({
      orderBy: { keyword: "asc" },
    });
    return NextResponse.json({ success: true, data: keywords });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, keyword, response } = await req.json();
    const upperKeyword = keyword.toUpperCase();
    
    if (id) {
      const updated = await prisma.botKeyword.update({
        where: { id },
        data: { keyword: upperKeyword, response, isActive: true },
      });
      return NextResponse.json({ success: true, data: updated });
    } else {
      const created = await prisma.botKeyword.create({
        data: { keyword: upperKeyword, response, isActive: true, matchType: "EXACT" },
      });
      return NextResponse.json({ success: true, data: created });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false }, { status: 400 });
    
    await prisma.botKeyword.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
