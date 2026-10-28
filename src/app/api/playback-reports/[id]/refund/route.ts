import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  if (admin?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const report = await prisma.playbackReport.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "Haipatikani" }, { status: 404 });
    }
    if (report.status === "refunded") {
      return NextResponse.json({ error: "Tayari imerudishwa" }, { status: 400 });
    }

    const amount = report.refundPoints || 1;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: report.userId },
        data: { points: { increment: amount } },
      }),
      prisma.pointLog.create({
        data: {
          userId: report.userId,
          amount,
          reason: "watch_refund_admin",
          meta: report.contentKey,
        },
      }),
      prisma.playbackReport.update({
        where: { id },
        data: { status: "refunded", adminNote: "Point zimerudishwa" },
      }),
    ]);

    return NextResponse.json({ ok: true, refunded: amount });
  } catch (e) {
    console.error("refund report", e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}
