/**
 * Main Entry Point for Lifecycle Operations Backend
 */

import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { database } from './utils/database'
import { logger } from './utils/logger'
import { userRoutes } from './routes/userRoutes'
import { workflowRoutes } from './routes/workflowRoutes'
import { segmentRoutes } from './routes/segmentRoutes'
import { triggerRoutes } from './routes/triggerRoutes'
import { metricsRoutes } from './routes/metricsRoutes'
import { claudeRoutes } from './routes/claudeRoutes'
import { errorHandler } from './middleware/errorHandler'

// Load environment variables
dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: database.isAvailable() ? 'connected' : 'unavailable'
  })
})

// API Routes
app.use('/api/users', userRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/segments', segmentRoutes)
app.use('/api/triggers', triggerRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/claude/v1', claudeRoutes)

// Error handling
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    // Try to connect to database (non-fatal)
    await database.connect()

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`)
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:8000'}`)

      if (database.isAvailable()) {
        logger.info(`✅ Database: connected`)
      } else {
        logger.warn(`⚠️  Database: unavailable (server running without database)`)
        logger.warn(`   To enable database: configure PostgreSQL and restart`)
        logger.warn(`   Or set DB_DISABLED=true to suppress warnings`)
      }
    })
  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await database.disconnect()
  process.exit(0)
})

// Start the server
startServer()

export default app
