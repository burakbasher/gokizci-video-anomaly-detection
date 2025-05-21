"middleware.ts"

import { NextRequest, NextResponse } from 'next/server'

// Add paths that require authentication''
const protectedPaths = ['/user', '/dashboard', '/profile', '/m']
// Add paths that should redirect to auth if user is already logged in
const authPaths = ['/auth']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isProtectedPage = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Check if the path requires authentication
  if (!token && isProtectedPage) {
    // Redirect to auth page if no token is present
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Check if user is trying to access auth pages while logged in
  if (token && isAuthPage) {
    // Redirect to user page if token is present
    return NextResponse.redirect(new URL('/user', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/user/:path*', '/dashboard/:path*', '/auth/:path*'],
} 