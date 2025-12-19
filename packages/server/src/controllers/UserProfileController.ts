/**
 * User Profile Controller
 */

import { Request, Response, NextFunction } from 'express'
import { userProfileService } from '../services/UserProfileService'

export class UserProfileController {
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, attributes } = req.body

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_EMAIL', message: 'Email is required' }
        })
      }

      const user = await userProfileService.createUser({
        email,
        attributes
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

}
