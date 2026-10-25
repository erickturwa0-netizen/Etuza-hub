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

type Profile = { email: string; name?: string; picture?: string };

/** Verify Google / Firebase ID token via Google tokeninfo (works for GIS credentials). */
async function verifyGoogleIdToken(idToken: string): Promise<Profile | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        email?: string;
        email_verified?: string;
        name?: string;
        picture?: string;
        aud?: string;
      };
      if (data.email && data.email_verified !== "false") {
        return {
          email: data.email.toLowerCase().trim(),
          name: data.name,
          picture: data.picture,
        };
      }
    }
  } catch (e) {
    console.error("tokeninfo", e);
  }

  // Fallback: Firebase Identity Toolkit lookup
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
      users?: { email?: string; displayName?: string; photoUrl?: string }[];
    };
    const u = data.users?.[0];
    if (u?.email) {
      return {
        email: u.email.toLowerCase().trim(),
        name: u.displayName,
        picture: u.photoUrl,
      };
    }
  } catch (e) {
    console.error("firebase lookup", e);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    await ensureUserSchema();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Token si sahihi" }, { status: 400 });
    }

    const profile = await verifyGoogleIdToken(parsed.data.idToken);
    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Google token imeshindikana. Hakikisha Web client ID iko sahihi kwenye Vercel.",
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
      const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
      const inviteCode = generateInviteCode();

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
      } catch {
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
          return NextResponse.json(
            { error: "Imeshindikana kuunda account" },
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
            meta: "Google sign-up",
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
