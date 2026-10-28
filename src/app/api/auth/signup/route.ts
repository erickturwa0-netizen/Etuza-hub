import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  hashPassword,
} from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { generateInviteCode, POINTS } from "@/lib/points";
import {
  assertDeviceAndIpAllowed,
  getClientIp,
} from "@/lib/ip-guard";
import { randomBytes } from "crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  inviteCode: z.string().optional(),
  deviceId: z.string().min(8).max(64).optional(),
});

function newId() {
  return Date.now().toString(36) + randomBytes(8).toString("hex");
}

export async function POST(req: Request) {
  try {
    await ensureUserSchema();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email au password si sahihi" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const passwordHash = await hashPassword(parsed.data.password);
    const fullName = parsed.data.fullName?.trim() || null;
    const deviceId = parsed.data.deviceId;
    const ip = getClientIp(req);

    if (deviceId && deviceId.length >= 16) {
      try {
        const existingDevice = (await prisma.$queryRawUnsafe(
          `SELECT id, email FROM "User" WHERE device_id = $1 AND (role IS NULL OR role <> 'admin') LIMIT 1`,
          deviceId.slice(0, 64)
        )) as { id: string; email: string }[];
        if (existingDevice[0]) {
          return NextResponse.json(
            {
              error:
                "Kifaa hiki tayari kina account. Huwezi kusajili account nyingine (hata Gmail nyingine) kwenye simu/browser hii.",
            },
            { status: 403 }
          );
        }
      } catch {
        /* ignore */
      }
    }

    let existing = false;
    try {
      const u = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      existing = !!u;
    } catch {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
        email
      );
      existing = rows.length > 0;
    }
    if (existing) {
      return NextResponse.json(
        { error: "Email hii tayari inatumika" },
        { status: 409 }
      );
    }

    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch {
      try {
        const rows = await prisma.$queryRawUnsafe<{ c: number }[]>(
          `SELECT COUNT(*)::int AS c FROM "User"`
        );
        userCount = rows[0]?.c ?? 0;
      } catch {
        userCount = 0;
      }
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
      .replace(/^MF\.\s*/i, "");
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
    const id = newId();

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
          id,
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
    } catch {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "User" (id, email, password_hash, full_name, role, points, invite_code, referred_by_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
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
    }

    const check = await assertDeviceAndIpAllowed(
      user.id,
      user.role,
      ip,
      deviceId
    );
    if (!check.ok) {
      try {
        await prisma.user.delete({ where: { id: user.id } });
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    await prisma.pointLog
      .create({
        data: {
          userId: user.id,
          amount: POINTS.SIGNUP,
          reason: "signup",
          meta: referredById ? `ref:${referredById}` : null,
        },
      })
      .catch(() => {});

    const invitePts = POINTS.INVITE_REWARD || 5;
    if (referredById) {
      try {
        await prisma.user.update({
          where: { id: referredById },
          data: { points: { increment: invitePts } },
        });
        await prisma.pointLog.create({
          data: {
            userId: referredById,
            amount: invitePts,
            reason: "invite",
            meta: user.id,
          },
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
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
        inviteCode: user.inviteCode,
      },
    });
  } catch (e) {
    console.error("signup", e);
    return NextResponse.json({ error: "Usajili umeshindwa" }, { status: 500 });
  }
}
