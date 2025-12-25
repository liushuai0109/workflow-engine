import pino from 'pino';

export function createLogger(environment: string) {
  const isDevelopment = environment === 'development';

  return pino({
    level: isDevelopment ? 'debug' : 'info',
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });
}

export type Logger = pino.Logger;
