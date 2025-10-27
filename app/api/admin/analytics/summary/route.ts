import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, gte, lte, count, sum } from 'drizzle-orm';
import { users, messages, conversations, projects, tasks, attachments } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/analytics/summary - Get platform analytics summary
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // User metrics
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [activeUsers] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));
    const [adminUsers] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'ADMIN'));
    const [newUsers] = await db.select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, startDate));

    // Message metrics
    const [totalMessages] = await db.select({ count: count() }).from(messages);
    const [recentMessages] = await db.select({ count: count() })
      .from(messages)
      .where(gte(messages.createdAt, startDate));

    // Conversation metrics
    const [totalConversations] = await db.select({ count: count() }).from(conversations);
    const [newConversations] = await db.select({ count: count() })
      .from(conversations)
      .where(gte(conversations.createdAt, startDate));

    // Project metrics
    const [totalProjects] = await db.select({ count: count() }).from(projects);
    const [activeProjects] = await db.select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'ACTIVE'));
    const [newProjects] = await db.select({ count: count() })
      .from(projects)
      .where(gte(projects.createdAt, startDate));

    // Task metrics
    const [totalTasks] = await db.select({ count: count() }).from(tasks);
    const [completedTasks] = await db.select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, 'DONE'));
    const [newTasks] = await db.select({ count: count() })
      .from(tasks)
      .where(gte(tasks.createdAt, startDate));

    // File storage metrics
    const [totalFiles] = await db.select({ count: count() }).from(attachments);
    const [storageSize] = await db.select({ total: sum(attachments.sizeBytes) })
      .from(attachments);
    const [newFiles] = await db.select({ count: count() })
      .from(attachments)
      .where(gte(attachments.createdAt, startDate));

    // Daily active users (simplified - just users who logged in in the period)
    const [recentlyActiveUsers] = await db.select({ count: count() })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        gte(users.lastLoginAt, startDate)
      ));

    // Growth metrics (new vs returning users)
    const returningUsers = recentlyActiveUsers.count - newUsers.count;

    const analytics = {
      period: `${daysAgo} days`,
      users: {
        total: Number(totalUsers.count) || 0,
        active: Number(activeUsers.count) || 0,
        admins: Number(adminUsers.count) || 0,
        new: Number(newUsers.count) || 0,
        recentlyActive: Number(recentlyActiveUsers.count) || 0,
        returning: Math.max(0, returningUsers)
      },
      messages: {
        total: Number(totalMessages.count) || 0,
        recent: Number(recentMessages.count) || 0,
        averagePerDay: Math.round((Number(recentMessages.count) || 0) / daysAgo)
      },
      conversations: {
        total: Number(totalConversations.count) || 0,
        new: Number(newConversations.count) || 0,
        averagePerDay: Math.round((Number(newConversations.count) || 0) / daysAgo)
      },
      projects: {
        total: Number(totalProjects.count) || 0,
        active: Number(activeProjects.count) || 0,
        new: Number(newProjects.count) || 0
      },
      tasks: {
        total: Number(totalTasks.count) || 0,
        completed: Number(completedTasks.count) || 0,
        new: Number(newTasks.count) || 0,
        completionRate: totalTasks.count > 0
          ? Math.round((Number(completedTasks.count) / Number(totalTasks.count)) * 100)
          : 0
      },
      storage: {
        totalFiles: Number(totalFiles.count) || 0,
        newFiles: Number(newFiles.count) || 0,
        totalSizeBytes: Number(storageSize.total) || 0,
        totalSizeMB: Math.round((Number(storageSize.total) || 0) / (1024 * 1024))
      },
      engagement: {
        averageMessagesPerUser: totalUsers.count > 0
          ? Math.round((Number(totalMessages.count) || 0) / Number(totalUsers.count))
          : 0,
        averageProjectsPerUser: activeUsers.count > 0
          ? Math.round((Number(totalProjects.count) || 0) / Number(activeUsers.count))
          : 0
      }
    };

    return NextResponse.json({ analytics });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}