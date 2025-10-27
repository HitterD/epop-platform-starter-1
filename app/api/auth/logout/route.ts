import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken, blacklistToken, revokeAllUserTokens } from '@/lib/auth/jwt-service';
import { createAuthenticatedHandler } from '@/lib/auth/auth-middleware';

export const POST = createAuthenticatedHandler(
  async (request, { user }) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (token) {
        // Blacklist the access token
        blacklistToken(token);
      }

      // Revoke all refresh tokens for this user
      revokeAllUserTokens(user.sub);

      // Create response
      const response = NextResponse.json(
        {
          message: 'Logout successful',
        },
        { status: 200 }
      );

      // Clear refresh token cookie
      response.cookies.set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { required: true }
);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}