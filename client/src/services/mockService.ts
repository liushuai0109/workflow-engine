/**
 * Mock Service - 处理工作流 Mock 执行相关的 API 调用
 */

export interface MockConfig {
  id?: string
  workflowId: string
  name: string
  description?: string
  nodeConfigs: Record<string, NodeConfig>
  gatewayConfigs: Record<string, GatewayConfig>
  createdAt?: string
  updatedAt?: string
}

export interface NodeConfig {
  mockResponse?: any
  delay?: number // milliseconds
  shouldFail?: boolean
  errorMessage?: string
}

export interface GatewayConfig {
  selectedPath: string // sequence flow ID
}

// Node-level mock data structure (matches backend)
export interface NodeMockData {
  statusCode: number
  body: any
  headers?: Record<string, string>
}

// Mock instance structure (matches backend MockWorkflowInstance)
export interface MockInstance {
  id: string
  workflowId: string
  status: string
  currentNodeIds: string[]
  variables: Record<string, any>
  instanceVersion: number
  createdAt: string
  updatedAt: string
}

// Interceptor call record structure
export interface InterceptorCall {
  name: string
  order: number
  timestamp: string
  input: Record<string, any>
  output: Record<string, any>
}

// Execution result structure (matches backend ExecuteResult)
export interface ExecuteResult {
  businessResponse?: {
    statusCode: number
    body: any
    headers?: Record<string, string>
  }
  engineResponse: {
    instanceId: string
    currentNodeIds: string[]
    nextNodeIds?: string[]
    status: string
    executionId: string
    variables: Record<string, any>
  }
  interceptorCalls?: InterceptorCall[]
  requestParams?: Record<string, any>
}

// Legacy MockExecution for backwards compatibility
export interface MockExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  currentNodeId: string
  variables: Record<string, any>
  executedNodes: string[]
  createdAt: string
  updatedAt: string
}

export interface ExecuteMockRequest {
  startNodeId?: string
  initialVariables?: Record<string, any>
  nodeMockData?: Record<string, NodeMockData>
  bpmnXml?: string // Optional BPMN XML for database-free mode
}

export interface StepMockRequest {
  businessParams?: Record<string, any>
  nodeMockData?: Record<string, NodeMockData>
}

class MockService {
  private baseUrl: string

  constructor() {
    // Get API base URL from environment or config
    // If using domain but cannot resolve, use IP:port
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://api.workflow.com:3000/api'
  }

  /**
   * Execute Mock workflow (new API - returns ExecuteResult)
   */
  async executeWorkflow(
    workflowId: string,
    request: ExecuteMockRequest = {}
  ): Promise<ExecuteResult> {
    console.log('MockService.executeWorkflow called with:', { workflowId, request })

    const url = `${this.baseUrl}/workflows/${workflowId}/mock/execute`
    console.log('Request URL:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log('Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)

      let error
      try {
        error = JSON.parse(errorText)
      } catch (e) {
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      throw new Error(error.error?.message || error.message || 'Failed to execute mock workflow')
    }

    const responseText = await response.text()
    console.log('Response body:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse response:', e)
      throw new Error('Invalid JSON response from server')
    }

    console.log('Parsed result:', result)
    return result.data
  }

  /**
   * Get Mock instance by ID
   */
  async getInstance(instanceId: string): Promise<MockInstance> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/instances/${instanceId}`)

    if (!response.ok) {
      let errorMessage = 'Failed to get mock instance'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch (e) {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Step execution (new API - uses instanceId)
   */
  async stepExecution(instanceId: string, request: StepMockRequest = {}): Promise<ExecuteResult> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/instances/${instanceId}/step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to step execution'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch (e) {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Legacy: Get execution (for backwards compatibility)
   * This now fetches the mock instance and converts it to the old format
   */
  async getExecution(executionId: string): Promise<MockExecution> {
    // Assuming executionId is actually instanceId in the new system
    const instance = await this.getInstance(executionId)

    // Convert MockInstance to MockExecution format
    return {
      id: instance.id,
      workflowId: instance.workflowId,
      status: this.convertStatus(instance.status),
      currentNodeId: instance.currentNodeIds[0] || '',
      variables: instance.variables,
      executedNodes: [], // Not tracked in new system
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    }
  }

  /**
   * Legacy: Continue execution
   */
  async continueExecution(executionId: string): Promise<MockExecution> {
    const response = await fetch(
      `${this.baseUrl}/workflows/mock/executions/${executionId}/continue`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      let errorMessage = 'Failed to continue execution'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch (e) {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Legacy: Stop execution
   */
  async stopExecution(executionId: string): Promise<MockExecution> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/executions/${executionId}/stop`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || error.message || 'Failed to stop execution')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Convert status from backend format to frontend format
   */
  private convertStatus(status: string): 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped' {
    const statusMap: Record<string, any> = {
      'pending': 'pending',
      'running': 'running',
      'paused': 'paused',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'stopped',
    }
    return statusMap[status] || 'running'
  }

  /**
   * Create Mock configuration
   */
  async createConfig(workflowId: string, config: Omit<MockConfig, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>): Promise<MockConfig> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/mock/configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create mock config')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Get all Mock configurations for a workflow
   */
  async getConfigs(workflowId: string): Promise<MockConfig[]> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/mock/configs`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get mock configs')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Get single Mock configuration
   */
  async getConfig(configId: string): Promise<MockConfig> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/configs/${configId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get mock config')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Update Mock configuration
   */
  async updateConfig(
    configId: string,
    config: Omit<MockConfig, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>
  ): Promise<MockConfig> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/configs/${configId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update mock config')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Delete Mock configuration
   */
  async deleteConfig(configId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/configs/${configId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete mock config')
    }
  }
}

export const mockService = new MockService()


