import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens as refreshTokensService } from '@/lib/auth/jwt-service';

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 });
    }

    // Get refresh token from cookie or request body
    let refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      // Try to get from request body
      try {
        const body = await request.json();
        refreshToken = body.refreshToken;
      } catch {
        // Invalid JSON or no body
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401 }
      );
    }

    // Refresh tokens
    const newTokens = await refreshTokensService(refreshToken);

    if (!newTokens) {
      // Invalid or expired refresh token
      const response = NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );

      // Clear the invalid refresh token cookie
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      return response;
    }

    // Create response
    const response = NextResponse.json(
      {
        message: 'Tokens refreshed successfully',
        tokens: {
          accessToken: newTokens.accessToken,
          accessTokenExpiry: newTokens.accessTokenExpiry,
          refreshTokenExpiry: newTokens.refreshTokenExpiry,
        },
      },
      { status: 200 }
    );

    // Set new refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    };

    response.cookies.set('refresh_token', newTokens.refreshToken, cookieOptions);

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}