import { NextRequest, NextResponse } from 'next/server';
import { minioService } from '@/lib/storage/minio-client';
import { getSessionFromRequest } from '@/lib/auth';
import { z } from 'zod';

const presignUploadSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().min(0).max(100 * 1024 * 1024), // Max 100MB
  messageId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  isPublic: z.boolean().default(false)
});

// POST /api/files/presign-upload - Generate presigned upload URL
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = presignUploadSchema.parse(body);

    const { originalName, mimeType, sizeBytes, messageId, projectId, isPublic } = validatedData;

    // Generate presigned upload URL
    const presignedResponse = await minioService.generatePresignedUploadUrl(
      {
        originalName,
        mimeType,
        sizeBytes,
        uploaderId: session.user.id,
        messageId,
        projectId
      },
      { isPublic }
    );

    return NextResponse.json({
      success: true,
      data: presignedResponse
    });

  } catch (error) {
    console.error('Error generating presigned upload URL:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid input',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate upload URL'
    }, { status: 500 });
  }
}