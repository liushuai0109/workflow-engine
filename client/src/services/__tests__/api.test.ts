/**
 * ApiClient Unit Tests
 * Tests interceptor header injection, configuration management, and dry-run functionality
 */

import { ApiClient, type InterceptorMode, type InterceptorConfig } from '../api'

// Mock fetch globally
global.fetch = jest.fn()

describe('ApiClient', () => {
  let client: ApiClient
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    client = new ApiClient('http://api.test.com')
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Configuration Management', () => {
    it('should set interceptor configuration', () => {
      const config: InterceptorConfig = {
        'GetWorkflow:workflow-123': 'enabled',
        'GetInstance:instance-456': 'record'
      }

      client.setInterceptorConfig(config)
      expect(client.getInterceptorConfig()).toEqual(config)
    })

    it('should update single interceptor mode', () => {
      client.updateInterceptorMode('GetWorkflow:workflow-123', 'enabled')

      const config = client.getInterceptorConfig()
      expect(config['GetWorkflow:workflow-123']).toBe('enabled')
    })

    it('should clear interceptor configuration', () => {
      client.setInterceptorConfig({
        'GetWorkflow:workflow-123': 'enabled'
      })

      client.clearInterceptorConfig()
      expect(client.getInterceptorConfig()).toEqual({})
    })

    it('should preserve immutability when getting config', () => {
      const originalConfig: InterceptorConfig = {
        'GetWorkflow:workflow-123': 'enabled'
      }

      client.setInterceptorConfig(originalConfig)
      const retrievedConfig = client.getInterceptorConfig()

      // Modify retrieved config
      retrievedConfig['GetWorkflow:workflow-123'] = 'disabled'

      // Original should be unchanged
      expect(client.getInterceptorConfig()['GetWorkflow:workflow-123']).toBe('enabled')
    })
  })

  describe('Header Injection', () => {
    it('should inject X-Intercept-Config header when config is set', async () => {
      const config: InterceptorConfig = {
        'GetWorkflow:workflow-123': 'enabled',
        'GetInstance:instance-456': 'record'
      }

      client.setInterceptorConfig(config)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.get('/test')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-Intercept-Config')).toBe(JSON.stringify(config))
    })

    it('should not inject X-Intercept-Config header when config is empty', async () => {
      client.clearInterceptorConfig()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.get('/test')

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-Intercept-Config')).toBeNull()
    })

    it('should inject X-Intercept-Dry-Run header in dry-run mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'X-Interceptor-List': JSON.stringify([
            { id: 'GetWorkflow:workflow-123', operation: 'GetWorkflow', params: {} }
          ])
        })
      } as Response)

      await client.dryRun('/execute')

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('X-Intercept-Dry-Run')).toBe('true')
    })

    it('should merge custom headers with interceptor headers', async () => {
      client.setInterceptorConfig({
        'GetWorkflow:workflow-123': 'enabled'
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.request('/test', {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers

      expect(headers.get('Authorization')).toBe('Bearer token123')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
      expect(headers.get('X-Intercept-Config')).toBeTruthy()
    })
  })

  describe('Dry-run Functionality', () => {
    it('should parse interceptor list from response header', async () => {
      const interceptorList = [
        { id: 'GetWorkflow:workflow-123', operation: 'GetWorkflow', params: { workflowId: 'workflow-123' } },
        { id: 'GetInstance:instance-456', operation: 'GetInstance', params: { instanceId: 'instance-456' } }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'X-Interceptor-List': JSON.stringify(interceptorList)
        })
      } as Response)

      const result = await client.dryRun('/execute')

      expect(result).toEqual(interceptorList)
    })

    it('should return empty array when X-Interceptor-List header is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers()
      } as Response)

      const result = await client.dryRun('/execute')

      expect(result).toEqual([])
    })

    it('should handle invalid JSON in X-Interceptor-List header', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'X-Interceptor-List': 'invalid-json'
        })
      } as Response)

      const result = await client.dryRun('/execute')

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse interceptor list:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should throw error when dry-run request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(client.dryRun('/execute')).rejects.toThrow('Dry-run request failed: Internal Server Error')
    })
  })

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      const result = await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/test',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual({ data: 'test' })
    })

    it('should make POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      const body = { key: 'value' }
      await client.post('/test', body)

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1]?.method).toBe('POST')
      expect(callArgs[1]?.body).toBe(JSON.stringify(body))

      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('should make PUT request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.put('/test', { key: 'value' })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/test',
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.delete('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test.com/test',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Response Handling', () => {
    it('should parse JSON response', async () => {
      const jsonData = { key: 'value' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => jsonData,
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      const result = await client.get('/test')
      expect(result).toEqual(jsonData)
    })

    it('should parse text response', async () => {
      const textData = 'plain text response'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => textData,
        headers: new Headers({ 'content-type': 'text/plain' })
      } as Response)

      const result = await client.get('/test')
      expect(result).toBe(textData)
    })

    it('should handle blob response', async () => {
      const blobData = new Blob(['binary data'])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => blobData,
        headers: new Headers({ 'content-type': 'application/octet-stream' })
      } as Response)

      const result = await client.get('/test')
      expect(result).toBe(blobData)
    })

    it('should throw error for failed requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Resource not found'
      } as Response)

      await expect(client.get('/test')).rejects.toThrow('API request failed: 404 Not Found - Resource not found')
    })
  })

  describe('URL Construction', () => {
    it('should construct URL with relative path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.get('/test')
      expect(mockFetch).toHaveBeenCalledWith('http://api.test.com/test', expect.any(Object))
    })

    it('should handle path without leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.get('test')
      expect(mockFetch).toHaveBeenCalledWith('http://api.test.com/test', expect.any(Object))
    })

    it('should handle absolute URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await client.get('https://external.api.com/test')
      expect(mockFetch).toHaveBeenCalledWith('https://external.api.com/test', expect.any(Object))
    })

    it('should handle baseUrl with trailing slash', async () => {
      const clientWithTrailingSlash = new ApiClient('http://api.test.com/')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ 'content-type': 'application/json' })
      } as Response)

      await clientWithTrailingSlash.get('/test')
      expect(mockFetch).toHaveBeenCalledWith('http://api.test.com/test', expect.any(Object))
    })
  })

  describe('Dry-run Mode Toggle', () => {
    it('should enable dry-run mode', () => {
      client.enableDryRun()
      expect(client.isDryRunEnabled()).toBe(true)
    })

    it('should disable dry-run mode', () => {
      client.enableDryRun()
      client.disableDryRun()
      expect(client.isDryRunEnabled()).toBe(false)
    })

    it('should start with dry-run mode disabled', () => {
      expect(client.isDryRunEnabled()).toBe(false)
    })
  })
})
