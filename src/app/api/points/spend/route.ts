import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/points";

/** Spend points — package bonus first, then normal points */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required", code: "AUTH" }, { status: 401 });
  }

  let contentKey = "";
  try {
    const body = await req.json();
    contentKey = String(body?.contentKey || "").slice(0, 80);
  } catch {
    /* ignore */
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        points: true,
        role: true,
        packagePoints: true,
        packagePointsExpiresAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({
        ok: true,
        points: user.points,
        packagePoints: user.packagePoints || 0,
        spent: 0,
        free: true,
      });
    }

    const now = new Date();
    let pkg =
      (user.packagePoints || 0) > 0 &&
      user.packagePointsExpiresAt &&
      user.packagePointsExpiresAt > now
        ? user.packagePoints
        : 0;

    // Expired package points → clear
    if (
      (user.packagePoints || 0) > 0 &&
      user.packagePointsExpiresAt &&
      user.packagePointsExpiresAt <= now
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { packagePoints: 0, packagePointsExpiresAt: null },
      });
      pkg = 0;
    }

    const normal = user.points || 0;
    if (pkg + normal < POINTS.WATCH_COST) {
      return NextResponse.json(
        {
          error: "Point zimeisha",
          code: "NO_POINTS",
          points: normal,
          packagePoints: pkg,
        },
        { status: 402 }
      );
    }

    // Spend from package first
    if (pkg >= POINTS.WATCH_COST) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { packagePoints: { decrement: POINTS.WATCH_COST } },
        select: { points: true, packagePoints: true },
      });
      await prisma.pointLog.create({
        data: {
          userId: user.id,
          amount: -POINTS.WATCH_COST,
          reason: "watch_spend_package",
          meta: contentKey || null,
        },
      });
      return NextResponse.json({
        ok: true,
        points: updated.points,
        packagePoints: updated.packagePoints,
        spent: POINTS.WATCH_COST,
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { points: { decrement: POINTS.WATCH_COST } },
      select: { points: true, packagePoints: true },
    });

    await prisma.pointLog.create({
      data: {
        userId: user.id,
        amount: -POINTS.WATCH_COST,
        reason: "watch_spend",
        meta: contentKey || null,
      },
    });

    return NextResponse.json({
      ok: true,
      points: updated.points,
      packagePoints: updated.packagePoints || 0,
      spent: POINTS.WATCH_COST,
    });
  } catch (e) {
    console.error("spend", e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}
