import { Context } from 'koa';
import { Database } from '../pkg/database';
import { Logger } from '../pkg/logger';

export async function healthCheck(ctx: Context, db: Database, _logger: Logger) {
  const isDbAvailable = db.isAvailable();

  ctx.status = 200;
  ctx.body = {
    status: 'ok',
    database: isDbAvailable ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
  };
}
