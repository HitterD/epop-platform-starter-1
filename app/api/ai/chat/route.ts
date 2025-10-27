import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getSessionFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { messages, conversations } from '@/db/schema';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI assistant for the EPOP (Enterprise Platform for Operational Performance) platform. You help users with:

1. **Communication & Messaging**: Drafting messages, summarizing conversations, extracting key information, suggesting follow-ups.

2. **Project Management**: Creating task descriptions, suggesting project timelines, providing productivity tips, helping with project planning.

3. **Document Management**: Summarizing documents, extracting key points, suggesting file organization strategies.

4. **Team Collaboration**: Facilitating team communication, suggesting meeting agendas, helping with team coordination.

Guidelines:
- Be helpful, professional, and concise
- Focus on practical, actionable advice
- Ask clarifying questions when needed
- Maintain privacy and security - never share sensitive information
- Format responses clearly with markdown when appropriate
- For code or technical questions, provide clear, well-commented examples

You have access to the user's current conversation context when relevant. Use this information to provide more personalized and contextually relevant assistance.`;

async function getConversationContext(conversationId?: string, userId?: string) {
  if (!conversationId || !userId) return null;

  try {
    // Check if user is member of the conversation
    const [conversation] = await db.select({
      id: conversations.id,
      title: conversations.title,
      type: conversations.type
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

    if (!conversation) return null;

    // Get recent messages from the conversation
    const recentMessages = await db.select({
      id: messages.id,
      senderId: messages.senderId,
      bodyPlain: messages.bodyPlain,
      createdAt: messages.createdAt
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(10);

    return {
      conversation,
      recentMessages: recentMessages.reverse() // Chronological order
    };
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages: chatMessages, conversationId } = body;

    if (!chatMessages || !Array.isArray(chatMessages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Get conversation context if provided
    const context = await getConversationContext(conversationId, session.user.id);

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;

    if (context) {
      systemPrompt += `\n\nCurrent Context:\n`;
      systemPrompt += `- Conversation: ${context.conversation.title || context.conversation.type}\n`;
      systemPrompt += `- Recent messages:\n`;

      context.recentMessages.forEach((msg, index) => {
        const senderName = msg.senderId === session.user.id ? 'User' : 'Other';
        const timeAgo = new Date(msg.createdAt).toLocaleString();
        systemPrompt += `  ${index + 1}. ${senderName} (${timeAgo}): ${msg.bodyPlain}\n`;
      });
    }

    // Prepare messages for AI
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...chatMessages
    ];

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create AI response
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: aiMessages,
      temperature: 0.7,
      onFinish: async (result) => {
        // Log AI usage for analytics
        console.log('AI chat completed:', {
          userId: session.user.id,
          conversationId,
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        });
      }
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in AI chat:', error);

    if (error instanceof Error) {
      // Handle specific AI SDK errors
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}