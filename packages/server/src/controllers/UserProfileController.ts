/**
 * User Profile Controller
 */

import { Request, Response, NextFunction } from 'express'
import { userProfileService } from '../services/UserProfileService'
import { LifecycleStage } from '../types'
import { logger } from '../utils/logger'

export class UserProfileController {
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, attributes, initialStage } = req.body

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_EMAIL', message: 'Email is required' }
        })
      }

      const user = await userProfileService.createUser({
        email,
        attributes,
        initialStage
      })

      res.status(201).json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params

      const user = await userProfileService.getUserById(userId)

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        })
      }

      res.json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const { attributes } = req.body

      const user = await userProfileService.updateUserAttributes(userId, attributes)

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        })
      }

      res.json({ success: true, data: user })
    } catch (error) {
      next(error)
    }
  }

  async getLifecycleHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const limit = parseInt(req.query.limit as string) || 50

      const history = await userProfileService.getUserLifecycleHistory(userId, limit)

      res.json({ success: true, data: history })
    } catch (error) {
      next(error)
    }
  }

  async transitionStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const { toStage, workflowExecutionId, metadata } = req.body

      if (!toStage) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_STAGE', message: 'Target stage is required' }
        })
      }

      const transition = await userProfileService.transitionLifecycleStage({
        userId,
        toStage,
        workflowExecutionId,
        metadata
      })

      res.json({ success: true, data: transition })
    } catch (error) {
      next(error)
    }
  }

  async getUsersByStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { stage } = req.params
      const limit = parseInt(req.query.limit as string) || 100
      const offset = parseInt(req.query.offset as string) || 0

      const users = await userProfileService.getUsersByStage(
        stage as LifecycleStage,
        limit,
        offset
      )

      res.json({ success: true, data: users })
    } catch (error) {
      next(error)
    }
  }
}
