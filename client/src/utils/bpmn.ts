/**
 * BPMN 工具函数
 */

export interface StartNode {
  id: string
  name: string
  type: 'StartEvent' | 'BoundaryEvent' | 'IntermediateCatchEvent'
}

/**
 * 从 BPMN XML 中提取所有可作为起始节点的节点
 *
 * 支持的节点类型：
 * - StartEvent: 开始节点
 * - BoundaryEvent: 边界事件
 * - IntermediateCatchEvent: 消息中间事件
 *
 * @param bpmnXml BPMN XML 字符串
 * @returns 起始节点数组
 */
export function extractStartNodes(bpmnXml: string): StartNode[] {
  if (!bpmnXml) {
    return []
  }

  const nodes: StartNode[] = []

  try {
    // 创建 DOM 解析器
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(bpmnXml, 'text/xml')

    // 检查解析错误
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('BPMN XML parsing error:', parserError.textContent)
      return []
    }

    // 提取 StartEvent 节点
    const startEvents = xmlDoc.querySelectorAll('startEvent, bpmn\\:startEvent, bpmn2\\:startEvent')
    startEvents.forEach((element) => {
      const id = element.getAttribute('id')
      const name = element.getAttribute('name') || '未命名开始节点'
      if (id) {
        nodes.push({ id, name, type: 'StartEvent' })
      }
    })

    // 提取 BoundaryEvent 节点
    const boundaryEvents = xmlDoc.querySelectorAll('boundaryEvent, bpmn\\:boundaryEvent, bpmn2\\:boundaryEvent')
    boundaryEvents.forEach((element) => {
      const id = element.getAttribute('id')
      const name = element.getAttribute('name') || '未命名边界事件'
      if (id) {
        nodes.push({ id, name, type: 'BoundaryEvent' })
      }
    })

    // 提取 IntermediateCatchEvent 节点
    const intermediateCatchEvents = xmlDoc.querySelectorAll(
      'intermediateCatchEvent, bpmn\\:intermediateCatchEvent, bpmn2\\:intermediateCatchEvent'
    )
    intermediateCatchEvents.forEach((element) => {
      const id = element.getAttribute('id')
      const name = element.getAttribute('name') || '未命名中间事件'
      if (id) {
        nodes.push({ id, name, type: 'IntermediateCatchEvent' })
      }
    })

    // 按类型和ID排序：StartEvent > BoundaryEvent > IntermediateCatchEvent
    nodes.sort((a, b) => {
      const typeOrder = { StartEvent: 1, BoundaryEvent: 2, IntermediateCatchEvent: 3 }
      const typeCompare = typeOrder[a.type] - typeOrder[b.type]
      if (typeCompare !== 0) return typeCompare
      return a.id.localeCompare(b.id)
    })

    console.log('Extracted start nodes:', nodes)
    return nodes
  } catch (error) {
    console.error('Error extracting start nodes from BPMN XML:', error)
    return []
  }
}

/**
 * 格式化起始节点显示文本
 * 格式：节点类型:节点名称:节点ID
 *
 * @param node 起始节点
 * @returns 格式化后的显示文本
 */
export function formatStartNodeLabel(node: StartNode): string {
  const typeLabels = {
    StartEvent: '开始节点',
    BoundaryEvent: '边界事件',
    IntermediateCatchEvent: '中间事件',
  }
  const typeLabel = typeLabels[node.type]
  return `${typeLabel}:${node.name}:${node.id}`
}

/**
 * 获取节点类型的中文标签
 *
 * @param type 节点类型
 * @returns 中文标签
 */
export function getNodeTypeLabel(type: StartNode['type']): string {
  const typeLabels = {
    StartEvent: '开始节点',
    BoundaryEvent: '边界事件',
    IntermediateCatchEvent: '中间事件',
  }
  return typeLabels[type]
}
