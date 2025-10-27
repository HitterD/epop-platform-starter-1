'use client';

import React, { useState, useEffect } from 'react';
import { ProjectCard } from '@/components/projects/project-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Input } from '@/radix-ui/input';
import { Badge } from '@/radix-ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/radix-ui/tabs';
import { Plus, Search, Filter, FolderOpen, Archive, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  creator: {
    name: string;
  };
  userRole: string;
  startDate?: string;
  endDate?: string;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data for demonstration
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'EPOP Platform Development',
      description: 'Enterprise Platform for Operational Performance - Real-time messaging and project management system',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      memberCount: 5,
      taskCount: 12,
      completedTaskCount: 8,
      creator: { name: 'John Doe' },
      userRole: 'OWNER',
      startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString()
    },
    {
      id: '2',
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern design and improved UX',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      memberCount: 3,
      taskCount: 8,
      completedTaskCount: 5,
      creator: { name: 'Jane Smith' },
      userRole: 'MAINTAINER',
      startDate: new Date(Date.now() - 86400000 * 14).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 21).toISOString()
    },
    {
      id: '3',
      name: 'Marketing Campaign Q4',
      description: 'Fourth quarter marketing campaign for product launch',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      memberCount: 4,
      taskCount: 6,
      completedTaskCount: 2,
      creator: { name: 'Mike Johnson' },
      userRole: 'CONTRIBUTOR',
      startDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 60).toISOString()
    }
  ];

  useEffect(() => {
    // Simulate loading projects
    setTimeout(() => {
      setProjects(mockProjects);
      setLoading(false);
    }, 1000);
  }, [user]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'active') return matchesSearch && project.status === 'ACTIVE';
    if (activeTab === 'archived') return matchesSearch && project.status === 'ARCHIVED';

    return matchesSearch;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVE').length,
    archived: projects.filter(p => p.status === 'ARCHIVED').length,
    totalTasks: projects.reduce((sum, p) => sum + p.taskCount, 0),
    completedTasks: projects.reduce((sum, p) => sum + p.completedTaskCount, 0),
    totalMembers: projects.reduce((sum, p) => sum + p.memberCount, 0)
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to access the project management system.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Manage your projects and track progress
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Projects</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Active Projects</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Archived</p>
                  <p className="text-2xl font-bold">{stats.archived}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Total Members</p>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Projects Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All Projects ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived ({stats.archived})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <p>Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Create your first project to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Progress Summary */}
      {stats.totalTasks > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Tasks Completed</span>
                <span>{stats.completedTasks}/{stats.totalTasks}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{
                    width: `${(stats.completedTasks / stats.totalTasks) * 100}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}