import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public auth pages + static assets
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  // Refresh Supabase session if configured
  const response = await updateSession(request)

  // Demo / local auth cookie or header check
  const hasSupabaseSession =
    request.cookies.getAll().some(
      (c) =>
        c.name.includes('sb-') &&
        (c.name.includes('auth-token') || c.name.includes('access-token'))
    )

  // Demo mode cookie set by login/signup pages
  const hasDemoSession = request.cookies.get('etuza_session')?.value === '1'

  const isLoggedIn = hasSupabaseSession || hasDemoSession

  if (!isPublic && !isLoggedIn) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in → don't show login/signup again
  if (isPublic && isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
    const home = request.nextUrl.clone()
    home.pathname = '/'
    return NextResponse.redirect(home)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
