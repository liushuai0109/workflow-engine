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
import type { ServiceTaskExtension } from './types'

const HIGH_PRIORITY = 1500

export default class ServiceTaskRenderer extends BaseRenderer {
  private bpmnRenderer: BpmnRenderer
  private textRenderer: TextRenderer

  constructor(eventBus: any, bpmnRenderer: BpmnRenderer, textRenderer: TextRenderer) {
    super(eventBus, HIGH_PRIORITY)
    
    this.bpmnRenderer = bpmnRenderer
    this.textRenderer = textRenderer
  }

  canRender(element: BpmnElement): boolean {
    // 只渲染扩展的 ServiceTask
    return is(element, 'bpmn:ServiceTask') && element.businessObject.$instanceOf('xflow:ServiceTaskExtension')
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    // 使用默认的 BPMN 渲染器绘制基础形状
    const shape = this.bpmnRenderer.drawShape(parentNode, element)
    
    // 添加自定义元素
    this.drawCustomElements(shape, element)
    
    return shape
  }

  private drawCustomElements(parentNode: SVGElement, element: any): void {
    const businessObject = element.businessObject as ServiceTaskExtension
    
    // 创建自定义容器
    const customContainer = this.createElement('g', {
      class: 'custom-service-task-elements'
    })

    // 绘制模块信息
    if (businessObject.module) {
      this.drawModuleInfo(customContainer, businessObject.module, element)
    }

    // 绘制方法信息
    if (businessObject.method) {
      this.drawMethodInfo(customContainer, businessObject.method, element)
    }
    
    parentNode.appendChild(customContainer)
  }

  private drawModuleInfo(parentNode: SVGElement, module: any, element: any): void {
    const width = element.width || 100
    const height = element.height || 80
    
    // 在任务左上角添加模块信息
    const moduleGroup = this.createElement('g', {
      class: 'module-info'
    })

    // 模块名称
    if (module.name) {
      const nameText = this.createElement('text', {
        x: '5',
        y: '15',
        'font-size': '9px',
        fill: '#2563eb',
        'font-weight': 'bold'
      })
      nameText.textContent = `Module: ${module.name}`
      moduleGroup.appendChild(nameText)
    }

    // 模块版本
    if (module.version) {
      const versionText = this.createElement('text', {
        x: '5',
        y: '28',
        'font-size': '8px',
        fill: '#6b7280'
      })
      versionText.textContent = `v${module.version}`
      moduleGroup.appendChild(versionText)
    }

    parentNode.appendChild(moduleGroup)
  }

  private drawMethodInfo(parentNode: SVGElement, method: any, element: any): void {
    const width = element.width || 100
    const height = element.height || 80
    
    // 在任务右下角添加方法信息
    const methodGroup = this.createElement('g', {
      class: 'method-info'
    })

    // 方法名称
    if (method.name) {
      const methodText = this.createElement('text', {
        x: (width - 5).toString(),
        y: (height - 15).toString(),
        'text-anchor': 'end',
        'font-size': '9px',
        fill: '#dc2626',
        'font-weight': 'bold'
      })
      methodText.textContent = `Method: ${method.name}`
      methodGroup.appendChild(methodText)
    }

    // 返回类型
    if (method.returnType) {
      const returnText = this.createElement('text', {
        x: (width - 5).toString(),
        y: (height - 2).toString(),
        'text-anchor': 'end',
        'font-size': '8px',
        fill: '#6b7280'
      })
      returnText.textContent = `→ ${method.returnType}`
      methodGroup.appendChild(returnText)
    }

    parentNode.appendChild(methodGroup)
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

(ServiceTaskRenderer as Injectable).$inject = ['eventBus', 'bpmnRenderer', 'textRenderer']
