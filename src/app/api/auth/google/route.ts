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
import { randomBytes } from "crypto";

const schema = z.object({
  idToken: z.string().min(20),
});

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  "AIzaSyCZBWGkbLcMvpstxUfWVeW2TE7z0cn4cZU";

async function verifyFirebaseIdToken(idToken: string): Promise<{
  email: string;
  name?: string;
  picture?: string;
  localId: string;
} | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    const data = (await res.json()) as {
      users?: {
        localId: string;
        email?: string;
        displayName?: string;
        photoUrl?: string;
      }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      console.error("firebase lookup", data?.error?.message || res.status);
      return null;
    }
    const u = data.users?.[0];
    if (!u?.email) return null;
    return {
      email: u.email.toLowerCase().trim(),
      name: u.displayName,
      picture: u.photoUrl,
      localId: u.localId,
    };
  } catch (e) {
    console.error("verifyFirebaseIdToken", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await ensureUserSchema();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Token si sahihi" }, { status: 400 });
    }

    const profile = await verifyFirebaseIdToken(parsed.data.idToken);
    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Google token imeshindikana kuthibitishwa. Jaribu tena au tumia email.",
        },
        { status: 401 }
      );
    }

    const email = profile.email;

    let user = await prisma.user
      .findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          points: true,
          inviteCode: true,
        },
      })
      .catch(() => null);

    if (!user) {
      const randomPass = randomBytes(32).toString("hex");
      const passwordHash = await hashPassword(randomPass);
      let inviteCode = generateInviteCode();

      try {
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            fullName: profile.name || email.split("@")[0],
            role: "user",
            points: POINTS.SIGNUP,
            inviteCode,
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
      } catch (createErr) {
        // Race: user created between find and create
        user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            points: true,
            inviteCode: true,
          },
        });
        if (!user) {
          console.error("google create user", createErr);
          return NextResponse.json(
            {
              error: "Imeshindikana kuunda account",
              detail:
                createErr instanceof Error ? createErr.message : "create failed",
            },
            { status: 500 }
          );
        }
      }

      await prisma.pointLog
        .create({
          data: {
            userId: user.id,
            amount: POINTS.SIGNUP,
            reason: "signup_google",
            meta: "Google sign-up bonus",
          },
        })
        .catch(() => {});
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
  } catch (err) {
    console.error("google auth", err);
    return NextResponse.json(
      {
        error: "Imeshindikana kuingia na Google",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}
