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

// Get user lifecycle history
router.get('/:userId/lifecycle', controller.getLifecycleHistory.bind(controller))

// Transition user lifecycle stage
router.post('/:userId/lifecycle/transition', controller.transitionStage.bind(controller))

// Get users by stage
router.get('/stage/:stage', controller.getUsersByStage.bind(controller))

export { router as userRoutes }
