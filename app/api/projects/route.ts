import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc, ilike, isNull, or } from 'drizzle-orm';
import { projects, projectMembers, users, tasks } from '@/db/schema';
import { getSessionFromRequest } from '@/lib/auth';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  divisionId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// GET /api/projects - Get user's projects
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build base query for projects where user is a member
    let query = db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        createdBy: projects.createdBy,
        divisionId: projects.divisionId,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberCount: db.count().as('member_count'),
        taskCount: db.count().as('task_count'),
        completedTaskCount: db.count().as('completed_task_count')
      })
      .from(projects)
      .innerJoin(
        projectMembers,
        eq(projects.id, projectMembers.projectId)
      )
      .where(and(
        eq(projectMembers.userId, session.user.id)
      ))
      .orderBy(desc(projects.updatedAt))
      .limit(limit)
      .offset(offset);

    // Add search filter
    if (search) {
      query = query.where(and(
        eq(projectMembers.userId, session.user.id),
        ilike(projects.name, `%${search}%`)
      ));
    }

    // Add status filter
    if (status && status !== 'all') {
      query = query.where(and(
        eq(projectMembers.userId, session.user.id),
        eq(projects.status, status)
      ));
    }

    // Exclude archived projects unless explicitly requested
    if (!includeArchived) {
      query = query.where(and(
        eq(projectMembers.userId, session.user.id),
        isNull(projects.divisionId).or(eq(projects.status, 'ACTIVE'))
      ));
    }

    const userProjects = await query;

    // Get additional details for each project
    const projectsWithDetails = await Promise.all(
      userProjects.map(async (project) => {
        // Get creator info
        const [creator] = await db.select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, project.createdBy))
        .limit(1);

        // Get user's role in this project
        const [membership] = await db.select({
          role: projectMembers.role
        })
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, project.id),
          eq(projectMembers.userId, session.user.id)
        ))
        .limit(1);

        return {
          ...project,
          creator: creator,
          userRole: membership?.role || 'MEMBER'
        };
      })
    );

    return NextResponse.json({
      projects: projectsWithDetails,
      hasMore: userProjects.length === limit
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    const { name, description, divisionId, memberIds = [], startDate, endDate } = validatedData;

    // Create project
    const [newProject] = await db.insert(projects).values({
      name,
      description,
      createdBy: session.user.id,
      divisionId: divisionId || null,
      status: 'ACTIVE',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    }).returning();

    // Add creator as owner
    const allMemberIds = [session.user.id, ...memberIds];
    await db.insert(projectMembers).values([
      {
        projectId: newProject.id,
        userId: session.user.id,
        role: 'OWNER'
      },
      ...memberIds.map(userId => ({
        projectId: newProject.id,
        userId,
        role: 'CONTRIBUTOR'
      }))
    ]);

    // TODO: Emit real-time events via Socket.IO
    // socketService.emitToUsers(allMemberIds, 'project:new', newProject);

    return NextResponse.json({ project: newProject }, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}