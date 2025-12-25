import { Context, Next } from 'koa';
import { Logger } from '../pkg/logger';

export function createErrorMiddleware(logger: Logger) {
  return async (ctx: Context, next: Next) => {
    try {
      await next();
    } catch (err: any) {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';

      logger.error({
        err,
        status,
        url: ctx.request.url,
        method: ctx.request.method,
      });

      ctx.status = status;
      ctx.body = {
        success: false,
        error: message,
      };
    }
  };
}
