'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Badge } from '@/radix-ui/badge';
import { Progress } from '@/radix-ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/radix-ui/tabs';
import {
  Users,
  MessageCircle,
  FolderOpen,
  CheckSquare,
  FileText,
  HardDrive,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsData {
  period: string;
  users: {
    total: number;
    active: number;
    admins: number;
    new: number;
    recentlyActive: number;
    returning: number;
  };
  messages: {
    total: number;
    recent: number;
    averagePerDay: number;
  };
  conversations: {
    total: number;
    new: number;
    averagePerDay: number;
  };
  projects: {
    total: number;
    active: number;
    new: number;
  };
  tasks: {
    total: number;
    completed: number;
    new: number;
    completionRate: number;
  };
  storage: {
    totalFiles: number;
    newFiles: number;
    totalSizeBytes: number;
    totalSizeMB: number;
  };
  engagement: {
    averageMessagesPerUser: number;
    averageProjectsPerUser: number;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const fetchAnalytics = async (period: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/summary?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p>Failed to load analytics data</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className={className}>
      {/* Period Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        <div className="flex gap-2">
          {['7', '30', '90'].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              Last {period} days
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.users.total)}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Active</span>
                <span>{analytics.users.active}</span>
              </div>
              <Progress value={(analytics.users.active / analytics.users.total) * 100} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Messages</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.messages.total)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.messages.averagePerDay} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Projects</p>
                <p className="text-2xl font-bold">{analytics.projects.total}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.projects.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Storage</p>
                <p className="text-2xl font-bold">{analytics.storage.totalSizeMB} MB</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.storage.totalFiles} files
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>New Users (last {analytics.period})</span>
                    <Badge variant="secondary">{analytics.users.new}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Returning Users</span>
                    <Badge variant="outline">{analytics.users.returning}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Recently Active</span>
                    <Badge variant="default">{analytics.users.recentlyActive}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Users</span>
                    <Badge variant="destructive">{analytics.users.admins}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Conversations</span>
                    <span>{analytics.conversations.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tasks</span>
                    <span>{analytics.tasks.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Task Completion Rate</span>
                    <span>{analytics.tasks.completionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Files</span>
                    <span>{analytics.storage.totalFiles}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Active Users</span>
                      <span>{analytics.users.active}</span>
                    </div>
                    <Progress value={(analytics.users.active / analytics.users.total) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Admin Users</span>
                      <span>{analytics.users.admins}</span>
                    </div>
                    <Progress value={(analytics.users.admins / analytics.users.total) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>New Users</span>
                    <span>{analytics.users.new}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Returning Users</span>
                    <span>{analytics.users.returning}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recently Active</span>
                    <span>{analytics.users.recentlyActive}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Avg Messages/User</span>
                    <span>{analytics.engagement.averageMessagesPerUser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Projects/User</span>
                    <span>{analytics.engagement.averageProjectsPerUser}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Messaging Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Messages</span>
                    <span>{formatNumber(analytics.messages.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent Messages</span>
                    <span>{formatNumber(analytics.messages.recent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Messages/Day</span>
                    <span>{analytics.messages.averagePerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Conversations</span>
                    <span>{analytics.conversations.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Projects</span>
                    <span>{analytics.projects.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Projects</span>
                    <span>{analytics.projects.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Projects</span>
                    <span>{analytics.projects.new}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tasks</span>
                    <span>{analytics.tasks.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Tasks</span>
                    <span>{analytics.tasks.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Tasks</span>
                    <span>{analytics.tasks.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Tasks</span>
                    <span>{analytics.tasks.new}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span>{analytics.tasks.completionRate}%</span>
                    </div>
                    <Progress value={analytics.tasks.completionRate} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Files</span>
                    <span>{analytics.storage.totalFiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Files</span>
                    <span>{analytics.storage.newFiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Storage</span>
                    <span>{formatBytes(analytics.storage.totalSizeBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg File Size</span>
                    <span>
                      {analytics.storage.totalFiles > 0
                        ? formatBytes(analytics.storage.totalSizeBytes / analytics.storage.totalFiles)
                        : '0 B'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}