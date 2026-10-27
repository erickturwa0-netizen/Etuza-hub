import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/points";

/**
 * Refund WATCH_COST when content failed to play after spend.
 * Only once per contentKey within last 10 minutes.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let contentKey = "";
  let reason = "playback_failed";
  try {
    const body = await req.json();
    contentKey = String(body?.contentKey || "").slice(0, 80);
    reason = String(body?.reason || "playback_failed").slice(0, 40);
  } catch {
    /* ignore */
  }

  if (!contentKey) {
    return NextResponse.json({ error: "contentKey required" }, { status: 400 });
  }

  try {
    // Already refunded?
    const already = await prisma.pointLog.findFirst({
      where: {
        userId: session.userId,
        reason: "watch_refund",
        meta: contentKey,
      },
      orderBy: { createdAt: "desc" },
    });
    if (already) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { points: true, packagePoints: true },
      });
      return NextResponse.json({
        ok: true,
        already: true,
        points: user?.points ?? 0,
        packagePoints: user?.packagePoints ?? 0,
      });
    }

    // Must have spent recently for this content
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const spend = await prisma.pointLog.findFirst({
      where: {
        userId: session.userId,
        reason: { in: ["watch_spend", "watch_spend_package"] },
        meta: contentKey,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!spend) {
      return NextResponse.json(
        { error: "Hakuna malipo ya point ya kurejesha", code: "NO_SPEND" },
        { status: 400 }
      );
    }

    const fromPackage = spend.reason === "watch_spend_package";
    const amount = POINTS.WATCH_COST;

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: fromPackage
        ? { packagePoints: { increment: amount } }
        : { points: { increment: amount } },
      select: { points: true, packagePoints: true },
    });

    await prisma.pointLog.create({
      data: {
        userId: session.userId,
        amount,
        reason: "watch_refund",
        meta: contentKey,
      },
    });

    return NextResponse.json({
      ok: true,
      refunded: amount,
      reason,
      points: updated.points,
      packagePoints: updated.packagePoints || 0,
    });
  } catch (e) {
    console.error("refund", e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}
