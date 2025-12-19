import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type { 
  BpmnElement, 
  BpmnRenderer, 
  TextRenderer, 
  Injectable
} from '../shared/types'
import type { 
  UserTaskExtension, 
  ServiceTaskExtension,
} from './types'

const HIGH_PRIORITY = 1500

export default class XFlowRenderer extends BaseRenderer {
  private bpmnRenderer: BpmnRenderer
  private textRenderer: TextRenderer

  constructor(eventBus: any, bpmnRenderer: BpmnRenderer, textRenderer: TextRenderer) {
    super(eventBus, HIGH_PRIORITY)
    
    this.bpmnRenderer = bpmnRenderer
    this.textRenderer = textRenderer
  }

  canRender(element: BpmnElement): boolean {
    // 检查是否是支持的任务类型且有 XFlow 扩展或生命周期扩展
    return (this.isSupportedTaskType(element) || is(element, 'bpmn:FlowNode')) &&
           (this.hasXFlowExtension(element) || this.hasLifecycleExtension(element))
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    // 使用默认的 BPMN 渲染器绘制基础形状
    const shape = this.bpmnRenderer.drawShape(parentNode, element)
    
    // 添加 XFlow 扩展元素
    this.drawXFlowElements(shape, element)
    
    return shape
  }

  private isSupportedTaskType(element: BpmnElement): boolean {
    return is(element, 'bpmn:UserTask') ||
           is(element, 'bpmn:ServiceTask') ||
           is(element, 'bpmn:ScriptTask') ||
           is(element, 'bpmn:BusinessRuleTask') ||
           is(element, 'bpmn:ManualTask') ||
           is(element, 'bpmn:ReceiveTask') ||
           is(element, 'bpmn:SendTask')
  }

  private hasXFlowExtension(element: BpmnElement): boolean {
    const businessObject = element.businessObject
    return businessObject.$instanceOf('xflow:UserTaskExtension') ||
           businessObject.$instanceOf('xflow:ServiceTaskExtension') ||
           businessObject.$instanceOf('xflow:ScriptTaskExtension') ||
           businessObject.$instanceOf('xflow:BusinessRuleTaskExtension') ||
           businessObject.$instanceOf('xflow:ManualTaskExtension') ||
           businessObject.$instanceOf('xflow:ReceiveTaskExtension') ||
           businessObject.$instanceOf('xflow:SendTaskExtension')
  }

  private hasLifecycleExtension(element: BpmnElement): boolean {
    const businessObject = element.businessObject
    if (!businessObject.extensionElements || !businessObject.extensionElements.values) {
      return false
    }
    return businessObject.extensionElements.values.some(
      (el: any) => el.$type === 'xflow:Lifecycle' || el.$type === 'xflow:Segments' || el.$type === 'xflow:Triggers'
    )
  }

  private drawXFlowElements(parentNode: SVGElement, element: any): void {
    const businessObject = element.businessObject

    // 创建 XFlow 容器
    const xflowContainer = this.createElement('g', {
      class: 'xflow-extension-elements'
    })

    // Draw lifecycle stage badge if present
    this.drawLifecycleBadge(xflowContainer, businessObject, element)

    // 根据任务类型绘制不同的扩展信息
    if (is(element, 'bpmn:UserTask') && businessObject.$instanceOf('xflow:UserTaskExtension')) {
      this.drawUserTaskExtensions(xflowContainer, businessObject as UserTaskExtension, element)
    } else if (is(element, 'bpmn:ServiceTask') && businessObject.$instanceOf('xflow:ServiceTaskExtension')) {
      this.drawServiceTaskExtensions(xflowContainer, businessObject as ServiceTaskExtension, element)
    }

    parentNode.appendChild(xflowContainer)
  }

  // UserTask 扩展渲染
  private drawUserTaskExtensions(parentNode: SVGElement, extension: UserTaskExtension, element: any): void {
    // 优先级指示器
    if (extension.priority) {
      this.drawPriorityIndicator(parentNode, extension.priority, element)
    }

    // 审批级别指示器
    if (extension.approvalLevel) {
      this.drawApprovalLevelIndicator(parentNode, extension.approvalLevel, element)
    }

    // 截止日期
    if (extension.dueDate) {
      this.drawDueDateIndicator(parentNode, extension.dueDate, element)
    }

    // 自定义字段
    if (extension.customFields && extension.customFields.length > 0) {
      this.drawCustomFields(parentNode, extension.customFields, element)
    }
  }

  // ServiceTask 扩展渲染
  private drawServiceTaskExtensions(parentNode: SVGElement, extension: ServiceTaskExtension, element: any): void {
    // Callee 信息
    if (extension.extensionElements?.callee) {
      this.drawCalleeInfo(parentNode, extension.extensionElements.callee, element)
    }
  }

  // 通用绘制方法
  private drawPriorityIndicator(parentNode: SVGElement, priority: string, element: any): void {
    const priorityColors: Record<string, string> = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#10b981'
    }

    const circle = this.createElement('circle', {
      cx: (element.width || 100) - 10,
      cy: 10,
      r: 4,
      fill: priorityColors[priority] || priorityColors['medium'] || '#f59e0b',
      'stroke-width': 1
    })
    
    parentNode.appendChild(circle)
  }

  private drawApprovalLevelIndicator(parentNode: SVGElement, level: number, element: any): void {
    const width = element.width || 100
    const height = element.height || 80
    
    const rect = this.createElement('rect', {
      x: 5,
      y: height - 8,
      width: width - 10,
      height: 3,
      rx: 1.5,
      class: 'approval-level-indicator'
    })
    parentNode.appendChild(rect)

    const text = this.createElement('text', {
      x: width / 2,
      y: height - 2,
      'text-anchor': 'middle',
      'font-size': '8px',
      fill: '#ffffff'
    })
    
    text.textContent = `Level ${level}`
    parentNode.appendChild(text)
  }

  private drawDueDateIndicator(parentNode: SVGElement, dueDate: string, element: any): void {
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#666'
    })
    
    text.textContent = `Due: ${dueDate}`
    parentNode.appendChild(text)
  }

  private drawCustomFields(parentNode: SVGElement, customFields: any[], element: any): void {
    let yOffset = 30
    
    customFields.forEach((field, index) => {
      if (index >= 3) return

      const text = this.createElement('text', {
        x: 10,
        y: yOffset,
        'font-size': '8px',
        fill: '#333'
      })
      text.textContent = `${field.name}: ${field.value}`
      parentNode.appendChild(text)
      
      yOffset += 12
    })
  }

  private drawCalleeInfo(parentNode: SVGElement, callee: any, element: any): void {
    let yOffset = 15

    // 显示 Module
    if (callee.module) {
      const moduleText = this.createElement('text', {
        x: '5',
        y: yOffset.toString(),
        'font-size': '9px',
        fill: '#2563eb',
        'font-weight': 'bold'
      })
      moduleText.textContent = `Module: ${callee.module}`
      parentNode.appendChild(moduleText)
      yOffset += 15
    }

    // 显示 CmdId
    if (callee.cmdid) {
      const cmdidText = this.createElement('text', {
        x: '5',
        y: yOffset.toString(),
        'font-size': '9px',
        fill: '#dc2626',
        'font-weight': 'bold'
      })
      cmdidText.textContent = `CmdId: ${callee.cmdid}`
      parentNode.appendChild(cmdidText)
    }
  }

  // Lifecycle badge rendering
  private drawLifecycleBadge(parentNode: SVGElement, businessObject: any, element: any): void {
    const lifecycle = this.getLifecycleExtension(businessObject)
    if (!lifecycle || !lifecycle.stage) {
      return
    }

    const stageConfig = this.getLifecycleStageConfig(lifecycle.stage)
    const width = element.width || 100

    // Draw lifecycle badge in top-right corner
    const badgeGroup = this.createElement('g', {
      class: 'lifecycle-badge',
      transform: `translate(${width - 35}, 5)`
    })

    // Badge background circle
    const circle = this.createElement('circle', {
      cx: 12,
      cy: 12,
      r: 12,
      fill: stageConfig.color,
      stroke: '#ffffff',
      'stroke-width': 2
    })
    badgeGroup.appendChild(circle)

    // Icon text (emoji)
    const iconText = this.createElement('text', {
      x: 12,
      y: 12,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': '14px'
    })
    iconText.textContent = stageConfig.icon
    badgeGroup.appendChild(iconText)

    // Tooltip title
    const title = this.createElement('title')
    title.textContent = `Lifecycle: ${lifecycle.stage}`
    badgeGroup.appendChild(title)

    parentNode.appendChild(badgeGroup)

    // Draw segments indicator if present
    const segments = this.getSegmentsExtension(businessObject)
    if (segments && segments.segmentIds) {
      const segmentBadge = this.createElement('g', {
        class: 'segments-indicator',
        transform: `translate(5, ${(element.height || 80) - 20})`
      })

      const segmentIcon = this.createElement('text', {
        x: 0,
        y: 0,
        'font-size': '12px',
        fill: '#6366f1'
      })
      segmentIcon.textContent = '👥'
      segmentBadge.appendChild(segmentIcon)

      const segmentTitle = this.createElement('title')
      segmentTitle.textContent = `Segments: ${segments.segmentIds}`
      segmentBadge.appendChild(segmentTitle)

      parentNode.appendChild(segmentBadge)
    }

    // Draw triggers indicator if present
    const triggers = this.getTriggersExtension(businessObject)
    if (triggers && triggers.triggerIds) {
      const triggerBadge = this.createElement('g', {
        class: 'triggers-indicator',
        transform: `translate(${width - 20}, ${(element.height || 80) - 20})`
      })

      const triggerIcon = this.createElement('text', {
        x: 0,
        y: 0,
        'font-size': '12px',
        fill: '#f59e0b'
      })
      triggerIcon.textContent = '⚡'
      triggerBadge.appendChild(triggerIcon)

      const triggerTitle = this.createElement('title')
      triggerTitle.textContent = `Triggers: ${triggers.triggerIds}`
      triggerBadge.appendChild(triggerTitle)

      parentNode.appendChild(triggerBadge)
    }
  }

  private getLifecycleExtension(businessObject: any): any {
    if (!businessObject.extensionElements || !businessObject.extensionElements.values) {
      return null
    }
    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === 'xflow:Lifecycle'
    )
  }

  private getSegmentsExtension(businessObject: any): any {
    if (!businessObject.extensionElements || !businessObject.extensionElements.values) {
      return null
    }
    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === 'xflow:Segments'
    )
  }

  private getTriggersExtension(businessObject: any): any {
    if (!businessObject.extensionElements || !businessObject.extensionElements.values) {
      return null
    }
    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === 'xflow:Triggers'
    )
  }

  private getLifecycleStageConfig(stage: string): { color: string; icon: string } {
    const configs: Record<string, { color: string; icon: string }> = {
      'Acquisition': { color: '#2196F3', icon: '🎯' },
      'Activation': { color: '#4CAF50', icon: '✨' },
      'Retention': { color: '#FFC107', icon: '🔄' },
      'Revenue': { color: '#9C27B0', icon: '💰' },
      'Referral': { color: '#FF5722', icon: '🚀' }
    }
    return configs[stage] || { color: '#757575', icon: '📊' }
  }

  private createElement(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag)

    Object.keys(attrs).forEach(key => {
      const value = attrs[key]
      if (value !== undefined) {
        element.setAttribute(key, value.toString())
      }
    })

    return element
  }
}

(XFlowRenderer as Injectable).$inject = ['eventBus', 'bpmnRenderer', 'textRenderer']
