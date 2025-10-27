'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Badge } from '@/radix-ui/badge';
import { Button } from '@/radix-ui/button';
import { Progress } from '@/radix-ui/progress';
import { Calendar, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: {
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
  };
  className?: string;
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const progress = project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'ARCHIVED': return 'secondary';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default';
      case 'MAINTAINER': return 'secondary';
      case 'CONTRIBUTOR': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      case 'ARCHIVED': return <Clock className="w-4 h-4" />;
      case 'CANCELLED': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = project.endDate && new Date(project.endDate) < new Date();

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate mb-2">
              <Link
                href={`/projects/${project.id}`}
                className="hover:text-primary transition-colors"
              >
                {project.name}
              </Link>
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description || 'No description provided'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <Badge variant={getStatusColor(project.status)} className="flex items-center gap-1">
              {getStatusIcon(project.status)}
              {project.status}
            </Badge>
            <Badge variant={getRoleColor(project.userRole)} className="text-xs">
              {project.userRole}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        {project.taskCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {progress.toFixed(0)}% complete
            </p>
          </div>
        )}

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{project.memberCount} members</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Created {format(new Date(project.createdAt), 'MMM d')}</span>
          </div>
        </div>

        {/* Dates */}
        {(project.startDate || project.endDate) && (
          <div className="space-y-1 text-sm">
            {project.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Start: {format(new Date(project.startDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {project.endDate && (
              <div className={cn(
                'flex items-center gap-2',
                isOverdue && 'text-destructive'
              )}>
                <Calendar className="w-4 h-4" />
                <span>
                  End: {format(new Date(project.endDate), 'MMM d, yyyy')}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Creator */}
        <div className="text-sm text-muted-foreground">
          Created by {project.creator.name}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/projects/${project.id}`}>
              View Project
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/tasks`}>
              Tasks
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}