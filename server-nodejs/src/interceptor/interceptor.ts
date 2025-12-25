/**
 * Interceptor for mocking and testing workflow execution
 * Simplified TypeScript implementation based on Go version
 */

export enum InterceptMode {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  RECORD = 'record',
}

export interface ExecutionLogEntry {
  timestamp: Date;
  operation: string;
  input?: any;
  output?: any;
  isMocked: boolean;
  error?: string;
}

export interface InterceptSession {
  id: string;
  instanceId: string;
  mode: InterceptMode;
  dataStore: Map<string, any>;
  executionLog: ExecutionLogEntry[];
  createdAt: Date;
}

export interface InterceptConfig {
  configMap: Record<string, string>;
  mockData: Map<string, any>;
}

export class InterceptorContext {
  private session?: InterceptSession;
  private config?: InterceptConfig;
  private callRecorder?: (name: string, input: any, output: any) => void;

  constructor() {
    // Empty constructor
  }

  setSession(session: InterceptSession): void {
    this.session = session;
  }

  getSession(): InterceptSession | undefined {
    return this.session;
  }

  setConfig(config: InterceptConfig): void {
    this.config = config;
  }

  getConfig(): InterceptConfig | undefined {
    return this.config;
  }

  setCallRecorder(recorder: (name: string, input: any, output: any) => void): void {
    this.callRecorder = recorder;
  }

  recordCall(name: string, input: any, output: any): void {
    if (this.callRecorder) {
      this.callRecorder(name, input, output);
    }
  }
}

/**
 * Create a new InterceptConfig
 */
export function createInterceptConfig(configMap?: Record<string, string>): InterceptConfig {
  return {
    configMap: configMap || {},
    mockData: new Map<string, any>(),
  };
}

/**
 * Get mode for the given interceptor ID
 * Supports wildcard "*" for setting default mode for all interceptors
 * Priority: specific interceptor config > wildcard config > system default (record)
 */
export function getMode(config: InterceptConfig, interceptorId: string): InterceptMode {
  // 1. Check for specific interceptor configuration
  if (config.configMap[interceptorId]) {
    return config.configMap[interceptorId] as InterceptMode;
  }

  // 2. Check for wildcard "*" configuration
  if (config.configMap['*']) {
    return config.configMap['*'] as InterceptMode;
  }

  // 3. Return system default
  return InterceptMode.RECORD;
}

/**
 * Get mock data for the given interceptor ID
 */
export function getMockData(config: InterceptConfig, interceptorId: string): any | undefined {
  return config.mockData.get(interceptorId);
}

/**
 * Set mock data for the given interceptor ID
 */
export function setMockData(config: InterceptConfig, interceptorId: string, data: any): void {
  config.mockData.set(interceptorId, data);
}

/**
 * Generate interceptor ID from operation and parameters
 * Simplified version - uses JSON stringification of ID fields
 */
export function generateInterceptorId(operation: string, params: any): string {
  if (!params || typeof params !== 'object') {
    return `${operation}:${params}`;
  }

  // Extract ID fields (fields that have 'id' in their name)
  const idParts: string[] = [operation];

  for (const [key, value] of Object.entries(params)) {
    if (key.toLowerCase().includes('id')) {
      idParts.push(String(value));
    }
  }

  return idParts.join(':');
}

/**
 * Generate mock data based on operation and params
 * Used when in ENABLED mode but no explicit mock data is provided
 */
function generateMockData(operation: string, params: any): any {
  const now = new Date();

  switch (operation) {
    case 'UpdateInstance':
      // Return updated instance based on params
      return {
        id: params.instanceId,
        workflowId: params.workflowId || 'mock-workflow-id',
        name: `Mock Instance ${params.instanceId}`,
        status: params.status,
        currentNodeIds: params.nextNodes || [],
        instanceVersion: 1,
        createdAt: now,
        updatedAt: now,
      };

    case 'CreateExecution':
      // Return created execution based on params
      return {
        id: `mock-execution-${params.instanceId}`,
        instanceId: params.instanceId,
        workflowId: params.workflowId,
        status: 'pending',
        variables: params.variables || {},
        errorMessage: '',
        createdAt: now,
        updatedAt: now,
      };

    case 'UpdateExecution':
      // Return updated execution based on params
      return {
        id: params.executionId,
        instanceId: params.instanceId || 'mock-instance-id',
        workflowId: params.workflowId || 'mock-workflow-id',
        status: params.status,
        variables: params.variables || {},
        errorMessage: params.errorMessage || '',
        createdAt: now,
        updatedAt: now,
      };

    case 'ExecuteNode':
      // Return null for node execution (most nodes don't return a value)
      return null;

    default:
      // For unknown operations, return a generic mock object with the params
      return { ...params, _mocked: true, _timestamp: now.toISOString() };
  }
}

/**
 * Core interceptor function that intercepts function calls
 */
export async function intercept<T, P>(
  context: InterceptorContext,
  operation: string,
  fn: (params: P) => Promise<T>,
  params: P
): Promise<T> {
  // 1. Generate interceptor ID
  const interceptorId = generateInterceptorId(operation, params);

  // 2. Check for InterceptSession (old approach, for backwards compatibility)
  const session = context.getSession();
  if (session) {
    return await interceptWithSession(context, interceptorId, operation, fn, params, session);
  }

  // 3. Get interceptor config (new approach)
  const config = context.getConfig();
  if (!config) {
    // No config, execute real function
    return await fn(params);
  }

  const mode = getMode(config, interceptorId);

  // 4. Execute based on mode
  switch (mode) {
    case InterceptMode.DISABLED:
      // Disabled mode: execute directly without recording
      return await fn(params);

    case InterceptMode.ENABLED:
      // Enabled mode: prioritize mock data
      const mockData = getMockData(config, interceptorId);
      if (mockData !== undefined) {
        logExecution(context, interceptorId, params, mockData, true, '');
        context.recordCall(interceptorId, params, mockData);
        return mockData as T;
      }

      // Mock data not found, auto-generate based on operation and params
      const generatedMockData = generateMockData(operation, params);
      logExecution(context, interceptorId, params, generatedMockData, true, '');
      context.recordCall(interceptorId, params, generatedMockData);
      return generatedMockData as T;

    case InterceptMode.RECORD:
      // Record mode: execute real function and record
      try {
        const result = await fn(params);
        setMockData(config, interceptorId, result);
        logExecution(context, interceptorId, params, result, false, '');
        context.recordCall(interceptorId, params, result);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logExecution(context, interceptorId, params, null, false, errorMsg);
        context.recordCall(interceptorId, params, null);
        throw error;
      }

    default:
      // Default: record mode
      try {
        const result = await fn(params);
        logExecution(context, interceptorId, params, result, false, '');
        context.recordCall(interceptorId, params, result);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logExecution(context, interceptorId, params, null, false, errorMsg);
        context.recordCall(interceptorId, params, null);
        throw error;
      }
  }
}

/**
 * Handle interception using InterceptSession (backwards compatibility)
 */
async function interceptWithSession<T, P>(
  context: InterceptorContext,
  interceptorId: string,
  operation: string,
  fn: (params: P) => Promise<T>,
  params: P,
  session: InterceptSession
): Promise<T> {
  const startTime = new Date();

  // Execute based on session mode
  switch (session.mode) {
    case InterceptMode.DISABLED:
      // Disabled: just execute
      return await fn(params);

    case InterceptMode.ENABLED:
      // Enabled: try mock data first
      const mockData = session.dataStore.get(interceptorId);
      if (mockData !== undefined) {
        // Return mock data
        session.executionLog.push({
          timestamp: startTime,
          operation,
          input: params,
          output: mockData,
          isMocked: true,
        });
        context.recordCall(interceptorId, params, mockData);
        return mockData as T;
      }

      // Mock data not found, fallback to real
      try {
        const result = await fn(params);
        session.executionLog.push({
          timestamp: startTime,
          operation,
          input: params,
          output: result,
          isMocked: false,
        });
        context.recordCall(interceptorId, params, result);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        session.executionLog.push({
          timestamp: startTime,
          operation,
          input: params,
          isMocked: false,
          error: errorMsg,
        });
        context.recordCall(interceptorId, params, null);
        throw error;
      }

    case InterceptMode.RECORD:
      // Record: execute and store result
      try {
        const result = await fn(params);
        session.dataStore.set(interceptorId, result);
        session.executionLog.push({
          timestamp: startTime,
          operation,
          input: params,
          output: result,
          isMocked: false,
        });
        context.recordCall(interceptorId, params, result);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        session.executionLog.push({
          timestamp: startTime,
          operation,
          input: params,
          isMocked: false,
          error: errorMsg,
        });
        context.recordCall(interceptorId, params, null);
        throw error;
      }

    default:
      // Default: just execute
      return await fn(params);
  }
}

/**
 * Log execution
 */
function logExecution(
  context: InterceptorContext,
  interceptorId: string,
  input: any,
  output: any,
  isMocked: boolean,
  errorMsg: string
): void {
  const session = context.getSession();
  if (session) {
    session.executionLog.push({
      timestamp: new Date(),
      operation: interceptorId,
      input,
      output,
      isMocked,
      error: errorMsg || undefined,
    });
  }
}
