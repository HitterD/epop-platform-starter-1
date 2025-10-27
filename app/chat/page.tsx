'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Input } from '@/radix-ui/input';
import { Badge } from '@/radix-ui/badge';
import { useSocketContext } from '@/contexts/socket-context';
import { useAuth } from '@/lib/auth';

export default function ChatPage() {
  const { isConnected, onlineUsers } = useSocketContext();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const mockConversations = [
    {
      id: '1',
      title: 'General Chat',
      type: 'GROUP',
      memberCount: 5,
      lastMessage: 'Welcome to the chat!',
      lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
      unreadCount: 2
    },
    {
      id: '2',
      title: 'Project Discussion',
      type: 'PROJECT',
      memberCount: 3,
      lastMessage: 'How is the development going?',
      lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
      unreadCount: 0
    },
    {
      id: '3',
      title: 'John Doe',
      type: 'DM',
      memberCount: 2,
      lastMessage: 'Sure, let\'s discuss this tomorrow',
      lastMessageAt: new Date(Date.now() - 900000).toISOString(),
      unreadCount: 1
    }
  ];

  const filteredConversations = mockConversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to access the chat system.</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Chat</h1>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {onlineUsers.size} users online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredConversations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No conversations found
                  </p>
                ) : (
                  filteredConversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/chat/${conversation.id}`}
                      className="block"
                    >
                      <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{conversation.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {conversation.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {conversation.lastMessage}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {conversation.memberCount} members
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(conversation.lastMessageAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="ml-2">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Online Users */}
          <Card>
            <CardHeader>
              <CardTitle>Online Users</CardTitle>
            </CardHeader>
            <CardContent>
              {onlineUsers.size === 0 ? (
                <p className="text-sm text-muted-foreground">No users online</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {onlineUsers.size} users currently online
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(onlineUsers).slice(0, 5).map((userId) => (
                      <Badge key={userId} variant="outline" className="text-xs">
                        User {userId.slice(-4)}
                      </Badge>
                    ))}
                    {onlineUsers.size > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{onlineUsers.size - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                New Conversation
              </Button>
              <Button variant="outline" className="w-full">
                Join Channel
              </Button>
              <Button variant="outline" className="w-full">
                Browse Directory
              </Button>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">WebSocket:</span>
                  <Badge variant={isConnected ? 'default' : 'destructive'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Server:</span>
                  <Badge variant="outline">
                    Online
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}