import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalRevenue, ordersCount, customersCount, topProducts] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        ordersCount,
        customersCount,
        topProducts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
