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

async function isValidSession(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isPublicApi = PUBLIC_API.some((p) => pathname === p);
  const isApiAuth = pathname.startsWith("/api/auth/");

  if (isPublicApi || pathname === "/api/auth/logout" || pathname === "/api/auth/me") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const loggedIn = await isValidSession(token);

  if (!isPublicPage && !isApiAuth && !loggedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPage && loggedIn) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
