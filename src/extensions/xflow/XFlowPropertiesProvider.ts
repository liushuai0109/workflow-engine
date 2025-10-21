import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
import { is } from "bpmn-js/lib/util/ModelUtil";
import {
  TextFieldEntry,
  isTextFieldEntryEdited,
  SelectEntry,
  isSelectEntryEdited,
  NumberFieldEntry,
  isNumberFieldEntryEdited,
  ListGroup,
} from "@bpmn-io/properties-panel";
import userTaskProps from "./provider/user-task/userTaskProps";
import type {
  BpmnElement,
  PropertiesPanel,
  Translate,
  Injector,
  Modeling,
  PropertiesPanelGroup,
  PropertiesPanelEntry,
  Injectable,
} from "../shared/types";
import type {
  UserTaskExtension,
  ServiceTaskExtension,
  ScriptTaskExtension,
  BusinessRuleTaskExtension,
  ManualTaskExtension,
  ReceiveTaskExtension,
  SendTaskExtension,
  TaskType,
  EXTENSION_TYPE_MAP,
} from "./types";
import { createPropertyEntry } from "./PropertyEntryFactory";

console.log("XFlowPropertiesProvider module loaded");

export default class XFlowPropertiesProvider {
  private propertiesPanel: PropertiesPanel;
  private injector: Injector;
  private translate: Translate;
  private modeling: Modeling;

  constructor(
    propertiesPanel: PropertiesPanel,
    translate: Translate,
    injector: Injector
  ) {
    console.log("XFlowPropertiesProvider constructor called");
    this.propertiesPanel = propertiesPanel;
    this.injector = injector;
    this.translate = translate;
    this.modeling = injector.get("modeling");

    this.register();
    console.log("XFlowPropertiesProvider registered");
  }

  register(): void {
    this.propertiesPanel.registerProvider(this);
  }

  getGroups(
    element: BpmnElement
  ): (groups: PropertiesPanelGroup[]) => PropertiesPanelGroup[] {
    return (groups: PropertiesPanelGroup[]) => {
      console.log(
        "XFlowPropertiesProvider.getGroups called for element:",
        element
      );

      // 对所有元素显示基本信息组
      // const elementInfoGroup = this.createElementInfoGroup(element)
      // console.log('Created element info group:', elementInfoGroup)
      // groups.push(elementInfoGroup)

      // 根据任务类型显示对应的 XFlow 扩展属性组
      const xflowGroup = this.createXFlowExtensionGroup(element);
      if (xflowGroup) {
        console.log("Created XFlow extension group:", xflowGroup);
        groups.push(xflowGroup);
      }

      console.log("Final groups:", groups);
      return groups;
    };
  }

  private createXFlowExtensionGroup(
    element: BpmnElement
  ): PropertiesPanelGroup | null {
    const businessObject = getBusinessObject(element);

    if (is(element, "bpmn:UserTask")) {
      return this.createUserTaskExtensionGroup(element, businessObject);
    } else if (is(element, "bpmn:ServiceTask")) {
      return this.createServiceTaskExtensionGroup(element, businessObject);
    }
    // else if (is(element, 'bpmn:ScriptTask') && businessObject.$instanceOf('xflow:ScriptTaskExtension')) {
    //   return this.createScriptTaskExtensionGroup(element, businessObject as ScriptTaskExtension)
    // } else if (is(element, 'bpmn:BusinessRuleTask') && businessObject.$instanceOf('xflow:BusinessRuleTaskExtension')) {
    //   return this.createBusinessRuleTaskExtensionGroup(element, businessObject as BusinessRuleTaskExtension)
    // } else if (is(element, 'bpmn:ManualTask') && businessObject.$instanceOf('xflow:ManualTaskExtension')) {
    //   return this.createManualTaskExtensionGroup(element, businessObject as ManualTaskExtension)
    // } else if (is(element, 'bpmn:ReceiveTask') && businessObject.$instanceOf('xflow:ReceiveTaskExtension')) {
    //   return this.createReceiveTaskExtensionGroup(element, businessObject as ReceiveTaskExtension)
    // } else if (is(element, 'bpmn:SendTask') && businessObject.$instanceOf('xflow:SendTaskExtension')) {
    //   return this.createSendTaskExtensionGroup(element, businessObject as SendTaskExtension)
    // }

    return null;
  }

  // UserTask 扩展属性组
  private createUserTaskExtensionGroup(
    element: BpmnElement,
    businessObject: any
  ): PropertiesPanelGroup {
    return {
      id: "userTaskExtension",
      label: this.translate("User Task Extension"),
      entries: [
        // 普通属性 - URL
        createPropertyEntry("url", element, TextFieldEntry, {
          propertyPath: "value",
          elementType: "xflow:XFlowUrl",
          label: "URL",
          description: "Task related URL",
          tooltip: "Set the URL for this task",
          placeholder: "Enter URL"
        }),
        
        // 结构化属性 - Inputs
        {
          id: 'inputs',
          label: 'Input Parameters',
          component: ListGroup,
          ...this.createInputListGroup(element)
        } as any,
        
        // 结构化属性 - Outputs
        {
          id: 'outputs',
          label: 'Output Parameters',
          component: ListGroup,
          ...this.createOutputListGroup(element)
        } as any
      ]
    };
  }

  // ServiceTask 扩展属性组
  private createServiceTaskExtensionGroup(
    element: BpmnElement,
    businessObject: any
  ): PropertiesPanelGroup {
    return {
      id: "serviceTaskExtension",
      label: "Service Task Extension",
      entries: [
        createPropertyEntry("moduleName", element, TextFieldEntry, {
          propertyPath: "value",
          elementType: "xflow:XFlowModule",
          label: "Module Name",
          description: "The name of the module",
          tooltip: "The name of the module",
          placeholder: "Enter the name of the module",
        }),
        createPropertyEntry("methodName", element, TextFieldEntry, {
          propertyPath: "value",
          elementType: "xflow:XFlowMethod",
          label: "Method Name",
          description: "The name of the method",
          tooltip: "The name of the method",
          placeholder: "Enter the name of the method",
        }),
      ],
    };
  }

  // ScriptTask 扩展属性组
  // private createScriptTaskExtensionGroup(element: BpmnElement, extension: ScriptTaskExtension): PropertiesPanelGroup {
  //   return {
  //     id: 'scriptTaskExtension',
  //     label: 'Script Task Extension',
  //     entries: [
  //       {
  //         id: 'scriptType',
  //         element,
  //         component: SelectEntry,
  //         isEdited: isSelectEntryEdited
  //       },
  //       {
  //         id: 'scriptEngine',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'timeout',
  //         element,
  //         component: NumberFieldEntry,
  //         isEdited: isNumberFieldEntryEdited
  //       },
  //       {
  //         id: 'retryCount',
  //         element,
  //         component: NumberFieldEntry,
  //         isEdited: isNumberFieldEntryEdited
  //       }
  //     ]
  //   }
  // }

  // BusinessRuleTask 扩展属性组
  // private createBusinessRuleTaskExtensionGroup(element: BpmnElement, extension: BusinessRuleTaskExtension): PropertiesPanelGroup {
  //   return {
  //     id: 'businessRuleTaskExtension',
  //     label: 'Business Rule Task Extension',
  //     entries: [
  //       {
  //         id: 'ruleSet',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'ruleEngine',
  //         element,
  //         component: SelectEntry,
  //         isEdited: isSelectEntryEdited
  //       },
  //       {
  //         id: 'decisionTable',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       }
  //     ]
  //   }
  // }

  // ManualTask 扩展属性组
  // private createManualTaskExtensionGroup(element: BpmnElement, extension: ManualTaskExtension): PropertiesPanelGroup {
  //   return {
  //     id: 'manualTaskExtension',
  //     label: 'Manual Task Extension',
  //     entries: [
  //       {
  //         id: 'instructions',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'estimatedDuration',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'requiredSkills',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       }
  //     ]
  //   }
  // }

  // ReceiveTask 扩展属性组
  // private createReceiveTaskExtensionGroup(element: BpmnElement, extension: ReceiveTaskExtension): PropertiesPanelGroup {
  //   return {
  //     id: 'receiveTaskExtension',
  //     label: 'Receive Task Extension',
  //     entries: [
  //       {
  //         id: 'messageType',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'correlationKey',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'timeout',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       }
  //     ]
  //   }
  // }

  // SendTask 扩展属性组
  // private createSendTaskExtensionGroup(element: BpmnElement, extension: SendTaskExtension): PropertiesPanelGroup {
  //   return {
  //     id: 'sendTaskExtension',
  //     label: 'Send Task Extension',
  //     entries: [
  //       {
  //         id: 'messageType',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'targetEndpoint',
  //         element,
  //         component: TextFieldEntry,
  //         isEdited: isTextFieldEntryEdited
  //       },
  //       {
  //         id: 'retryPolicy',
  //         element,
  //         component: SelectEntry,
  //         isEdited: isSelectEntryEdited
  //       }
  //     ]
  //   }
  // }

  private createElementInfoGroup(element: BpmnElement): PropertiesPanelGroup {
    const businessObject = getBusinessObject(element);

    return {
      id: "elementInfo",
      label: "Element Information",
      entries: [
        {
          id: "elementType",
          element,
          component: TextFieldEntry,
          isEdited: isTextFieldEntryEdited,
        },
        {
          id: "elementId",
          element,
          component: TextFieldEntry,
          isEdited: isTextFieldEntryEdited,
        },
        {
          id: "elementName",
          element,
          component: TextFieldEntry,
          isEdited: isTextFieldEntryEdited,
        },
        {
          id: "elementDocumentation",
          element,
          component: TextFieldEntry,
          isEdited: isTextFieldEntryEdited,
        },
      ],
    };
  }

  private updateModuleProperty(
    element: BpmnElement,
    property: string,
    value: string
  ): void {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension;

    // 确保 extensionElements 和 module 对象存在
    if (!businessObject.extensionElements) {
      businessObject.extensionElements = {};
    }
    if (!businessObject.extensionElements.module) {
      businessObject.extensionElements.module = {};
    }

    // 更新属性
    (businessObject.extensionElements.module as any)[property] = value;

    // 触发更新
    this.modeling.updateProperties(element, {
      extensionElements: businessObject.extensionElements,
    });
  }

  private updateMethodProperty(
    element: BpmnElement,
    property: string,
    value: string
  ): void {
    const businessObject = getBusinessObject(element) as ServiceTaskExtension;

    // 确保 extensionElements 和 method 对象存在
    if (!businessObject.extensionElements) {
      businessObject.extensionElements = {};
    }
    if (!businessObject.extensionElements.method) {
      businessObject.extensionElements.method = {};
    }

    // 更新属性
    (businessObject.extensionElements.method as any)[property] = value;

    // 触发更新
    this.modeling.updateProperties(element, {
      extensionElements: businessObject.extensionElements,
    });
  }

  // ServiceTask 属性配置方法
  private getModuleNameConfig(element: BpmnElement) {
    return {
      id: "moduleName",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  private getModuleVersionConfig(element: BpmnElement) {
    return {
      id: "moduleVersion",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  private getModuleDescriptionConfig(element: BpmnElement) {
    return {
      id: "moduleDescription",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  private getMethodNameConfig(element: BpmnElement) {
    return {
      id: "methodName",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  private getMethodParametersConfig(element: BpmnElement) {
    return {
      id: "methodParameters",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  private getMethodReturnTypeConfig(element: BpmnElement) {
    return {
      id: "methodReturnType",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  private getMethodDescriptionConfig(element: BpmnElement) {
    return {
      id: "methodDescription",
      element,
      component: TextFieldEntry,
      isEdited: isTextFieldEntryEdited,
    };
  }

  // 创建 Input 列表组
  private createInputListGroup(element: BpmnElement) {
    const inputs = this.getInputs(element) || [];
    const bpmnFactory = this.injector.get('bpmnFactory');
    const commandStack = this.injector.get('commandStack');

    const items = inputs.map((input: any, index: number) => {
      const id = element.id + '-input-' + index;
      return {
        id,
        label: input.name || `Input ${index + 1}`,
        entries: this.createInputEntries(id, element, input),
        autoFocusEntry: id + '-name',
        remove: this.createInputRemoveHandler(element, input)
      };
    });

    return {
      items,
      add: this.createInputAddHandler(element)
    };
  }

  // 创建 Output 列表组
  private createOutputListGroup(element: BpmnElement) {
    const outputs = this.getOutputs(element) || [];
    const bpmnFactory = this.injector.get('bpmnFactory');
    const commandStack = this.injector.get('commandStack');

    const items = outputs.map((output: any, index: number) => {
      const id = element.id + '-output-' + index;
      return {
        id,
        label: output.name || `Output ${index + 1}`,
        entries: this.createOutputEntries(id, element, output),
        autoFocusEntry: id + '-name',
        remove: this.createOutputRemoveHandler(element, output)
      };
    });

    return {
      items,
      add: this.createOutputAddHandler(element)
    };
  }

  // 获取 Inputs
  private getInputs(element: BpmnElement): any[] {
    const businessObject = getBusinessObject(element);
    const inputOutput = this.getInputOutputExtension(businessObject);
    return inputOutput ? inputOutput.input || [] : [];
  }

  // 获取 Outputs
  private getOutputs(element: BpmnElement): any[] {
    const businessObject = getBusinessObject(element);
    const inputOutput = this.getInputOutputExtension(businessObject);
    return inputOutput ? inputOutput.output || [] : [];
  }

  // 获取 InputOutput 扩展
  private getInputOutputExtension(businessObject: any): any {
    if (!businessObject.extensionElements || !businessObject.extensionElements.values) {
      return null;
    }
    
    return businessObject.extensionElements.values.find((el: any) => 
      el.$type === 'xflow:XFlowInputOutput'
    );
  }

  // 创建 Input 条目
  private createInputEntries(idPrefix: string, element: BpmnElement, input: any): any[] {
    return [
      {
        id: idPrefix + '-name',
        component: (props: { element: BpmnElement; id: string }) => {
          const commandStack = this.injector.get('commandStack');
          const translate = this.injector.get('translate');
          const debounce = this.injector.get('debounceInput');
          
          const getValue = () => {
            return input.name || '';
          };

          const setValue = (value: string) => {
            commandStack.execute('element.updateModdleProperties', {
              element: props.element,
              moddleElement: input,
              properties: {
                name: value
              }
            });
          };

          return TextFieldEntry({
            id: props.id,
            element: props.element,
            label: translate('Name'),
            getValue,
            setValue,
            debounce
          });
        }
      },
      {
        id: idPrefix + '-variable',
        component: (props: { element: BpmnElement; id: string }) => {
          const commandStack = this.injector.get('commandStack');
          const translate = this.injector.get('translate');
          const debounce = this.injector.get('debounceInput');
          
          const getValue = () => {
            return input.variable ? input.variable.name || '' : '';
          };

          const setValue = (value: string) => {
            const bpmnFactory = this.injector.get('bpmnFactory');
            
            if (!input.variable) {
              input.variable = bpmnFactory.create('xflow:XFlowVariable', { name: '' });
            }
            
            // 直接更新 variable 的 name 属性，而不是创建新对象
            input.variable.name = value;
            
            commandStack.execute('element.updateModdleProperties', {
              element: props.element,
              moddleElement: input,
              properties: {
                variable: input.variable
              }
            });
          };

          return TextFieldEntry({
            id: props.id,
            element: props.element,
            label: translate('Variable'),
            getValue,
            setValue,
            debounce
          });
        }
      }
    ];
  }

  // 创建 Output 条目
  private createOutputEntries(idPrefix: string, element: BpmnElement, output: any): any[] {
    return [
      {
        id: idPrefix + '-name',
        component: (props: { element: BpmnElement; id: string }) => {
          const commandStack = this.injector.get('commandStack');
          const translate = this.injector.get('translate');
          const debounce = this.injector.get('debounceInput');
          
          const getValue = () => {
            return output.name || '';
          };

          const setValue = (value: string) => {
            commandStack.execute('element.updateModdleProperties', {
              element: props.element,
              moddleElement: output,
              properties: {
                name: value
              }
            });
          };

          return TextFieldEntry({
            id: props.id,
            element: props.element,
            label: translate('Name'),
            getValue,
            setValue,
            debounce
          });
        }
      },
      {
        id: idPrefix + '-variable',
        component: (props: { element: BpmnElement; id: string }) => {
          const commandStack = this.injector.get('commandStack');
          const translate = this.injector.get('translate');
          const debounce = this.injector.get('debounceInput');
          
          const getValue = () => {
            return output.variable ? output.variable.name || '' : '';
          };

          const setValue = (value: string) => {
            const bpmnFactory = this.injector.get('bpmnFactory');
            
            if (!output.variable) {
              output.variable = bpmnFactory.create('xflow:XFlowVariable', { name: '' });
            }
            
            // 直接更新 variable 的 name 属性，而不是创建新对象
            output.variable.name = value;
            
            commandStack.execute('element.updateModdleProperties', {
              element: props.element,
              moddleElement: output,
              properties: {
                variable: output.variable
              }
            });
          };

          return TextFieldEntry({
            id: props.id,
            element: props.element,
            label: translate('Variable'),
            getValue,
            setValue,
            debounce
          });
        }
      },
      {
        id: idPrefix + '-source',
        component: (props: { element: BpmnElement; id: string }) => {
          const commandStack = this.injector.get('commandStack');
          const translate = this.injector.get('translate');
          const debounce = this.injector.get('debounceInput');
          
          const getValue = () => {
            return output.source ? output.source.value || '' : '';
          };

          const setValue = (value: string) => {
            const bpmnFactory = this.injector.get('bpmnFactory');
            
            if (!output.source) {
              output.source = bpmnFactory.create('xflow:XFlowSource', { value: '' });
            }
            
            // 直接更新 source 的 value 属性，而不是创建新对象
            output.source.value = value;
            
            commandStack.execute('element.updateModdleProperties', {
              element: props.element,
              moddleElement: output,
              properties: {
                source: output.source
              }
            });
          };

          return TextFieldEntry({
            id: props.id,
            element: props.element,
            label: translate('Source'),
            getValue,
            setValue,
            debounce
          });
        }
      }
    ];
  }


  // 创建 Input 删除处理器
  private createInputRemoveHandler(element: BpmnElement, input: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get('commandStack');
      const businessObject = getBusinessObject(element);
      const extension = this.getInputOutputExtension(businessObject);
      
      if (!extension) {
        return;
      }

      const inputs = (extension.input || []).filter((item: any) => item !== input);

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extension,
        properties: {
          input: inputs
        }
      });
    };
  }

  // 创建 Output 删除处理器
  private createOutputRemoveHandler(element: BpmnElement, output: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get('commandStack');
      const businessObject = getBusinessObject(element);
      const extension = this.getInputOutputExtension(businessObject);
      
      if (!extension) {
        return;
      }

      const outputs = (extension.output || []).filter((item: any) => item !== output);

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extension,
        properties: {
          output: outputs
        }
      });
    };
  }

  // 创建 Input 添加处理器
  private createInputAddHandler(element: BpmnElement) {
    return (event: Event) => {
      event.stopPropagation();
      const bpmnFactory = this.injector.get('bpmnFactory');
      const commandStack = this.injector.get('commandStack');
      const businessObject = getBusinessObject(element);

      let extensionElements = businessObject.extensionElements;
      if (!extensionElements) {
        extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: businessObject,
          properties: { extensionElements }
        });
      }

      let extension = this.getInputOutputExtension(businessObject);
      if (!extension) {
        extension = bpmnFactory.create('xflow:XFlowInputOutput', {
          input: [],
          output: []
        });
        extensionElements.values.push(extension);
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values
          }
        });
      }

      const newInput = bpmnFactory.create('xflow:XFlowInput', {
        name: this.nextId('Input_'),
        variable: bpmnFactory.create('xflow:XFlowVariable', { name: '' })
      });

      extension.input = [...(extension.input || []), newInput];

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extension,
        properties: {
          input: extension.input
        }
      });
    };
  }

  // 创建 Output 添加处理器
  private createOutputAddHandler(element: BpmnElement) {
    return (event: Event) => {
      event.stopPropagation();
      const bpmnFactory = this.injector.get('bpmnFactory');
      const commandStack = this.injector.get('commandStack');
      const businessObject = getBusinessObject(element);

      let extensionElements = businessObject.extensionElements;
      if (!extensionElements) {
        extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: businessObject,
          properties: { extensionElements }
        });
      }

      let extension = this.getInputOutputExtension(businessObject);
      if (!extension) {
        extension = bpmnFactory.create('xflow:XFlowInputOutput', {
          input: [],
          output: []
        });
        extensionElements.values.push(extension);
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values
          }
        });
      }

      const newOutput = bpmnFactory.create('xflow:XFlowOutput', {
        name: this.nextId('Output_'),
        variable: bpmnFactory.create('xflow:XFlowVariable', { name: '' }),
        source: bpmnFactory.create('xflow:XFlowSource', { value: '' })
      });

      extension.output = [...(extension.output || []), newOutput];

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extension,
        properties: {
          output: extension.output
        }
      });
    };
  }

  // 生成唯一ID
  private nextId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}_${random}`;
  }
}

(XFlowPropertiesProvider as Injectable).$inject = [
  "propertiesPanel",
  "translate",
  "injector",
];
