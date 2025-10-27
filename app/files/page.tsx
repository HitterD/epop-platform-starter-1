'use client';

import React, { useState, useEffect } from 'react';
import { FileUpload } from '@/components/file/file-upload';
import { FileViewer } from '@/components/file/file-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Input } from '@/radix-ui/input';
import { Badge } from '@/radix-ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/radix-ui/tabs';
import { Search, Upload, FolderOpen, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploaderId: string;
  filename?: string;
}

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Mock data for demonstration
  const mockFiles: FileInfo[] = [
    {
      id: '1',
      originalName: 'project-proposal.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 1024 * 2.5, // 2.5MB
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      uploaderId: user?.id || '1',
      filename: 'project-proposal.pdf'
    },
    {
      id: '2',
      originalName: 'design-mockup.png',
      mimeType: 'image/png',
      sizeBytes: 1024 * 512, // 512KB
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      uploaderId: user?.id || '1',
      filename: 'design-mockup.png'
    },
    {
      id: '3',
      originalName: 'meeting-notes.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 1024 * 128, // 128KB
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      uploaderId: user?.id || '1',
      filename: 'meeting-notes.docx'
    }
  ];

  useEffect(() => {
    // Simulate loading files
    setTimeout(() => {
      setFiles(mockFiles);
      setLoading(false);
    }, 1000);
  }, [user]);

  const handleUploadComplete = (uploadedFiles: any[]) => {
    // Add new files to the list
    const newFiles: FileInfo[] = uploadedFiles.map(file => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: new Date().toISOString(),
      uploaderId: user?.id || '1',
      filename: file.originalName
    }));

    setFiles(prev => [newFiles[0], ...prev]);
    toast.success('Files uploaded successfully');
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'images') {
      return matchesSearch && file.mimeType.startsWith('image/');
    }
    if (activeTab === 'documents') {
      return matchesSearch && (
        file.mimeType.includes('document') ||
        file.mimeType === 'application/pdf' ||
        file.mimeType.startsWith('text/')
      );
    }

    return matchesSearch;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to access the file manager.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">File Manager</h1>
        <p className="text-muted-foreground">
          Upload, manage, and share your files securely
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={5}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </CardContent>
          </Card>

          {/* Files Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  My Files
                </CardTitle>
                <Badge variant="secondary">
                  {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
                </Badge>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All Files</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <FileViewer
                    files={filteredFiles}
                    onDelete={handleDeleteFile}
                    showDelete={true}
                  />
                </TabsContent>

                <TabsContent value="images" className="mt-4">
                  <FileViewer
                    files={filteredFiles}
                    onDelete={handleDeleteFile}
                    showDelete={true}
                  />
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <FileViewer
                    files={filteredFiles}
                    onDelete={handleDeleteFile}
                    showDelete={true}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Storage Info */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Used</span>
                    <span>
                      {files.reduce((total, file) => total + file.sizeBytes, 0) / (1024 * 1024)} MB
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${Math.min((files.reduce((total, file) => total + file.sizeBytes, 0) / (1024 * 1024 * 100)) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    100 MB available
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Images</span>
                    <span>
                      {files.filter(f => f.mimeType.startsWith('image/')).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Documents</span>
                    <span>
                      {files.filter(f => f.mimeType.includes('document') || f.mimeType === 'application/pdf').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Other</span>
                    <span>
                      {files.filter(f => !f.mimeType.startsWith('image/') && !f.mimeType.includes('document') && f.mimeType !== 'application/pdf').length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Create Document
              </Button>
              <Button variant="outline" className="w-full">
                <FolderOpen className="w-4 h-4 mr-2" />
                Browse Shared Files
              </Button>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {files.slice(0, 3).map((file) => (
                  <div key={file.id} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{file.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {files.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}