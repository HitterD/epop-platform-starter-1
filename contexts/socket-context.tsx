'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket, ServerToClientEvents } from '@/lib/socket/client';

interface SocketContextType {
  socket: Socket<ServerToClientEvents, any> | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onlineUsers: Set<string>;
  userStatuses: Map<string, { status: string; lastSeen?: string }>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected, isConnecting, error } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userStatuses, setUserStatuses] = useState<Map<string, { status: string; lastSeen?: string }>>(new Map());

  useEffect(() => {
    if (!socket) return;

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
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    error,
    onlineUsers,
    userStatuses
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}