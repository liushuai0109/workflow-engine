import type { FlowData } from './FlowRenderer'

export interface GatewayDistribution {
  [gatewayId: string]: {
    [outgoingFlowId: string]: number  // 流量分配比例 (0-1)
  }
}

export default class FlowSimulator {
  private elementRegistry: any
  private initialFlow: number = 100

  constructor(elementRegistry: any) {
    this.elementRegistry = elementRegistry
  }

  // 设置初始流量值
  setInitialFlow(value: number): void {
    this.initialFlow = value
  }

  // 模拟流量分配，返回每条连线的流量数据
  simulate(customDistribution?: GatewayDistribution): FlowData {
    const flowData: FlowData = {}
    const visited = new Set<string>()

    // 找到所有起始事件
    const startEvents = this.findStartEvents()

    // 从每个起始事件开始模拟
    startEvents.forEach(startEvent => {
      this.simulateFromElement(startEvent, this.initialFlow, flowData, visited, customDistribution)
    })

    return flowData
  }

  // 从指定元素开始递归模拟流量
  private simulateFromElement(
    element: any,
    incomingFlow: number,
    flowData: FlowData,
    visited: Set<string>,
    customDistribution?: GatewayDistribution
  ): void {
    // 避免循环
    if (visited.has(element.id)) return
    visited.add(element.id)

    // 获取所有出边
    const outgoingFlows = this.getOutgoingFlows(element)

    if (outgoingFlows.length === 0) {
      // 结束节点，无需处理
      return
    }

    // 根据元素类型分配流量
    const distribution = this.calculateDistribution(
      element,
      outgoingFlows,
      incomingFlow,
      customDistribution
    )

    // 递归处理每条出边
    outgoingFlows.forEach(flow => {
      const flowValue = distribution[flow.id] || 0
      flowData[flow.id] = flowValue

      // 找到目标节点
      const targetElement = this.elementRegistry.get(flow.businessObject.targetRef.id)
      if (targetElement) {
        this.simulateFromElement(targetElement, flowValue, flowData, visited, customDistribution)
      }
    })
  }

  // 计算流量分配
  private calculateDistribution(
    element: any,
    outgoingFlows: any[],
    incomingFlow: number,
    customDistribution?: GatewayDistribution
  ): { [flowId: string]: number } {
    const distribution: { [flowId: string]: number } = {}

    // 如果有自定义分配，优先使用
    if (customDistribution && customDistribution[element.id]) {
      const customDist = customDistribution[element.id]
      if (customDist) {
        outgoingFlows.forEach(flow => {
          const ratio = customDist[flow.id] || 0
          distribution[flow.id] = incomingFlow * ratio
        })
        return distribution
      }
    }

    // 根据元素类型自动分配
    const elementType = element.businessObject.$type

    if (this.isParallelGateway(elementType)) {
      // 并行网关：流量完整复制到每条分支
      outgoingFlows.forEach(flow => {
        distribution[flow.id] = incomingFlow
      })
    } else if (this.isExclusiveGateway(elementType) || this.isInclusiveGateway(elementType)) {
      // 排他网关/包容网关：流量按比例分配
      // 默认均分，可以通过条件概率自定义
      const splitRatio = 1 / outgoingFlows.length
      outgoingFlows.forEach(flow => {
        distribution[flow.id] = incomingFlow * splitRatio
      })
    } else if (this.isEventBasedGateway(elementType)) {
      // 基于事件的网关：模拟为排他网关
      const splitRatio = 1 / outgoingFlows.length
      outgoingFlows.forEach(flow => {
        distribution[flow.id] = incomingFlow * splitRatio
      })
    } else {
      // 普通节点：流量传递到所有出边（一般只有一条）
      if (outgoingFlows.length === 1) {
        distribution[outgoingFlows[0].id] = incomingFlow
      } else {
        // 如果有多条出边，均分
        const splitRatio = 1 / outgoingFlows.length
        outgoingFlows.forEach(flow => {
          distribution[flow.id] = incomingFlow * splitRatio
        })
      }
    }

    return distribution
  }

  // 查找所有起始事件
  private findStartEvents(): any[] {
    const startEvents: any[] = []
    const allElements = this.elementRegistry.getAll()

    allElements.forEach((element: any) => {
      if (element.businessObject.$type === 'bpmn:StartEvent') {
        startEvents.push(element)
      }
    })

    return startEvents
  }

  // 获取元素的所有出边
  private getOutgoingFlows(element: any): any[] {
    if (!element.outgoing) return []
    return element.outgoing.filter((flow: any) => flow.businessObject.$type === 'bpmn:SequenceFlow')
  }

  // 网关类型判断
  private isParallelGateway(type: string): boolean {
    return type === 'bpmn:ParallelGateway'
  }

  private isExclusiveGateway(type: string): boolean {
    return type === 'bpmn:ExclusiveGateway'
  }

  private isInclusiveGateway(type: string): boolean {
    return type === 'bpmn:InclusiveGateway'
  }

  private isEventBasedGateway(type: string): boolean {
    return type === 'bpmn:EventBasedGateway'
  }

  // 生成默认的网关分配（用于示例）
  static generateDefaultDistribution(elementRegistry: any): GatewayDistribution {
    const distribution: GatewayDistribution = {}
    const allElements = elementRegistry.getAll()

    allElements.forEach((element: any) => {
      const elementType = element.businessObject.$type

      // 对排他网关和包容网关设置示例分配
      if (elementType === 'bpmn:ExclusiveGateway' || elementType === 'bpmn:InclusiveGateway') {
        const outgoingFlows = element.outgoing || []

        if (outgoingFlows.length > 0) {
          distribution[element.id] = {}

          // 生成随机比例，但总和为1
          const ratios = this.generateRandomRatios(outgoingFlows.length)

          outgoingFlows.forEach((flow: any, index: number) => {
            const ratio = ratios[index]
            const gatewayDist = distribution[element.id]
            if (gatewayDist && ratio !== undefined) {
              gatewayDist[flow.id] = ratio
            }
          })
        }
      }
    })

    return distribution
  }

  // 生成随机比例数组，总和为1
  private static generateRandomRatios(count: number): number[] {
    if (count === 0) return []
    if (count === 1) return [1]

    // 生成随机数
    const randoms = Array.from({ length: count }, () => Math.random())
    const sum = randoms.reduce((a, b) => a + b, 0)

    // 归一化
    return randoms.map(r => r / sum)
  }
}
