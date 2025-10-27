'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-client';

// Types for client-side events
export interface ClientToServerEvents {
  // Join/leave rooms
  'join:conversation': (conversationId: string) => void;
  'leave:conversation': (conversationId: string) => void;

  // Messaging
  'message:send': (data: {
    conversationId: string;
    content: any;
    replyToId?: string;
    attachments?: string[];
  }) => void;
  'message:typing:start': (conversationId: string) => void;
  'message:typing:stop': (conversationId: string) => void;

  // Presence
  'presence:update': (status: 'online' | 'away' | 'offline') => void;

  // Reactions
  'message:reaction:add': (data: {
    messageId: string;
    emoji: string;
  }) => void;
  'message:reaction:remove': (data: {
    messageId: string;
    emoji: string;
  }) => void;

  // Read receipts
  'conversation:read': (conversationId: string) => void;
}

export interface ServerToClientEvents {
  // Messaging
  'message:new': (message: any) => void;
  'message:updated': (message: any) => void;
  'message:deleted': (messageId: string) => void;

  // Typing indicators
  'typing:user': (data: {
    conversationId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  }) => void;

  // Presence
  'presence:user': (data: {
    userId: string;
    status: 'online' | 'away' | 'offline';
    lastSeen?: string;
  }) => void;

  // Reactions
  'message:reaction': (data: {
    messageId: string;
    userId: string;
    emoji: string;
    action: 'add' | 'remove';
  }) => void;

  // Read receipts
  'conversation:read': (data: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
  }) => void;

  // System
  'error': (error: { message: string; code?: string }) => void;
  'success': (message: string) => void;
}

export interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const { user, getAccessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  // Connect to Socket.IO server
  const connect = async () => {
    if (!user || socketRef.current?.connected) return;

    setIsConnecting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const socketUrl = process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:3000';

      const socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.IO server:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err);
        setError(err.message);
        setIsConnecting(false);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
        setError(error.message);
      });

    } catch (err) {
      console.error('Failed to initialize socket:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  };

  // Disconnect from Socket.IO server
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setError(null);
  };

  // Auto-connect when user is available
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect
  };
}

// Hook for specific conversation
export function useConversationSocket(conversationId: string) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, { userName: string; timestamp: number }>>(new Map());

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join conversation
    socket.emit('join:conversation', conversationId);

    // Handle typing indicators
    const handleTypingUser = (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (data.isTyping) {
            newMap.set(data.userId, { userName: data.userName, timestamp: Date.now() });
          } else {
            newMap.delete(data.userId);
          }
          return newMap;
        });
      }
    };

    socket.on('typing:user', handleTypingUser);

    // Clean up old typing indicators (remove after 5 seconds)
    const cleanupInterval = setInterval(() => {
      setTypingUsers(prev => {
        const newMap = new Map();
        const now = Date.now();
        for (const [userId, data] of prev.entries()) {
          if (now - data.timestamp < 5000) {
            newMap.set(userId, data);
          }
        }
        return newMap;
      });
    }, 1000);

    return () => {
      socket.off('typing:user', handleTypingUser);
      socket.emit('leave:conversation', conversationId);
      clearInterval(cleanupInterval);
    };
  }, [socket, isConnected, conversationId]);

  const sendMessage = (content: any, replyToId?: string, attachments?: string[]) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }

    socket.emit('message:send', {
      conversationId,
      content,
      replyToId,
      attachments
    });
  };

  const startTyping = () => {
    if (socket && isConnected) {
      socket.emit('message:typing:start', conversationId);
    }
  };

  const stopTyping = () => {
    if (socket && isConnected) {
      socket.emit('message:typing:stop', conversationId);
    }
  };

  const markAsRead = () => {
    if (socket && isConnected) {
      socket.emit('conversation:read', conversationId);
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (socket && isConnected) {
      socket.emit('message:reaction:add', { messageId, emoji });
    }
  };

  const removeReaction = (messageId: string, emoji: string) => {
    if (socket && isConnected) {
      socket.emit('message:reaction:remove', { messageId, emoji });
    }
  };

  return {
    typingUsers: Array.from(typingUsers.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName
    })),
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    addReaction,
    removeReaction
  };
}

// Hook for presence management
export function usePresenceSocket() {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userStatuses, setUserStatuses] = useState<Map<string, { status: string; lastSeen?: string }>>(new Map());

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePresenceUser = (data: { userId: string; status: string; lastSeen?: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });

      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          status: data.status,
          lastSeen: data.lastSeen
        });
        return newMap;
      });
    };

    socket.on('presence:user', handlePresenceUser);

    return () => {
      socket.off('presence:user', handlePresenceUser);
    };
  }, [socket, isConnected]);

  const updatePresence = (status: 'online' | 'away' | 'offline') => {
    if (socket && isConnected) {
      socket.emit('presence:update', status);
    }
  };

  return {
    onlineUsers,
    userStatuses,
    updatePresence,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    getUserStatus: (userId: string) => userStatuses.get(userId)
  };
}