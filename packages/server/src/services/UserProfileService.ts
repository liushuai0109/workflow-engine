/**
 * User Profile Service
 * Manages user profiles and lifecycle state
 */

import { database } from '../utils/database'
import { logger } from '../utils/logger'
import { UserProfile, LifecycleStage, LifecycleTransition } from '../types'

export class UserProfileService {
  /**
   * Create a new user profile
   */
  async createUser(data: {
    email: string
    attributes?: Record<string, any>
    initialStage?: LifecycleStage
  }): Promise<UserProfile> {
    const { email, attributes = {}, initialStage = LifecycleStage.Acquisition } = data

    try {
      const result = await database.queryOne<UserProfile>(
        `INSERT INTO users (email, current_lifecycle_stage, attributes, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [email, initialStage, JSON.stringify(attributes)]
      )

      if (!result) {
        throw new Error('Failed to create user')
      }

      // Record initial lifecycle transition
      await this.recordLifecycleTransition({
        userId: result.id,
        fromStage: null,
        toStage: initialStage,
        metadata: { source: 'user_creation' }
      })

      logger.info(`User created: ${result.id} with stage ${initialStage}`)
      return result
    } catch (error) {
      logger.error('Error creating user', error)
      throw error
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    return database.queryOne<UserProfile>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    )
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return database.queryOne<UserProfile>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(
    userId: string,
    attributes: Record<string, any>
  ): Promise<UserProfile | null> {
    try {
      const result = await database.queryOne<UserProfile>(
        `UPDATE users
         SET attributes = attributes || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(attributes), userId]
      )

      if (result) {
        logger.info(`User attributes updated: ${userId}`)
      }

      return result
    } catch (error) {
      logger.error('Error updating user attributes', error)
      throw error
    }
  }

  /**
   * Transition user to new lifecycle stage
   */
  async transitionLifecycleStage(data: {
    userId: string
    toStage: LifecycleStage
    workflowExecutionId?: string
    metadata?: Record<string, any>
  }): Promise<LifecycleTransition> {
    const { userId, toStage, workflowExecutionId, metadata = {} } = data

    return database.transaction(async (client) => {
      // Get current stage
      const user = await client.query(
        'SELECT current_lifecycle_stage FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      )

      if (user.rows.length === 0) {
        throw new Error(`User not found: ${userId}`)
      }

      const fromStage = user.rows[0].current_lifecycle_stage

      // Update user's current stage
      await client.query(
        `UPDATE users
         SET current_lifecycle_stage = $1, updated_at = NOW()
         WHERE id = $2`,
        [toStage, userId]
      )

      // Record transition in history
      const transitionResult = await client.query(
        `INSERT INTO user_lifecycle_history
         (user_id, from_stage, to_stage, transitioned_at, workflow_execution_id, metadata)
         VALUES ($1, $2, $3, NOW(), $4, $5)
         RETURNING *`,
        [userId, fromStage, toStage, workflowExecutionId, JSON.stringify(metadata)]
      )

      const transition = transitionResult.rows[0]

      logger.info(`User ${userId} transitioned: ${fromStage} → ${toStage}`)

      return transition
    })
  }

  /**
   * Get user's lifecycle history
   */
  async getUserLifecycleHistory(
    userId: string,
    limit = 50
  ): Promise<LifecycleTransition[]> {
    return database.query<LifecycleTransition>(
      `SELECT * FROM user_lifecycle_history
       WHERE user_id = $1
       ORDER BY transitioned_at DESC
       LIMIT $2`,
      [userId, limit]
    )
  }

  /**
   * Get users by lifecycle stage
   */
  async getUsersByStage(
    stage: LifecycleStage,
    limit = 100,
    offset = 0
  ): Promise<UserProfile[]> {
    return database.query<UserProfile>(
      `SELECT * FROM users
       WHERE current_lifecycle_stage = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [stage, limit, offset]
    )
  }

  /**
   * Get lifecycle stage distribution
   */
  async getStageDistribution(): Promise<Record<LifecycleStage, number>> {
    const results = await database.query<{ stage: LifecycleStage; count: string }>(
      `SELECT current_lifecycle_stage as stage, COUNT(*) as count
       FROM users
       GROUP BY current_lifecycle_stage`
    )

    const distribution: Record<string, number> = {}
    results.forEach((row) => {
      distribution[row.stage] = parseInt(row.count)
    })

    return distribution as Record<LifecycleStage, number>
  }

  /**
   * Record a lifecycle transition (internal helper)
   */
  private async recordLifecycleTransition(data: {
    userId: string
    fromStage: LifecycleStage | null
    toStage: LifecycleStage
    workflowExecutionId?: string
    metadata?: Record<string, any>
  }): Promise<void> {
    const { userId, fromStage, toStage, workflowExecutionId, metadata = {} } = data

    await database.query(
      `INSERT INTO user_lifecycle_history
       (user_id, from_stage, to_stage, transitioned_at, workflow_execution_id, metadata)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [userId, fromStage, toStage, workflowExecutionId, JSON.stringify(metadata)]
    )
  }
}

export const userProfileService = new UserProfileService()
