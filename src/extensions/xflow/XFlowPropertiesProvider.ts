import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
import { is } from "bpmn-js/lib/util/ModelUtil";
import { TextFieldEntry, ListGroup } from "@bpmn-io/properties-panel";
import { useService } from "bpmn-js-properties-panel";
import type { 
  BpmnElement, 
  PropertiesPanel, 
  Translate, 
  Injector, 
  Modeling,
  PropertiesPanelGroup,
  Injectable,
} from "../shared/types";
import { createPropertyEntry } from "./PropertyEntryFactory";

console.log("XFlowPropertiesProvider module loaded");

export default class XFlowPropertiesProvider {
  private propertiesPanel: PropertiesPanel;
  private injector: Injector;
  private translate: Translate;
  private modeling: Modeling;
  
  // 组件缓存，避免重复创建
  private componentCache = new Map<string, any>();

  // 封装的组件创建方法
  private createCachedComponent(
    cacheKey: string,
    componentFactory: () => any
  ): any {
    if (this.componentCache.has(cacheKey)) {
      return this.componentCache.get(cacheKey);
    }
    
    const component = componentFactory();
    this.componentCache.set(cacheKey, component);
    return component;
  }

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
    } else if (
      is(element, "bpmn:ExclusiveGateway") ||
      is(element, "bpmn:InclusiveGateway") ||
      is(element, "bpmn:ParallelGateway") ||
      is(element, "bpmn:ComplexGateway")
    ) {
      return this.createGatewayConditionGroup(element, businessObject);
    }

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
          elementType: "xflow:url",
          label: "URL",
          description: "Task related URL",
          tooltip: "Set the URL for this task",
          placeholder: "Enter URL",
        }),

        // 结构化属性 - Inputs
        {
          id: "inputs",
          label: "Input Parameters",
          component: ListGroup,
          ...this.createInputListGroup(element),
        } as any,

        // 结构化属性 - Outputs
        {
          id: "outputs",
          label: "Output Parameters",
          component: ListGroup,
          ...this.createOutputListGroup(element),
        } as any,
      ],
    };
  }

  // Gateway 条件编辑组
  private createGatewayConditionGroup(
    element: BpmnElement,
    businessObject: any
  ): PropertiesPanelGroup {
    const entries = this.createGatewayConditionEntries(element, businessObject);

    return {
      id: "gatewayConditions",
      label: this.translate("Gateway Conditions"),
      entries,
    };
  }

  // 创建 Gateway 条件条目
  private createGatewayConditionEntries(
    element: BpmnElement,
    businessObject: any
  ): any[] {
    const entries: any[] = [];

    // 获取所有从该 gateway 出发的 sequence flows
    const outgoingFlows = businessObject.outgoing || [];

    outgoingFlows.forEach((flow: any, index: number) => {
      entries.push({
        id: `gateway-conditions-condition-${index}`,
        component: ConditionExpression,
        idPrefix: `gateway-conditions-condition-${index}`,
        element,
        flow,
        flowIndex: index,
      });
    });

    return entries;
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
          elementType: "xflow:module",
          label: "Module Name",
          description: "The name of the module",
          tooltip: "The name of the module",
          placeholder: "Enter the name of the module",
        }),
        createPropertyEntry("methodName", element, TextFieldEntry, {
          propertyPath: "value",
          elementType: "xflow:method",
          label: "Method Name",
          description: "The name of the method",
          tooltip: "The name of the method",
          placeholder: "Enter the name of the method",
        }),

        // 结构化属性 - Inputs
        {
          id: "inputs",
          label: "Input Parameters",
          component: ListGroup,
          ...this.createInputListGroup(element),
        } as any,

        // 结构化属性 - Outputs
        {
          id: "outputs",
          label: "Output Parameters",
          component: ListGroup,
          ...this.createOutputListGroup(element),
        } as any,
      ],
    };
  }

  // 创建 Input 列表组
  private createInputListGroup(element: BpmnElement) {
    const inputs = this.getInputs(element) || [];
    const bpmnFactory = this.injector.get("bpmnFactory");
    const commandStack = this.injector.get("commandStack");

    const items = inputs.map((input: any, index: number) => {
      const id = element.id + "-input-" + index;
      return {
        id,
        label: input.name || `Input ${index + 1}`,
        entries: this.createInputEntries(id, element, input),
        autoFocusEntry: id + "-name",
        remove: this.createInputRemoveHandler(element, input),
      };
    });

    return {
      items,
      add: this.createInputAddHandler(element),
    };
  }

  // 创建 Output 列表组
  private createOutputListGroup(element: BpmnElement) {
    const outputs = this.getOutputs(element) || [];
    const bpmnFactory = this.injector.get("bpmnFactory");
    const commandStack = this.injector.get("commandStack");

    const items = outputs.map((output: any, index: number) => {
      const id = element.id + "-output-" + index;
      return {
        id,
        label: output.name || `Output ${index + 1}`,
        entries: this.createOutputEntries(id, element, output),
        autoFocusEntry: id + "-name",
        remove: this.createOutputRemoveHandler(element, output),
      };
    });

    return {
      items,
      add: this.createOutputAddHandler(element),
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
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }

    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:inputOutput"
    );
  }

  // 创建 Input 条目
  private createInputEntries(
    idPrefix: string,
    element: BpmnElement,
    input: any
  ): any[] {
    return [
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `input-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return input.name || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: input,
                properties: {
                  name: value,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Name"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
      {
        id: idPrefix + "-variable",
        component: this.createCachedComponent(
          `input-variable-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return input.variable ? input.variable.name || "" : "";
            };

            const setValue = (value: string) => {
              const bpmnFactory = this.injector.get("bpmnFactory");

              if (!input.variable) {
                input.variable = bpmnFactory.create("xflow:variable", {
                  name: "",
                });
              }

              // 直接更新 variable 的 name 属性，而不是创建新对象
              input.variable.name = value;

              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: input,
                properties: {
                  variable: input.variable,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Variable"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
    ];
  }

  // 创建 Output 条目
  private createOutputEntries(
    idPrefix: string,
    element: BpmnElement,
    output: any
  ): any[] {
    return [
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `output-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return output.name || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: output,
                properties: {
                  name: value,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Name"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
      {
        id: idPrefix + "-variable",
        component: this.createCachedComponent(
          `output-variable-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return output.variable ? output.variable.name || "" : "";
            };

            const setValue = (value: string) => {
              const bpmnFactory = this.injector.get("bpmnFactory");

              if (!output.variable) {
                output.variable = bpmnFactory.create("xflow:variable", {
                  name: "",
                });
              }

              // 直接更新 variable 的 name 属性，而不是创建新对象
              output.variable.name = value;

              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: output,
                properties: {
                  variable: output.variable,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Variable"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
      {
        id: idPrefix + "-source",
        component: this.createCachedComponent(
          `output-source-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return output.source ? output.source.value || "" : "";
            };

            const setValue = (value: string) => {
              const bpmnFactory = this.injector.get("bpmnFactory");

              if (!output.source) {
                output.source = bpmnFactory.create("xflow:source", {
                  value: "",
                });
              }

              // 直接更新 source 的 value 属性，而不是创建新对象
              output.source.value = value;

              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: output,
                properties: {
                  source: output.source,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Source"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
    ];
  }

  // 创建 Input 删除处理器
  private createInputRemoveHandler(element: BpmnElement, input: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);
      const extension = this.getInputOutputExtension(businessObject);

      if (!extension) {
        return;
      }

      const inputs = (extension.input || []).filter(
        (item: any) => item !== input
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: extension,
        properties: {
          input: inputs,
        },
      });
    };
  }

  // 创建 Output 删除处理器
  private createOutputRemoveHandler(element: BpmnElement, output: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);
      const extension = this.getInputOutputExtension(businessObject);

      if (!extension) {
        return;
      }

      const outputs = (extension.output || []).filter(
        (item: any) => item !== output
      );

      commandStack.execute("element.updateModdleProperties", {
      element,
        moddleElement: extension,
        properties: {
          output: outputs,
        },
      });
    };
  }

  // 创建 Input 添加处理器
  private createInputAddHandler(element: BpmnElement) {
    return (event: Event) => {
      event.stopPropagation();
      const bpmnFactory = this.injector.get("bpmnFactory");
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);

      let extensionElements = businessObject.extensionElements;
      if (!extensionElements) {
        extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
          values: [],
        });
        businessObject.extensionElements = extensionElements;
        commandStack.execute("element.updateModdleProperties", {
      element,
          moddleElement: businessObject,
          properties: { extensionElements },
        });
      }
      
      // 确保 values 数组存在
      if (!extensionElements.values) {
        extensionElements.values = [];
      }

      let extension = this.getInputOutputExtension(businessObject);
      if (!extension) {
        extension = bpmnFactory.create("xflow:inputOutput", {
          input: [],
          output: [],
        });
        extensionElements.values.push(extension);
        commandStack.execute("element.updateModdleProperties", {
      element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      const newInput = bpmnFactory.create("xflow:input", {
        name: this.nextId("Input_"),
        variable: bpmnFactory.create("xflow:variable", { name: "" }),
      });

      extension.input = [...(extension.input || []), newInput];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: extension,
        properties: {
          input: extension.input,
        },
      });
    };
  }

  // 创建 Output 添加处理器
  private createOutputAddHandler(element: BpmnElement) {
    return (event: Event) => {
      event.stopPropagation();
      const bpmnFactory = this.injector.get("bpmnFactory");
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);

      let extensionElements = businessObject.extensionElements;
      if (!extensionElements) {
        extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
          values: [],
        });
        businessObject.extensionElements = extensionElements;
        commandStack.execute("element.updateModdleProperties", {
      element,
          moddleElement: businessObject,
          properties: { extensionElements },
        });
      }
      
      // 确保 values 数组存在
      if (!extensionElements.values) {
        extensionElements.values = [];
      }

      let extension = this.getInputOutputExtension(businessObject);
      if (!extension) {
        extension = bpmnFactory.create("xflow:inputOutput", {
          input: [],
          output: [],
        });
        extensionElements.values.push(extension);
        commandStack.execute("element.updateModdleProperties", {
      element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      const newOutput = bpmnFactory.create("xflow:output", {
        name: this.nextId("Output_"),
        variable: bpmnFactory.create("xflow:variable", { name: "" }),
        source: bpmnFactory.create("xflow:source", { value: "" }),
      });

      extension.output = [...(extension.output || []), newOutput];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: extension,
        properties: {
          output: extension.output,
        },
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

// 独立的条件表达式组件函数
function ConditionExpression(props: {
  idPrefix: string;
  element: BpmnElement;
  flow: any;
  flowIndex: number;
}) {
  const { idPrefix, element, flow, flowIndex } = props;
  const commandStack = useService("commandStack");
  const translate = useService("translate");
  const debounce = useService("debounceInput");
  const moddle = useService("moddle");

  const setValue = (value: string) => {
    if (!value || value.trim() === "") {
      // 删除 condition expression
      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: flow,
        properties: {
          conditionExpression: undefined,
        },
      });
    } else {
      // 创建或更新 condition expression
      let conditionExpression = flow.conditionExpression;

      if (!conditionExpression) {
        conditionExpression = moddle.create("bpmn:FormalExpression", {
          body: value,
        });
      } else {
        conditionExpression.body = value;
      }

      commandStack.execute("element.updateModdleProperties", {
      element,
        moddleElement: flow,
        properties: {
          conditionExpression: conditionExpression,
        },
      });
    }
  };

  const getValue = () => {
    return flow.conditionExpression ? flow.conditionExpression.body : "";
  };

  const getLabel = () => {
    const target = flow.targetRef;
    const targetName = target ? target.name || target.id : "Unknown";
    return `Condition to ${targetName}`;
  };

  return TextFieldEntry({
    element: flow,
    id: idPrefix,
    label: getLabel(),
    getValue,
    setValue,
    debounce,
  });
}
