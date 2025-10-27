import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, checkRateLimit, resetRateLimit } from '@/lib/auth/password-service';
import { generateTokenPair, blacklistToken } from '@/lib/auth/jwt-service';
import { loginSchema, LoginInput } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, password }: LoginInput = validation.data;

    // Get client IP for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limiting
    const rateLimitResult = checkRateLimit(email, ipAddress);
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
          lockedUntil: rateLimitResult.lockedUntil,
        },
        { status: 429 }
      );

      if (rateLimitResult.retryAfter) {
        response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
      }

      return response;
    }

    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult[0];

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login time
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Reset rate limit on successful login
    resetRateLimit(email, ipAddress);

    // Return response with user data
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: new Date(),
        },
        tokens: {
          accessToken: tokens.accessToken,
          accessTokenExpiry: tokens.accessTokenExpiry,
          refreshTokenExpiry: tokens.refreshTokenExpiry,
        },
      },
      { status: 200 }
    );

    // Set refresh token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    };

    response.cookies.set('refresh_token', tokens.refreshToken, cookieOptions);

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.attemptsRemaining.toString());

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Login error:', error);
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