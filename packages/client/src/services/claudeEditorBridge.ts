/**
 * Claude Editor Bridge
 * 连接 Claude Tool Executor 和 BPMN Editor Operations
 */

import { editorOperationService } from './editorOperationService'
import type { ToolExecutorConfig } from './claude/toolExecutor'

/**
 * 创建 Claude 工具执行器配置
 * 将 LLM 工具调用映射到实际的编辑器操作
 */
export function createClaudeEditorBridge(): ToolExecutorConfig {
  return {
    /**
     * 创建节点
     */
    createNode: async (params: {
      id: string
      name?: string
      type: 'startEvent' | 'endEvent' | 'userTask' | 'serviceTask' | 'exclusiveGateway' | 'parallelGateway'
      x: number
      y: number
    }) => {
      try {
        const { id, name, type, x, y } = params

        // 调用编辑器操作服务
        const element = editorOperationService.createNode({
          id,
          name,
          type,
          position: { x, y }
        })

        return {
          success: true,
          elementId: id,
          message: `成功创建节点: ${name || id} (${type})`
        }
      } catch (error) {
        throw new Error(`创建节点失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    /**
     * 创建连线
     */
    createFlow: async (params: {
      id: string
      sourceId: string
      targetId: string
      name?: string
      condition?: string
    }) => {
      try {
        const { id, sourceId, targetId, name, condition } = params

        // 调用编辑器操作服务
        const connection = editorOperationService.createFlow({
          id,
          sourceId,
          targetId,
          name,
          condition
        })

        return {
          success: true,
          flowId: id,
          message: `成功创建连线: ${sourceId} → ${targetId}${name ? ` (${name})` : ''}`
        }
      } catch (error) {
        throw new Error(`创建连线失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    /**
     * 删除节点
     */
    deleteNode: async (params: { nodeId: string }) => {
      try {
        const { nodeId } = params

        editorOperationService.deleteNode(nodeId)

        return {
          success: true,
          message: `成功删除节点: ${nodeId}`
        }
      } catch (error) {
        throw new Error(`删除节点失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    /**
     * 更新节点
     */
    updateNode: async (params: {
      nodeId: string
      name?: string
      properties?: Record<string, any>
    }) => {
      try {
        const { nodeId, name, properties = {} } = params

        // 如果提供了 name，将其添加到 properties
        const updateProps = name ? { ...properties, name } : properties

        editorOperationService.updateNode(nodeId, updateProps)

        return {
          success: true,
          message: `成功更新节点: ${nodeId}`
        }
      } catch (error) {
        throw new Error(`更新节点失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    /**
     * 清空画布
     */
    clearCanvas: async () => {
      try {
        editorOperationService.clearCanvas()

        return {
          success: true,
          message: '成功清空画布'
        }
      } catch (error) {
        throw new Error(`清空画布失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    /**
     * 获取节点列表
     */
    getNodes: async () => {
      try {
        const nodes = editorOperationService.getAllNodes()

        // 格式化节点信息
        const nodeList = nodes.map(node => {
          const info = editorOperationService.getNodeInfo(node.id)
          return {
            id: info.id,
            type: info.type,
            name: info.name || info.id,
            position: { x: info.x, y: info.y }
          }
        })

        return {
          success: true,
          nodes: nodeList,
          count: nodeList.length,
          message: `当前画布上有 ${nodeList.length} 个节点`
        }
      } catch (error) {
        throw new Error(`获取节点列表失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    },

    /**
     * 错误处理回调
     */
    onError: (toolName: string, error: Error) => {
      console.error(`工具执行错误 [${toolName}]:`, error)
    }
  }
}

/**
 * 检查编辑器是否已初始化
 */
export function isEditorReady(): boolean {
  try {
    // 尝试获取所有节点，如果失败说明编辑器未初始化
    editorOperationService.getAllNodes()
    return true
  } catch {
    return false
  }
}

/**
 * 等待编辑器初始化
 */
export async function waitForEditor(timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (isEditorReady()) {
      return true
    }
    // 等待 100ms 后重试
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return false
}
