import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  hashPassword,
} from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { generateInviteCode, POINTS } from "@/lib/points";
import { randomBytes } from "crypto";

const CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  "611497432345-vddmu6fqjup24qa8retjp4gkv4kv7e4i.apps.googleusercontent.com";

const CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || "";

function siteOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "https://etuza-hub-v2.vercel.app";
}

async function exchangeCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    id_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "token exchange failed");
  }
  return data;
}

async function profileFromTokens(tokens: {
  id_token?: string;
  access_token?: string;
}) {
  if (tokens.id_token) {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`
    );
    if (res.ok) {
      const d = (await res.json()) as {
        email?: string;
        name?: string;
        picture?: string;
      };
      if (d.email) {
        return {
          email: d.email.toLowerCase().trim(),
          name: d.name,
          picture: d.picture,
        };
      }
    }
  }
  if (tokens.access_token) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (res.ok) {
      const d = (await res.json()) as {
        email?: string;
        name?: string;
        picture?: string;
      };
      if (d.email) {
        return {
          email: d.email.toLowerCase().trim(),
          name: d.name,
          picture: d.picture,
        };
      }
    }
  }
  return null;
}

async function loginUser(profile: { email: string; name?: string }) {
  await ensureUserSchema();
  const email = profile.email;

  let user = await prisma.user.findUnique({
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
    const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: profile.name || email.split("@")[0],
        role: "user",
        points: POINTS.SIGNUP,
        inviteCode: generateInviteCode(),
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
    await prisma.pointLog
      .create({
        data: {
          userId: user.id,
          amount: POINTS.SIGNUP,
          reason: "signup_google",
          meta: "Google OAuth",
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
  return user;
}

function redirectHome(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, siteOrigin(req)));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (err) {
    return redirectHome(
      req,
      `/login?error=${encodeURIComponent(err)}`
    );
  }
  if (!code) {
    return redirectHome(req, "/login?error=missing_code");
  }

  try {
    const origin = siteOrigin(req);
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const profile = await profileFromTokens(tokens);
    if (!profile) {
      return redirectHome(req, "/login?error=no_profile");
    }
    const user = await loginUser(profile);
    let next = "/";
    if (state) {
      try {
        next = decodeURIComponent(escape(atob(state)));
      } catch {
        next = "/";
      }
    }
    if (user.role === "admin") next = next.startsWith("/admin") ? next : "/admin";
    else if (next.startsWith("/admin")) next = "/";
    return redirectHome(req, next || "/");
  } catch (e) {
    console.error("google callback", e);
    const msg = e instanceof Error ? e.message : "callback_failed";
    return redirectHome(
      req,
      `/login?error=${encodeURIComponent(msg.slice(0, 120))}`
    );
  }
}
