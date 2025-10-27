import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, analyzePasswordStrength, resetRateLimit } from '@/lib/auth/password-service';
import { generateTokenPair } from '@/lib/auth/jwt-service';
import { registerSchema, RegisterInput } from '@/lib/validations/auth';
import { registrationRateLimit } from '@/lib/auth/rate-limit-middleware';

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 });
    }

    // Apply rate limiting
    const rateLimitResponse = await registrationRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, password, name, role = 'USER' }: RegisterInput = validation.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Analyze password strength (optional feedback)
    const passwordStrength = analyzePasswordStrength(password);
    if (!passwordStrength.isValid) {
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          feedback: passwordStrength.feedback,
          suggestions: passwordStrength.suggestions,
        },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name: name.trim(),
        role,
        isActive: true,
      })
      .returning();

    if (newUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const user = newUser[0];

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Reset rate limit for this email
    resetRateLimit(email);

    // Return response with user data (excluding password hash)
    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken: tokens.accessToken,
          accessTokenExpiry: tokens.accessTokenExpiry,
          refreshTokenExpiry: tokens.refreshTokenExpiry,
        },
        passwordStrength: {
          score: passwordStrength.score,
          feedback: passwordStrength.feedback,
        },
      },
      { status: 201 }
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

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('Registration error:', error);
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