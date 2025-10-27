'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Badge } from '@/radix-ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/radix-ui/tabs';
import {
  Users,
  Settings,
  Shield,
  BarChart3,
  FolderOpen,
  FileText,
  Database,
  Bell,
  Download,
  Upload,
  Eye
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalMessages: number;
  storageUsed: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock system stats
  const mockStats: SystemStats = {
    totalUsers: 150,
    activeUsers: 120,
    totalProjects: 25,
    totalMessages: 5000,
    storageUsed: 2.5 * 1024 * 1024 * 1024, // 2.5GB
    systemHealth: 'healthy'
  };

  useEffect(() => {
    // Simulate loading system stats
    setTimeout(() => {
      setSystemStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const handleExportUsers = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('User data exported successfully');
    } catch (error) {
      toast.error('Failed to export user data');
    }
  };

  const handleBackupSystem = async () => {
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('System backup completed successfully');
    } catch (error) {
      toast.error('Failed to backup system');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is admin (in real app, this would be checked server-side)
  const isAdmin = user.email?.includes('admin') || user.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, monitor system health, and oversee platform operations
        </p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{systemStats?.totalUsers}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStats?.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Projects</p>
                <p className="text-2xl font-bold">{systemStats?.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Messages</p>
                <p className="text-2xl font-bold">{systemStats?.totalMessages.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Storage</p>
                <p className="text-2xl font-bold">{formatBytes(systemStats?.storageUsed || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={getHealthColor(systemStats?.systemHealth || 'warning')}>
                {systemStats?.systemHealth?.charAt(0).toUpperCase() + systemStats?.systemHealth?.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                All systems operating normally
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Logs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Functions */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderOpen className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="system">
            <Database className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportUsers}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Users
                </Button>
                <Button size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">User Management</h3>
                <p className="text-muted-foreground mb-4">
                  Manage user accounts, roles, and permissions
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    View All Users
                  </Button>
                  <Button variant="outline" className="w-full">
                    Bulk Import Users
                  </Button>
                  <Button variant="outline" className="w-full">
                    Manage User Roles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Oversight</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Project Management</h3>
                <p className="text-muted-foreground mb-4">
                  Monitor and manage all platform projects
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    View All Projects
                  </Button>
                  <Button variant="outline" className="w-full">
                    Project Analytics
                  </Button>
                  <Button variant="outline" className="w-full">
                    Manage Project Categories
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Platform Configuration</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      General Settings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="w-4 h-4 mr-2" />
                      Notification Settings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="w-4 h-4 mr-2" />
                      Storage Limits
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Security</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Security Policies
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Access Control
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Maintenance</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={handleBackupSystem}>
                      <Download className="w-4 h-4 mr-2" />
                      Backup System
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="w-4 h-4 mr-2" />
                      Restore Backup
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="w-4 h-4 mr-2" />
                      Database Maintenance
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Monitoring</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="w-4 h-4 mr-2" />
                      System Logs
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Performance Metrics
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="w-4 h-4 mr-2" />
                      Alert Configuration
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}