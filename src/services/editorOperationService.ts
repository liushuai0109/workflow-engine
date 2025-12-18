/**
 * 编辑器操作服务
 * 提供对 BPMN 编辑器的直接操作接口
 */

import type { BpmnModelerInstance } from '../types'

export interface NodePosition {
  x: number
  y: number
}

export interface NodeConfig {
  id: string
  name?: string
  type: 'startEvent' | 'endEvent' | 'userTask' | 'serviceTask' | 'exclusiveGateway' | 'parallelGateway'
  position: NodePosition
  properties?: Record<string, any>
}

export interface FlowConfig {
  id: string
  sourceId: string
  targetId: string
  name?: string
  condition?: string
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

    const { id, name, type, position, properties } = config

    // 获取根元素（process）
    const rootElement = this.elementRegistry.get('Process_1') || this.elementRegistry.filter((element: any) => {
      return element.type === 'bpmn:Process'
    })[0]

    if (!rootElement) {
      throw new Error('找不到流程根节点')
    }

    // 映射节点类型到 BPMN 类型
    const typeMap: Record<string, string> = {
      'startEvent': 'bpmn:StartEvent',
      'endEvent': 'bpmn:EndEvent',
      'userTask': 'bpmn:UserTask',
      'serviceTask': 'bpmn:ServiceTask',
      'exclusiveGateway': 'bpmn:ExclusiveGateway',
      'parallelGateway': 'bpmn:ParallelGateway'
    }

    const bpmnType = typeMap[type]
    if (!bpmnType) {
      throw new Error(`不支持的节点类型: ${type}`)
    }

    // 创建形状
    const shape = this.elementFactory.createShape({
      id,
      type: bpmnType,
      businessObject: {
        id,
        name: name || '',
        ...properties
      }
    })

    // 添加到画布
    const newShape = this.modeling.createShape(
      shape,
      { x: position.x, y: position.y },
      rootElement
    )

    console.log(`✅ 创建节点: ${name || id} (${type}) at (${position.x}, ${position.y})`)

    return newShape
  }

  /**
   * 创建连线
   */
  createFlow(config: FlowConfig): any {
    this.ensureInitialized()

    const { id, sourceId, targetId, name, condition } = config

    // 获取源节点和目标节点
    const sourceElement = this.elementRegistry.get(sourceId)
    const targetElement = this.elementRegistry.get(targetId)

    if (!sourceElement) {
      throw new Error(`找不到源节点: ${sourceId}`)
    }
    if (!targetElement) {
      throw new Error(`找不到目标节点: ${targetId}`)
    }

    // 创建连接
    const connection = this.modeling.createConnection(
      sourceElement,
      targetElement,
      {
        id,
        type: 'bpmn:SequenceFlow',
        businessObject: {
          id,
          name: name || '',
          sourceRef: sourceElement.businessObject,
          targetRef: targetElement.businessObject,
          conditionExpression: condition ? { body: condition } : undefined
        }
      },
      sourceElement.parent
    )

    console.log(`✅ 创建连线: ${sourceId} -> ${targetId}${name ? ` (${name})` : ''}`)

    return connection
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
   * 清空画布（保留开始节点）
   */
  clearCanvas(): void {
    this.ensureInitialized()

    const elements = this.elementRegistry.filter((element: any) => {
      return element.type && element.type.startsWith('bpmn:') &&
             element.type !== 'bpmn:Process' &&
             element.type !== 'bpmn:StartEvent' // 保留开始节点
    })

    if (elements.length > 0) {
      this.modeling.removeElements(elements)
      console.log(`🧹 清空画布，移除 ${elements.length} 个元素`)
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
