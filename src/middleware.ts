import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/signup"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/signup"];
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isPublicApi = PUBLIC_API.some((p) => pathname === p);

  if (isPublicApi || pathname === "/api/auth/logout" || pathname === "/api/auth/me") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await getSession(token);
  const loggedIn = !!session;

  // Must login for all non-public pages
  if (!isPublicPage && !pathname.startsWith("/api/auth/") && !loggedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes – admin role only
  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    return NextResponse.redirect(home);
  }

  // Already logged in on login/signup → role-based redirect
  if (isPublicPage && loggedIn) {
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
