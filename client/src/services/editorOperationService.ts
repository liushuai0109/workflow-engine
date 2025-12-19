/**
 * 编辑器操作服务
 * 提供对 BPMN 编辑器的直接操作接口
 * 支持生命周期属性管理
 */

import type { BpmnModelerInstance } from '../types'

export interface NodePosition {
  x: number
  y: number
}

export interface NodeConfig {
  id: string
  name?: string
  type: string  // BPMN 类型，如 'bpmn:StartEvent', 'bpmn:UserTask' 等
  position: NodePosition
  properties?: Record<string, any>
  documentation?: string  // BPMN documentation 文档说明
}

export interface FlowConfig {
  id: string
  sourceId: string
  targetId: string
  name?: string
  condition?: string
  waypoints?: Array<{ x: number; y: number }>  // 自定义路径点，用于绕过节点避免遮挡
}

class EditorOperationService {
  private modeler: BpmnModelerInstance | null = null
  private elementFactory: any = null
  private modeling: any = null
  private elementRegistry: any = null

  /**
   * 初始化服务，绑定 modeler 实例
   */
  init(modeler: BpmnModelerInstance): void {
    this.modeler = modeler
    this.elementFactory = modeler.get('elementFactory')
    this.modeling = modeler.get('modeling')
    this.elementRegistry = modeler.get('elementRegistry')
  }

  /**
   * 检查是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.modeler || !this.elementFactory || !this.modeling || !this.elementRegistry) {
      throw new Error('编辑器操作服务未初始化')
    }
  }

  /**
   * 创建节点
   */
  createNode(config: NodeConfig): any {
    this.ensureInitialized()

    const { id, name, type, position, properties, documentation } = config

    // 获取根元素（process）
    const rootElement = this.elementRegistry.get('Process_1') || this.elementRegistry.filter((element: any) => {
      return element.type === 'bpmn:Process'
    })[0]

    if (!rootElement) {
      throw new Error('找不到流程根节点')
    }

    // 使用 bpmnFactory 创建 business object
    const bpmnFactory = this.modeler.get('bpmnFactory')
    const businessObject = bpmnFactory.create(type, {
      id,
      name: name || '',
      ...properties
    })

    // 添加 documentation（如果提供） - 使用 bpmnFactory 创建
    if (documentation) {
      const docElement = bpmnFactory.create('bpmn:Documentation', {
        text: documentation
      })
      businessObject.documentation = [docElement]
    }

    // 创建形状 - 不需要再传 id 和 type，已经在 businessObject 中了
    const shape = this.elementFactory.createShape({
      type: type,
      businessObject
    })

    // 添加到画布
    const newShape = this.modeling.createShape(
      shape,
      { x: position.x, y: position.y },
      rootElement
    )

    console.log(`✅ 创建节点: ${name || id} (${type}) at (${position.x}, ${position.y})${documentation ? ' 📝 含文档' : ''}`)

    return newShape
  }

  /**
   * 创建连线
   */
  createFlow(config: FlowConfig): any {
    this.ensureInitialized()

    const { id, sourceId, targetId, name, condition, waypoints } = config

    // 获取源节点和目标节点
    const sourceElement = this.elementRegistry.get(sourceId)
    const targetElement = this.elementRegistry.get(targetId)

    if (!sourceElement) {
      throw new Error(`找不到源节点: ${sourceId}`)
    }
    if (!targetElement) {
      throw new Error(`找不到目标节点: ${targetId}`)
    }

    // 使用 bpmnFactory 创建 business object
    const bpmnFactory = this.modeler.get('bpmnFactory')
    const businessObject = bpmnFactory.create('bpmn:SequenceFlow', {
      id,
      name: name || '',
      sourceRef: sourceElement.businessObject,
      targetRef: targetElement.businessObject
    })

    // 添加条件表达式（如果提供）
    if (condition) {
      const conditionExpression = bpmnFactory.create('bpmn:FormalExpression', {
        body: condition
      })
      businessObject.conditionExpression = conditionExpression
    }

    // 创建连接（不传waypoints，让bpmn-js先自动计算）
    const connection = this.modeling.createConnection(
      sourceElement,
      targetElement,
      {
        type: 'bpmn:SequenceFlow',
        businessObject
      },
      sourceElement.parent
    )

    // 如果提供了自定义路径点，验证并更新连线的路径
    if (waypoints && waypoints.length > 0) {
      // 验证并修正 waypoints
      const validatedWaypoints = this.validateAndFixWaypoints(
        waypoints,
        sourceElement,
        targetElement
      )

      // 更新连线路径
      this.modeling.updateWaypoints(connection, validatedWaypoints)
      console.log(`✅ 创建连线（自定义路径）: ${sourceId} -> ${targetId}${name ? ` (${name})` : ''} [${validatedWaypoints.length} 个路径点]`)
    } else {
      console.log(`✅ 创建连线: ${sourceId} -> ${targetId}${name ? ` (${name})` : ''}`)
    }

    return connection
  }

  /**
   * 验证并修正 waypoints，确保起点和终点在节点边缘上，且连接垂直，路径正交
   */
  private validateAndFixWaypoints(
    waypoints: Array<{ x: number; y: number }>,
    sourceElement: any,
    targetElement: any
  ): Array<{ x: number; y: number }> {
    if (waypoints.length < 2) {
      console.warn('⚠️ waypoints 至少需要2个点')
      return waypoints
    }

    const result = [...waypoints]

    // 获取节点边界
    const sourceBounds = {
      x: sourceElement.x,
      y: sourceElement.y,
      width: sourceElement.width,
      height: sourceElement.height
    }
    const targetBounds = {
      x: targetElement.x,
      y: targetElement.y,
      width: targetElement.width,
      height: targetElement.height
    }

    // 修正起点：确保在源节点边缘上
    const firstPoint = result[0]
    const secondPoint = result[1]
    const fixedStart = this.snapToNodeEdge(firstPoint, secondPoint, sourceBounds, 'source')
    if (fixedStart) {
      result[0] = fixedStart
      console.log(`🔧 修正起点: (${firstPoint.x}, ${firstPoint.y}) -> (${fixedStart.x}, ${fixedStart.y})`)
    }

    // 修正终点：确保在目标节点边缘上
    const lastPoint = result[result.length - 1]
    const secondLastPoint = result[result.length - 2]
    const fixedEnd = this.snapToNodeEdge(lastPoint, secondLastPoint, targetBounds, 'target')
    if (fixedEnd) {
      result[result.length - 1] = fixedEnd
      console.log(`🔧 修正终点: (${lastPoint.x}, ${lastPoint.y}) -> (${fixedEnd.x}, ${fixedEnd.y})`)
    }

    // 确保中间waypoints遵循正交路由（横平竖直）
    if (result.length === 3) {
      // 最常见情况：3个点（起点、中间点、终点）
      const orthogonalMiddle = this.calculateOrthogonalMiddlePoint(result[0], result[2])
      if (orthogonalMiddle) {
        result[1] = orthogonalMiddle
        console.log(`🔧 修正中间点为正交路径: (${waypoints[1].x}, ${waypoints[1].y}) -> (${orthogonalMiddle.x}, ${orthogonalMiddle.y})`)
      }
    } else if (result.length > 3) {
      // 多个中间点：确保每段都是水平或垂直
      for (let i = 1; i < result.length - 1; i++) {
        const prev = result[i - 1]
        const curr = result[i]
        const next = result[i + 1]

        // 判断应该水平对齐还是垂直对齐
        const dxPrev = Math.abs(curr.x - prev.x)
        const dyPrev = Math.abs(curr.y - prev.y)
        const dxNext = Math.abs(next.x - curr.x)
        const dyNext = Math.abs(next.y - curr.y)

        // 如果与前一个点的水平距离更大，保持y对齐
        // 如果与前一个点的垂直距离更大，保持x对齐
        if (dxPrev > dyPrev) {
          // 前一段应该是水平的，保持y
          result[i] = { ...curr, y: prev.y }
        } else {
          // 前一段应该是垂直的，保持x
          result[i] = { ...curr, x: prev.x }
        }
      }
    }

    return result
  }

  /**
   * 计算3点路径的正交中间点
   * 确保路径从起点到终点是横平竖直的
   */
  private calculateOrthogonalMiddlePoint(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number } {
    const dx = end.x - start.x
    const dy = end.y - start.y

    // 如果已经在同一条水平或垂直线上，不需要中间点
    if (dx === 0 || dy === 0) {
      return { x: end.x, y: start.y } // 返回任意正交点
    }

    // 判断起点的出发方向
    // 根据dx和dy的大小关系决定先走哪个方向
    const dxAbs = Math.abs(dx)
    const dyAbs = Math.abs(dy)

    if (dxAbs > dyAbs) {
      // 水平距离更大，先水平移动
      return { x: end.x, y: start.y }
    } else {
      // 垂直距离更大，先垂直移动
      return { x: start.x, y: end.y }
    }
  }

  /**
   * 将点吸附到节点边缘上，并确保垂直连接
   *
   * 逻辑：
   * - 对于起点（source）：看从起点到第二个点的方向，起点应该在连线出发的那一侧
   * - 对于终点（target）：看从倒数第二个点到终点的方向，终点应该在连线到达的那一侧
   */
  private snapToNodeEdge(
    point: { x: number; y: number },
    adjacentPoint: { x: number; y: number },
    nodeBounds: { x: number; y: number; width: number; height: number },
    role: 'source' | 'target'
  ): { x: number; y: number } | null {
    const { x, y, width, height } = nodeBounds
    const centerX = x + width / 2
    const centerY = y + height / 2

    // 判断连接方向（根据相邻点相对于当前点的位置）
    const dx = adjacentPoint.x - point.x
    const dy = adjacentPoint.y - point.y

    // 如果水平方向移动更多，说明是左右连接
    if (Math.abs(dx) > Math.abs(dy)) {
      // 左右连接：x 应该在节点左边缘或右边缘
      if (dx > 0) {
        // 相邻点在右侧，连线向右，当前点应该在右边缘
        return { x: x + width, y: centerY }
      } else {
        // 相邻点在左侧，连线向左，当前点应该在左边缘
        return { x, y: centerY }
      }
    } else {
      // 上下连接：y 应该在节点顶部或底部
      if (dy > 0) {
        // 相邻点在下方，连线向下，当前点应该在底部
        return { x: centerX, y: y + height }
      } else {
        // 相邻点在上方，连线向上，当前点应该在顶部
        return { x: centerX, y }
      }
    }
  }

  /**
   * 删除节点
   */
  deleteNode(nodeId: string): void {
    this.ensureInitialized()

    const element = this.elementRegistry.get(nodeId)
    if (!element) {
      throw new Error(`找不到节点: ${nodeId}`)
    }

    this.modeling.removeElements([element])
    console.log(`🗑️ 删除节点: ${nodeId}`)
  }

  /**
   * 更新节点属性
   */
  updateNode(nodeId: string, properties: Record<string, any>): void {
    this.ensureInitialized()

    const element = this.elementRegistry.get(nodeId)
    if (!element) {
      throw new Error(`找不到节点: ${nodeId}`)
    }

    this.modeling.updateProperties(element, properties)
    console.log(`✏️ 更新节点: ${nodeId}`, properties)
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): any[] {
    this.ensureInitialized()

    return this.elementRegistry.filter((element: any) => {
      return element.type && element.type.startsWith('bpmn:') && element.type !== 'bpmn:Process'
    })
  }

  /**
   * 获取节点信息
   */
  getNodeInfo(nodeId: string): any {
    this.ensureInitialized()

    const element = this.elementRegistry.get(nodeId)
    if (!element) {
      return null
    }

    return {
      id: element.id,
      type: element.type,
      name: element.businessObject?.name,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height
    }
  }

  /**
   * 清空画布（完全清空，用于 AI 创建新流程）
   */
  clearCanvas(): void {
    this.ensureInitialized()

    const elements = this.elementRegistry.filter((element: any) => {
      return element.type && element.type.startsWith('bpmn:') &&
             element.type !== 'bpmn:Process' // 只保留 Process 容器
    })

    if (elements.length > 0) {
      this.modeling.removeElements(elements)
      console.log(`🧹 清空画布，移除 ${elements.length} 个元素（包括默认开始节点）`)
    }
  }

  /**
   * 自动布局
   */
  autoLayout(): void {
    // TODO: 实现自动布局算法
    console.log('📐 自动布局功能待实现')
  }

  /**
   * 计算节点位置（用于自动排列）
   */
  calculatePosition(index: number, type: string): NodePosition {
    // 简单的垂直排列算法
    const startX = 200
    const startY = 100
    const verticalGap = 150

    return {
      x: startX,
      y: startY + (index * verticalGap)
    }
  }
}

// 导出单例
export const editorOperationService = new EditorOperationService()
