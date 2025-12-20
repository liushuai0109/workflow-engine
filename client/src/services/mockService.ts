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
  configId?: string
  initialVariables?: Record<string, any>
  bpmnXml?: string // 可选的 BPMN XML，用于无数据库模式
}

class MockService {
  private baseUrl: string

  constructor() {
    // 从环境变量或配置中获取 API 基础 URL
    // 如果使用域名但无法解析，使用 IP:端口
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://api.workflow.com:3000/api'
  }

  /**
   * 执行 Mock 工作流
   */
  async executeWorkflow(
    workflowId: string,
    request: ExecuteMockRequest = {}
  ): Promise<MockExecution> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/mock/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to execute mock workflow')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 获取 Mock 执行状态
   */
  async getExecution(executionId: string): Promise<MockExecution> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/executions/${executionId}`)

    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = 'Failed to get mock execution'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch (e) {
        // 如果响应不是 JSON，使用状态文本
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 单步执行
   */
  async stepExecution(executionId: string): Promise<MockExecution> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/executions/${executionId}/step`, {
      method: 'POST',
    })

    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = 'Failed to step execution'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch (e) {
        // 如果响应不是 JSON，使用状态文本
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 继续执行
   */
  async continueExecution(executionId: string): Promise<MockExecution> {
    const response = await fetch(
      `${this.baseUrl}/workflows/mock/executions/${executionId}/continue`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = 'Failed to continue execution'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || errorMessage
      } catch (e) {
        // 如果响应不是 JSON，使用状态文本
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 停止执行
   */
  async stopExecution(executionId: string): Promise<MockExecution> {
    const response = await fetch(`${this.baseUrl}/workflows/mock/executions/${executionId}/stop`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to stop execution')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 创建 Mock 配置
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
   * 获取工作流的所有 Mock 配置
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
   * 获取单个 Mock 配置
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
   * 更新 Mock 配置
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
   * 删除 Mock 配置
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

