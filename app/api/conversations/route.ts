import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { conversations, conversationMembers, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createConversationSchema = z.object({
  type: z.enum(['DM', 'GROUP', 'PROJECT']),
  title: z.string().min(1).optional(),
  memberIds: z.array(z.string()).min(1),
  projectId: z.string().optional()
});

// GET /api/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = db
      .select({
        id: conversations.id,
        type: conversations.type,
        title: conversations.title,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        memberCount: db.count().as('member_count')
      })
      .from(conversations)
      .innerJoin(
        conversationMembers,
        eq(conversations.id, conversationMembers.conversationId)
      )
      .where(and(
        eq(conversationMembers.userId, session.user.id),
        eq(conversationMembers.hasLeft, false)
      ))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    // Add search filter
    if (search) {
      query = query.where(and(
        eq(conversationMembers.userId, session.user.id),
        eq(conversationMembers.hasLeft, false),
        ilike(conversations.title, `%${search}%`)
      ));
    }

    const userConversations = await query;

    return NextResponse.json({
      conversations: userConversations,
      hasMore: userConversations.length === limit
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createConversationSchema.parse(body);

    const { type, title, memberIds, projectId } = validatedData;

    // Ensure current user is included in members
    const allMemberIds = Array.from(new Set([session.user.id, ...memberIds]));

    // For DM conversations, check if one already exists
    if (type === 'DM' && allMemberIds.length === 2) {
      const existingDM = await db
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(
          conversationMembers,
          eq(conversations.id, conversationMembers.conversationId)
        )
        .where(and(
          eq(conversations.type, 'DM'),
          eq(conversationMembers.userId, allMemberIds[0])
        ))
        .groupBy(conversations.id)
        .having(db.count().eq(2)); // DM should have exactly 2 members

      if (existingDM.length > 0) {
        return NextResponse.json({
          conversation: existingDM[0],
          message: 'DM conversation already exists'
        }, { status: 200 });
      }
    }

    // Create conversation
    const [newConversation] = await db.insert(conversations).values({
      type,
      title: type === 'DM' ? null : title,
      createdBy: session.user.id,
      projectId: projectId || null
    }).returning();

    // Add members to conversation
    await db.insert(conversationMembers).values(
      allMemberIds.map(userId => ({
        conversationId: newConversation.id,
        userId,
        joinedAt: new Date()
      }))
    );

    // TODO: Emit real-time events via Socket.IO
    // socketService.emitToUsers(allMemberIds, 'conversation:new', newConversation);

    return NextResponse.json({ conversation: newConversation }, { status: 201 });

  } catch (error) {
    console.error('Error creating conversation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}