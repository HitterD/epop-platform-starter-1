import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { messages, conversations, conversationMembers } from '@/db/schema';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/conversations/[id]/messages - Get messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Verify user is member of conversation
    const membership = await db.select()
      .from(conversationMembers)
      .where(and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, session.user.id),
        eq(conversationMembers.hasLeft, false)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    // Build query
    let query = db.select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      bodyRich: messages.bodyRich,
      bodyPlain: messages.bodyPlain,
      isEdited: messages.isEdited,
      editedAt: messages.editedAt,
      replyToId: messages.replyToId,
      createdAt: messages.createdAt
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

    // Add cursor if provided
    if (cursor) {
      query = query.where(and(
        eq(messages.conversationId, conversationId),
        // Note: In a real implementation, you'd need to parse the cursor and use it properly
      ));
    }

    const conversationMessages = await query;

    return NextResponse.json({
      messages: conversationMessages.reverse(), // Reverse to get chronological order
      hasMore: conversationMessages.length === limit
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversations/[id]/messages - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const body = await request.json();
    const { content, replyToId } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify user is member of conversation
    const membership = await db.select()
      .from(conversationMembers)
      .where(and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, session.user.id),
        eq(conversationMembers.hasLeft, false)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Not a member of this conversation' }, { status: 403 });
    }

    // Create message
    const [newMessage] = await db.insert(messages).values({
      conversationId,
      senderId: session.user.id,
      bodyRich: content,
      bodyPlain: typeof content === 'string' ? content : JSON.stringify(content), // Extract plain text for search
      replyToId: replyToId || null
    }).returning();

    // Update conversation's last message time
    await db.update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    // TODO: Emit real-time event via Socket.IO
    // socketService.emitToConversation(conversationId, 'message:new', newMessage);

    return NextResponse.json({ message: newMessage }, { status: 201 });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}