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
];

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/signup",
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
];

const COOKIE_NAME = "etuza_session";

function getSecret() {
  const secret =
    process.env.AUTH_SECRET || process.env.DATABASE_URL || "etuza-hub-dev-secret-change-me";
  return new TextEncoder().encode(secret.slice(0, 64));
}

type Session = { userId: string; email: string; role: string };

async function getSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.userId || !payload.email) return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await getSession(token);
  const loggedIn = !!session;

  if (!loggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    return NextResponse.redirect(home);
  }

  if ((pathname === "/login" || pathname === "/signup") && loggedIn) {
    const dest = request.nextUrl.clone();
    dest.pathname = session?.role === "admin" ? "/admin" : "/";
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
