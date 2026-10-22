import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { POINTS, generateInviteCode } from "@/lib/points";
import { randomBytes } from "crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  inviteCode: z.string().optional(),
});

function cuidLike() {
  return (
    "c" +
    Date.now().toString(36) +
    randomBytes(8).toString("hex")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email au password si sahihi" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const passwordHash = await hashPassword(parsed.data.password);
    const fullName = parsed.data.fullName?.trim() || null;

    // Check existing — resilient
    let existing = false;
    try {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      existing = !!u;
    } catch {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
        email
      );
      existing = rows.length > 0;
    }
    if (existing) {
      return NextResponse.json({ error: "Email hii tayari inatumika" }, { status: 409 });
    }

    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch {
      const rows = await prisma.$queryRawUnsafe<{ c: number }[]>(
        `SELECT COUNT(*)::int AS c FROM "User"`
      );
      userCount = rows[0]?.c ?? 0;
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const role =
      userCount === 0 || (adminEmail.length > 0 && email === adminEmail)
        ? "admin"
        : "user";

    let referredById: string | null = null;
    const rawInvite = (parsed.data.inviteCode || "")
      .trim()
      .toUpperCase()
      .replace(/^MF\.\s*/i, ""); // ignore placeholder "MF. ETAB12CD"
    if (rawInvite && rawInvite.length >= 4 && !rawInvite.includes("ETAB12")) {
      try {
        const inviter = await prisma.user.findFirst({
          where: { inviteCode: rawInvite },
          select: { id: true },
        });
        if (inviter) referredById = inviter.id;
      } catch {
        /* ignore */
      }
    }

    const inviteCode = generateInviteCode();
    const id = cuidLike();

    // Try Prisma create with full schema
    let user: {
      id: string;
      email: string;
      fullName: string | null;
      role: string;
      points: number;
      inviteCode: string | null;
    } | null = null;

    try {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role,
          points: POINTS.SIGNUP,
          inviteCode,
          referredById,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          points: true,
          inviteCode: true,
        },
      });
    } catch (e1) {
      console.error("prisma create failed", e1);
      // Raw insert — works even if Prisma client/DB schema mismatch
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "User" (id, email, password_hash, full_name, role, points, invite_code, referred_by_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          id,
          email,
          passwordHash,
          fullName,
          role,
          POINTS.SIGNUP,
          inviteCode,
          referredById
        );
        user = {
          id,
          email,
          fullName,
          role,
          points: POINTS.SIGNUP,
          inviteCode,
        };
      } catch (e2) {
        console.error("raw insert with points failed", e2);
        // Oldest schema without points columns
        await prisma.$executeRawUnsafe(
          `INSERT INTO "User" (id, email, password_hash, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          id,
          email,
          passwordHash,
          fullName,
          role
        );
        user = {
          id,
          email,
          fullName,
          role,
          points: POINTS.SIGNUP,
          inviteCode: null,
        };
      }
    }

    // Best-effort point log
    try {
      await prisma.pointLog.create({
        data: {
          userId: user.id,
          amount: POINTS.SIGNUP,
          reason: "signup_bonus",
          meta: "Point 10 za kuanza",
        },
      });
    } catch {
      /* table may not exist yet */
    }

    if (referredById) {
      try {
        await prisma.user.update({
          where: { id: referredById },
          data: { points: { increment: POINTS.INVITE_REWARD } },
        });
      } catch {
        /* ignore */
      }
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
        inviteCode: user.inviteCode,
      },
    });
  } catch (err) {
    console.error("signup error", err);
    return NextResponse.json(
      {
        error: "Imeshindikana kuunda account",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}
