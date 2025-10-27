import * as Minio from 'minio';
import { db } from '@/lib/db';
import { attachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface FileUploadOptions {
  bucket?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  fileId: string;
  expiresIn: number;
}

export interface PresignedDownloadResponse {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  expiresIn: number;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  messageId?: string;
  projectId?: string;
}

class MinioService {
  private client: Minio.Client | null = null;
  private defaultBucket = 'epop-files';
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = parseInt(process.env.MINIO_PORT || '9000');
      const useSSL = process.env.MINIO_USE_SSL === 'true';
      const accessKey = process.env.MINIO_ACCESS_KEY;
      const secretKey = process.env.MINIO_SECRET_KEY;

      if (!accessKey || !secretKey) {
        throw new Error('MinIO access key and secret key are required');
      }

      this.client = new Minio.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey
      });

      // Ensure bucket exists
      await this.ensureBucketExists(this.defaultBucket);

      this.isInitialized = true;
      console.log('MinIO client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MinIO client:', error);
      throw error;
    }
  }

  private async ensureBucketExists(bucketName: string): Promise<void> {
    if (!this.client) throw new Error('MinIO client not initialized');

    try {
      const exists = await this.client.bucketExists(bucketName);
      if (!exists) {
        await this.client.makeBucket(bucketName, 'us-east-1');
        console.log(`Created bucket: ${bucketName}`);

        // Set bucket policy for public access if needed
        await this.setBucketPolicy(bucketName);
      }
    } catch (error) {
      console.error(`Error ensuring bucket exists: ${bucketName}`, error);
      throw error;
    }
  }

  private async setBucketPolicy(bucketName: string): Promise<void> {
    if (!this.client) throw new Error('MinIO client not initialized');

    try {
      // Set a read-only policy for public access to objects
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };

      await this.client.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Set bucket policy for: ${bucketName}`);
    } catch (error) {
      console.warn(`Failed to set bucket policy for ${bucketName}:`, error);
      // Don't throw error - bucket can still work without public policy
    }
  }

  private async getMaxFileSize(userId: string): Promise<number> {
    // Default to 10MB, in a real implementation this would check user role/settings
    return 10 * 1024 * 1024; // 10MB
  }

  private validateFileSize(fileSize: number, maxSize: number): void {
    if (fileSize > maxSize) {
      throw new Error(`File size ${fileSize} exceeds maximum allowed size of ${maxSize} bytes`);
    }
  }

  private validateFileType(mimeType: string): void {
    // Basic validation for common file types
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'text/plain', 'text/csv', 'text/markdown',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Other
      'application/json', 'application/xml'
    ];

    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }
  }

  private generateFileKey(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const uuid = randomUUID();
    const extension = originalName.split('.').pop();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `uploads/${userId}/${timestamp}-${uuid}-${sanitizedName}`;
  }

  async generatePresignedUploadUrl(
    metadata: FileMetadata,
    options: FileUploadOptions = {}
  ): Promise<PresignedUploadResponse> {
    await this.initialize();
    if (!this.client) throw new Error('MinIO client not initialized');

    const bucket = options.bucket || this.defaultBucket;
    const maxFileSize = await this.getMaxFileSize(metadata.uploaderId);

    // Validate file metadata
    this.validateFileSize(metadata.sizeBytes, maxFileSize);
    this.validateFileType(metadata.mimeType);

    // Generate unique file key
    const fileKey = this.generateFileKey(metadata.originalName, metadata.uploaderId);
    const fileId = randomUUID();

    try {
      // Create attachment record in database
      await db.insert(attachments).values({
        id: fileId,
        messageId: metadata.messageId || null,
        projectId: metadata.projectId || null,
        uploaderId: metadata.uploaderId,
        filename: fileKey,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
        storageKey: fileKey,
        isPublic: options.isPublic || false
      });

      // Generate presigned URL for upload
      const uploadUrl = await this.client.presignedPutObject(
        bucket,
        fileKey,
        60 * 60 // 1 hour expiry
      );

      return {
        uploadUrl,
        fileKey,
        fileId,
        expiresIn: 60 * 60 // 1 hour
      };

    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  async generatePresignedDownloadUrl(
    fileId: string,
    expiresIn: number = 60 * 60 // 1 hour default
  ): Promise<PresignedDownloadResponse> {
    await this.initialize();
    if (!this.client) throw new Error('MinIO client not initialized');

    try {
      // Get attachment metadata from database
      const [attachment] = await db.select()
        .from(attachments)
        .where(eq(attachments.id, fileId))
        .limit(1);

      if (!attachment) {
        throw new Error('File not found');
      }

      const bucket = this.defaultBucket;
      const downloadUrl = await this.client.presignedGetObject(
        bucket,
        attachment.storageKey,
        expiresIn
      );

      return {
        downloadUrl,
        filename: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        expiresIn
      };

    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    await this.initialize();
    if (!this.client) throw new Error('MinIO client not initialized');

    try {
      // Get attachment metadata from database
      const [attachment] = await db.select()
        .from(attachments)
        .where(eq(attachments.id, fileId))
        .limit(1);

      if (!attachment) {
        throw new Error('File not found');
      }

      // Check if user has permission to delete (either uploader or admin)
      if (attachment.uploaderId !== userId) {
        // In a real implementation, you'd check if user is admin or has project permissions
        throw new Error('Permission denied');
      }

      // Delete from MinIO
      const bucket = this.defaultBucket;
      await this.client.removeObject(bucket, attachment.storageKey);

      // Delete from database
      await db.delete(attachments).where(eq(attachments.id, fileId));

      console.log(`Deleted file: ${attachment.originalName}`);

    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      const [attachment] = await db.select()
        .from(attachments)
        .where(eq(attachments.id, fileId))
        .limit(1);

      if (!attachment) {
        throw new Error('File not found');
      }

      return attachment;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw new Error('Failed to get file info');
    }
  }

  async searchFiles(query: string, userId?: string): Promise<any[]> {
    try {
      let dbQuery = db.select({
        id: attachments.id,
        originalName: attachments.originalName,
        mimeType: attachments.mimeType,
        sizeBytes: attachments.sizeBytes,
        createdAt: attachments.createdAt,
        uploaderId: attachments.uploaderId,
        filename: attachments.filename
      })
      .from(attachments);

      // Add search filter
      if (query) {
        dbQuery = dbQuery.where(
          // In a real implementation, you'd use full-text search
          // For now, we'll use a simple LIKE query
          eq(attachments.originalName, `%${query}%`)
        );
      }

      // Add user filter if provided
      if (userId) {
        dbQuery = dbQuery.where(eq(attachments.uploaderId, userId));
      }

      const files = await dbQuery.limit(50).orderBy(attachments.createdAt);

      return files;
    } catch (error) {
      console.error('Error searching files:', error);
      throw new Error('Failed to search files');
    }
  }

  async getFilesByMessage(messageId: string): Promise<any[]> {
    try {
      const files = await db.select()
        .from(attachments)
        .where(eq(attachments.messageId, messageId))
        .orderBy(attachments.createdAt);

      return files;
    } catch (error) {
      console.error('Error getting files by message:', error);
      throw new Error('Failed to get message files');
    }
  }

  async getFilesByProject(projectId: string): Promise<any[]> {
    try {
      const files = await db.select()
        .from(attachments)
        .where(eq(attachments.projectId, projectId))
        .orderBy(attachments.createdAt);

      return files;
    } catch (error) {
      console.error('Error getting files by project:', error);
      throw new Error('Failed to get project files');
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.client) return false;

      // Try to list buckets to verify connection
      await this.client.listBuckets();
      return true;
    } catch (error) {
      console.error('MinIO health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const minioService = new MinioService();
export default minioService;