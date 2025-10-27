import { Server, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { users, conversations, conversationMembers } from '@/db/schema';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
} from '@/types/realtime';

// Try to import Redis adapter, but don't fail if Redis is not available
let createAdapter: any;
let createClient: any;
try {
  const redisModule = require('redis');
  createClient = redisModule.createClient;
  const adapterModule = require('@socket.io/redis-adapter');
  createAdapter = adapterModule.createAdapter;
} catch (error) {
  console.warn('Redis adapter not available, running in single instance mode');
}

export type TypedIO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Socket.IO types
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

class SocketService {
  private io: TypedIO | null = null;
  private redisAdapter: any = null;
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs

  async initialize(server: HTTPServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.NEXT_PUBLIC_APP_URL
          : ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize Redis adapter
    await this.initializeRedisAdapter();

    // Authentication middleware
    this.io.use(this.authenticateSocket.bind(this));

    // Handle connections
    this.io.on('connection', this.handleConnection.bind(this));

    console.log('Socket.IO server initialized');
  }

  private async initializeRedisAdapter() {
    if (!createAdapter || !createClient) {
      console.warn('Redis adapter not available, running in single instance mode');
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Create Redis clients for pub/sub
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.redisAdapter = createAdapter(pubClient, subClient);
      this.io?.adapter(this.redisAdapter);

      console.log('Redis adapter initialized');
    } catch (error) {
      console.error('Failed to initialize Redis adapter:', error);
      // Continue without Redis if connection fails
      console.warn('Socket.IO running without Redis adapter (single instance mode)');
    }
  }

  private async authenticateSocket(socket: any, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('JWT secret not configured'));
      }

      const decoded = jwt.verify(token, jwtSecret) as any;

      // Fetch user from database
      const user = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

      if (!user.length || !user[0].isActive) {
        return next(new Error('User not found or inactive'));
      }

      // Attach user data to socket
      socket.userId = user[0].id;
      socket.user = user[0];

      // Track socket for this user
      if (!this.userSockets.has(user[0].id)) {
        this.userSockets.set(user[0].id, new Set());
      }
      this.userSockets.get(user[0].id)!.add(socket.id);

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket) {
    console.log(`User ${socket.user.name} connected: ${socket.id}`);

    // Join user to their personal room for presence
    socket.join(`user:${socket.userId}`);

    // Broadcast user online status
    this.broadcastPresence(socket.userId, 'online');

    // Register event handlers
    this.registerEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  private registerEventHandlers(socket: AuthenticatedSocket) {
    // Conversation management
    socket.on('join:conversation', async (conversationId: string) => {
      await this.handleJoinConversation(socket, conversationId);
    });

    socket.on('leave:conversation', async (conversationId: string) => {
      await this.handleLeaveConversation(socket, conversationId);
    });

    // Messaging
    socket.on('message:send', async (data) => {
      await this.handleMessageSend(socket, data);
    });

    socket.on('message:typing:start', (conversationId: string) => {
      this.handleTypingStart(socket, conversationId);
    });

    socket.on('message:typing:stop', (conversationId: string) => {
      this.handleTypingStop(socket, conversationId);
    });

    // Presence
    socket.on('presence:update', (status: 'online' | 'away' | 'offline') => {
      this.broadcastPresence(socket.userId, status);
    });

    // Reactions
    socket.on('message:reaction:add', async (data) => {
      await this.handleReactionAdd(socket, data);
    });

    socket.on('message:reaction:remove', async (data) => {
      await this.handleReactionRemove(socket, data);
    });

    // Read receipts
    socket.on('conversation:read', async (conversationId: string) => {
      await this.handleConversationRead(socket, conversationId);
    });
  }

  private async handleJoinConversation(socket: AuthenticatedSocket, conversationId: string) {
    try {
      // Verify user is member of conversation
      const membership = await db.select()
        .from(conversationMembers)
        .where(and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, socket.userId),
          eq(conversationMembers.hasLeft, false)
        ))
        .limit(1);

      if (!membership.length) {
        socket.emit('error', { message: 'Not a member of this conversation' });
        return;
      }

      // Join socket to conversation room
      socket.join(`conversation:${conversationId}`);

      // Notify others in conversation that user is online
      socket.to(`conversation:${conversationId}`).emit('presence:user', {
        userId: socket.userId,
        status: 'online'
      });

      console.log(`User ${socket.user.name} joined conversation ${conversationId}`);
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  private async handleLeaveConversation(socket: AuthenticatedSocket, conversationId: string) {
    socket.leave(`conversation:${conversationId}`);
    socket.to(`conversation:${conversationId}`).emit('presence:user', {
      userId: socket.userId,
      status: 'offline'
    });
  }

  private async handleMessageSend(socket: AuthenticatedSocket, data: {
    conversationId: string;
    content: any;
    replyToId?: string;
    attachments?: string[];
  }) {
    try {
      // This would typically save to database and broadcast
      // For now, we'll emit to the conversation room
      socket.to(`conversation:${data.conversationId}`).emit('message:new', {
        id: crypto.randomUUID(),
        conversationId: data.conversationId,
        senderId: socket.userId,
        senderName: socket.user.name,
        content: data.content,
        replyToId: data.replyToId,
        attachments: data.attachments,
        createdAt: new Date().toISOString()
      });

      // Stop typing indicator
      this.handleTypingStop(socket, data.conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTypingStart(socket: AuthenticatedSocket, conversationId: string) {
    const key = `${socket.userId}:${conversationId}`;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      this.handleTypingStop(socket, conversationId);
    }, 3000);

    this.typingTimeouts.set(key, timeout);

    // Broadcast typing indicator
    socket.to(`conversation:${conversationId}`).emit('typing:user', {
      conversationId,
      userId: socket.userId,
      userName: socket.user.name,
      isTyping: true
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, conversationId: string) {
    const key = `${socket.userId}:${conversationId}`;

    // Clear timeout
    const timeout = this.typingTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(key);
    }

    // Broadcast stop typing
    socket.to(`conversation:${conversationId}`).emit('typing:user', {
      conversationId,
      userId: socket.userId,
      userName: socket.user.name,
      isTyping: false
    });
  }

  private async handleReactionAdd(socket: AuthenticatedSocket, data: { messageId: string; emoji: string }) {
    try {
      // This would save to database
      // Broadcast to conversation members
      socket.to(`conversation:${data.messageId}`).emit('message:reaction', {
        messageId: data.messageId,
        userId: socket.userId,
        emoji: data.emoji,
        action: 'add'
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  private async handleReactionRemove(socket: AuthenticatedSocket, data: { messageId: string; emoji: string }) {
    try {
      // This would remove from database
      socket.to(`conversation:${data.messageId}`).emit('message:reaction', {
        messageId: data.messageId,
        userId: socket.userId,
        emoji: data.emoji,
        action: 'remove'
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  private async handleConversationRead(socket: AuthenticatedSocket, conversationId: string) {
    try {
      // This would update last read message in database
      // Broadcast to other members
      socket.to(`conversation:${conversationId}`).emit('conversation:read', {
        conversationId,
        userId: socket.userId,
        lastReadMessageId: 'some-id' // This would come from database
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }

  private broadcastPresence(userId: string, status: 'online' | 'away' | 'offline') {
    this.io?.emit('presence:user', {
      userId,
      status,
      lastSeen: status === 'offline' ? new Date().toISOString() : undefined
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket) {
    console.log(`User ${socket.user.name} disconnected: ${socket.id}`);

    // Remove socket from user tracking
    const userSockets = this.userSockets.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);

      // If user has no more active sockets, broadcast offline status
      if (userSockets.size === 0) {
        this.userSockets.delete(socket.userId);
        this.broadcastPresence(socket.userId, 'offline');
      }
    }

    // Clean up typing timeouts
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(`${socket.userId}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }

  // Public methods for external use
  emitToUser(userId: string, event: string, data: any) {
    this.io?.to(`user:${userId}`).emit(event as any, data);
  }

  emitToConversation(conversationId: string, event: string, data: any) {
    this.io?.to(`conversation:${conversationId}`).emit(event as any, data);
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;