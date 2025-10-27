'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/radix-ui/button';
import { Progress } from '@/radix-ui/progress';
import { Card, CardContent } from '@/radix-ui/card';
import { Badge } from '@/radix-ui/badge';
import { Upload, X, File, Image, FileText, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  messageId?: string;
  projectId?: string;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadUrl: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  messageId,
  projectId,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return <FileText className="w-4 h-4" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const fileKey = `${file.name}-${Date.now()}`;

    // Add to uploading files
    setUploadingFiles(prev => new Map(prev).set(fileKey, {
      file,
      progress: 0,
      status: 'uploading'
    }));

    try {
      // Get presigned upload URL
      const response = await fetch('/api/files/presign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          messageId,
          projectId,
          isPublic: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { data } = await response.json();

      // Upload file using the presigned URL
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString()
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Update progress
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const uploadingFile = newMap.get(fileKey);
        if (uploadingFile) {
          uploadingFile.progress = 100;
          uploadingFile.status = 'success';
          uploadingFile.uploadedFile = {
            id: data.fileId,
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            uploadUrl: data.uploadUrl
          };
        }
        return newMap;
      });

      return {
        id: data.fileId,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadUrl: data.uploadUrl
      };

    } catch (error) {
      // Update error status
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const uploadingFile = newMap.get(fileKey);
        if (uploadingFile) {
          uploadingFile.status = 'error';
          uploadingFile.error = error instanceof Error ? error.message : 'Upload failed';
        }
        return newMap;
      });

      throw error;
    }
  }, [messageId, projectId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    // Check if adding these files would exceed the max
    const currentUploading = Array.from(uploadingFiles.values()).filter(
      f => f.status !== 'error'
    ).length;

    if (currentUploading + acceptedFiles.length > maxFiles) {
      onUploadError?.(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of acceptedFiles) {
        const uploadedFile = await uploadFile(file);
        uploadedFiles.push(uploadedFile);
      }

      onUploadComplete?.(uploadedFiles);

      // Clean up successful uploads after a delay
      setTimeout(() => {
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          for (const [key, file] of newMap.entries()) {
            if (file.status === 'success') {
              newMap.delete(key);
            }
          }
          return newMap;
        });
      }, 2000);

    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [disabled, uploadingFiles.size, maxFiles, uploadFile, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/markdown': ['.md'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
      'application/json': ['.json']
    },
    maxSize,
    maxFiles,
    disabled
  });

  const removeUploadingFile = (fileKey: string) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileKey);
      return newMap;
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Drop files here or click to upload'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports images, documents, archives up to {formatFileSize(maxSize)}
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum {maxFiles} files
              </p>
            </div>
            <Button type="button" variant="outline" className="mt-4" disabled={disabled}>
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploading files */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          {Array.from(uploadingFiles.entries()).map(([fileKey, uploadingFile]) => (
            <Card key={fileKey}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadingFile.file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium truncate">
                        {uploadingFile.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(uploadingFile.file.size)}
                        </span>
                        {uploadingFile.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUploadingFile(fileKey)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {uploadingFile.status === 'uploading' && (
                      <Progress value={uploadingFile.progress} className="h-2" />
                    )}

                    {uploadingFile.status === 'success' && (
                      <Badge variant="default" className="text-xs">
                        Uploaded
                      </Badge>
                    )}

                    {uploadingFile.status === 'error' && (
                      <div className="space-y-1">
                        <Badge variant="destructive" className="text-xs">
                          Upload Failed
                        </Badge>
                        {uploadingFile.error && (
                          <p className="text-xs text-destructive">
                            {uploadingFile.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}