import type { 
  BpmnElement, 
  EventBus, 
  ElementFactory, 
  Injector,
  Canvas,
  Modeling,
  ElementRegistry,
  Injectable
} from '../shared/types'

export default class CustomContextPad {
  private eventBus: EventBus
  private elementFactory: ElementFactory
  private modeling: Modeling
  private canvas: Canvas
  private elementRegistry: ElementRegistry

  constructor(eventBus: EventBus, elementFactory: ElementFactory, modeling: Modeling, canvas: Canvas, elementRegistry: ElementRegistry) {
    this.eventBus = eventBus
    this.elementFactory = elementFactory
    this.modeling = modeling
    this.canvas = canvas
    this.elementRegistry = elementRegistry

    this.registerContextPadEntries()
  }

  private registerContextPadEntries(): void {
    // 为 UserTask 添加上下文菜单
    this.eventBus.on('contextPad.getEntries', (event: any) => {
      const { element } = event
      
      if (this.isUserTask(element)) {
        // 添加 "Append UserTask" 按钮
        event.entries['append-user-task'] = {
          group: 'model',
          className: 'bpmn-icon-user-task',
          title: 'Append UserTask',
          action: {
            click: () => this.appendUserTask(element)
          }
        }

        // 添加 "Append ServiceTask" 按钮
        event.entries['append-service-task'] = {
          group: 'model',
          className: 'bpmn-icon-service-task',
          title: 'Append ServiceTask',
          action: {
            click: () => this.appendServiceTask(element)
          }
        }
      }

      if (this.isServiceTask(element)) {
        // 添加 "Append UserTask" 按钮
        event.entries['append-user-task'] = {
          group: 'model',
          className: 'bpmn-icon-user-task',
          title: 'Append UserTask',
          action: {
            click: () => this.appendUserTask(element)
          }
        }

        // 添加 "Append ServiceTask" 按钮
        event.entries['append-service-task'] = {
          group: 'model',
          className: 'bpmn-icon-service-task',
          title: 'Append ServiceTask',
          action: {
            click: () => this.appendServiceTask(element)
          }
        }
      }

      // 为所有任务类型添加通用扩展按钮
      if (this.isTask(element)) {
        event.entries['add-xflow-extension'] = {
          group: 'model',
          className: 'bpmn-icon-extension',
          title: 'Add XFlow Extension',
          action: {
            click: () => this.addXFlowExtension(element)
          }
        }
      }
    })
  }

  private isUserTask(element: BpmnElement): boolean {
    return element.type === 'bpmn:UserTask'
  }

  private isServiceTask(element: BpmnElement): boolean {
    return element.type === 'bpmn:ServiceTask'
  }

  private isTask(element: BpmnElement): boolean {
    return !!(element.type && element.type.includes('Task'))
  }

  private appendUserTask(sourceElement: BpmnElement): void {
    const position = this.getNextPosition(sourceElement)
    
    const userTask = this.elementFactory.createShape({
      type: 'bpmn:UserTask',
      businessObject: {
        $type: 'bpmn:UserTask',
        name: 'New UserTask'
      }
    })

    const newElement = this.canvas.addShape(userTask, position)
    
    // 创建连接
    this.modeling.connect(sourceElement, newElement, {
      type: 'bpmn:SequenceFlow'
    })

    // 添加 XFlow 扩展
    this.addXFlowExtension(newElement)
  }

  private appendServiceTask(sourceElement: BpmnElement): void {
    const position = this.getNextPosition(sourceElement)
    
    const serviceTask = this.elementFactory.createShape({
      type: 'bpmn:ServiceTask',
      businessObject: {
        $type: 'bpmn:ServiceTask',
        name: 'New ServiceTask'
      }
    })

    const newElement = this.canvas.addShape(serviceTask, position)
    
    // 创建连接
    this.modeling.connect(sourceElement, newElement, {
      type: 'bpmn:SequenceFlow'
    })

    // 添加 XFlow 扩展
    this.addXFlowExtension(newElement)
  }

  private addXFlowExtension(element: BpmnElement): void {
    const businessObject = element.businessObject
    
    if (this.isUserTask(element)) {
      // 为 UserTask 添加 XFlow 扩展
      this.modeling.updateProperties(element, {
        $type: 'xflow:UserTaskExtension',
        priority: 'medium',
        approvalLevel: 1,
        assignee: '',
        dueDate: '',
        customFields: []
      })
    } else if (this.isServiceTask(element)) {
      // 为 ServiceTask 添加 XFlow 扩展
      this.modeling.updateProperties(element, {
        $type: 'xflow:ServiceTaskExtension',
        module: {
          name: '',
          version: '1.0.0',
          description: ''
        },
        method: {
          name: '',
          parameters: '',
          returnType: 'void',
          description: ''
        }
      })
    }
  }

  private getNextPosition(sourceElement: BpmnElement): { x: number; y: number } {
    const sourcePosition = {
      x: sourceElement.x || 0,
      y: sourceElement.y || 0
    }

    // 在源元素右侧创建新元素
    return {
      x: sourcePosition.x + 200,
      y: sourcePosition.y
    }
  }
}

(CustomContextPad as Injectable).$inject = ['eventBus', 'elementFactory', 'modeling', 'canvas', 'elementRegistry']
