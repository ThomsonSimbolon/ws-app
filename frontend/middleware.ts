import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Use a default secret if env is missing during build, but ideally should be present.
// Note: NEXT_PUBLIC_ variables are for browser, process.env for Node/Edge.
// CRITICAL FIX: Hardcoding secret to ensure Edge Runtime consistency
const SECRET_KEY = new TextEncoder().encode('whatsapp-service-secret-key-2024-development');

export async function middleware(request: NextRequest) {
  // 1. Check for 'token' cookie
  const token = request.cookies.get('token')?.value;
  
  // Debug Logging
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin')) {
      console.log(`[Middleware] Path: ${request.nextUrl.pathname}`);
      console.log(`[Middleware] Token in Cookie: ${token ? 'YES' : 'NO'}`);
      console.log(`[Middleware] Secret Length: ${SECRET_KEY.length}`);
  }

  // 2. Define protected paths
  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/devices');

  // 3. If no token on protected path -> Redirect to Login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    // Optional: Add ?callbackUrl=... 
    return NextResponse.redirect(loginUrl);
  }

  // 4. If token exists, verify it
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      
      // 5. Admin Guard
      if (request.nextUrl.pathname.startsWith('/admin')) {
         if (payload.role !== 'admin') {
            // User trying to access Admin -> Redirect to Dashboard or 403
            return NextResponse.redirect(new URL('/dashboard', request.url));
         }
      }
      
      // Token valid, allow request
      return NextResponse.next();

    } catch (error) {
      // Token invalid/expired
      if (isProtectedPath) {
         return NextResponse.redirect(new URL('/auth/login', request.url));
      }
      // If not protected path (e.g. public home), just continue (maybe just expired session state)
      return NextResponse.next();
    }
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/devices/:path*',
    // Exclude API routes, static files, auth routes
    // '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
};
