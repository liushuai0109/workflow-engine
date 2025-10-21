import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type { 
  BpmnElement, 
  BpmnRenderer, 
  TextRenderer, 
  EventBus, 
  ElementFactory, 
  Injector,
  Canvas,
  Modeling,
  ElementRegistry,
  Injectable
} from '../shared/types'
import type { 
  UserTaskExtension, 
  ServiceTaskExtension, 
  ScriptTaskExtension,
  BusinessRuleTaskExtension,
  ManualTaskExtension,
  ReceiveTaskExtension,
  SendTaskExtension,
  TaskType,
  EXTENSION_TYPE_MAP
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
    // 检查是否是支持的任务类型且有 XFlow 扩展
    return this.isSupportedTaskType(element) && this.hasXFlowExtension(element)
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

  private drawXFlowElements(parentNode: SVGElement, element: any): void {
    const businessObject = element.businessObject
    
    // 创建 XFlow 容器
    const xflowContainer = this.createElement('g', {
      class: 'xflow-extension-elements'
    })

    // 根据任务类型绘制不同的扩展信息
    if (is(element, 'bpmn:UserTask') && businessObject.$instanceOf('xflow:UserTaskExtension')) {
      this.drawUserTaskExtensions(xflowContainer, businessObject as UserTaskExtension, element)
    } else if (is(element, 'bpmn:ServiceTask') && businessObject.$instanceOf('xflow:ServiceTaskExtension')) {
      this.drawServiceTaskExtensions(xflowContainer, businessObject as ServiceTaskExtension, element)
    } else if (is(element, 'bpmn:ScriptTask') && businessObject.$instanceOf('xflow:ScriptTaskExtension')) {
      this.drawScriptTaskExtensions(xflowContainer, businessObject as ScriptTaskExtension, element)
    } else if (is(element, 'bpmn:BusinessRuleTask') && businessObject.$instanceOf('xflow:BusinessRuleTaskExtension')) {
      this.drawBusinessRuleTaskExtensions(xflowContainer, businessObject as BusinessRuleTaskExtension, element)
    } else if (is(element, 'bpmn:ManualTask') && businessObject.$instanceOf('xflow:ManualTaskExtension')) {
      this.drawManualTaskExtensions(xflowContainer, businessObject as ManualTaskExtension, element)
    } else if (is(element, 'bpmn:ReceiveTask') && businessObject.$instanceOf('xflow:ReceiveTaskExtension')) {
      this.drawReceiveTaskExtensions(xflowContainer, businessObject as ReceiveTaskExtension, element)
    } else if (is(element, 'bpmn:SendTask') && businessObject.$instanceOf('xflow:SendTaskExtension')) {
      this.drawSendTaskExtensions(xflowContainer, businessObject as SendTaskExtension, element)
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
    // 模块信息
    if (extension.extensionElements?.module) {
      this.drawModuleInfo(parentNode, extension.extensionElements.module, element)
    }

    // 方法信息
    if (extension.extensionElements?.method) {
      this.drawMethodInfo(parentNode, extension.extensionElements.method, element)
    }
  }

  // ScriptTask 扩展渲染
  private drawScriptTaskExtensions(parentNode: SVGElement, extension: ScriptTaskExtension, element: any): void {
    // 脚本类型
    if (extension.scriptType) {
      this.drawScriptTypeIndicator(parentNode, extension.scriptType, element)
    }

    // 超时时间
    if (extension.timeout) {
      this.drawTimeoutIndicator(parentNode, extension.timeout, element)
    }
  }

  // BusinessRuleTask 扩展渲染
  private drawBusinessRuleTaskExtensions(parentNode: SVGElement, extension: BusinessRuleTaskExtension, element: any): void {
    // 规则集
    if (extension.ruleSet) {
      this.drawRuleSetIndicator(parentNode, extension.ruleSet, element)
    }
  }

  // ManualTask 扩展渲染
  private drawManualTaskExtensions(parentNode: SVGElement, extension: ManualTaskExtension, element: any): void {
    // 预估时长
    if (extension.estimatedDuration) {
      this.drawDurationIndicator(parentNode, extension.estimatedDuration, element)
    }
  }

  // ReceiveTask 扩展渲染
  private drawReceiveTaskExtensions(parentNode: SVGElement, extension: ReceiveTaskExtension, element: any): void {
    // 消息类型
    if (extension.messageType) {
      this.drawMessageTypeIndicator(parentNode, extension.messageType, element)
    }
  }

  // SendTask 扩展渲染
  private drawSendTaskExtensions(parentNode: SVGElement, extension: SendTaskExtension, element: any): void {
    // 目标端点
    if (extension.targetEndpoint) {
      this.drawTargetEndpointIndicator(parentNode, extension.targetEndpoint, element)
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

  private drawModuleInfo(parentNode: SVGElement, module: any, element: any): void {
    if (module.value) {
      const nameText = this.createElement('text', {
        x: '5',
        y: '15',
        'font-size': '9px',
        fill: '#2563eb',
        'font-weight': 'bold'
      })
      nameText.textContent = `Module: ${module.value}`
      parentNode.appendChild(nameText)
    }
  }

  private drawMethodInfo(parentNode: SVGElement, method: any, element: any): void {
    const width = element.width || 100
    const height = element.height || 80
    
    if (method.value) {
      const methodText = this.createElement('text', {
        x: (width - 5).toString(),
        y: (height - 15).toString(),
        'text-anchor': 'end',
        'font-size': '9px',
        fill: '#dc2626',
        'font-weight': 'bold'
      })
      methodText.textContent = `Method: ${method.value}`
      parentNode.appendChild(methodText)
    }
  }

  private drawScriptTypeIndicator(parentNode: SVGElement, scriptType: string, element: any): void {
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#7c3aed',
      'font-weight': 'bold'
    })
    
    text.textContent = `Script: ${scriptType}`
    parentNode.appendChild(text)
  }

  private drawTimeoutIndicator(parentNode: SVGElement, timeout: number, element: any): void {
    const width = element.width || 100
    const text = this.createElement('text', {
      x: (width - 5).toString(),
      y: 15,
      'text-anchor': 'end',
      'font-size': '8px',
      fill: '#f59e0b'
    })
    
    text.textContent = `Timeout: ${timeout}s`
    parentNode.appendChild(text)
  }

  private drawRuleSetIndicator(parentNode: SVGElement, ruleSet: string, element: any): void {
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#059669',
      'font-weight': 'bold'
    })
    
    text.textContent = `Rules: ${ruleSet}`
    parentNode.appendChild(text)
  }

  private drawDurationIndicator(parentNode: SVGElement, duration: string, element: any): void {
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#0891b2',
      'font-weight': 'bold'
    })
    
    text.textContent = `Duration: ${duration}`
    parentNode.appendChild(text)
  }

  private drawMessageTypeIndicator(parentNode: SVGElement, messageType: string, element: any): void {
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#be185d',
      'font-weight': 'bold'
    })
    
    text.textContent = `Msg: ${messageType}`
    parentNode.appendChild(text)
  }

  private drawTargetEndpointIndicator(parentNode: SVGElement, endpoint: string, element: any): void {
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#be185d',
      'font-weight': 'bold'
    })
    
    text.textContent = `To: ${endpoint}`
    parentNode.appendChild(text)
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
