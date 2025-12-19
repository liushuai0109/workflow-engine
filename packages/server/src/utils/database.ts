/**
 * Database Connection Utility
 */

import { Pool, PoolClient } from 'pg'
import { logger } from './logger'

class Database {
  private pool: Pool | null = null

  /**
   * Initialize database connection pool
   */
  async connect(): Promise<void> {
    // Check if database is disabled
    if (process.env.DB_DISABLED === 'true') {
      logger.warn('Database is disabled (DB_DISABLED=true). Server will run without database.')
      return
    }

    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'lifecycle_operations',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })

      // Test connection
      const client = await this.pool.connect()
      logger.info('Database connected successfully')
      client.release()

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected database error', err)
      })
    } catch (error) {
      logger.error('Failed to connect to database', error)
      logger.warn('Server will continue without database. Set DB_DISABLED=true to suppress this warning.')
      // Don't throw - allow server to start without database
      this.pool = null
    }
  }

  /**
   * Get database pool
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not available. Please configure database connection or set DB_DISABLED=true.')
    }
    return this.pool
  }

  /**
   * Check if database is available
   */
  isAvailable(): boolean {
    return this.pool !== null
  }

  /**
   * Execute a query
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getPool().connect()
    try {
      const result = await client.query(text, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  /**
   * Execute a query and return single result
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params)
    return results.length > 0 ? results[0] : null
  }

  /**
   * Begin a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getPool().connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      logger.info('Database disconnected')
    }
  }
}

export const database = new Database()
