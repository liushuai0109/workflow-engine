import { Context, Next } from 'koa';
import {
  InterceptorContext,
  createInterceptConfig,
} from '../interceptor/interceptor';

const interceptorStorage = new Map<string, any>();

export async function interceptorMiddleware(ctx: Context, next: Next) {
  const sessionId = ctx.get('X-Interceptor-Session-ID');
  const configHeader = ctx.get('X-Intercept-Config');

  // Create InterceptorContext for this request
  const interceptorContext = new InterceptorContext();

  // Parse and set interceptor config from header if present
  if (configHeader) {
    try {
      const configData = JSON.parse(configHeader);

      // Only support simple format: {"*":"enabled", "key1":"disabled"}
      const configMap = configData;

      // Create config
      const config = createInterceptConfig(configMap);

      interceptorContext.setConfig(config);
    } catch (error) {
      console.error('Failed to parse X-Intercept-Config header:', error);
    }
  }

  // Set up call recorder callback to store interceptor calls in context state
  const interceptorCalls: any[] = [];
  interceptorContext.setCallRecorder((name: string, input: any, output: any) => {
    interceptorCalls.push({
      name,
      order: interceptorCalls.length + 1,
      timestamp: new Date().toISOString(),
      input,
      output,
    });
  });

  // Store interceptor context in Koa context state
  ctx.state.interceptorContext = interceptorContext;
  ctx.state.interceptorCalls = interceptorCalls;

  // Legacy support for session-based interception
  if (sessionId) {
    ctx.state.interceptorSessionId = sessionId;
    ctx.state.interceptorData = interceptorStorage.get(sessionId) || {};
  }

  await next();

  // Legacy support
  if (sessionId && ctx.state.interceptorData) {
    interceptorStorage.set(sessionId, ctx.state.interceptorData);
  }
}

export function getInterceptorContext(ctx: Context): InterceptorContext | undefined {
  return ctx.state.interceptorContext;
}

export function getInterceptorData(sessionId: string) {
  return interceptorStorage.get(sessionId);
}

export function setInterceptorData(sessionId: string, data: any) {
  interceptorStorage.set(sessionId, data);
}

export function clearInterceptorData(sessionId: string) {
  interceptorStorage.delete(sessionId);
}
