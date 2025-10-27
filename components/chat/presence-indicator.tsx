'use client';

import React from 'react';
import { usePresenceSocket } from '@/lib/socket/client';
import { cn } from '@/lib/utils';

interface PresenceIndicatorProps {
  userId: string;
  userName: string;
  showStatus?: boolean;
  className?: string;
}

export function PresenceIndicator({
  userId,
  userName,
  showStatus = true,
  className
}: PresenceIndicatorProps) {
  const { isUserOnline, getUserStatus } = usePresenceSocket();

  const isOnline = isUserOnline(userId);
  const userStatus = getUserStatus(userId);

  const getStatusColor = () => {
    if (isOnline) return 'bg-green-500';
    if (userStatus?.status === 'away') return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isOnline) return 'Online';
    if (userStatus?.status === 'away') return 'Away';
    if (userStatus?.status === 'offline') {
      return userStatus.lastSeen ? `Last seen ${new Date(userStatus.lastSeen).toLocaleString()}` : 'Offline';
    }
    return 'Offline';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className={cn(
          'w-3 h-3 rounded-full',
          getStatusColor()
        )} />
        {isOnline && (
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
        )}
      </div>
      {showStatus && (
        <span className="text-sm text-muted-foreground">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

// Online users list component
export function OnlineUsersList({ className }: { className?: string }) {
  const { onlineUsers, userStatuses } = usePresenceSocket();

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-sm font-medium text-muted-foreground">
        Online Users ({onlineUsers.size})
      </h3>
      <div className="space-y-1">
        {Array.from(onlineUsers).map(userId => {
          const status = userStatuses.get(userId);
          return (
            <div key={userId} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
              <PresenceIndicator userId={userId} userName={status?.userId || 'User'} showStatus={false} />
              <span className="text-sm">
                {status?.userId || 'User'}
              </span>
            </div>
          );
        })}
        {onlineUsers.size === 0 && (
          <p className="text-sm text-muted-foreground">No users online</p>
        )}
      </div>
    </div>
  );
}