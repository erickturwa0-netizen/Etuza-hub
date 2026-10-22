import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { POINTS, generateInviteCode } from "@/lib/points";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  inviteCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email au password si sahihi" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email hii tayari inatumika" }, { status: 409 });
    }

    const userCount = await prisma.user.count();
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const isAdmin =
      userCount === 0 || (adminEmail.length > 0 && email === adminEmail);

    let referredById: string | null = null;
    const rawInvite = (parsed.data.inviteCode || "").trim().toUpperCase();
    if (rawInvite) {
      try {
        const inviter = await prisma.user.findFirst({
          where: { inviteCode: rawInvite },
          select: { id: true },
        });
        if (inviter) referredById = inviter.id;
      } catch {
        /* invite_code column may not exist yet */
      }
    }

    let inviteCode = generateInviteCode();
    try {
      for (let i = 0; i < 5; i++) {
        const clash = await prisma.user.findFirst({ where: { inviteCode } });
        if (!clash) break;
        inviteCode = generateInviteCode();
      }
    } catch {
      /* ignore */
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const fullName = parsed.data.fullName?.trim() || null;
    const role = isAdmin ? "admin" : "user";

    // Try full points schema first; fallback if DB not migrated yet
    let user: {
      id: string;
      email: string;
      fullName: string | null;
      role: string;
      points?: number;
      inviteCode?: string | null;
    };

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
          pointLogs: {
            create: {
              amount: POINTS.SIGNUP,
              reason: "signup_bonus",
              meta: "Point 10 za kuanza",
            },
          },
        },
      });
    } catch (e1) {
      console.error("signup with points failed, fallback", e1);
      try {
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            fullName,
            role,
            points: POINTS.SIGNUP,
            inviteCode,
          },
        });
      } catch (e2) {
        console.error("signup mid fallback failed", e2);
        // Oldest schema: only email/password/name/role
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            fullName,
            role,
          },
        });
      }
    }

    if (referredById) {
      try {
        await prisma.user.update({
          where: { id: referredById },
          data: { points: { increment: POINTS.INVITE_REWARD } },
        });
        await prisma.pointLog.create({
          data: {
            userId: referredById,
            amount: POINTS.INVITE_REWARD,
            reason: "invite_reward",
            meta: `Aliyealikwa: ${email}`,
          },
        });
      } catch (e) {
        console.error("invite reward", e);
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
        points: user.points ?? POINTS.SIGNUP,
        inviteCode: user.inviteCode ?? null,
      },
    });
  } catch (err) {
    console.error("signup error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    // Help debug without leaking secrets
    const hint = msg.includes("column") || msg.includes("does not exist")
      ? "Database haijasasishwa — run prisma db push"
      : "Imeshindikana kuunda account";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
