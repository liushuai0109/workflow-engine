// Interceptor Service for frontend
// Provides API communication with backend interceptor endpoints

export interface InterceptSession {
  sessionId: string
  instanceId: string
  workflowId: string
  status: string
  currentNodeIds: string[]
  variables: Record<string, any>
}

export interface TriggerNodeRequest {
  nodeId: string
  businessParams?: Record<string, any>
}

export interface TriggerNodeResult {
  result: ExecuteResult
  executionLog: ExecutionLogEntry[]
}

export interface ExecutionLogEntry {
  timestamp: string
  operation: string
  input?: any
  output?: any
  isMocked: boolean
  error?: string
}

export interface InitializeInterceptRequest {
  startNodeId?: string
  initialVariables?: Record<string, any>
  mockData?: Record<string, NodeMockData>
  bpmnXml?: string
}

export interface NodeMockData {
  statusCode: number
  body: any
  headers?: Record<string, string>
}

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
}

export class InterceptorService {
  private baseUrl = '/api/interceptor'

  /**
   * Initialize interceptor execution
   */
  async initializeIntercept(
    workflowId: string,
    mockData: Record<string, any>,
    initialVariables?: Record<string, any>,
    bpmnXml?: string
  ): Promise<InterceptSession> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mockData,
        initialVariables,
        bpmnXml
      })
    })

    if (!response.ok) {
      throw new Error('Failed to initialize interceptor execution')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Trigger node to continue execution
   */
  async triggerNode(
    sessionId: string,
    instanceId: string,
    request: TriggerNodeRequest
  ): Promise<TriggerNodeResult> {
    const response = await fetch(
      `${this.baseUrl}/instances/${instanceId}/trigger?sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }
    )

    if (!response.ok) {
      throw new Error('Failed to trigger node')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<InterceptSession> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`)

    if (!response.ok) {
      throw new Error('Failed to get session')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Get execution log
   */
  async getExecutionLog(sessionId: string): Promise<ExecutionLogEntry[]> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/log`)

    if (!response.ok) {
      throw new Error('Failed to get execution log')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Reset execution
   */
  async resetExecution(sessionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/sessions/${sessionId}/reset`, {
      method: 'POST'
    })
  }
}

export const interceptorService = new InterceptorService()
