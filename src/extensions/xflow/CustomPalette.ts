import type { 
  EventBus, 
  ElementFactory, 
  Injector,
  Canvas,
  Modeling,
  Injectable
} from '../shared/types'

export default class CustomPalette {
  private eventBus: EventBus
  private elementFactory: ElementFactory
  private modeling: Modeling
  private canvas: Canvas

  constructor(eventBus: EventBus, elementFactory: ElementFactory, modeling: Modeling, canvas: Canvas) {
    this.eventBus = eventBus
    this.elementFactory = elementFactory
    this.modeling = modeling
    this.canvas = canvas

    this.registerPaletteEntries()
  }

  private registerPaletteEntries(): void {
    // 注册自定义调色板条目
    this.eventBus.on('palette.getEntries', (event: any) => {
      // 添加 XFlow 扩展任务组
      event.entries['xflow-user-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-user-task xflow-task',
        title: 'XFlow UserTask',
        action: {
          dragstart: (event: DragEvent) => this.createUserTask(event),
          click: (event: MouseEvent) => this.createUserTask(event)
        }
      }

      event.entries['xflow-service-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-service-task xflow-task',
        title: 'XFlow ServiceTask',
        action: {
          dragstart: (event: DragEvent) => this.createServiceTask(event),
          click: (event: MouseEvent) => this.createServiceTask(event)
        }
      }

      event.entries['xflow-script-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-script-task xflow-task',
        title: 'XFlow ScriptTask',
        action: {
          dragstart: (event: DragEvent) => this.createScriptTask(event),
          click: (event: MouseEvent) => this.createScriptTask(event)
        }
      }

      event.entries['xflow-business-rule-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-business-rule-task xflow-task',
        title: 'XFlow BusinessRuleTask',
        action: {
          dragstart: (event: DragEvent) => this.createBusinessRuleTask(event),
          click: (event: MouseEvent) => this.createBusinessRuleTask(event)
        }
      }

      event.entries['xflow-manual-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-manual-task xflow-task',
        title: 'XFlow ManualTask',
        action: {
          dragstart: (event: DragEvent) => this.createManualTask(event),
          click: (event: MouseEvent) => this.createManualTask(event)
        }
      }

      event.entries['xflow-receive-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-receive-task xflow-task',
        title: 'XFlow ReceiveTask',
        action: {
          dragstart: (event: DragEvent) => this.createReceiveTask(event),
          click: (event: MouseEvent) => this.createReceiveTask(event)
        }
      }

      event.entries['xflow-send-task'] = {
        group: 'xflow-tasks',
        className: 'bpmn-icon-send-task xflow-task',
        title: 'XFlow SendTask',
        action: {
          dragstart: (event: DragEvent) => this.createSendTask(event),
          click: (event: MouseEvent) => this.createSendTask(event)
        }
      }
    })
  }

  private createUserTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const userTask = this.elementFactory.createShape({
      type: 'bpmn:UserTask',
      businessObject: {
        $type: 'bpmn:UserTask',
        name: 'XFlow UserTask'
      }
    })

    const newElement = this.canvas.addShape(userTask, position)
    
    // 添加 XFlow 扩展
    this.addUserTaskExtension(newElement)
  }

  private createServiceTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const serviceTask = this.elementFactory.createShape({
      type: 'bpmn:ServiceTask',
      businessObject: {
        $type: 'bpmn:ServiceTask',
        name: 'XFlow ServiceTask'
      }
    })

    const newElement = this.canvas.addShape(serviceTask, position)
    
    // 添加 XFlow 扩展
    this.addServiceTaskExtension(newElement)
  }

  private createScriptTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const scriptTask = this.elementFactory.createShape({
      type: 'bpmn:ScriptTask',
      businessObject: {
        $type: 'bpmn:ScriptTask',
        name: 'XFlow ScriptTask'
      }
    })

    const newElement = this.canvas.addShape(scriptTask, position)
    
    // 添加 XFlow 扩展
    this.addScriptTaskExtension(newElement)
  }

  private createBusinessRuleTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const businessRuleTask = this.elementFactory.createShape({
      type: 'bpmn:BusinessRuleTask',
      businessObject: {
        $type: 'bpmn:BusinessRuleTask',
        name: 'XFlow BusinessRuleTask'
      }
    })

    const newElement = this.canvas.addShape(businessRuleTask, position)
    
    // 添加 XFlow 扩展
    this.addBusinessRuleTaskExtension(newElement)
  }

  private createManualTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const manualTask = this.elementFactory.createShape({
      type: 'bpmn:ManualTask',
      businessObject: {
        $type: 'bpmn:ManualTask',
        name: 'XFlow ManualTask'
      }
    })

    const newElement = this.canvas.addShape(manualTask, position)
    
    // 添加 XFlow 扩展
    this.addManualTaskExtension(newElement)
  }

  private createReceiveTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const receiveTask = this.elementFactory.createShape({
      type: 'bpmn:ReceiveTask',
      businessObject: {
        $type: 'bpmn:ReceiveTask',
        name: 'XFlow ReceiveTask'
      }
    })

    const newElement = this.canvas.addShape(receiveTask, position)
    
    // 添加 XFlow 扩展
    this.addReceiveTaskExtension(newElement)
  }

  private createSendTask(event: DragEvent | MouseEvent): void {
    const position = this.getEventPosition(event)
    
    const sendTask = this.elementFactory.createShape({
      type: 'bpmn:SendTask',
      businessObject: {
        $type: 'bpmn:SendTask',
        name: 'XFlow SendTask'
      }
    })

    const newElement = this.canvas.addShape(sendTask, position)
    
    // 添加 XFlow 扩展
    this.addSendTaskExtension(newElement)
  }

  private addUserTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      priority: 'medium',
      approvalLevel: 1,
      assignee: '',
      dueDate: '',
      customFields: []
    })
  }

  private addServiceTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      module: {
        name: 'defaultModule',
        version: '1.0.0',
        description: 'Default XFlow module'
      },
      method: {
        name: 'defaultMethod',
        parameters: '',
        returnType: 'void',
        description: 'Default XFlow method'
      }
    })
  }

  private addScriptTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      scriptType: 'javascript',
      scriptEngine: 'node',
      timeout: 30,
      retryCount: 0
    })
  }

  private addBusinessRuleTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      ruleSet: 'defaultRules',
      ruleEngine: 'drools',
      decisionTable: ''
    })
  }

  private addManualTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      instructions: 'Please complete this manual task',
      estimatedDuration: '15 minutes',
      requiredSkills: ''
    })
  }

  private addReceiveTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      messageType: 'defaultMessage',
      correlationKey: 'processId',
      timeout: '1h'
    })
  }

  private addSendTaskExtension(element: any): void {
    this.modeling.updateProperties(element, {
      messageType: 'defaultMessage',
      targetEndpoint: 'defaultEndpoint',
      retryPolicy: 'none'
    })
  }

  private getEventPosition(event: DragEvent | MouseEvent): { x: number; y: number } {
    // 获取画布中心位置作为默认位置
    const viewbox = this.canvas.viewbox()
    return {
      x: viewbox.x + viewbox.width / 2 - 50,
      y: viewbox.y + viewbox.height / 2 - 40
    }
  }
}

(CustomPalette as Injectable).$inject = ['eventBus', 'elementFactory', 'modeling', 'canvas']
