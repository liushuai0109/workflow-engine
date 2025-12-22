// API Client with Interceptor Header Support
// Provides HTTP request functionality with automatic interceptor header injection

export type InterceptorMode = 'enabled' | 'disabled' | 'record'

export interface InterceptorConfig {
  [interceptorId: string]: InterceptorMode
}

export interface InterceptorInfo {
  id: string
  operation: string
  params: Record<string, any>
}

export interface RequestOptions extends RequestInit {
  headers?: HeadersInit
}

/**
 * API Client with interceptor configuration support
 */
export class ApiClient {
  private baseUrl: string
  private interceptorConfig: InterceptorConfig = {}
  private dryRunMode: boolean = false

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Set interceptor configuration
   * @param config - Map of interceptor IDs to their modes (enabled/disabled/record)
   */
  setInterceptorConfig(config: InterceptorConfig): void {
    this.interceptorConfig = { ...config }
  }

  /**
   * Update a single interceptor's mode
   * @param interceptorId - The interceptor ID (e.g., "GetInstance:instance-123")
   * @param mode - The mode to set (enabled/disabled/record)
   */
  updateInterceptorMode(interceptorId: string, mode: InterceptorMode): void {
    this.interceptorConfig[interceptorId] = mode
  }

  /**
   * Clear all interceptor configuration
   */
  clearInterceptorConfig(): void {
    this.interceptorConfig = {}
  }

  /**
   * Get current interceptor configuration
   */
  getInterceptorConfig(): InterceptorConfig {
    return { ...this.interceptorConfig }
  }

  /**
   * Perform a dry-run request to get list of interceptors that would be called
   * @param url - The API endpoint
   * @param options - Request options
   * @returns Array of interceptor information
   */
  async dryRun(url: string, options: RequestOptions = {}): Promise<InterceptorInfo[]> {
    const headers = this.getHeaders(options.headers, true)
    const fullUrl = this.getFullUrl(url)

    const response = await fetch(fullUrl, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`Dry-run request failed: ${response.statusText}`)
    }

    // Parse X-Interceptor-List header
    const interceptorListHeader = response.headers.get('X-Interceptor-List')
    if (!interceptorListHeader) {
      return []
    }

    try {
      return JSON.parse(interceptorListHeader)
    } catch (error) {
      console.error('Failed to parse interceptor list:', error)
      return []
    }
  }

  /**
   * Make an HTTP request with automatic interceptor header injection
   * @param url - The API endpoint (relative to baseUrl)
   * @param options - Request options
   * @returns Response object
   */
  async request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const headers = this.getHeaders(options.headers, false)
    const fullUrl = this.getFullUrl(url)

    const response = await fetch(fullUrl, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // Handle different content types
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    } else if (contentType?.includes('text/')) {
      return await response.text() as any
    } else {
      return await response.blob() as any
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(url: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers)
    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(url: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers)
    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  /**
   * Get headers with interceptor configuration injected
   * @param customHeaders - Custom headers provided by caller
   * @param isDryRun - Whether this is a dry-run request
   * @returns Headers object with interceptor headers
   */
  private getHeaders(customHeaders?: HeadersInit, isDryRun: boolean = false): Headers {
    const headers = new Headers(customHeaders)

    // Add dry-run header if enabled
    if (isDryRun) {
      headers.set('X-Intercept-Dry-Run', 'true')
    }

    // Add interceptor config header if configuration exists
    if (Object.keys(this.interceptorConfig).length > 0) {
      const configJson = JSON.stringify(this.interceptorConfig)
      headers.set('X-Intercept-Config', configJson)
    }

    return headers
  }

  /**
   * Get full URL by combining base URL with relative path
   */
  private getFullUrl(url: string): string {
    // If URL is already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    // Remove leading slash from url if present
    const path = url.startsWith('/') ? url.slice(1) : url

    // Remove trailing slash from baseUrl if present
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl

    return `${base}/${path}`
  }

  /**
   * Enable dry-run mode for all subsequent requests
   */
  enableDryRun(): void {
    this.dryRunMode = true
  }

  /**
   * Disable dry-run mode
   */
  disableDryRun(): void {
    this.dryRunMode = false
  }

  /**
   * Check if dry-run mode is enabled
   */
  isDryRunEnabled(): boolean {
    return this.dryRunMode
  }
}

// Export a default instance with full API URL
// Requests will be sent directly to http://api.workflow.com:3000/api/*
export const apiClient = new ApiClient('http://api.workflow.com:3000/api')

// Export default for easy importing
export default apiClient
