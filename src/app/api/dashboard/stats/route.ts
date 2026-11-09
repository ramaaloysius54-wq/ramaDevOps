import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCustomers,
      totalOrders,
      totalProducts,
      waConnection,
      groupedMessages,
      paidRevenueAgg,
      recentMessages7d,
      recentOrders7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.whatsappConnection.findUnique({
        where: { sessionId: "primary" },
      }),
      prisma.message.groupBy({
        by: ["senderType"],
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "PROCESSING", "COMPLETED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.message.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, senderType: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, totalAmount: true, status: true },
      }),
    ]);

    let messagesIn = 0;
    let messagesOut = 0;

    groupedMessages.forEach((item) => {
      if (item.senderType === "CUSTOMER") {
        messagesIn += item._count.id;
      } else {
        messagesOut += item._count.id;
      }
    });

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const chartMap = new Map<
      string,
      {
        name: string;
        tanggal: string;
        pesanMasuk: number;
        pesanKeluar: number;
        pesanan: number;
        penjualan: number;
      }
    >();

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const dateKey = d.toISOString().split("T")[0];
      const dayLabel = `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
      chartMap.set(dateKey, {
        name: dayLabel,
        tanggal: dateKey,
        pesanMasuk: 0,
        pesanKeluar: 0,
        pesanan: 0,
        penjualan: 0,
      });
    }

    recentMessages7d.forEach((m) => {
      const key = new Date(m.createdAt).toISOString().split("T")[0];
      const entry = chartMap.get(key);
      if (entry) {
        if (m.senderType === "CUSTOMER") {
          entry.pesanMasuk += 1;
        } else {
          entry.pesanKeluar += 1;
        }
      }
    });

    recentOrders7d.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().split("T")[0];
      const entry = chartMap.get(key);
      if (entry && o.status !== "CANCELLED") {
        entry.pesanan += 1;
        if (["PAID", "PROCESSING", "COMPLETED"].includes(o.status)) {
          entry.penjualan += Number(o.totalAmount || 0);
        }
      }
    });

    const chartData = Array.from(chartMap.values());
    const totalRevenue = Number(paidRevenueAgg._sum.totalAmount || 0);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalCustomers,
        totalOrders,
        totalProducts,
        totalRevenue,
        messagesIn,
        messagesOut,
        waStatus: waConnection?.status || "DISCONNECTED",
        phone: waConnection?.phone || "-",
        uptimeStart: waConnection?.uptimeStart || null,
        chartData,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
