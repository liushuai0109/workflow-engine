export interface ChatConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  sequence: number;
  createdAt: Date;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}
