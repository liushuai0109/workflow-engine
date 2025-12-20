/**
 * Visualization Service - 处理节点高亮、路径高亮等可视化功能
 */

export type NodeStatus = 'running' | 'completed' | 'failed' | 'pending' | 'breakpoint'

export interface NodeHighlight {
  nodeId: string
  status: NodeStatus
}

export interface PathHighlight {
  flowId: string
  active: boolean
}

class VisualizationService {
  private modeler: any = null
  private highlightedNodes: Map<string, NodeStatus> = new Map()
  private highlightedPaths: Map<string, boolean> = new Map()

  /**
   * 初始化服务，设置 modeler 实例
   */
  init(modeler: any) {
    this.modeler = modeler
  }

  /**
   * 高亮节点
   */
  highlightNode(nodeId: string, status: NodeStatus) {
    if (!this.modeler) return

    const elementRegistry = this.modeler.get('elementRegistry')
    const canvas = this.modeler.get('canvas')
    const element = elementRegistry.get(nodeId)

    if (!element) {
      console.warn(`Node ${nodeId} not found`)
      return
    }

    // 移除旧的样式类
    this.removeNodeHighlight(nodeId)

    // 添加新的样式类
    const statusClass = `node-status-${status}`
    canvas.addMarker(nodeId, statusClass)
    this.highlightedNodes.set(nodeId, status)
  }

  /**
   * 移除节点高亮
   */
  removeNodeHighlight(nodeId: string) {
    if (!this.modeler) return

    const canvas = this.modeler.get('canvas')
    const oldStatus = this.highlightedNodes.get(nodeId)

    if (oldStatus) {
      canvas.removeMarker(nodeId, `node-status-${oldStatus}`)
      this.highlightedNodes.delete(nodeId)
    }
  }

  /**
   * 高亮多个节点
   */
  highlightNodes(highlights: NodeHighlight[]) {
    highlights.forEach(({ nodeId, status }) => {
      this.highlightNode(nodeId, status)
    })
  }

  /**
   * 清除所有节点高亮
   */
  clearNodeHighlights() {
    if (!this.modeler) return

    const canvas = this.modeler.get('canvas')
    this.highlightedNodes.forEach((status, nodeId) => {
      canvas.removeMarker(nodeId, `node-status-${status}`)
    })
    this.highlightedNodes.clear()
  }

  /**
   * 高亮路径（连线）
   */
  highlightPath(flowId: string, active: boolean = true) {
    if (!this.modeler) return

    const elementRegistry = this.modeler.get('elementRegistry')
    const canvas = this.modeler.get('canvas')
    const element = elementRegistry.get(flowId)

    if (!element) {
      console.warn(`Flow ${flowId} not found`)
      return
    }

    // 移除旧的样式类
    this.removePathHighlight(flowId)

    // 添加新的样式类
    if (active) {
      canvas.addMarker(flowId, 'path-active')
      this.highlightedPaths.set(flowId, true)
    }
  }

  /**
   * 移除路径高亮
   */
  removePathHighlight(flowId: string) {
    if (!this.modeler) return

    const canvas = this.modeler.get('canvas')
    const isActive = this.highlightedPaths.get(flowId)

    if (isActive) {
      canvas.removeMarker(flowId, 'path-active')
      this.highlightedPaths.delete(flowId)
    }
  }

  /**
   * 高亮多个路径
   */
  highlightPaths(paths: PathHighlight[]) {
    paths.forEach(({ flowId, active }) => {
      this.highlightPath(flowId, active)
    })
  }

  /**
   * 清除所有路径高亮
   */
  clearPathHighlights() {
    if (!this.modeler) return

    const canvas = this.modeler.get('canvas')
    this.highlightedPaths.forEach((_, flowId) => {
      canvas.removeMarker(flowId, 'path-active')
    })
    this.highlightedPaths.clear()
  }

  /**
   * 清除所有高亮
   */
  clearAllHighlights() {
    this.clearNodeHighlights()
    this.clearPathHighlights()
  }

  /**
   * 根据执行状态更新可视化
   */
  updateVisualization(executedNodes: string[], currentNodeId?: string, failedNodes: string[] = []) {
    this.clearAllHighlights()

    // 高亮已执行的节点
    executedNodes.forEach((nodeId) => {
      if (failedNodes.includes(nodeId)) {
        this.highlightNode(nodeId, 'failed')
      } else {
        this.highlightNode(nodeId, 'completed')
      }
    })

    // 高亮当前节点
    if (currentNodeId) {
      this.highlightNode(currentNodeId, 'running')
    }
  }
}

export const visualizationService = new VisualizationService()

