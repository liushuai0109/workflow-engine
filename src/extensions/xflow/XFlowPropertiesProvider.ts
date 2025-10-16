import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type { 
  BpmnElement, 
  PropertiesPanel, 
  Translate, 
  Injector, 
  Modeling,
  PropertiesPanelGroup,
  PropertiesPanelEntry,
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

console.log('XFlowPropertiesProvider module loaded')

export default class XFlowPropertiesProvider {
  private propertiesPanel: PropertiesPanel
  private translate: Translate
  private modeling: Modeling

  constructor(propertiesPanel: PropertiesPanel, translate: Translate, injector: Injector) {
    console.log('XFlowPropertiesProvider constructor called')
    this.propertiesPanel = propertiesPanel
    this.translate = translate
    this.modeling = injector.get('modeling')
    
    this.register()
    console.log('XFlowPropertiesProvider registered')
  }

  register(): void {
    this.propertiesPanel.registerProvider(this)
  }

  getGroups(element: BpmnElement): (groups: PropertiesPanelGroup[]) => PropertiesPanelGroup[] {
    return (groups: PropertiesPanelGroup[]) => {
      console.log('XFlowPropertiesProvider.getGroups called for element:', element)
      
      // 对所有元素显示基本信息组
      const elementInfoGroup = this.createElementInfoGroup(element)
      console.log('Created element info group:', elementInfoGroup)
      groups.push(elementInfoGroup)
      
      // 根据任务类型显示对应的 XFlow 扩展属性组
      const xflowGroup = this.createXFlowExtensionGroup(element)
      if (xflowGroup) {
        console.log('Created XFlow extension group:', xflowGroup)
        groups.push(xflowGroup)
      }
      
      console.log('Final groups:', groups)
      return groups
    }
  }

  private createXFlowExtensionGroup(element: BpmnElement): PropertiesPanelGroup | null {
    const businessObject = getBusinessObject(element)
    
    if (is(element, 'bpmn:UserTask') && businessObject.$instanceOf('xflow:UserTaskExtension')) {
      return this.createUserTaskExtensionGroup(element, businessObject as UserTaskExtension)
    } else if (is(element, 'bpmn:ServiceTask') && businessObject.$instanceOf('xflow:ServiceTaskExtension')) {
      return this.createServiceTaskExtensionGroup(element, businessObject as ServiceTaskExtension)
    } else if (is(element, 'bpmn:ScriptTask') && businessObject.$instanceOf('xflow:ScriptTaskExtension')) {
      return this.createScriptTaskExtensionGroup(element, businessObject as ScriptTaskExtension)
    } else if (is(element, 'bpmn:BusinessRuleTask') && businessObject.$instanceOf('xflow:BusinessRuleTaskExtension')) {
      return this.createBusinessRuleTaskExtensionGroup(element, businessObject as BusinessRuleTaskExtension)
    } else if (is(element, 'bpmn:ManualTask') && businessObject.$instanceOf('xflow:ManualTaskExtension')) {
      return this.createManualTaskExtensionGroup(element, businessObject as ManualTaskExtension)
    } else if (is(element, 'bpmn:ReceiveTask') && businessObject.$instanceOf('xflow:ReceiveTaskExtension')) {
      return this.createReceiveTaskExtensionGroup(element, businessObject as ReceiveTaskExtension)
    } else if (is(element, 'bpmn:SendTask') && businessObject.$instanceOf('xflow:SendTaskExtension')) {
      return this.createSendTaskExtensionGroup(element, businessObject as SendTaskExtension)
    }
    
    return null
  }

  // UserTask 扩展属性组
  private createUserTaskExtensionGroup(element: BpmnElement, extension: UserTaskExtension): PropertiesPanelGroup {
    return {
      id: 'userTaskExtension',
      label: 'User Task Extension',
      entries: [
        {
          id: 'priority',
          label: 'Priority',
          type: 'select',
          selectOptions: [
            { name: 'High', value: 'high' },
            { name: 'Medium', value: 'medium' },
            { name: 'Low', value: 'low' }
          ],
          get: (element: BpmnElement) => extension.priority || 'medium',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { priority: value })
          }
        },
        {
          id: 'approvalLevel',
          label: 'Approval Level',
          type: 'number',
          get: (element: BpmnElement) => extension.approvalLevel || 1,
          set: (element: BpmnElement, value: number) => {
            this.modeling.updateProperties(element, { approvalLevel: parseInt(value as any) || 1 })
          }
        },
        {
          id: 'assignee',
          label: 'Assignee',
          type: 'text',
          get: (element: BpmnElement) => extension.assignee || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { assignee: value })
          }
        },
        {
          id: 'dueDate',
          label: 'Due Date',
          type: 'text',
          get: (element: BpmnElement) => extension.dueDate || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { dueDate: value })
          }
        }
      ]
    }
  }

  // ServiceTask 扩展属性组
  private createServiceTaskExtensionGroup(element: BpmnElement, extension: ServiceTaskExtension): PropertiesPanelGroup {
    return {
      id: 'serviceTaskExtension',
      label: 'Service Task Extension',
      entries: [
        {
          id: 'moduleName',
          label: 'Module Name',
          type: 'text',
          get: (element: BpmnElement) => extension.module?.name || '',
          set: (element: BpmnElement, value: string) => {
            this.updateModuleProperty(element, 'name', value)
          }
        },
        {
          id: 'moduleVersion',
          label: 'Module Version',
          type: 'text',
          get: (element: BpmnElement) => extension.module?.version || '',
          set: (element: BpmnElement, value: string) => {
            this.updateModuleProperty(element, 'version', value)
          }
        },
        {
          id: 'methodName',
          label: 'Method Name',
          type: 'text',
          get: (element: BpmnElement) => extension.method?.name || '',
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'name', value)
          }
        },
        {
          id: 'methodParameters',
          label: 'Method Parameters',
          type: 'text',
          get: (element: BpmnElement) => extension.method?.parameters || '',
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'parameters', value)
          }
        },
        {
          id: 'methodReturnType',
          label: 'Return Type',
          type: 'text',
          get: (element: BpmnElement) => extension.method?.returnType || '',
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'returnType', value)
          }
        }
      ]
    }
  }

  // ScriptTask 扩展属性组
  private createScriptTaskExtensionGroup(element: BpmnElement, extension: ScriptTaskExtension): PropertiesPanelGroup {
    return {
      id: 'scriptTaskExtension',
      label: 'Script Task Extension',
      entries: [
        {
          id: 'scriptType',
          label: 'Script Type',
          type: 'select',
          selectOptions: [
            { name: 'JavaScript', value: 'javascript' },
            { name: 'Python', value: 'python' },
            { name: 'Groovy', value: 'groovy' },
            { name: 'Shell', value: 'shell' }
          ],
          get: (element: BpmnElement) => extension.scriptType || 'javascript',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { scriptType: value })
          }
        },
        {
          id: 'scriptEngine',
          label: 'Script Engine',
          type: 'text',
          get: (element: BpmnElement) => extension.scriptEngine || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { scriptEngine: value })
          }
        },
        {
          id: 'timeout',
          label: 'Timeout (seconds)',
          type: 'number',
          get: (element: BpmnElement) => extension.timeout || 30,
          set: (element: BpmnElement, value: number) => {
            this.modeling.updateProperties(element, { timeout: parseInt(value as any) || 30 })
          }
        },
        {
          id: 'retryCount',
          label: 'Retry Count',
          type: 'number',
          get: (element: BpmnElement) => extension.retryCount || 0,
          set: (element: BpmnElement, value: number) => {
            this.modeling.updateProperties(element, { retryCount: parseInt(value as any) || 0 })
          }
        }
      ]
    }
  }

  // BusinessRuleTask 扩展属性组
  private createBusinessRuleTaskExtensionGroup(element: BpmnElement, extension: BusinessRuleTaskExtension): PropertiesPanelGroup {
    return {
      id: 'businessRuleTaskExtension',
      label: 'Business Rule Task Extension',
      entries: [
        {
          id: 'ruleSet',
          label: 'Rule Set',
          type: 'text',
          get: (element: BpmnElement) => extension.ruleSet || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { ruleSet: value })
          }
        },
        {
          id: 'ruleEngine',
          label: 'Rule Engine',
          type: 'select',
          selectOptions: [
            { name: 'Drools', value: 'drools' },
            { name: 'Easy Rules', value: 'easy-rules' },
            { name: 'Custom', value: 'custom' }
          ],
          get: (element: BpmnElement) => extension.ruleEngine || 'drools',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { ruleEngine: value })
          }
        },
        {
          id: 'decisionTable',
          label: 'Decision Table',
          type: 'text',
          get: (element: BpmnElement) => extension.decisionTable || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { decisionTable: value })
          }
        }
      ]
    }
  }

  // ManualTask 扩展属性组
  private createManualTaskExtensionGroup(element: BpmnElement, extension: ManualTaskExtension): PropertiesPanelGroup {
    return {
      id: 'manualTaskExtension',
      label: 'Manual Task Extension',
      entries: [
        {
          id: 'instructions',
          label: 'Instructions',
          type: 'text',
          get: (element: BpmnElement) => extension.instructions || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { instructions: value })
          }
        },
        {
          id: 'estimatedDuration',
          label: 'Estimated Duration',
          type: 'text',
          get: (element: BpmnElement) => extension.estimatedDuration || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { estimatedDuration: value })
          }
        },
        {
          id: 'requiredSkills',
          label: 'Required Skills',
          type: 'text',
          get: (element: BpmnElement) => extension.requiredSkills || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { requiredSkills: value })
          }
        }
      ]
    }
  }

  // ReceiveTask 扩展属性组
  private createReceiveTaskExtensionGroup(element: BpmnElement, extension: ReceiveTaskExtension): PropertiesPanelGroup {
    return {
      id: 'receiveTaskExtension',
      label: 'Receive Task Extension',
      entries: [
        {
          id: 'messageType',
          label: 'Message Type',
          type: 'text',
          get: (element: BpmnElement) => extension.messageType || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { messageType: value })
          }
        },
        {
          id: 'correlationKey',
          label: 'Correlation Key',
          type: 'text',
          get: (element: BpmnElement) => extension.correlationKey || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { correlationKey: value })
          }
        },
        {
          id: 'timeout',
          label: 'Timeout',
          type: 'text',
          get: (element: BpmnElement) => extension.timeout || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { timeout: value })
          }
        }
      ]
    }
  }

  // SendTask 扩展属性组
  private createSendTaskExtensionGroup(element: BpmnElement, extension: SendTaskExtension): PropertiesPanelGroup {
    return {
      id: 'sendTaskExtension',
      label: 'Send Task Extension',
      entries: [
        {
          id: 'messageType',
          label: 'Message Type',
          type: 'text',
          get: (element: BpmnElement) => extension.messageType || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { messageType: value })
          }
        },
        {
          id: 'targetEndpoint',
          label: 'Target Endpoint',
          type: 'text',
          get: (element: BpmnElement) => extension.targetEndpoint || '',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { targetEndpoint: value })
          }
        },
        {
          id: 'retryPolicy',
          label: 'Retry Policy',
          type: 'select',
          selectOptions: [
            { name: 'None', value: 'none' },
            { name: 'Fixed Delay', value: 'fixed-delay' },
            { name: 'Exponential Backoff', value: 'exponential-backoff' }
          ],
          get: (element: BpmnElement) => extension.retryPolicy || 'none',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { retryPolicy: value })
          }
        }
      ]
    }
  }

  private createElementInfoGroup(element: BpmnElement): PropertiesPanelGroup {
    const businessObject = getBusinessObject(element)
    
    return {
      id: 'elementInfo',
      label: 'Element Information',
      entries: [
        {
          id: 'elementType',
          label: 'Element Type',
          type: 'text',
          get: (element: BpmnElement) => businessObject.$type || 'Unknown',
          set: () => {
            // 只读
          }
        },
        {
          id: 'elementId',
          label: 'Element ID',
          type: 'text',
          get: (element: BpmnElement) => businessObject.id || 'No ID',
          set: () => {
            // 只读
          }
        },
        {
          id: 'elementName',
          label: 'Element Name',
          type: 'text',
          get: (element: BpmnElement) => businessObject.name || 'No Name',
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, { name: value })
          }
        },
        {
          id: 'elementDocumentation',
          label: 'Documentation',
          type: 'text',
          get: (element: BpmnElement) => businessObject.documentation?.[0]?.text || '',
          set: (element: BpmnElement, value: string) => {
            // 这里可以添加文档更新逻辑
          }
        }
      ]
    }
  }

  private updateModuleProperty(element: BpmnElement, property: string, value: string): void {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension
    
    if (!businessObject.module) {
      businessObject.module = {}
    }
    
    (businessObject.module as any)[property] = value
    
    this.modeling.updateProperties(element, {
      module: businessObject.module
    })
  }

  private updateMethodProperty(element: BpmnElement, property: string, value: string): void {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension
    
    if (!businessObject.method) {
      businessObject.method = {}
    }
    
    (businessObject.method as any)[property] = value
    
    this.modeling.updateProperties(element, {
      method: businessObject.method
    })
  }
}

(XFlowPropertiesProvider as Injectable).$inject = ['propertiesPanel', 'translate', 'injector']
