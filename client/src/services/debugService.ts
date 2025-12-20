/**
 * Debug Service - 处理工作流 Debug 相关的 API 调用
 */

export interface DebugSession {
  id: string
  workflowId: string
  executionId?: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'stopped'
  currentNodeId: string
  variables: Record<string, any>
  breakpoints: string[]
  callStack: CallStackFrame[]
  createdAt: string
  updatedAt: string
}

export interface CallStackFrame {
  nodeId: string
  nodeName: string
  nodeType: number
  variables: Record<string, any>
  enteredAt: string
}

export interface StartDebugRequest {
  executionId?: string
  initialVariables?: Record<string, any>
  breakpoints?: string[]
}

class DebugService {
  private baseUrl: string

  constructor() {
    // 如果使用域名但无法解析，使用 IP:端口
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://api.workflow.com:3000/api'
  }

  /**
   * 启动 Debug 会话
   */
  async startDebug(workflowId: string, request: StartDebugRequest = {}): Promise<DebugSession> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/debug/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to start debug session')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 获取 Debug 会话
   */
  async getSession(sessionId: string): Promise<DebugSession> {
    const response = await fetch(`${this.baseUrl}/workflows/debug/sessions/${sessionId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get debug session')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 单步执行
   */
  async stepSession(sessionId: string): Promise<DebugSession> {
    const response = await fetch(`${this.baseUrl}/workflows/debug/sessions/${sessionId}/step`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to step debug session')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 继续执行
   */
  async continueSession(sessionId: string): Promise<DebugSession> {
    const response = await fetch(
      `${this.baseUrl}/workflows/debug/sessions/${sessionId}/continue`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to continue debug session')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 停止 Debug 会话
   */
  async stopSession(sessionId: string): Promise<DebugSession> {
    const response = await fetch(`${this.baseUrl}/workflows/debug/sessions/${sessionId}/stop`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to stop debug session')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 获取变量
   */
  async getVariables(sessionId: string): Promise<Record<string, any>> {
    const response = await fetch(`${this.baseUrl}/workflows/debug/sessions/${sessionId}/variables`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get variables')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 获取节点信息
   */
  async getNode(sessionId: string, nodeId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/workflows/debug/sessions/${sessionId}/nodes/${nodeId}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get node info')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 设置断点
   */
  async setBreakpoints(sessionId: string, breakpoints: string[]): Promise<DebugSession> {
    const response = await fetch(
      `${this.baseUrl}/workflows/debug/sessions/${sessionId}/breakpoints`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ breakpoints }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to set breakpoints')
    }

    const result = await response.json()
    return result.data
  }

  /**
   * 获取执行历史
   */
  async getExecutionHistories(
    executionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ histories: ExecutionHistory[]; total: number; limit: number; offset: number }> {
    const response = await fetch(
      `${this.baseUrl}/executions/${executionId}/histories?limit=${limit}&offset=${offset}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to get execution histories')
    }

    const result = await response.json()
    return result.data
  }
}

export interface ExecutionHistory {
  id: string
  executionId: string
  nodeId: string
  nodeName: string
  nodeType: number
  inputData: Record<string, any>
  outputData: Record<string, any>
  variablesBefore: Record<string, any>
  variablesAfter: Record<string, any>
  executionTimeMs: number
  errorMessage?: string
  executedAt: string
}

export const debugService = new DebugService()

