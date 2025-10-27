'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Badge } from '@/radix-ui/badge';
import { Progress } from '@/radix-ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/radix-ui/tabs';
import { ArrowLeft, Calendar, Users, Settings, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  divisionId?: string;
  startDate?: string;
  endDate?: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  division?: {
    id: string;
    name: string;
  };
  members: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    joinedAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId?: string;
    assignee?: {
      id: string;
      name: string;
    };
    dueDate?: string;
    createdAt: string;
  }>;
  userRole: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const projectId = params.id as string;

  // Mock data for demonstration
  const mockProject: Project = {
    id: projectId,
    name: 'EPOP Platform Development',
    description: 'Enterprise Platform for Operational Performance - A comprehensive real-time messaging and project management system built with modern web technologies.',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    createdBy: '1',
    startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    creator: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    },
    members: [
      {
        userId: '1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        role: 'OWNER',
        joinedAt: new Date(Date.now() - 86400000 * 7).toISOString()
      },
      {
        userId: '2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        role: 'MAINTAINER',
        joinedAt: new Date(Date.now() - 86400000 * 6).toISOString()
      },
      {
        userId: '3',
        userName: 'Mike Johnson',
        userEmail: 'mike@example.com',
        role: 'CONTRIBUTOR',
        joinedAt: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ],
    tasks: [
      {
        id: '1',
        title: 'Set up project architecture',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: '1',
        assignee: { id: '1', name: 'John Doe' },
        dueDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
      },
      {
        id: '2',
        title: 'Implement authentication system',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: '2',
        assignee: { id: '2', name: 'Jane Smith' },
        dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
      },
      {
        id: '3',
        title: 'Build real-time messaging',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeId: '1',
        assignee: { id: '1', name: 'John Doe' },
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: '4',
        title: 'Implement file storage',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: '3',
        assignee: { id: '3', name: 'Mike Johnson' },
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
      }
    ],
    userRole: 'OWNER'
  };

  useEffect(() => {
    // Simulate loading project data
    setTimeout(() => {
      setProject(mockProject);
      setLoading(false);
    }, 1000);
  }, [projectId, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to access project details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">The project you're looking for doesn't exist or you don't have access to it.</p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push('/projects')}>
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default';
      case 'MAINTAINER': return 'secondary';
      case 'CONTRIBUTOR': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'secondary';
      case 'IN_PROGRESS': return 'default';
      case 'DONE': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'secondary';
      case 'MEDIUM': return 'default';
      case 'HIGH': return 'default';
      case 'URGENT': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <Badge variant={getRoleColor(project.userRole)}>
            {project.userRole}
          </Badge>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-muted-foreground max-w-3xl">
              {project.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Progress</p>
                <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
              </div>
            </div>
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Tasks</p>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Members</p>
                <p className="text-2xl font-bold">{project.members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Timeline</p>
                <p className="text-sm font-bold">
                  {format(new Date(project.startDate!), 'MMM d')} - {format(new Date(project.endDate!), 'MMM d')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant="outline" className="ml-2">
                    {project.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Created by</label>
                  <p className="text-sm text-muted-foreground">
                    {project.creator.name} ({project.creator.email})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created on</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(project.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last updated</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(project.updatedAt), 'MMMM d, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(project.startDate!), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(project.endDate!), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <p className="text-sm text-muted-foreground">
                    {Math.ceil((new Date(project.endDate!).getTime() - new Date(project.startDate!).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge variant={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {task.assignee && (
                          <span>Assigned to {task.assignee.name}</span>
                        )}
                        {task.dueDate && (
                          <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {project.tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet. Create your first task to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.userName}</h4>
                        <Badge variant={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(member.joinedAt), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  File management will be implemented here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}