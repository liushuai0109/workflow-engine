import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseConfig } from '../../config';
import { Logger } from '../logger';

export class Database {
  private pool: Pool | null = null;
  private available: boolean = false;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async connect(config: DatabaseConfig): Promise<void> {
    if (config.disabled) {
      this.logger.info('Database is disabled (DB_DISABLED=true)');
      return;
    }

    this.logger.info({
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      msg: 'Connecting to database',
    });

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 25,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      this.logger.error({ err }, 'Unexpected database pool error');
    });

    try {
      const client = await this.pool.connect();

      // Set search path
      await client.query('SET search_path TO public');

      // Verify connection
      const result = await client.query('SELECT current_database(), current_schema()');
      const { current_database, current_schema } = result.rows[0];

      this.logger.info({
        database: current_database,
        schema: current_schema,
        msg: 'Connected to database',
      });

      // Check if tables exist
      const tableCheck = await client.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'chat_conversations'
        )`
      );

      if (tableCheck.rows[0].exists) {
        this.logger.info('✅ chat_conversations table found');
      } else {
        this.logger.warn('chat_conversations table not found in public schema');
      }

      client.release();
      this.available = true;
    } catch (err) {
      this.logger.error({ err }, 'Failed to connect to database');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database connection closed');
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.query<T>(text, params);
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }
}
