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
} from './types'
import type { UserTaskExtension } from './types'

export default class UserTaskPropertiesProvider {
  private propertiesPanel: PropertiesPanel
  private translate: Translate
  private modeling: Modeling

  constructor(propertiesPanel: PropertiesPanel, translate: Translate, injector: Injector) {
    this.propertiesPanel = propertiesPanel
    this.translate = translate
    this.modeling = injector.get('modeling')
    
    this.register()
  }

  register(): void {
    this.propertiesPanel.registerProvider(this)
  }

  getGroups(element: BpmnElement): (groups: PropertiesPanelGroup[]) => PropertiesPanelGroup[] {
    return (groups: PropertiesPanelGroup[]) => {
      // 对所有 UserTask 显示自定义属性组
      if (this.isUserTask(element)) {
        groups.push(this.createUserTaskExtensionGroup(element))
      }
      
      return groups
    }
  }

  private isUserTask(element: BpmnElement): boolean {
    return is(element, 'bpmn:UserTask')
  }

  private createUserTaskExtensionGroup(element: BpmnElement): PropertiesPanelGroup {
    const businessObject = getBusinessObject(element) as UserTaskExtension
    
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
          get: (element: BpmnElement) => {
            return businessObject.priority || 'medium'
          },
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, {
              priority: value
            })
          }
        },
        {
          id: 'approvalLevel',
          label: 'Approval Level',
          type: 'number',
          get: (element: BpmnElement) => {
            return businessObject.approvalLevel || 1
          },
          set: (element: BpmnElement, value: number) => {
            this.modeling.updateProperties(element, {
              approvalLevel: parseInt(value.toString()) || 1
            })
          }
        },
        {
          id: 'assignee',
          label: 'Assignee',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.assignee || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, {
              assignee: value
            })
          }
        },
        {
          id: 'dueDate',
          label: 'Due Date',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.dueDate || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, {
              dueDate: value
            })
          }
        },
        {
          id: 'customFields',
          label: 'Custom Fields',
          type: 'custom',
          get: (element: BpmnElement) => {
            return businessObject.customFields || []
          },
          set: (element: BpmnElement, value: any[]) => {
            this.modeling.updateProperties(element, {
              customFields: value
            })
          }
        }
      ]
    }
  }
}

UserTaskPropertiesProvider.$inject = ['propertiesPanel', 'translate', 'injector']
