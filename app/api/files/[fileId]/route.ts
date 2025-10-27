import { NextRequest, NextResponse } from 'next/server';
import { minioService } from '@/lib/storage/minio-client';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/files/[fileId] - Get file information
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.fileId;

    // Get file information
    const fileInfo = await minioService.getFileInfo(fileId);

    // Check permissions (similar logic as download)
    const hasPermission =
      fileInfo.uploaderId === session.user.id ||
      fileInfo.isPublic ||
      (fileInfo.projectId && await checkProjectMembership(session.user.id, fileInfo.projectId)) ||
      (fileInfo.messageId && await checkConversationMembership(session.user.id, fileId));

    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: fileInfo
    });

  } catch (error) {
    console.error('Error getting file info:', error);

    if (error instanceof Error && error.message === 'File not found') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get file info'
    }, { status: 500 });
  }
}

// DELETE /api/files/[fileId] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.fileId;

    // Delete file
    await minioService.deleteFile(fileId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);

    if (error instanceof Error && error.message === 'File not found') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'Permission denied') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete file'
    }, { status: 500 });
  }
}

// Helper function to check project membership (placeholder)
async function checkProjectMembership(userId: string, projectId: string): Promise<boolean> {
  // In a real implementation, you'd check the project_members table
  return false;
}

// Helper function to check conversation membership (placeholder)
async function checkConversationMembership(userId: string, fileId: string): Promise<boolean> {
  // In a real implementation, you'd check the conversation_members table
  return false;
}