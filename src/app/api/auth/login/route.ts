import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email au password si sahihi" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Select only core fields first (works even mid-migration)
    let user: {
      id: string;
      email: string;
      passwordHash: string;
      fullName: string | null;
      role: string;
      points?: number;
      inviteCode?: string | null;
    } | null = null;

    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          fullName: true,
          role: true,
          points: true,
          inviteCode: true,
        },
      });
    } catch {
      // Columns missing — raw query fallback
      const rows = await prisma.$queryRawUnsafe<
        {
          id: string;
          email: string;
          password_hash: string;
          full_name: string | null;
          role: string;
        }[]
      >(
        `SELECT id, email, password_hash, full_name, role FROM "User" WHERE email = $1 LIMIT 1`,
        email
      );
      if (rows[0]) {
        user = {
          id: rows[0].id,
          email: rows[0].email,
          passwordHash: rows[0].password_hash,
          fullName: rows[0].full_name,
          role: rows[0].role,
          points: 10,
          inviteCode: null,
        };
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Email au password si sahihi" }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Email au password si sahihi" }, { status: 401 });
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
        points: user.points ?? 10,
        inviteCode: user.inviteCode ?? null,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json(
      {
        error: "Imeshindikana kuingia",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}
