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
import type { XFlowModule, XFlowMethod, ServiceTaskExtension } from './types'

console.log('ServiceTaskPropertiesProvider module loaded')

export default class ServiceTaskPropertiesProvider {
  private propertiesPanel: PropertiesPanel
  private translate: Translate
  private modeling: Modeling

  constructor(propertiesPanel: PropertiesPanel, translate: Translate, injector: Injector) {
    console.log('ServiceTaskPropertiesProvider constructor called')
    this.propertiesPanel = propertiesPanel
    this.translate = translate
    this.modeling = injector.get('modeling')
    
    this.register()
    console.log('ServiceTaskPropertiesProvider registered')
  }

  register(): void {
    this.propertiesPanel.registerProvider(this)
  }

  getGroups(element: BpmnElement): (groups: PropertiesPanelGroup[]) => PropertiesPanelGroup[] {
    return (groups: PropertiesPanelGroup[]) => {
      console.log('ServiceTaskPropertiesProvider.getGroups called for element:', element)
      
      // 对所有元素显示基本信息组
      const elementInfoGroup = this.createElementInfoGroup(element)
      console.log('Created element info group:', elementInfoGroup)
      groups.push(elementInfoGroup)
      
      // 对所有 ServiceTask 显示 XFlow 扩展属性组
      if (this.isServiceTask(element)) {
        const xflowGroup = this.createXFlowExtensionGroup(element)
        console.log('Created XFlow extension group:', xflowGroup)
        groups.push(xflowGroup)
      }
      
      console.log('Final groups:', groups)
      return groups
    }
  }

  private isServiceTask(element: BpmnElement): boolean {
    return is(element, 'bpmn:ServiceTask')
  }

  private createXFlowExtensionGroup(element: BpmnElement): PropertiesPanelGroup {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension
    
    return {
      id: 'xflowExtension',
      label: 'XFlow Extension',
      entries: [
        // 模块信息组
        {
          id: 'moduleName',
          label: 'Module Name',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.module?.name || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateModuleProperty(element, 'name', value)
          }
        },
        {
          id: 'moduleVersion',
          label: 'Module Version',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.module?.version || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateModuleProperty(element, 'version', value)
          }
        },
        {
          id: 'moduleDescription',
          label: 'Module Description',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.module?.description || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateModuleProperty(element, 'description', value)
          }
        },
        // 方法信息组
        {
          id: 'methodName',
          label: 'Method Name',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.method?.name || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'name', value)
          }
        },
        {
          id: 'methodParameters',
          label: 'Method Parameters',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.method?.parameters || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'parameters', value)
          }
        },
        {
          id: 'methodReturnType',
          label: 'Return Type',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.method?.returnType || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'returnType', value)
          }
        },
        {
          id: 'methodDescription',
          label: 'Method Description',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.method?.description || ''
          },
          set: (element: BpmnElement, value: string) => {
            this.updateMethodProperty(element, 'description', value)
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
          get: (element: BpmnElement) => {
            return businessObject.$type || 'Unknown'
          },
          set: () => {
            // 只读
          }
        },
        {
          id: 'elementId',
          label: 'Element ID',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.id || 'No ID'
          },
          set: () => {
            // 只读
          }
        },
        {
          id: 'elementName',
          label: 'Element Name',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.name || 'No Name'
          },
          set: (element: BpmnElement, value: string) => {
            this.modeling.updateProperties(element, {
              name: value
            })
          }
        },
        {
          id: 'elementDocumentation',
          label: 'Documentation',
          type: 'text',
          get: (element: BpmnElement) => {
            return businessObject.documentation?.[0]?.text || ''
          },
          set: (element: BpmnElement, value: string) => {
            // 这里可以添加文档更新逻辑
          }
        }
      ]
    }
  }

  private updateModuleProperty(element: BpmnElement, property: string, value: string): void {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension
    
    // 确保 module 对象存在
    if (!businessObject.module) {
      businessObject.module = {}
    }
    
    // 更新属性
    (businessObject.module as any)[property] = value
    
    // 触发更新
    this.modeling.updateProperties(element, {
      module: businessObject.module
    })
  }

  private updateMethodProperty(element: BpmnElement, property: string, value: string): void {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension
    
    // 确保 method 对象存在
    if (!businessObject.method) {
      businessObject.method = {}
    }
    
    // 更新属性
    (businessObject.method as any)[property] = value
    
    // 触发更新
    this.modeling.updateProperties(element, {
      method: businessObject.method
    })
  }
}

(ServiceTaskPropertiesProvider as Injectable).$inject = ['propertiesPanel', 'translate', 'injector']
