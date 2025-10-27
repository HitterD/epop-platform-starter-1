import { NextRequest, NextResponse } from 'next/server';
import { minioService } from '@/lib/storage/minio-client';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/files/search - Search files
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Search files
    const files = await minioService.searchFiles(query, session.user.id);

    // Apply pagination
    const paginatedFiles = files.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        files: paginatedFiles,
        total: files.length,
        hasMore: offset + limit < files.length
      }
    });

  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to search files'
    }, { status: 500 });
  }
}