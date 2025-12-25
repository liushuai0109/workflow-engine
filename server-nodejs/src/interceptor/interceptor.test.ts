import {
  InterceptMode,
  InterceptorContext,
  createInterceptConfig,
  getMode,
  getMockData,
  setMockData,
  intercept,
  generateInterceptorId,
} from '../interceptor';

describe('Interceptor', () => {
  describe('createInterceptConfig', () => {
    it('should create config with empty configMap by default', () => {
      const config = createInterceptConfig();
      expect(config.configMap).toEqual({});
      expect(config.mockData).toBeInstanceOf(Map);
    });

    it('should create config with provided configMap', () => {
      const configMap = { operation1: 'enabled', operation2: 'disabled' };
      const config = createInterceptConfig(configMap);
      expect(config.configMap).toEqual(configMap);
    });
  });

  describe('getMode', () => {
    it('should return specific interceptor mode if configured', () => {
      const config = createInterceptConfig({ operation1: 'enabled' });
      expect(getMode(config, 'operation1')).toBe(InterceptMode.ENABLED);
    });

    it('should return wildcard mode if specific not found', () => {
      const config = createInterceptConfig({ '*': 'disabled' });
      expect(getMode(config, 'operation1')).toBe(InterceptMode.DISABLED);
    });

    it('should return RECORD as default mode', () => {
      const config = createInterceptConfig();
      expect(getMode(config, 'operation1')).toBe(InterceptMode.RECORD);
    });

    it('should prioritize specific over wildcard', () => {
      const config = createInterceptConfig({
        '*': 'disabled',
        operation1: 'enabled',
      });
      expect(getMode(config, 'operation1')).toBe(InterceptMode.ENABLED);
      expect(getMode(config, 'operation2')).toBe(InterceptMode.DISABLED);
    });
  });

  describe('getMockData and setMockData', () => {
    it('should store and retrieve mock data', () => {
      const config = createInterceptConfig();
      const mockData = { id: '123', name: 'Test' };

      setMockData(config, 'operation1', mockData);
      expect(getMockData(config, 'operation1')).toEqual(mockData);
    });

    it('should return undefined for non-existent mock data', () => {
      const config = createInterceptConfig();
      expect(getMockData(config, 'operation1')).toBeUndefined();
    });
  });

  describe('generateInterceptorId', () => {
    it('should generate ID from operation and simple params', () => {
      const id = generateInterceptorId('GetUser', 'user123');
      expect(id).toBe('GetUser:user123');
    });

    it('should extract id fields from object params', () => {
      const params = { userId: 'user123', name: 'John', age: 30 };
      const id = generateInterceptorId('GetUser', params);
      expect(id).toContain('GetUser');
      expect(id).toContain('user123');
    });

    it('should handle params without id fields', () => {
      const params = { name: 'John', age: 30 };
      const id = generateInterceptorId('CreateUser', params);
      expect(id).toBe('CreateUser:');
    });
  });

  describe('intercept', () => {
    it('should execute real function when mode is DISABLED', async () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'disabled' });
      context.setConfig(config);

      const mockFn = jest.fn().mockResolvedValue({ result: 'success' });
      const result = await intercept(context, 'TestOp', mockFn, { id: '123' });

      expect(mockFn).toHaveBeenCalledWith({ id: '123' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should return mock data when mode is ENABLED and mock exists', async () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'enabled' });
      const mockData = { result: 'mocked' };
      setMockData(config, 'TestOp:123', mockData);
      context.setConfig(config);

      const mockFn = jest.fn();
      const result = await intercept(context, 'TestOp', mockFn, { id: '123' });

      expect(mockFn).not.toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should execute real function when mode is ENABLED but no mock data', async () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'enabled' });
      context.setConfig(config);

      const mockFn = jest.fn().mockResolvedValue({ result: 'real' });
      const result = await intercept(context, 'TestOp', mockFn, { id: '123' });

      expect(mockFn).toHaveBeenCalled();
      expect(result).toEqual({ result: 'real' });
    });

    it('should execute and store result when mode is RECORD', async () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'record' });
      context.setConfig(config);

      const realResult = { result: 'success' };
      const mockFn = jest.fn().mockResolvedValue(realResult);
      const result = await intercept(context, 'TestOp', mockFn, { id: '123' });

      expect(mockFn).toHaveBeenCalled();
      expect(result).toEqual(realResult);
      expect(getMockData(config, 'TestOp:123')).toEqual(realResult);
    });

    it('should call recorder callback when set', async () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'disabled' });
      context.setConfig(config);

      const recorderFn = jest.fn();
      context.setCallRecorder(recorderFn);

      const mockFn = jest.fn().mockResolvedValue({ result: 'success' });
      await intercept(context, 'TestOp', mockFn, { id: '123' });

      expect(recorderFn).toHaveBeenCalledWith(
        'TestOp:123',
        { id: '123' },
        { result: 'success' }
      );
    });

    it('should handle function errors correctly', async () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'record' });
      context.setConfig(config);

      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(intercept(context, 'TestOp', mockFn, { id: '123' })).rejects.toThrow(
        'Test error'
      );
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('InterceptorContext', () => {
    it('should store and retrieve session', () => {
      const context = new InterceptorContext();
      const session = {
        id: 'session123',
        instanceId: 'instance123',
        mode: InterceptMode.ENABLED,
        dataStore: new Map(),
        executionLog: [],
        createdAt: new Date(),
      };

      context.setSession(session);
      expect(context.getSession()).toEqual(session);
    });

    it('should store and retrieve config', () => {
      const context = new InterceptorContext();
      const config = createInterceptConfig({ '*': 'enabled' });

      context.setConfig(config);
      expect(context.getConfig()).toEqual(config);
    });

    it('should store and call recorder', () => {
      const context = new InterceptorContext();
      const recorderFn = jest.fn();

      context.setCallRecorder(recorderFn);
      context.recordCall('operation1', { input: 'test' }, { output: 'result' });

      expect(recorderFn).toHaveBeenCalledWith('operation1', { input: 'test' }, { output: 'result' });
    });
  });
});
