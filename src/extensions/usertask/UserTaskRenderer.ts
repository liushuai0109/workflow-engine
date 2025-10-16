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
} from './types'
import type { UserTaskExtension } from './types'

const HIGH_PRIORITY = 1500
const TASK_BORDER_RADIUS = 2

export default class UserTaskRenderer extends BaseRenderer {
  private bpmnRenderer: BpmnRenderer
  private textRenderer: TextRenderer

  constructor(eventBus: any, bpmnRenderer: BpmnRenderer, textRenderer: TextRenderer) {
    super(eventBus, HIGH_PRIORITY)
    
    this.bpmnRenderer = bpmnRenderer
    this.textRenderer = textRenderer
  }

  canRender(element: BpmnElement): boolean {
    // 只渲染扩展的 UserTask
    return is(element, 'bpmn:UserTask') && element.businessObject.$instanceOf('usertaskext:UserTaskExtension')
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    // 使用默认的 BPMN 渲染器绘制基础形状
    const shape = this.bpmnRenderer.drawShape(parentNode, element)
    
    // 添加自定义元素
    this.drawCustomElements(shape, element)
    
    return shape
  }

  private drawCustomElements(parentNode: SVGElement, element: any): void {
    const businessObject = element.businessObject as UserTaskExtension
    
    // 创建自定义容器
    const customContainer = this.createElement('g', {
      class: 'custom-user-task-elements'
    })
    
    // 添加优先级指示器
    if (businessObject.priority) {
      this.drawPriorityIndicator(customContainer, businessObject.priority, element)
    }
    
    // 添加审批级别指示器
    if (businessObject.approvalLevel) {
      this.drawApprovalLevelIndicator(customContainer, businessObject.approvalLevel, element)
    }
    
    // 添加截止日期
    if (businessObject.dueDate) {
      this.drawDueDateIndicator(customContainer, businessObject.dueDate, element)
    }
    
    // 添加自定义字段
    if (businessObject.customFields && businessObject.customFields.length > 0) {
      this.drawCustomFields(customContainer, businessObject.customFields, element)
    }
    
    parentNode.appendChild(customContainer)
  }

  private drawPriorityIndicator(parentNode: SVGElement, priority: string, element: any): void {
    const priorityColors: Record<string, string> = {
      'high': '#ff4444',
      'medium': '#ffaa00',
      'low': '#44aa44'
    }
    
    const color = priorityColors[priority] || '#666666'
    
    // 在任务右上角添加优先级圆点
    const circle = this.createElement('circle', {
      cx: (element.width || 100) - 10,
      cy: 10,
      r: 4,
      fill: color,
      stroke: '#ffffff',
      'stroke-width': 1
    })
    
    parentNode.appendChild(circle)
  }

  private drawApprovalLevelIndicator(parentNode: SVGElement, level: number, element: any): void {
    const width = element.width || 100
    const height = element.height || 80
    
    // 在任务底部添加审批级别条
    const rect = this.createElement('rect', {
      x: 5,
      y: height - 8,
      width: width - 10,
      height: 3,
      fill: '#3b82f6',
      rx: 1.5
    })
    
    parentNode.appendChild(rect)
    
    // 添加级别文本
    const text = this.createElement('text', {
      x: width / 2,
      y: height - 2,
      'text-anchor': 'middle',
      'font-size': '8px',
      fill: '#3b82f6',
      'font-weight': 'bold'
    })
    
    text.textContent = `Level ${level}`
    parentNode.appendChild(text)
  }

  private drawDueDateIndicator(parentNode: SVGElement, dueDate: string, element: any): void {
    // 在任务左上角添加截止日期
    const text = this.createElement('text', {
      x: 5,
      y: 15,
      'font-size': '8px',
      fill: '#666666',
      'font-weight': 'bold'
    })
    
    text.textContent = `Due: ${dueDate}`
    parentNode.appendChild(text)
  }

  private drawCustomFields(parentNode: SVGElement, customFields: any[], element: any): void {
    // 在任务内部添加自定义字段
    let yOffset = 30
    
    customFields.forEach((field, index) => {
      if (index >= 3) return // 最多显示3个字段
      
      const text = this.createElement('text', {
        x: 10,
        y: yOffset,
        'font-size': '9px',
        fill: '#333333'
      })
      
      text.textContent = `${field.name}: ${field.value}`
      parentNode.appendChild(text)
      
      yOffset += 12
    })
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

UserTaskRenderer.$inject = ['eventBus', 'bpmnRenderer', 'textRenderer']
