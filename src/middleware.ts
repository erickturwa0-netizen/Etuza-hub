import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/",
  "/movies",
  "/tv",
  "/music",
  "/radio",
  "/drama",
  "/games",
  "/vpn",
  "/watch",
  "/play",
  "/privacy",
  "/terms",
  "/ai",
  "/account",
];

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/google",
  "/api/auth/google-client",
  "/api/auth/google/callback",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/tv/channels",
  "/api/tv/modobo",
  "/api/tv/mfalme",
  "/api/tv/streamfree",
  "/api/content",
  "/api/covers",
  "/api/resolve-downloads",
  "/api/public-feed",
  "/api/radio/stations",
  "/api/proxy/stream",
  "/api/presence",
  "/api/setup/db",
  "/api/setup/movies",
  "/api/cron/sync",
  "/api/points/reward-ad",
  "/api/payments/settings",
  "/api/payments/access",
  "/api/payments/request",
  "/api/ai",
  "/api/vpn/event",
  "/api/vpn/my-config",
];

const COOKIE_NAME = "etuza_session";

function getSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "etuza-hub-dev-secret-change-me";
  return new TextEncoder().encode(secret.slice(0, 64));
}

async function readSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: String(payload.userId || ""),
      email: String(payload.email || ""),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/"))
  );
}

function isPublicApi(pathname: string) {
  return PUBLIC_API.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = await readSession(req);

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) return NextResponse.next();
    // other APIs: allow through (handlers check auth themselves)
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
