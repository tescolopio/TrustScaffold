import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase-middleware';

const publicRoutes = new Set(['/login', '/signup']);
const protectedPrefixes = ['/dashboard', '/wizard', '/generated-docs', '/team', '/settings'];
const publicPrefixes = ['/auditor/', '/api/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const isPublicRoute = publicRoutes.has(pathname) || pathname.startsWith('/auth/callback') || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  if (isPublicRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
