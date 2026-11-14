import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/points";

export const dynamic = "force-dynamic";

type MeUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  points: number;
  packagePoints: number;
  packagePointsExpiresAt: Date | null;
  inviteCode: string | null;
};

async function loadUser(userId: string): Promise<MeUser | null> {
  // Raw SQL matches actual DB columns (full_name, points, package_points…)
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, email,
              COALESCE(NULLIF(full_name, ''), NULLIF(name, ''), email) AS full_name,
              COALESCE(role, 'user') AS role,
              COALESCE(points, 0) AS points,
              COALESCE(package_points, 0) AS package_points,
              package_points_expires_at,
              invite_code
       FROM "User" WHERE id = $1 LIMIT 1`,
      userId
    )) as Record<string, unknown>[];
    if (rows[0]) {
      const r = rows[0];
      return {
        id: String(r.id),
        email: String(r.email || ""),
        fullName: (r.full_name as string) || null,
        role: String(r.role || "user"),
        points: Number(r.points || 0),
        packagePoints: Number(r.package_points || 0),
        packagePointsExpiresAt: (r.package_points_expires_at as Date) || null,
        inviteCode: (r.invite_code as string) || null,
      };
    }
  } catch (e) {
    console.error("loadUser raw", e);
  }

  // Prisma client fallback (name mapped to full_name)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        points: true,
        packagePoints: true,
        packagePointsExpiresAt: true,
        inviteCode: true,
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
      points: user.points,
      packagePoints: user.packagePoints,
      packagePointsExpiresAt: user.packagePointsExpiresAt,
      inviteCode: user.inviteCode,
    };
  } catch (e) {
    console.error("loadUser prisma", e);
  }
  return null;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    let user = await loadUser(session.userId);
    if (!user) {
      return NextResponse.json({
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          fullName: session.fullName ?? null,
          points: 0,
          packagePoints: 0,
          packagePointsExpiresAt: null,
          inviteCode: null,
        },
      });
    }

    // Clear expired package points
    if (
      user.packagePoints > 0 &&
      user.packagePointsExpiresAt &&
      user.packagePointsExpiresAt <= new Date()
    ) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET package_points = 0, package_points_expires_at = NULL WHERE id = $1`,
          user.id
        );
      } catch {
        /* ignore */
      }
      user.packagePoints = 0;
      user.packagePointsExpiresAt = null;
    }

    if (!user.inviteCode) {
      try {
        let code = generateInviteCode();
        for (let i = 0; i < 5; i++) {
          const clash = (await prisma.$queryRawUnsafe(
            `SELECT id FROM "User" WHERE invite_code = $1 LIMIT 1`,
            code
          )) as unknown[];
          if (!clash.length) break;
          code = generateInviteCode();
        }
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET invite_code = $1 WHERE id = $2`,
          code,
          user.id
        );
        user.inviteCode = code;
      } catch {
        /* invite_code column may be missing */
      }
    }

    // Total usable points = regular + active package points
    const totalPoints =
      Number(user.points || 0) + Number(user.packagePoints || 0);

    return NextResponse.json({
      user: {
        ...user,
        points: totalPoints,
        basePoints: user.points,
        packagePoints: user.packagePoints,
      },
    });
  } catch (e) {
    console.error("me", e);
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        points: 0,
      },
    });
  }
}
