/**
 * Mock Service - 前端配置方案（不再调用后端 Mock API）
 */

// Node-level mock data structure
export interface NodeMockData {
  statusCode: number
  body: any
  headers?: Record<string, string>
}

// Mock instance structure
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

// Execution result structure
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
  bpmnXml?: string
}

// Mock 服务类 - 前端实现（不调用后端 API）
class MockService {
  // 占位实现 - TODO: 实现前端 Mock 执行逻辑
  async executeWorkflow(
    _workflowId: string,
    _request: ExecuteMockRequest = {}
  ): Promise<ExecuteResult> {
    throw new Error('Mock execution not implemented - frontend configuration required')
  }
}

export const mockService = new MockService()
