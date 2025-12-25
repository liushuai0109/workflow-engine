import { Context, Next } from 'koa';
import { Logger } from '../pkg/logger';

export function createLoggerMiddleware(logger: Logger) {
  return async (ctx: Context, next: Next) => {
    const start = Date.now();
    const { method, url } = ctx.request;

    try {
      await next();

      const duration = Date.now() - start;
      const { status } = ctx.response;

      logger.info({
        method,
        url,
        status,
        duration: `${duration}ms`,
      });
    } catch (err) {
      const duration = Date.now() - start;

      logger.error({
        err,
        method,
        url,
        duration: `${duration}ms`,
        msg: 'Request failed',
      });

      throw err;
    }
  };
}
