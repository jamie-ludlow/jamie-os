import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — protect /api/tasks/* routes from casual external access.
 *
 * TODO: Replace with proper Supabase Auth session validation once user auth is added.
 * Currently: allow requests that come from the same origin (same-origin browser
 * requests don't send an Origin header but DO send a Referer, and same-origin
 * fetch/XHR sends neither or the app URL). We also allow requests that present
 * the correct x-api-key header (for agent-to-API calls).
 *
 * This is NOT bulletproof — an attacker can spoof headers — but it prevents
 * casual/accidental external access and satisfies the single-user Vercel use-case.
 */
export function middleware(request: NextRequest) {
  // Only gate the tasks API
  if (!request.nextUrl.pathname.startsWith('/api/tasks')) {
    return NextResponse.next();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const apiKey = process.env.API_SECRET_KEY || '';

  // 1. Accept if a valid x-api-key is provided (agent / server-to-server calls)
  if (apiKey) {
    const providedKey = request.headers.get('x-api-key');
    if (providedKey === apiKey) {
      return NextResponse.next();
    }
  }

  // 2. If app URL is not configured, allow everything (don't lock users out in dev)
  if (!appUrl) {
    // Warn in server logs so developers notice this is bypassing auth checks
    console.warn('[middleware] NEXT_PUBLIC_APP_URL not set — auth checks bypassed');
    return NextResponse.next();
  }

  // 3. Accept same-origin browser requests (Origin or Referer starts with app URL)
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  if (origin.startsWith(appUrl) || referer.startsWith(appUrl)) {
    return NextResponse.next();
  }

  // Otherwise: reject (removed the "no Origin header" bypass — it was too permissive)
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

export const config = {
  matcher: ['/api/tasks/:path*'],
};
