import { Context } from 'koa';
import { ChatConversationService } from '../services/chatConversationService';
import { ChatMessageService } from '../services/chatMessageService';
import { Logger } from '../pkg/logger';
import { ApiResponse } from '../models/response';

export class ChatConversationHandler {
  constructor(
    private conversationService: ChatConversationService,
    private messageService: ChatMessageService,
    private logger: Logger
  ) {}

  createConversation = async (ctx: Context) => {
    const { title } = ctx.request.body as any;

    try {
      const conversation = await this.conversationService.createConversation(title);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: conversation,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to create conversation');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to create conversation',
      } as ApiResponse;
    }
  };

  getConversations = async (ctx: Context) => {
    const page = parseInt((ctx.query.page as string) || '1');
    const pageSize = parseInt((ctx.query.pageSize as string) || '20');
    const orderBy = (ctx.query.orderBy as string) || 'last_message_at';
    const order = (ctx.query.order as string) || 'desc';

    try {
      const { conversations, total } = await this.conversationService.listConversations(
        page,
        pageSize,
        orderBy,
        order
      );

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: conversations,
        metadata: {
          page,
          pageSize,
          total,
          hasMore: page * pageSize < total,
        },
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to list conversations');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to list conversations',
      } as ApiResponse;
    }
  };

  getConversation = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
      const conversation = await this.conversationService.getConversationById(id);

      if (!conversation) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Conversation not found',
        } as ApiResponse;
        return;
      }

      const messages = await this.messageService.getMessagesByConversationId(id);

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: {
          conversation,
          messages,
        },
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, conversationId: id }, 'Failed to get conversation');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get conversation',
      } as ApiResponse;
    }
  };

  updateConversation = async (ctx: Context) => {
    const { id } = ctx.params;
    const { title } = ctx.request.body as any;

    if (!title) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Title is required',
      } as ApiResponse;
      return;
    }

    try {
      const conversation = await this.conversationService.updateConversation(id, title);

      if (!conversation) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Conversation not found',
        } as ApiResponse;
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: conversation,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, conversationId: id }, 'Failed to update conversation');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to update conversation',
      } as ApiResponse;
    }
  };

  deleteConversation = async (ctx: Context) => {
    const { id } = ctx.params;

    try {
      const deleted = await this.conversationService.deleteConversation(id);

      if (!deleted) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Conversation not found',
        } as ApiResponse;
        return;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        data: { deleted: true },
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, conversationId: id }, 'Failed to delete conversation');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to delete conversation',
      } as ApiResponse;
    }
  };

  addMessage = async (ctx: Context) => {
    const { id } = ctx.params;
    const { role, content, metadata } = ctx.request.body as any;

    if (!role || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Role and content are required',
      } as ApiResponse;
      return;
    }

    try {
      // Verify conversation exists
      const conversation = await this.conversationService.getConversationById(id);
      if (!conversation) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Conversation not found',
        } as ApiResponse;
        return;
      }

      const message = await this.messageService.createMessage(id, role, content, metadata);

      // Update conversation's last_message_at
      await this.conversationService.updateLastMessageAt(id);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: message,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, conversationId: id }, 'Failed to add message');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to add message',
      } as ApiResponse;
    }
  };

  batchAddMessages = async (ctx: Context) => {
    const { id } = ctx.params;
    const { messages } = ctx.request.body as any;

    if (!Array.isArray(messages) || messages.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Messages array is required',
      } as ApiResponse;
      return;
    }

    try {
      // Verify conversation exists
      const conversation = await this.conversationService.getConversationById(id);
      if (!conversation) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Conversation not found',
        } as ApiResponse;
        return;
      }

      const createdMessages = await this.messageService.batchCreateMessages(id, messages);

      // Update conversation's last_message_at
      await this.conversationService.updateLastMessageAt(id);

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: createdMessages,
      } as ApiResponse;
    } catch (err: any) {
      this.logger.error({ err, conversationId: id }, 'Failed to batch add messages');

      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to batch add messages',
      } as ApiResponse;
    }
  };
}
