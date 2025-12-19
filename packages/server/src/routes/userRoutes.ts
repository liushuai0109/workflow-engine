/**
 * User Profile Routes
 */

import { Router } from 'express'
import { UserProfileController } from '../controllers/UserProfileController'

const router = Router()
const controller = new UserProfileController()

// Create user
router.post('/', controller.createUser.bind(controller))

// Get user by ID
router.get('/:userId', controller.getUserById.bind(controller))

// Update user attributes
router.put('/:userId', controller.updateUser.bind(controller))

export { router as userRoutes }
