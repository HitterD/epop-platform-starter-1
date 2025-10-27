'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageList } from '@/components/chat/message-list';
import { PresenceIndicator } from '@/components/chat/presence-indicator';
import { OnlineUsersList } from '@/components/chat/presence-indicator';
import { AIAssistant } from '@/components/ai/ai-assistant';
import { useSocketContext } from '@/contexts/socket-context';
import { useAuth } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Badge } from '@/radix-ui/badge';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: any;
  createdAt: string;
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user } = useAuth();
  const { isConnected, onlineUsers } = useSocketContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);

  // Mock conversation data
  useEffect(() => {
    // Simulate loading conversation data
    setTimeout(() => {
      setConversation({
        id: conversationId,
        title: conversationId === '1' ? 'General Chat' : 'Project Discussion',
        type: 'GROUP',
        members: [
          { id: '1', name: 'John Doe', role: 'admin' },
          { id: '2', name: 'Jane Smith', role: 'member' },
          { id: user?.id || '3', name: user?.name || 'You', role: 'member' }
        ]
      });

      // Mock initial messages
      setMessages([
        {
          id: '1',
          conversationId,
          senderId: '1',
          senderName: 'John Doe',
          content: { type: 'text', text: 'Welcome to the chat!' },
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          conversationId,
          senderId: '2',
          senderName: 'Jane Smith',
          content: { type: 'text', text: 'Hey everyone! 👋' },
          createdAt: new Date(Date.now() - 1800000).toISOString()
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, [conversationId, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access chat</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Chat</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <OnlineUsersList />
        </div>

        <div className="p-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Conversation Members
          </h3>
          <div className="space-y-2">
            {conversation?.members.map((member: any) => (
              <div key={member.id} className="flex items-center gap-2">
                <PresenceIndicator
                  userId={member.id}
                  userName={member.name}
                  showStatus={false}
                />
                <span className="text-sm">{member.name}</span>
                {member.role === 'admin' && (
                  <Badge variant="secondary" className="text-xs">
                    Admin
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{conversation?.title}</h1>
              <p className="text-sm text-muted-foreground">
                {onlineUsers.size} members online
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PresenceIndicator
                userId={user.id}
                userName={user.name}
                showStatus={true}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1">
          <MessageList
            conversationId={conversationId}
            initialMessages={messages}
            currentUserId={user.id}
          />
        </div>
      </div>

      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg">
          Connection lost. Reconnecting...
        </div>
      )}

      {/* AI Assistant */}
      <AIAssistant conversationId={conversationId} />
    </div>
  );
}