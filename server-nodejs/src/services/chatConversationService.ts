import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';
import { ChatConversation } from '../models/chat';
import { v4 as uuidv4 } from 'uuid';

export class ChatConversationService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async createConversation(title: string = '新对话'): Promise<ChatConversation> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const id = uuidv4();

    const query = `
      INSERT INTO chat_conversations (id, title, created_at, updated_at, last_message_at)
      VALUES ($1, $2, NOW(), NOW(), NOW())
      RETURNING id, title, created_at, updated_at, last_message_at
    `;

    const result = await this.db.query<any>(query, [id, title]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create conversation');
    }

    this.logger.info({ conversationId: id }, 'Conversation created');
    return this.mapDbToConversation(result.rows[0]);
  }

  async getConversationById(id: string): Promise<ChatConversation | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      SELECT id, title, created_at, updated_at, last_message_at
      FROM chat_conversations
      WHERE id = $1
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToConversation(result.rows[0]);
  }

  async listConversations(
    page: number = 1,
    pageSize: number = 20,
    orderBy: string = 'last_message_at',
    order: string = 'desc'
  ): Promise<{
    conversations: ChatConversation[];
    total: number;
  }> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    // Validate and set defaults
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;

    const validOrderBy: Record<string, string> = {
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
      last_message_at: 'c.last_message_at',
      title: 'c.title',
    };

    const orderByColumn = validOrderBy[orderBy] || validOrderBy.last_message_at;
    const orderDirection = order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * pageSize;

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM chat_conversations';
    const countResult = await this.db.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    // Get conversations with message count
    const query = `
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        COALESCE(COUNT(m.id), 0) as message_count
      FROM chat_conversations c
      LEFT JOIN chat_messages m ON c.id = m.conversation_id
      GROUP BY c.id, c.title, c.created_at, c.updated_at, c.last_message_at
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $1 OFFSET $2
    `;

    const result = await this.db.query<any>(query, [pageSize, offset]);

    const conversations = result.rows.map((row) => {
      const conv = this.mapDbToConversation(row);
      conv.messageCount = parseInt(row.message_count);
      return conv;
    });

    return { conversations, total };
  }

  async updateConversation(id: string, title: string): Promise<ChatConversation | null> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      UPDATE chat_conversations
      SET title = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, title, created_at, updated_at, last_message_at
    `;

    const result = await this.db.query<any>(query, [title, id]);

    if (result.rows.length === 0) {
      return null;
    }

    this.logger.info({ conversationId: id }, 'Conversation updated');
    return this.mapDbToConversation(result.rows[0]);
  }

  async deleteConversation(id: string): Promise<boolean> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    // Messages will be deleted automatically due to CASCADE
    const query = 'DELETE FROM chat_conversations WHERE id = $1';
    const result = await this.db.query(query, [id]);

    const deleted = !!(result.rowCount && result.rowCount > 0);

    if (deleted) {
      this.logger.info({ conversationId: id }, 'Conversation deleted');
    }

    return deleted;
  }

  async updateLastMessageAt(id: string): Promise<void> {
    if (!this.db.isAvailable()) {
      return;
    }

    const query = `
      UPDATE chat_conversations
      SET last_message_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [id]);
  }

  private mapDbToConversation(row: any): ChatConversation {
    return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastMessageAt: new Date(row.last_message_at),
    };
  }
}
