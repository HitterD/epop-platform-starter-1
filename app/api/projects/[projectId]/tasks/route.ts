import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { tasks, users, projectMembers } from '@/db/schema';
import { getSessionFromRequest } from '@/lib/auth';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).max(1000).optional()
});

// GET /api/projects/[projectId]/tasks - Get project tasks
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.projectId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is member of the project
    const membership = await db.select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }

    // Build query
    let query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assigneeId: tasks.assigneeId,
        reporterId: tasks.reporterId,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    // Add filters
    if (status && status !== 'all') {
      query = query.where(and(
        eq(tasks.projectId, projectId),
        eq(tasks.status, status)
      ));
    }

    if (assignee && assignee !== 'all') {
      query = query.where(and(
        eq(tasks.projectId, projectId),
        eq(tasks.assigneeId, assignee)
      ));
    }

    if (priority && priority !== 'all') {
      query = query.where(and(
        eq(tasks.projectId, projectId),
        eq(tasks.priority, priority)
      ));
    }

    if (search) {
      query = query.where(and(
        eq(tasks.projectId, projectId),
        ilike(tasks.title, `%${search}%`)
      ));
    }

    const projectTasks = await query;

    // Get assignee and reporter details
    const tasksWithDetails = await Promise.all(
      projectTasks.map(async (task) => {
        const [assignee] = task.assigneeId ? await db.select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, task.assigneeId))
        .limit(1) : [null];

        const [reporter] = await db.select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, task.reporterId))
        .limit(1);

        return {
          ...task,
          assignee,
          reporter
        };
      })
    );

    return NextResponse.json({
      tasks: tasksWithDetails,
      hasMore: projectTasks.length === limit
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[projectId]/tasks - Create a new task
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.projectId;
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    const { title, description, assigneeId, priority, dueDate, estimatedHours } = validatedData;

    // Check if user is member of the project
    const membership = await db.select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }

    // If assigneeId is provided, check if they are a member of the project
    if (assigneeId) {
      const [assigneeMembership] = await db.select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, assigneeId)
        ))
        .limit(1);

      if (!assigneeMembership) {
        return NextResponse.json({ error: 'Assignee is not a member of this project' }, { status: 400 });
      }
    }

    // Create task
    const [newTask] = await db.insert(tasks).values({
      projectId,
      title,
      description,
      assigneeId: assigneeId || null,
      reporterId: session.user.id,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours || null,
      status: 'TODO'
    }).returning();

    // TODO: Emit real-time events via Socket.IO
    // socketService.emitToProject(projectId, 'task:new', newTask);
    // if (assigneeId) {
    //   socketService.emitToUser(assigneeId, 'task:assigned', newTask);
    // }

    return NextResponse.json({ task: newTask }, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}