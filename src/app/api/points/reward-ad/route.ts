import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/points";
import { ensureUserSchema } from "@/lib/db-migrate";

/** Minimum seconds between ad rewards */
const COOLDOWN_SEC = 20;

/** Award points after user opened ad (logged-in only) */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        guest: true,
        points: 0,
        awarded: 0,
        error: "Ingia kwanza ili upate point",
      },
      { status: 401 }
    );
  }

  try {
    await ensureUserSchema();

    const since = new Date(Date.now() - COOLDOWN_SEC * 1000);
    let recent = null as { createdAt: Date } | null;
    try {
      recent = await prisma.pointLog.findFirst({
        where: {
          userId: session.userId,
          reason: "ad_reward",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
    } catch {
      // PointLog may be missing — still allow award
      recent = null;
    }

    if (recent) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { points: true },
      });
      const wait = Math.ceil(
        (recent.createdAt.getTime() + COOLDOWN_SEC * 1000 - Date.now()) / 1000
      );
      return NextResponse.json({
        ok: true,
        points: user?.points ?? 0,
        awarded: 0,
        cooldown: true,
        waitSec: Math.max(1, wait),
        message: `Subiri sekunde ${Math.max(1, wait)} kisha jaribu tena`,
      });
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { points: { increment: POINTS.AD_REWARD } },
      select: { points: true },
    });

    try {
      await prisma.pointLog.create({
        data: {
          userId: session.userId,
          amount: POINTS.AD_REWARD,
          reason: "ad_reward",
          meta: "Tazama tangazo (auto)",
        },
      });
    } catch (e) {
      console.error("reward-ad log", e);
    }

    return NextResponse.json({
      ok: true,
      points: updated.points,
      awarded: POINTS.AD_REWARD,
      message: `+${POINTS.AD_REWARD} point zimeongezwa`,
    });
  } catch (e) {
    console.error("reward-ad", e);
    return NextResponse.json(
      { ok: false, error: "Imeshindikana kuongeza point", awarded: 0 },
      { status: 500 }
    );
  }
}
