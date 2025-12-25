import cors from '@koa/cors';

export function createCorsMiddleware() {
  return cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'anthropic-version',
      'x-api-key',
      'x-intercept-config',
    ],
    exposeHeaders: ['*'],
    credentials: true,
  });
}
