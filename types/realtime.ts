export interface ServerToClientEvents {
  "message:new": { conversationId: string; messageId: string };
  "typing": { conversationId: string; userId: string; isTyping: boolean };
  "presence:update": { userId: string; status: "online" | "away" | "offline" };
  "read:receipt": { conversationId: string; messageId: string; userId: string };
}

export interface ClientToServerEvents {
  "typing": { conversationId: string; isTyping: boolean };
  "join:conversation": { conversationId: string };
  "leave:conversation": { conversationId: string };
}

export type InterServerEvents = Record<string, unknown>;
export type SocketData = { userId: string };