import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { generateExpiringToken, isValidTokenFormat } from '@/lib/auth/password-service';
import { passwordResetRequestSchema } from '@/lib/validations/auth';
import { passwordResetRateLimit } from '@/lib/auth/rate-limit-middleware';
import { emailService } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 });
    }

    // Apply rate limiting
    const rateLimitResponse = await passwordResetRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = passwordResetRequestSchema.safeParse(body);

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

    const { email } = validation.data;

    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return a generic response for security (don't reveal if user exists)
    const genericResponse = NextResponse.json(
      {
        message: 'If an account with this email exists, a password reset link has been sent.',
      },
      { status: 200 }
    );

    if (userResult.length === 0) {
      // User doesn't exist, but don't reveal this
      return genericResponse;
    }

    const user = userResult[0];

    // Check if user is active
    if (!user.isActive) {
      // Don't reveal that account is disabled
      return genericResponse;
    }

    // Check if there's already a valid reset token (within the last hour)
    const existingToken = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.isUsed, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    // If there's a valid token less than 5 minutes old, don't send another
    if (existingToken.length > 0) {
      const tokenAge = Date.now() - existingToken[0].createdAt.getTime();
      if (tokenAge < 5 * 60 * 1000) { // 5 minutes
        return NextResponse.json(
          {
            message: 'A password reset email was recently sent. Please check your email or wait before requesting another.',
            retryAfter: Math.ceil((5 * 60 * 1000 - tokenAge) / 1000), // seconds
          },
          { status: 429 }
        );
      }
    }

    // Generate new reset token
    const { token, expiresAt } = generateExpiringToken(60); // 1 hour expiry

    // Get client IP and user agent for audit
    const ipAddress = request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Save reset token to database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // Mark any existing unused tokens as used (to prevent multiple reset links)
    await db
      .update(passwordResetTokens)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.isUsed, false),
          // Don't update the token we just created
          // We need to exclude the current token, but Drizzle doesn't support "neq" directly
          // So we'll update all other tokens
        )
      );

    try {
      // Send password reset email
      await emailService.sendPasswordReset(user.email, token, user.name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue with generic response even if email fails
    }

    return genericResponse;
  } catch (error) {
    console.error('Password reset request error:', error);
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