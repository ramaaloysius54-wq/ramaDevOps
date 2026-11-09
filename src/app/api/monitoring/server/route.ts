import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import os from "os";

export async function GET() {
  try {
    const latestMetric = await prisma.serverMetric.findFirst({
      orderBy: { recordedAt: "desc" },
    });

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return NextResponse.json({
      success: true,
      data: latestMetric || {
        cpuUsage: os.loadavg()[0],
        ramUsagePercent: (usedMem / totalMem) * 100,
        ramTotalBytes: totalMem,
        ramUsedBytes: usedMem,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
