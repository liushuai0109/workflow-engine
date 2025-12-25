import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { loadConfig } from './config';
import { createLogger } from './pkg/logger';
import { Database } from './pkg/database';
import { createCorsMiddleware } from './middleware/cors';
import { createLoggerMiddleware } from './middleware/logger';
import { createErrorMiddleware } from './middleware/error';
import { interceptorMiddleware } from './middleware/interceptor';
import { setupRoutes } from './routes';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.environment);

  const app = new Koa();

  // Initialize database
  const db = new Database(logger);
  try {
    await db.connect(config.database);
  } catch (err) {
    logger.warn({ err }, 'Database connection failed, running without database');
  }

  // Middleware
  app.use(createErrorMiddleware(logger));
  app.use(createCorsMiddleware());
  app.use(createLoggerMiddleware(logger));
  app.use(bodyParser());
  app.use(interceptorMiddleware);

  // Routes
  const router = setupRoutes(db, logger);
  app.use(router.routes());
  app.use(router.allowedMethods());

  // Start server
  const port = config.port;
  const server = app.listen(port, () => {
    logger.info({
      port,
      environment: config.environment,
      corsOrigin: config.corsOrigin,
      msg: '🚀 Server starting',
    });

    if (db.isAvailable()) {
      logger.info('✅ Database: connected');
    } else {
      logger.warn('⚠️  Database: unavailable (server running without database)');
    }
  });

  // Disable keep-alive to help with clean shutdowns
  server.keepAliveTimeout = 0;

  // Track active connections
  const connections = new Set<any>();
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => {
      connections.delete(conn);
    });
  });

  // Graceful shutdown
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal');
      return;
    }
    isShuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Force shutdown after 3 seconds if graceful shutdown fails
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.kill(process.pid, 'SIGKILL');
    }, 3000);

    try {
      // Immediately destroy all active connections
      for (const conn of connections) {
        conn.destroy();
      }
      connections.clear();

      // Close server to stop accepting new connections
      await new Promise<void>((resolve) => {
        server.close((err) => {
          if (err) {
            logger.warn({ err }, 'Error closing server, but continuing shutdown');
          } else {
            logger.info('HTTP server closed');
          }
          resolve();
        });

        // Also try to unref the server to allow process to exit
        server.unref();
      });

      // Then disconnect from database
      try {
        await Promise.race([
          db.disconnect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB disconnect timeout')), 1000))
        ]);
        logger.info('Database disconnected');
      } catch (err) {
        logger.warn({ err }, 'Database disconnect timed out or failed');
      }

      // Clear the force shutdown timer
      clearTimeout(forceShutdownTimer);

      // Exit cleanly
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
