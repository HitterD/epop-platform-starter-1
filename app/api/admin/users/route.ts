import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, ilike, isNull } from 'drizzle-orm';
import { users, fcmTokens, divisions, divisionMembers, auditLogs } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';
import { hash } from 'argon2';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(100),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  divisionIds: z.array(z.string().uuid()).optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  isActive: z.boolean().optional(),
  divisionIds: z.array(z.string().uuid()).optional()
});


// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Add filters
    const conditions = [];
    if (search) {
      conditions.push(ilike(users.name, `%${search}%`));
      conditions.push(ilike(users.email, `%${search}%`));
    }
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role));
    }
    if (isActive !== undefined && isActive !== 'all') {
      conditions.push(eq(users.isActive, isActive === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allUsers = await query;

    // Get additional user stats
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        // Get FCM tokens count
        const fcmTokens = await db.select()
          .from(fcmTokens)
          .where(eq(fcmTokens.userId, user.id));

        // Get divisions
        const userDivisions = await db.select({
          id: divisions.id,
          name: divisions.name
        })
        .from(divisions)
        .innerJoin(divisionMembers, eq(divisions.id, divisionMembers.divisionId))
        .where(eq(divisionMembers.userId, user.id));

        return {
          ...user,
          fcmTokensCount: fcmTokens.length,
          divisions: userDivisions
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      hasMore: allUsers.length === limit
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const { email, name, password, role, divisionIds = [] } = validatedData;

    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hash(password);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role,
      isActive: true
    }).returning();

    // Add to divisions if specified
    if (divisionIds.length > 0) {
      await db.insert(divisionMembers).values(
        divisionIds.map(divisionId => ({
          userId: newUser.id,
          divisionId,
          roleInDivision: 'MEMBER'
        }))
      );
    }

    // Log admin action
    await db.insert(auditLogs).values({
      actorId: session.user.id,
      action: 'user.created',
      target: `user:${newUser.id}`,
      metadata: {
        email,
        name,
        role
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({ user: newUser }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}