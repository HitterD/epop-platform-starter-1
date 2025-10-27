'use client';

import React, { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { useConversationSocket } from '@/lib/socket/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/radix-ui/avatar';
import { Badge } from '@/radix-ui/badge';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: any; // TipTap JSON
  replyToId?: string;
  attachments?: string[];
  createdAt: string;
  reactions?: Array<{ userId: string; emoji: string }>;
}

interface MessageListProps {
  conversationId: string;
  initialMessages?: Message[];
  currentUserId: string;
}

export function MessageList({
  conversationId,
  initialMessages = [],
  currentUserId
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    socket,
    isConnected,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    addReaction,
    removeReaction
  } = useConversationSocket(conversationId);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);

      // Mark as read if it's not our own message
      if (message.senderId !== currentUserId) {
        markAsRead();
      }
    };

    const handleReaction = (data: { messageId: string; userId: string; emoji: string; action: 'add' | 'remove' }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          const reactions = msg.reactions || [];
          if (data.action === 'add') {
            return {
              ...msg,
              reactions: [...reactions.filter(r => !(r.userId === data.userId && r.emoji === data.emoji)), { userId: data.userId, emoji: data.emoji }]
            };
          } else {
            return {
              ...msg,
              reactions: reactions.filter(r => !(r.userId === data.userId && r.emoji === data.emoji))
            };
          }
        }
        return msg;
      }));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:reaction', handleReaction);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:reaction', handleReaction);
    };
  }, [socket, isConnected, currentUserId, markAsRead]);

  const handleSendMessage = (content: any) => {
    sendMessage(content);
    setIsTyping(false);
    stopTyping();
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping();
    }
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    stopTyping();
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existingReaction = message.reactions?.find(r => r.userId === currentUserId && r.emoji === emoji);
    if (existingReaction) {
      removeReaction(messageId, emoji);
    } else {
      addReaction(messageId, emoji);
    }
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.senderId === currentUserId;
    const messageDate = new Date(message.createdAt);

    return (
      <div
        key={message.id}
        className={`flex gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors ${
          isOwn ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={''} alt={message.senderName} />
          <AvatarFallback>
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className={`flex-1 space-y-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {message.senderName}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(messageDate, 'HH:mm')}
            </span>
            {isOwn && (
              <Badge variant="secondary" className="text-xs">
                You
              </Badge>
            )}
          </div>

          <div
            className={`inline-block rounded-lg px-3 py-2 ${
              isOwn
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {/* Message content would be rendered here using TipTap content */}
            <div className="text-sm">
              {JSON.stringify(message.content)}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    📎 {attachment}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex gap-1 mt-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => handleReactionClick(message.id, reaction.emoji)}
                  className={`px-2 py-1 rounded-full text-xs border ${
                    reaction.userId === currentUserId
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted border-border hover:bg-muted/80'
                  } transition-colors`}
                >
                  {reaction.emoji}
                  <span className="ml-1 text-muted-foreground">
                    {/* Count would be calculated here */}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map(renderMessage)}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex gap-2 items-center px-4 py-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              {typingUsers.map(user => (
                <span key={user.userId} className="px-2 py-1 bg-muted rounded-full">
                  {user.userName} is typing...
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connection status */}
        {!isConnected && (
          <div className="text-center py-2 text-sm text-muted-foreground">
            Reconnecting...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message composer would go here */}
      <div className="border-t p-4">
        <div className="text-sm text-muted-foreground">
          Message composer would be implemented here
        </div>
      </div>
    </div>
  );
}