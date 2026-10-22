import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/points";

/** Spend 1 point to unlock content for this session */
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
      select: { id: true, points: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Admins unlimited
    if (user.role === "admin") {
      return NextResponse.json({ ok: true, points: user.points, spent: 0, free: true });
    }

    if (user.points < POINTS.WATCH_COST) {
      return NextResponse.json(
        {
          error: "Point zimeisha",
          code: "NO_POINTS",
          points: user.points,
        },
        { status: 402 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { points: { decrement: POINTS.WATCH_COST } },
      select: { points: true },
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
      spent: POINTS.WATCH_COST,
    });
  } catch (e) {
    console.error("spend", e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}
