import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/points";

/** After watching pre-roll ad — award points (logged-in users) */
export async function POST() {
  const session = await getSession();
  if (!session) {
    // Guest: client unlocks via sessionStorage only
    return NextResponse.json({ ok: true, guest: true, points: 0, awarded: 0 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { points: { increment: POINTS.AD_REWARD } },
      select: { points: true },
    });

    await prisma.pointLog.create({
      data: {
        userId: session.userId,
        amount: POINTS.AD_REWARD,
        reason: "ad_reward",
        meta: "Tazama tangazo",
      },
    });

    return NextResponse.json({
      ok: true,
      points: updated.points,
      awarded: POINTS.AD_REWARD,
    });
  } catch (e) {
    console.error("reward-ad", e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}
