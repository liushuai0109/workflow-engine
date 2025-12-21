/**
 * Claude Tool Use 执行器
 * 解析 Claude 返回的 Tool Use 并执行相应的编辑器操作
 */

import type { ToolUseBlock } from './ClaudeAPIClient'

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  toolUseId: string
  toolName: string
  result: any
  success: boolean
  error?: string
}

/**
 * 工具执行器配置
 */
export interface ToolExecutorConfig {
  // 编辑器操作回调函数
  createNode?: (params: any) => Promise<any>
  createFlow?: (params: any) => Promise<any>
  createBoundaryEvent?: (params: any) => Promise<any>  // 新增：创建边界事件
  deleteNode?: (params: any) => Promise<any>
  updateNode?: (params: any) => Promise<any>
  clearCanvas?: () => Promise<any>
  getNodes?: () => Promise<any>

  // 自定义工具处理器
  customHandlers?: Record<string, (params: any) => Promise<any>>

  // 错误处理回调
  onError?: (toolName: string, error: Error) => void
}

/**
 * Claude Tool Use 执行器
 */
export class ClaudeToolExecutor {
  private config: ToolExecutorConfig

  constructor(config: ToolExecutorConfig) {
    this.config = config
  }

  /**
   * 解析并执行单个 Tool Use
   */
  async executeTool(toolUse: ToolUseBlock): Promise<ToolExecutionResult> {
    const { id, name, input } = toolUse

    try {
      // 查找处理器
      const handler = this.findHandler(name)

      if (!handler) {
        throw new Error(`Unknown tool: ${name}`)
      }

      // 执行工具
      const result = await handler(input)

      return {
        toolUseId: id,
        toolName: name,
        result,
        success: true
      }
    } catch (error) {
      // 错误处理
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (this.config.onError) {
        this.config.onError(name, error as Error)
      }

      return {
        toolUseId: id,
        toolName: name,
        result: null,
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 批量执行多个 Tool Use
   */
  async executeTools(toolUses: ToolUseBlock[]): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = []

    for (const toolUse of toolUses) {
      const result = await this.executeTool(toolUse)
      results.push(result)

      // 如果某个工具执行失败，可以选择继续或中断
      // 这里选择继续执行，收集所有结果
    }

    return results
  }

  /**
   * 查找工具处理器
   */
  private findHandler(toolName: string): ((params: any) => Promise<any>) | undefined {
    // 先查找自定义处理器
    if (this.config.customHandlers?.[toolName]) {
      return this.config.customHandlers[toolName]
    }

    // 查找内置处理器
    switch (toolName) {
      case 'createNode':
        return this.config.createNode
      case 'createFlow':
        return this.config.createFlow
      case 'createBoundaryEvent':
        return this.config.createBoundaryEvent
      case 'deleteNode':
        return this.config.deleteNode
      case 'updateNode':
        return this.config.updateNode
      case 'clearCanvas':
        return this.config.clearCanvas
      case 'getNodes':
        return this.config.getNodes
      default:
        return undefined
    }
  }

  /**
   * 格式化执行结果为 Claude 消息格式
   * 用于将工具执行结果返回给 Claude
   */
  formatResultsForClaude(results: ToolExecutionResult[]): Array<{
    type: 'tool_result'
    tool_use_id: string
    content: string
    is_error?: boolean
  }> {
    return results.map(result => ({
      type: 'tool_result' as const,
      tool_use_id: result.toolUseId,
      content: result.success
        ? JSON.stringify(result.result, null, 2)
        : `Error: ${result.error}`,
      is_error: !result.success
    }))
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ToolExecutorConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * 从 Claude 响应中提取 Tool Use blocks
 */
export function extractToolUses(content: any): ToolUseBlock[] {
  const toolUses: ToolUseBlock[] = []

  if (!Array.isArray(content)) {
    return toolUses
  }

  for (const block of content) {
    if (block.type === 'tool_use') {
      toolUses.push(block as ToolUseBlock)
    }
  }

  return toolUses
}

/**
 * 检查响应是否包含 Tool Use
 */
export function hasToolUse(content: any): boolean {
  if (!Array.isArray(content)) {
    return false
  }

  return content.some(block => block.type === 'tool_use')
}

/**
 * 创建默认的工具执行器（空操作）
 * 用于测试或占位
 */
export function createNoOpExecutor(): ClaudeToolExecutor {
  return new ClaudeToolExecutor({
    createNode: async (params) => {
      console.log('NoOp: createNode', params)
      return { success: true }
    },
    createFlow: async (params) => {
      console.log('NoOp: createFlow', params)
      return { success: true }
    },
    deleteNode: async (params) => {
      console.log('NoOp: deleteNode', params)
      return { success: true }
    },
    updateNode: async (params) => {
      console.log('NoOp: updateNode', params)
      return { success: true }
    },
    clearCanvas: async () => {
      console.log('NoOp: clearCanvas')
      return { success: true }
    },
    getNodes: async () => {
      console.log('NoOp: getNodes')
      return []
    }
  })
}
