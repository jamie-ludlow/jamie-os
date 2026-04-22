import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — currently a pass-through.
 *
 * We keep the file in place so we can reintroduce route gating later if needed,
 * but for now there is no extra auth layer in front of the app routes.
 */
export function middleware(request: NextRequest) {
  // No additional auth gate is required right now.
  // Keep the middleware in place only so we can reintroduce protection later if needed.
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/tasks/:path*'],
};
