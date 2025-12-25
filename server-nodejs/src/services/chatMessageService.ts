import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';
import { ChatMessage } from '../models/chat';
import { v4 as uuidv4 } from 'uuid';

interface MessageInput {
  role: string;
  content: string;
  metadata?: Record<string, any>;
}

export class ChatMessageService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  async createMessage(
    conversationId: string,
    role: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<ChatMessage> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    // Get next sequence number
    const sequence = await this.getNextSequence(conversationId);

    const id = uuidv4();
    const metadataJSON = JSON.stringify(metadata);

    const query = `
      INSERT INTO chat_messages (id, conversation_id, role, content, metadata, sequence, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
      RETURNING id, conversation_id, role, content, metadata, sequence, created_at
    `;

    const result = await this.db.query<any>(query, [
      id,
      conversationId,
      role,
      content,
      metadataJSON,
      sequence,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create message');
    }

    return this.mapDbToMessage(result.rows[0]);
  }

  async batchCreateMessages(
    conversationId: string,
    messages: MessageInput[]
  ): Promise<ChatMessage[]> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Get current max sequence
      const sequenceResult = await client.query(
        'SELECT COALESCE(MAX(sequence), 0) as max_seq FROM chat_messages WHERE conversation_id = $1',
        [conversationId]
      );

      let maxSequence = parseInt(sequenceResult.rows[0].max_seq);

      const createdMessages: ChatMessage[] = [];

      for (let i = 0; i < messages.length; i++) {
        const msgData = messages[i];
        const sequence = maxSequence + i + 1;
        const id = uuidv4();
        const metadataJSON = JSON.stringify(msgData.metadata || {});

        const query = `
          INSERT INTO chat_messages (id, conversation_id, role, content, metadata, sequence, created_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
          RETURNING id, conversation_id, role, content, metadata, sequence, created_at
        `;

        const result = await client.query(query, [
          id,
          conversationId,
          msgData.role,
          msgData.content,
          metadataJSON,
          sequence,
        ]);

        if (result.rows.length > 0) {
          createdMessages.push(this.mapDbToMessage(result.rows[0]));
        }
      }

      await client.query('COMMIT');

      this.logger.info(
        { conversationId, count: createdMessages.length },
        'Messages batch created'
      );

      return createdMessages;
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error({ err, conversationId }, 'Failed to batch create messages');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db.isAvailable()) {
      throw new Error('Database not available');
    }

    const query = `
      SELECT id, conversation_id, role, content, metadata, sequence, created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY sequence ASC
    `;

    const result = await this.db.query<any>(query, [conversationId]);

    return result.rows.map(this.mapDbToMessage);
  }

  private async getNextSequence(conversationId: string): Promise<number> {
    const query =
      'SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq FROM chat_messages WHERE conversation_id = $1';

    const result = await this.db.query(query, [conversationId]);

    return parseInt(result.rows[0].next_seq);
  }

  private mapDbToMessage(row: any): ChatMessage {
    let metadata = {};
    if (row.metadata) {
      if (typeof row.metadata === 'string') {
        metadata = JSON.parse(row.metadata);
      } else {
        metadata = row.metadata;
      }
    }

    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      metadata,
      sequence: row.sequence,
      createdAt: new Date(row.created_at),
    };
  }
}
