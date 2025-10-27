'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Badge } from '@/radix-ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/radix-ui/dialog';
import { Download, Eye, Trash2, File, Image as ImageIcon, FileText, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploaderId: string;
  uploaderName?: string;
  filename?: string;
}

interface FileViewerProps {
  files: FileInfo[];
  onDelete?: (fileId: string) => void;
  showDelete?: boolean;
  className?: string;
}

export function FileViewer({ files, onDelete, showDelete = false, className }: FileViewerProps) {
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const isPreviewable = (mimeType: string) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/');
  };

  const handlePreview = async (file: FileInfo) => {
    if (!isPreviewable(file.mimeType)) {
      // For non-previewable files, just download
      handleDownload(file);
      return;
    }

    setLoading(file.id);
    try {
      const response = await fetch(`/api/files/${file.id}/presign-download`);
      if (!response.ok) throw new Error('Failed to get download URL');

      const { data } = await response.json();
      setPreviewUrl(data.downloadUrl);
      setPreviewFile(file);
    } catch (error) {
      console.error('Error getting preview URL:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async (file: FileInfo) => {
    setLoading(file.id);
    try {
      const response = await fetch(`/api/files/${file.id}/presign-download`);
      if (!response.ok) throw new Error('Failed to get download URL');

      const { data } = await response.json();

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (file: FileInfo) => {
    if (!onDelete) return;

    if (!confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      return;
    }

    setLoading(file.id);
    try {
      await onDelete(file.id);
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setLoading(null);
    }
  };

  const renderPreview = () => {
    if (!previewFile || !previewUrl) return null;

    const { mimeType } = previewFile;

    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={previewUrl}
            alt={previewFile.originalName}
            className="max-w-full max-h-[70vh] object-contain rounded"
          />
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <div className="w-full h-[70vh]">
          <iframe
            src={previewUrl}
            className="w-full h-full rounded"
            title={previewFile.originalName}
          />
        </div>
      );
    }

    if (mimeType.startsWith('text/')) {
      return (
        <div className="w-full h-[70vh]">
          <iframe
            src={previewUrl}
            className="w-full h-full rounded font-mono text-sm"
            title={previewFile.originalName}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Preview not available for this file type</p>
          <Button
            onClick={() => handleDownload(previewFile)}
            className="mt-4"
            disabled={loading === previewFile.id}
          >
            Download File
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {files.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No files found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(file.sizeBytes)}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-medium truncate" title={file.originalName}>
                    {file.originalName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(file.createdAt)}
                      </div>
                      {file.uploaderName && (
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {file.uploaderName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(file)}
                        disabled={loading === file.id}
                        className="flex-1"
                      >
                        {isPreviewable(file.mimeType) ? (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </>
                        )}
                      </Button>

                      {showDelete && onDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(file)}
                          disabled={loading === file.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon(previewFile?.mimeType || '')}
              {previewFile?.originalName}
            </DialogTitle>
          </DialogHeader>
          {renderPreview()}
        </DialogContent>
      </Dialog>
    </>
  );
}