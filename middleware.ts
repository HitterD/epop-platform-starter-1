import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/api/admin')) {

    const session = await auth();

    if (!session?.user?.id) {
      // Redirect to login for admin pages
      if (request.nextUrl.pathname.startsWith('/admin')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    // In a real implementation, you'd check this from the database
    // For now, we'll use a simple check based on email
    const isAdmin = session.user.email?.includes('admin') ||
                   session.user.role === 'ADMIN';

    if (!isAdmin) {
      // Redirect non-admin users
      if (request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Return 403 for API routes
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ]
};