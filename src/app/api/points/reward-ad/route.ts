import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POINTS } from "@/lib/points";
import { ensureUserSchema } from "@/lib/db-migrate";
import {
  addUserPoints,
  getUserPoints,
} from "@/lib/user-points";
import { randomBytes } from "crypto";

/** Minimum seconds between ad rewards */
const COOLDOWN_SEC = 15;

function newLogId() {
  return (
    Date.now().toString(36) + randomBytes(6).toString("hex")
  ).slice(0, 28);
}

/** Award points after user watched ad (logged-in only) — raw SQL only */
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

  const userId = session.userId;

  try {
    try {
      await ensureUserSchema();
    } catch {
      /* ignore */
    }

    // Cooldown via PointLog (raw)
    try {
      const recent = (await prisma.$queryRawUnsafe(
        `SELECT created_at FROM "PointLog"
         WHERE user_id = $1 AND reason = 'ad_reward'
           AND created_at >= NOW() - ($2 || ' seconds')::interval
         ORDER BY created_at DESC LIMIT 1`,
        userId,
        String(COOLDOWN_SEC)
      )) as { created_at: Date }[];

      if (recent[0]) {
        const pts = await getUserPoints(userId);
        const created = new Date(recent[0].created_at).getTime();
        const wait = Math.ceil(
          (created + COOLDOWN_SEC * 1000 - Date.now()) / 1000
        );
        return NextResponse.json({
          ok: true,
          points: pts,
          awarded: 0,
          cooldown: true,
          waitSec: Math.max(1, wait),
          message: `Subiri sekunde ${Math.max(1, wait)} kisha jaribu tena`,
        });
      }
    } catch (e) {
      console.error("reward-ad cooldown check", e);
      // continue — still award
    }

    // Increment points (raw SQL)
    const newPoints = await addUserPoints(userId, POINTS.AD_REWARD);

    // Log
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PointLog" (id, user_id, amount, reason, meta, created_at)
         VALUES ($1, $2, $3, 'ad_reward', $4, NOW())`,
        newLogId(),
        userId,
        POINTS.AD_REWARD,
        "Tazama tangazo (auto)"
      );
    } catch (e) {
      console.error("reward-ad log", e);
    }

    return NextResponse.json({
      ok: true,
      points: newPoints,
      awarded: POINTS.AD_REWARD,
      message: `+${POINTS.AD_REWARD} point zimeongezwa`,
    });
  } catch (e) {
    console.error("reward-ad", e);
    // Last-resort: still try raw increment
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET points = COALESCE(points, 0) + $1 WHERE id = $2`,
        POINTS.AD_REWARD,
        userId
      );
      const pts = await getUserPoints(userId);
      return NextResponse.json({
        ok: true,
        points: pts,
        awarded: POINTS.AD_REWARD,
        message: `+${POINTS.AD_REWARD} point zimeongezwa`,
      });
    } catch (e2) {
      console.error("reward-ad fallback", e2);
    }
    return NextResponse.json(
      { ok: false, error: "Imeshindikana kuongeza point", awarded: 0 },
      { status: 500 }
    );
  }
}
