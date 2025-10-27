import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { projects, projectMembers, users, tasks, divisions } from '@/db/schema';
import { getSessionFromRequest } from '@/lib/auth';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

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

    // Get project details
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project members
    const members = await db.select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

    // Get project tasks
    const tasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      reporterId: tasks.reporterId,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.createdAt));

    // Get division info if applicable
    let division = null;
    if (project.divisionId) {
      const [divisionInfo] = await db.select()
        .from(divisions)
        .where(eq(divisions.id, project.divisionId))
        .limit(1);
      division = divisionInfo;
    }

    // Get creator info
    const [creator] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    })
    .from(users)
    .where(eq(users.id, project.createdBy))
    .limit(1);

    return NextResponse.json({
      project: {
        ...project,
        creator,
        division,
        members,
        tasks,
        userRole: membership[0].role
      }
    });

  } catch (error) {
    console.error('Error fetching project details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // Check if user has permission (owner or maintainer)
    const membership = await db.select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ))
      .limit(1);

    if (!membership.length || !['OWNER', 'MAINTAINER'].includes(membership[0].role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update project
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.startDate !== undefined) updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    updateData.updatedAt = new Date();

    const [updatedProject] = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    // TODO: Emit real-time events via Socket.IO
    // socketService.emitToProject(projectId, 'project:updated', updatedProject);

    return NextResponse.json({ project: updatedProject });

  } catch (error) {
    console.error('Error updating project:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Check if user is the owner
    const membership = await db.select()
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id),
        eq(projectMembers.role, 'OWNER')
      ))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Only project owners can delete projects' }, { status: 403 });
    }

    // Archive project instead of deleting (soft delete)
    const [archivedProject] = await db.update(projects)
      .set({
        status: 'ARCHIVED',
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();

    // TODO: Emit real-time events via Socket.IO
    // socketService.emitToProject(projectId, 'project:archived', archivedProject);

    return NextResponse.json({
      message: 'Project archived successfully',
      project: archivedProject
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}