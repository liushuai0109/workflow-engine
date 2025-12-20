/**
 * Context Menu Service - 处理节点右键菜单
 */

export interface ContextMenuOption {
  label: string
  icon?: string
  action: () => void
  disabled?: boolean
}

class ContextMenuService {
  private modeler: any = null
  private contextPad: any = null
  private breakpoints: Set<string> = new Set()
  private onSetBreakpoint?: (nodeId: string) => void
  private onRemoveBreakpoint?: (nodeId: string) => void
  private onViewDetails?: (nodeId: string) => void

  /**
   * 初始化服务
   */
  init(
    modeler: any,
    callbacks: {
      onSetBreakpoint?: (nodeId: string) => void
      onRemoveBreakpoint?: (nodeId: string) => void
      onViewDetails?: (nodeId: string) => void
    }
  ) {
    this.modeler = modeler
    this.onSetBreakpoint = callbacks.onSetBreakpoint
    this.onRemoveBreakpoint = callbacks.onRemoveBreakpoint
    this.onViewDetails = callbacks.onViewDetails

    this.setupContextPad()
  }

  /**
   * 设置 Context Pad（右键菜单）
   */
  private setupContextPad() {
    if (!this.modeler) return

    const contextPad = this.modeler.get('contextPad')
    const eventBus = this.modeler.get('eventBus')

    // 监听元素选择事件
    eventBus.on('element.click', (event: any) => {
      const element = event.element
      if (element && element.type !== 'bpmn:Process') {
        this.updateContextPad(element)
      }
    })
  }

  /**
   * 更新 Context Pad
   * Note: 在 bpmn-js 17.x 中，contextPad API 已更改
   * addProvider 方法不再可用，需要在初始化时注册 provider
   */
  private updateContextPad(element: any) {
    // 此方法在 bpmn-js 17.x 中暂时禁用
    // Context pad 自定义功能需要重新实现
    // TODO: 使用新的 bpmn-js 17.x API 重新实现 context pad 自定义
    return
  }

  /**
   * 设置断点
   */
  setBreakpoint(nodeId: string) {
    this.breakpoints.add(nodeId)
    this.onSetBreakpoint?.(nodeId)
    this.updateBreakpointVisualization(nodeId, true)
  }

  /**
   * 移除断点
   */
  removeBreakpoint(nodeId: string) {
    this.breakpoints.delete(nodeId)
    this.onRemoveBreakpoint?.(nodeId)
    this.updateBreakpointVisualization(nodeId, false)
  }

  /**
   * 查看详情
   */
  viewDetails(nodeId: string) {
    this.onViewDetails?.(nodeId)
  }

  /**
   * 更新断点可视化
   */
  private updateBreakpointVisualization(nodeId: string, hasBreakpoint: boolean) {
    if (!this.modeler) return

    const canvas = this.modeler.get('canvas')
    if (hasBreakpoint) {
      canvas.addMarker(nodeId, 'node-breakpoint')
    } else {
      canvas.removeMarker(nodeId, 'node-breakpoint')
    }
  }

  /**
   * 获取所有断点
   */
  getBreakpoints(): string[] {
    return Array.from(this.breakpoints)
  }

  /**
   * 设置断点列表
   */
  setBreakpoints(breakpoints: string[]) {
    // 清除旧的断点可视化
    this.breakpoints.forEach((nodeId) => {
      this.updateBreakpointVisualization(nodeId, false)
    })

    this.breakpoints = new Set(breakpoints)

    // 添加新的断点可视化
    breakpoints.forEach((nodeId) => {
      this.updateBreakpointVisualization(nodeId, true)
    })
  }
}

export const contextMenuService = new ContextMenuService()

