/**
 * User Profile Service
 * Manages user profiles
 */

import { database } from '../utils/database'
import { logger } from '../utils/logger'
import { UserProfile } from '../types'

export class UserProfileService {
  /**
   * Create a new user profile
   */
  async createUser(data: {
    email: string
    attributes?: Record<string, any>
  }): Promise<UserProfile> {
    const { email, attributes = {} } = data

    try {
      const result = await database.queryOne<UserProfile>(
        `INSERT INTO users (email, attributes, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [email, JSON.stringify(attributes)]
      )

      if (!result) {
        throw new Error('Failed to create user')
      }

      logger.info(`User created: ${result.id}`)
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

}

export const userProfileService = new UserProfileService()
