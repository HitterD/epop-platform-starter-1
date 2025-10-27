import { NextRequest, NextResponse } from 'next/server';
import { minioService } from '@/lib/storage/minio-client';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/files/[fileId]/presign-download - Generate presigned download URL
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
    const { searchParams } = new URL(request.url);
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600'); // Default 1 hour

    // Get file info first to check permissions
    const fileInfo = await minioService.getFileInfo(fileId);

    // Check if user has permission to access this file
    // In a real implementation, you'd check if:
    // - User is the file uploader
    // - User is a member of the project (if projectId exists)
    // - User is a member of the conversation (if messageId exists)
    // - File is public
    const hasPermission =
      fileInfo.uploaderId === session.user.id ||
      fileInfo.isPublic ||
      (fileInfo.projectId && await checkProjectMembership(session.user.id, fileInfo.projectId)) ||
      (fileInfo.messageId && await checkConversationMembership(session.user.id, fileId));

    if (!hasPermission) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Generate presigned download URL
    const presignedResponse = await minioService.generatePresignedDownloadUrl(fileId, expiresIn);

    return NextResponse.json({
      success: true,
      data: presignedResponse
    });

  } catch (error) {
    console.error('Error generating presigned download URL:', error);

    if (error instanceof Error && error.message === 'File not found') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate download URL'
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
  // by joining through the attachments table
  return false;
}