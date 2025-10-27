import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/password-service';
import { passwordResetConfirmSchema } from '@/lib/validations/auth';
import { revokeAllUserTokens } from '@/lib/auth/jwt-service';

export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = passwordResetConfirmSchema.safeParse(body);

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

    const { token, password } = validation.data;

    // Validate token format
    if (!token || !token.match(/^[a-f0-9]{64}$/i)) {
      return NextResponse.json(
        { error: 'Invalid reset token format' },
        { status: 400 }
      );
    }

    // Find valid reset token
    const tokenResult = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.isUsed, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (tokenResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const resetToken = tokenResult[0];

    // Get the user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Mark reset token as used
    await db
      .update(passwordResetTokens)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Revoke all existing refresh tokens for this user (force re-login)
    revokeAllUserTokens(user.id);

    // Mark all other unused reset tokens as used (prevent reuse)
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
          // Don't update the token we just marked as used
          // We need a way to exclude the current token
        )
      );

    return NextResponse.json(
      {
        message: 'Password reset successfully. Please log in with your new password.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    // Validate token format
    if (!token.match(/^[a-f0-9]{64}$/i)) {
      return NextResponse.json(
        { error: 'Invalid reset token format' },
        { status: 400 }
      );
    }

    // Check if token is valid
    const tokenResult = await db
      .select({
        id: passwordResetTokens.id,
        expiresAt: passwordResetTokens.expiresAt,
        isUsed: passwordResetTokens.isUsed,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(passwordResetTokens)
      .leftJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.isUsed, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (tokenResult.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired reset token',
        },
        { status: 400 }
      );
    }

    const resetToken = tokenResult[0];

    return NextResponse.json(
      {
        valid: true,
        user: {
          name: resetToken.user?.name,
          email: resetToken.user?.email,
        },
        expiresAt: resetToken.expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset validation error:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}