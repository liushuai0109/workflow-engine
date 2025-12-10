import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
import { is } from "bpmn-js/lib/util/ModelUtil";
import { TextFieldEntry, NumberFieldEntry, ListGroup, SelectEntry, CheckboxEntry } from "@bpmn-io/properties-panel";
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
    this.setupInitializationListener();
    console.log("XFlowPropertiesProvider registered");
  }

  // 设置初始化监听器
  private setupInitializationListener(): void {
    const eventBus = this.injector.get("eventBus");
    if (eventBus) {
      // 监听模型导入完成事件
      eventBus.on("import.done", () => {
        console.log("XPMN model imported, initializing Flow Variable Declarations");
        this.initializeFlowVariableDeclarations();
      });
    }
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
      const businessObject = getBusinessObject(element);
      
      if (is(element, "bpmn:UserTask")) {
        const userTaskGroup = this.createUserTaskExtensionGroup(element, businessObject);
        console.log("Created UserTask extension group:", userTaskGroup);
        groups.push(userTaskGroup);
      } else if (is(element, "bpmn:ServiceTask")) {
        const serviceTaskGroup = this.createServiceTaskExtensionGroup(element, businessObject);
        console.log("Created ServiceTask extension group:", serviceTaskGroup);
        groups.push(serviceTaskGroup);
      } else if (
        is(element, "bpmn:ExclusiveGateway") ||
        is(element, "bpmn:InclusiveGateway") ||
        is(element, "bpmn:ParallelGateway") ||
        is(element, "bpmn:ComplexGateway")
      ) {
        const gatewayGroup = this.createGatewayConditionGroup(element, businessObject);
        console.log("Created Gateway condition group:", gatewayGroup);
        groups.push(gatewayGroup);
      }  else if (is(element, "bpmn:Process")) {
        const processGroup = this.createProcessExtensionGroup(element, businessObject);
        console.log("Created Process extension group:", processGroup);
        groups.push(processGroup);
      } else {
        // 检查是否有 MessageEventDefinition
        const messageEventDefinition = this.getMessageEventDefinition(businessObject);
        if (messageEventDefinition) {
          const messageEventGroup = this.createMessageEventDefinitionExtensionGroup(element, messageEventDefinition);
          console.log("Created MessageEventDefinition extension group:", messageEventGroup);
          groups.push(messageEventGroup);
        }
      }

      console.log("Final groups:", groups);
      return groups;
    };
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
        // Assignee 属性
        {
          id: "assignee",
          component: this.createCachedComponent(
            "userTask-assignee",
            () => (props: { element: BpmnElement; id: string }) => {
              const translate = this.injector.get("translate");
              const debounce = this.injector.get("debounceInput");
              const modeling = this.injector.get("modeling");

              const getValue = () => {
                const bo = getBusinessObject(props.element);
                return bo.$attrs.assignee || "";
              };

              const setValue = (value: string) => {
                modeling.updateProperties(props.element, {
                  assignee: value || undefined,
                });
              };

              return TextFieldEntry({
                id: props.id,
                element: props.element,
                label: translate("Assignee"),
                getValue,
                setValue,
                debounce,
                description: translate("The user assigned to this task"),
                placeholder: translate("Enter assignee"),
              });
            }
          ),
        },
        // URL 属性
        {
          id: "url",
          component: this.createCachedComponent(
            "userTask-url",
            () => (props: { element: BpmnElement; id: string }) => {
              const translate = this.injector.get("translate");
              const debounce = this.injector.get("debounceInput");
              const modeling = this.injector.get("modeling");

              const getValue = () => {
                const bo = getBusinessObject(props.element);
                return bo.$attrs.url || "";
              };

              const setValue = (value: string) => {
                modeling.updateProperties(props.element, {
                  url: value || undefined,
                });
              };

              return TextFieldEntry({
                id: props.id,
                element: props.element,
                label: translate("URL"),
                getValue,
                setValue,
                debounce,
                description: translate("Task related URL"),
                tooltip: translate("Set the URL for this task"),
                placeholder: translate("Enter URL"),
              });
            }
          ),
        },
        // Visible Flow Variables 列表组
        {
          id: "visibleFlowVariables",
          label: this.translate("Visible Flow Variables"),
          component: ListGroup,
          ...this.createVisibleFlowVariablesListGroup(element),
        } as any,
      ],
    };
  }

  // 创建 Visible Flow Variables 列表组
  private createVisibleFlowVariablesListGroup(element: BpmnElement) {
    const elementRegistry = this.injector.get("elementRegistry");
    
    // 获取 Process 的 Declarations
    const processElement = this.findProcessElement(elementRegistry);
    const processDeclarations = processElement 
      ? this.getDeclarations(processElement) 
      : [];

    // 获取 UserTask 的 VisibleFlowVariables
    const businessObject = getBusinessObject(element);
    const visibleFlowVariables = this.getVisibleFlowVariablesElement(businessObject);
    const selectedDeclarations = visibleFlowVariables 
      ? (visibleFlowVariables.variable || []) 
      : [];

    // 创建选中集合（使用 name::field 作为唯一标识）
    const selectedKeys = new Set(
      selectedDeclarations.map((decl: any) => 
        `${decl.name || ''}::${decl.field || ''}`
      )
    );

    // 为每个 Declaration 创建一个列表项
    const items = processDeclarations.map((decl: any, index: number) => {
      const key = `${decl.name || ''}::${decl.field || ''}`;
      const id = element.id + "-visible-var-" + index;
      
      return {
        id,
        label: decl.name || decl.field || `Variable ${index + 1}`,
        entries: this.createVisibleVariableEntries(id, element, decl, key),
      };
    });

    return {
      items: items.length > 0 ? items : [],
      add: undefined, // 不显示添加按钮，因为选项来自 Process Declarations
    };
  }

  // 创建单个 Visible Variable 的条目
  private createVisibleVariableEntries(
    idPrefix: string,
    element: BpmnElement,
    declaration: any,
    key: string
  ): any[] {
    return [
      {
        id: idPrefix + "-checkbox",
        component: this.createCachedComponent(
          `visible-var-checkbox-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            return this.createVisibleVariableCheckbox(
              props.element,
              props.id,
              declaration,
              key
            );
          }
        ),
      },
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `visible-var-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Name"),
              getValue: () => declaration.name || "",
              setValue: () => {}, // 只读
              debounce,
              disabled: true,
            });
          }
        ),
      },
      {
        id: idPrefix + "-field",
        component: this.createCachedComponent(
          `visible-var-field-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Field"),
              getValue: () => declaration.field || "",
              setValue: () => {}, // 只读
              debounce,
              disabled: true,
            });
          }
        ),
      },
      {
        id: idPrefix + "-type",
        component: this.createCachedComponent(
          `visible-var-type-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Type"),
              getValue: () => {
                const type = declaration.$attrs?.type || declaration.type;
                return type || "";
              },
              setValue: () => {}, // 只读
              debounce,
              disabled: true,
            });
          }
        ),
      },
    ];
  }

  // 创建单个 Visible Variable 复选框
  private createVisibleVariableCheckbox(
    element: BpmnElement,
    id: string,
    declaration: any,
    key: string
  ): any {
    const commandStack = this.injector.get("commandStack");
    const translate = this.injector.get("translate");
    const bpmnFactory = this.injector.get("bpmnFactory");
    const businessObject = getBusinessObject(element);

    const getValue = () => {
      const visibleFlowVariables = this.getVisibleFlowVariablesElement(businessObject);
      if (!visibleFlowVariables || !visibleFlowVariables.variable) {
        return false;
      }
      return visibleFlowVariables.variable.some((decl: any) => 
        `${decl.name || ''}::${decl.field || ''}` === key
      );
    };

    const setValue = (checked: boolean) => {
      // 确保 extensionElements 存在
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

      // 获取或创建 VisibleFlowVariables
      let visibleFlowVars = this.getVisibleFlowVariablesElement(businessObject);
      if (!visibleFlowVars) {
        visibleFlowVars = bpmnFactory.create("xflow:VisibleFlowVariables", {
          variable: [],
        });
        visibleFlowVars.$parent = extensionElements;
        extensionElements.values.push(visibleFlowVars);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      // 更新 variable 数组
      const currentVariables = visibleFlowVars.variable || [];
      if (checked) {
        // 添加：如果不存在则添加
        const exists = currentVariables.some((decl: any) => 
          `${decl.name || ''}::${decl.field || ''}` === key
        );
        if (!exists) {
          // 创建 Declaration 的副本
          const declarationCopy = bpmnFactory.create("xflow:Declaration", {
            name: declaration.name,
            field: declaration.field,
            type: declaration.type || declaration.$attrs?.type,
          });
          declarationCopy.$parent = visibleFlowVars;
          visibleFlowVars.variable = [...currentVariables, declarationCopy];
        }
      } else {
        // 移除：过滤掉匹配的声明
        visibleFlowVars.variable = currentVariables.filter((decl: any) => 
          `${decl.name || ''}::${decl.field || ''}` !== key
        );
      }

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: visibleFlowVars,
        properties: {
          variable: visibleFlowVars.variable,
        },
      });
    };

    return CheckboxEntry({
      id,
      element,
      label: translate("Visible"),
      getValue,
      setValue,
    });
  }

  // 获取 VisibleFlowVariables 扩展元素
  private getVisibleFlowVariablesElement(businessObject: any): any {
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }
    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:VisibleFlowVariables"
    );
  }

  // Gateway 条件编辑组
  private createGatewayConditionGroup(
    element: BpmnElement,
    businessObject: any
  ): PropertiesPanelGroup {
    return {
      id: "gatewayConditions",
      label: this.translate("Gateway Conditions"),
      entries: [
        {
          id: "gatewayConditions",
          label: "Gateway Conditions",
          component: ListGroup,
          ...this.createGatewayConditionListGroup(element, businessObject),
        } as any,
      ],
    };
  }

  // 创建 Gateway 条件列表组
  private createGatewayConditionListGroup(
    element: BpmnElement,
    businessObject: any
  ) {
    // 获取所有从该 gateway 出发的 sequence flows
    const outgoingFlows = businessObject.outgoing || [];

    // 获取每个条件的优先级并排序（从大到小）
    const flowsWithPriority = outgoingFlows.map((flow: any, index: number) => {
      const priority = this.getConditionPriority(flow);
      return { flow, index, priority };
    });

    // 按优先级从大到小排序
    flowsWithPriority.sort((a: { flow: any; index: number; priority: number }, b: { flow: any; index: number; priority: number }) => {
      // 优先级大的排在前面
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      // 如果优先级相同，保持原有顺序
      return a.index - b.index;
    });

    const items = flowsWithPriority.map(({ flow, index }: { flow: any; index: number; priority: number }) => {
      const target = flow.targetRef;
      const targetName = target ? target.name || target.id : "Unknown";
      const id = element.id + "-condition-" + index;
      return {
        id,
        label: `Condition to ${targetName}`,
        entries: this.createConditionEntries(id, element, flow),
        autoFocusEntry: id + "-name",
      };
    });

    return {
      items,
    };
  }

  // 获取条件的优先级
  private getConditionPriority(flow: any): number {
    // 从 $attrs 或直接属性中获取 priority，并转换为数字
    const priority = flow.$attrs?.priority || flow.priority;
    if (priority === undefined || priority === null || priority === '') {
      return 0;
    }
    const numPriority = typeof priority === 'string' ? parseInt(priority, 10) : Number(priority);
    return isNaN(numPriority) ? 0 : numPriority;
  }

  // 创建条件条目（包含条件名称和条件表达式）
  private createConditionEntries(
    idPrefix: string,
    element: BpmnElement,
    flow: any
  ): any[] {
    return [
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `condition-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            const elementRegistry = this.injector.get("elementRegistry");

            const getValue = () => {
              // 重新获取最新的 flow businessObject 以确保获取最新值
              const flowElement = elementRegistry.get(flow.id);
              if (flowElement) {
                const currentFlow = getBusinessObject(flowElement);
                return currentFlow.name || "";
              }
              return flow.name || "";
            };

            const setValue = (value: string) => {
              // 获取 sequenceFlow 对应的 diagram element
              const flowElement = elementRegistry.get(flow.id);
              if (flowElement) {
                const modeling = this.injector.get("modeling");
                // 使用 modeling.updateLabel 来更新 SequenceFlow 的名称
                // 这会同时更新 businessObject 和画布上的标签
                modeling.updateLabel(flowElement, value || "");
              }
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Condition Name"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
      {
        id: idPrefix + "-expression",
        component: this.createCachedComponent(
          `condition-expression-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            const bpmnFactory = this.injector.get("bpmnFactory");

            const getValue = () => {
              // 重新获取最新的 flow businessObject 以确保获取最新值
              const elementRegistry = this.injector.get("elementRegistry");
              const flowElement = elementRegistry.get(flow.id);
              if (flowElement) {
                const currentFlow = getBusinessObject(flowElement);
                return currentFlow.conditionExpression ? currentFlow.conditionExpression.body : "";
              }
              return flow.conditionExpression ? flow.conditionExpression.body : "";
            };

            const setValue = (value: string) => {
              const elementRegistry = this.injector.get("elementRegistry");
              // 获取 sequenceFlow 对应的 diagram element
              const flowElement = elementRegistry.get(flow.id);
              
              if (!flowElement) {
                return;
              }

              if (!value || value.trim() === "") {
                // 删除 condition expression
                commandStack.execute("element.updateModdleProperties", {
                  element: flowElement,
                  moddleElement: flow,
                  properties: {
                    conditionExpression: undefined,
                  },
                });
              } else {
                // 创建或更新 condition expression
                let conditionExpression = flow.conditionExpression;

                if (!conditionExpression) {
                  conditionExpression = bpmnFactory.create("bpmn:FormalExpression", {
                    body: value,
                  });
                } else {
                  conditionExpression.body = value;
                }

                commandStack.execute("element.updateModdleProperties", {
                  element: flowElement,
                  moddleElement: flow,
                  properties: {
                    conditionExpression: conditionExpression,
                  },
                });
              }
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Condition Expression"),
              getValue,
              setValue,
              debounce,
            });
          }
        ),
      },
      {
        id: idPrefix + "-priority",
        component: this.createCachedComponent(
          `condition-priority-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            const bpmnFactory = this.injector.get("bpmnFactory");
            const elementRegistry = this.injector.get("elementRegistry");

            const getValue = () => {
              // 重新获取最新的 flow businessObject 以确保获取最新值
              const flowElement = elementRegistry.get(flow.id);
              if (flowElement) {
                const currentFlow = getBusinessObject(flowElement);
                // priority 值存储在 $attrs 属性中
                const priority = currentFlow.$attrs?.priority || currentFlow.priority;
                return priority ? String(priority) : "";
              }
              // 从闭包中的 flow 对象获取
              const priority = flow.$attrs?.priority || flow.priority;
              return priority ? String(priority) : "";
            };

            const setValue = (value: string) => {
              const flowElement = elementRegistry.get(flow.id);
              if (!flowElement) {
                return;
              }

              const numValue = value ? parseInt(value, 10) : undefined;
              const priorityValue = numValue && numValue > 0 ? numValue : undefined;

              // 直接设置属性到 businessObject
              flow.priority = priorityValue;
              
              // 使用 commandStack 来记录更改（支持撤销/重做）
              commandStack.execute("element.updateModdleProperties", {
                element: flowElement,
                moddleElement: flow,
                properties: {
                  priority: priorityValue,
                },
              });
            };

            // 验证函数：确保是大于 0 的整数
            const validate = (value: string | number): string | null => {
              // NumberFieldEntry 可能传入字符串或数字
              const strValue = typeof value === 'string' ? value : String(value || '');
              if (!strValue || strValue.trim() === "") {
                return null; // 允许为空
              }
              const numValue = parseInt(strValue, 10);
              if (isNaN(numValue) || !Number.isInteger(numValue)) {
                return translate("Priority must be an integer");
              }
              if (numValue <= 0) {
                return translate("Priority must be greater than 0");
              }
              return null; // 验证通过
            };

            return NumberFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Priority"),
              getValue,
              setValue,
              debounce,
              validate,
              description: translate("Priority must be a positive integer. Higher numbers indicate higher priority."),
            });
          }
        ),
      },
    ];
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
        // Callee 列表组
        {
          id: "callee",
          label: this.translate("Callee"),
          component: ListGroup,
          ...this.createCalleeListGroup(element),
        } as any,

        // Allowed Sources 输入框
        {
          id: "allowedSources",
          component: this.createCachedComponent(
            "serviceTask-allowedSources",
            () => (props: { element: BpmnElement; id: string }) => {
              const translate = this.injector.get("translate");
              const debounce = this.injector.get("debounceInput");
              const modeling = this.injector.get("modeling");

              const getValue = () => {
                const bo = getBusinessObject(props.element);
                return bo.$attrs?.allowedSources || bo.allowedSources || "";
              };

              const setValue = (value: string) => {
                modeling.updateProperties(props.element, {
                  allowedSources: value || undefined,
                });
              };

              return TextFieldEntry({
                id: props.id,
                element: props.element,
                label: translate("Allowed Sources"),
                getValue,
                setValue,
                debounce,
                description: translate("Multiple sources separated by commas"),
                tooltip: translate("Specify the allowed sources for this service task. Multiple sources should be separated by commas (e.g., source1, source2, source3)"),
                placeholder: translate("Enter sources separated by commas"),
              });
            }
          ),
        },

        // Request Parameter Assignments 列表组
        {
          id: "requestParameterAssignments",
          label: "Request Parameter Assignments",
          component: ListGroup,
          ...this.createRequestParameterAssignmentsListGroup(element),
        } as any,

        // 生成 Flow Variable Assignments 列表组
        {
          id: "flowVariableAssignments",
          label: "Flow Variable Assignments",
          component: ListGroup,
          ...this.createFlowVariableAssignmentsListGroup(element),
        } as any,
      ],
    };
  }

  // 获取 MessageEventDefinition
  private getMessageEventDefinition(businessObject: any): any {
    if (!businessObject || !businessObject.eventDefinitions) {
      return null;
    }
    return businessObject.eventDefinitions.find(
      (eventDef: any) => eventDef.$type === "bpmn:MessageEventDefinition"
    ) || null;
  }

  // MessageEventDefinition 扩展属性组
  private createMessageEventDefinitionExtensionGroup(
    element: BpmnElement,
    messageEventDefinition: any
  ): PropertiesPanelGroup {
    return {
      id: "messageEventDefinitionExtension",
      label: this.translate("Message Event Definition Extension"),
      entries: [
        // Allowed Sources 输入框
        {
          id: "messageEventAllowedSources",
          component: this.createCachedComponent(
            "messageEvent-allowedSources",
            () => (props: { element: BpmnElement; id: string }) => {
              const translate = this.injector.get("translate");
              const debounce = this.injector.get("debounceInput");
              const modeling = this.injector.get("modeling");

              const getValue = () => {
                const bo = getBusinessObject(props.element);
                return bo.$attrs?.allowedSources || bo.allowedSources || "";
              };

              const setValue = (value: string) => {
                modeling.updateProperties(props.element, {
                  allowedSources: value || undefined,
                });
              };

              return TextFieldEntry({
                id: props.id,
                element: props.element,
                label: translate("Allowed Sources"),
                getValue,
                setValue,
                debounce,
                description: translate("Multiple sources separated by commas"),
                tooltip: translate("Specify the allowed sources for this message event. Multiple sources should be separated by commas (e.g., source1, source2, source3)"),
                placeholder: translate("Enter sources separated by commas"),
              });
            }
          ),
        },
        // Flow Variable Assignments 列表组
        {
          id: "messageEventFlowVariableAssignments",
          label: this.translate("Flow Variable Assignments"),
          component: ListGroup,
          ...this.createMessageEventFlowVariableAssignmentsListGroup(element, messageEventDefinition),
        } as any,
      ],
    };
  }

  // 创建 MessageEventDefinition 的 FlowVariableAssignments 列表组
  private createMessageEventFlowVariableAssignmentsListGroup(
    element: BpmnElement,
    messageEventDefinition: any
  ) {
    const assignments = this.getMessageEventFlowVariableAssignments(messageEventDefinition) || [];

    const items = assignments.map((assignment: any, index: number) => {
      const id = element.id + "-message-event-flow-assignment-" + index;
      return {
        id,
        label: assignment.name || assignment.target || assignment.source || `Assignment ${index + 1}`,
        entries: this.createFlowVariableAssignmentEntries(id, element, assignment),
        autoFocusEntry: id + "-name",
        remove: this.createMessageEventFlowVariableAssignmentRemoveHandler(element, messageEventDefinition, assignment),
      };
    });

    return {
      items,
      add: this.createMessageEventFlowVariableAssignmentAddHandler(element, messageEventDefinition),
    };
  }

  // 获取 MessageEventDefinition 的 FlowVariableAssignments
  private getMessageEventFlowVariableAssignments(messageEventDefinition: any): any[] {
    const flowVariableAssignments = this.getFlowVariableAssignmentsElement(messageEventDefinition);
    return flowVariableAssignments ? flowVariableAssignments.assignment || [] : [];
  }

  // 创建 MessageEventDefinition FlowVariable Assignment 删除处理器
  private createMessageEventFlowVariableAssignmentRemoveHandler(
    element: BpmnElement,
    messageEventDefinition: any,
    assignment: any
  ) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get("commandStack");
      const flowVariableAssignments = this.getFlowVariableAssignmentsElement(messageEventDefinition);

      if (!flowVariableAssignments) {
        return;
      }

      const assignments = (flowVariableAssignments.assignment || []).filter(
        (item: any) => item !== assignment
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: flowVariableAssignments,
        properties: {
          assignment: assignments,
        },
      });
    };
  }

  // 创建 MessageEventDefinition FlowVariable Assignment 添加处理器
  private createMessageEventFlowVariableAssignmentAddHandler(
    element: BpmnElement,
    messageEventDefinition: any
  ) {
    return (event: Event) => {
      event.stopPropagation();
      const bpmnFactory = this.injector.get("bpmnFactory");
      const commandStack = this.injector.get("commandStack");

      let extensionElements = messageEventDefinition.extensionElements;
      if (!extensionElements) {
        extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
          values: [],
        });
        messageEventDefinition.extensionElements = extensionElements;
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: messageEventDefinition,
          properties: { extensionElements },
        });
      }

      // 确保 values 数组存在
      if (!extensionElements.values) {
        extensionElements.values = [];
      }

      let flowVariableAssignments = this.getFlowVariableAssignmentsElement(messageEventDefinition);
      if (!flowVariableAssignments) {
        flowVariableAssignments = bpmnFactory.create("xflow:FlowVariableAssignments", {
          assignment: [],
        });
        flowVariableAssignments.$parent = extensionElements;
        extensionElements.values.push(flowVariableAssignments);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      // Flow Variable Assignment 的 target 必须以 "$FLOW" 开头，设置默认值
      const newAssignment = bpmnFactory.create("xflow:Assignment", {
        name: this.nextId("Assignment_"),
        target: "$FLOW",
        source: "",
      });

      // Set parent for proper namespace handling
      newAssignment.$parent = flowVariableAssignments;

      flowVariableAssignments.assignment = [
        ...(flowVariableAssignments.assignment || []),
        newAssignment,
      ];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: flowVariableAssignments,
        properties: {
          assignment: flowVariableAssignments.assignment,
        },
      });
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
    const inputOutput = this.getInputOutputElement(businessObject);
    return inputOutput ? inputOutput.input || [] : [];
  }

  // 获取 Outputs
  private getOutputs(element: BpmnElement): any[] {
    const businessObject = getBusinessObject(element);
    const inputOutput = this.getInputOutputElement(businessObject);
    return inputOutput ? inputOutput.output || [] : [];
  }

  // 获取 InputOutput 扩展
  private getInputOutputElement(businessObject: any): any {
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }

    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:InputOutput"
    );
  }

  // 获取 RequestParameterAssignments 扩展
  private getRequestParameterAssignmentsElement(businessObject: any): any {
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }

    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:RequestParameterAssignments"
    );
  }

  // 获取 FlowVariableAssignments 扩展
  private getFlowVariableAssignmentsElement(businessObject: any): any {
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }

    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:FlowVariableAssignments"
    );
  }

  // 获取 Callee 扩展元素
  private getCalleeElement(businessObject: any): any {
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }

    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:Callee" || 
                   el.$type === "ns0:callee" || 
                   el.$type === "callee" ||
                   el.$type.endsWith(":callee")
    );
  }

  // 获取 RequestParameter Assignments
  private getRequestParameterAssignments(element: BpmnElement): any[] {
    const businessObject = getBusinessObject(element);
    const requestParameterAssignments = this.getRequestParameterAssignmentsElement(businessObject);
    return requestParameterAssignments ? requestParameterAssignments.assignment || [] : [];
  }

  // 获取 FlowVariable Assignments
  private getFlowVariableAssignments(element: BpmnElement): any[] {
    const businessObject = getBusinessObject(element);
    const flowVariableAssignments = this.getFlowVariableAssignmentsElement(businessObject);
    return flowVariableAssignments ? flowVariableAssignments.assignment || [] : [];
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
                input.variable = bpmnFactory.create("xflow:Variable", {
                  name: "",
                });
                input.variable.$parent = input; // Set parent for namespace context
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
                output.variable = bpmnFactory.create("xflow:Variable", {
                  name: "",
                });
                output.variable.$parent = output; // Set parent for namespace context
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
                output.source = bpmnFactory.create("xflow:Source", {
                  value: "",
                });
                output.source.$parent = output; // Set parent for namespace context
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
      const inputOutput = this.getInputOutputElement(businessObject);

      if (!inputOutput) {
        return;
      }

      const inputs = (inputOutput.input || []).filter(
        (item: any) => item !== input
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: inputOutput,
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
      const inputOutput = this.getInputOutputElement(businessObject);

      if (!inputOutput) {
        return;
      }

      const outputs = (inputOutput.output || []).filter(
        (item: any) => item !== output
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: inputOutput,
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

      let inputOutput = this.getInputOutputElement(businessObject);
      if (!inputOutput) {
        inputOutput = bpmnFactory.create("xflow:InputOutput", {
          input: [],
          output: [],
        });
        inputOutput.$parent = extensionElements;
        extensionElements.values.push(inputOutput);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      const newInput = bpmnFactory.create("xflow:Input", {
        name: this.nextId("Input_"),
      });
      
      // Create variable separately to set parent properly
      const variable = bpmnFactory.create("xflow:Variable", { name: "" });
      variable.$parent = newInput;
      newInput.variable = variable;

      // Set parent for proper namespace handling
      newInput.$parent = inputOutput;
      if (newInput.variable) {
        newInput.variable.$parent = newInput;
      }

      inputOutput.input = [...(inputOutput.input || []), newInput];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: inputOutput,
        properties: {
          input: inputOutput.input,
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

      let inputOutput = this.getInputOutputElement(businessObject);
      if (!inputOutput) {
        inputOutput = bpmnFactory.create("xflow:InputOutput", {
          input: [],
          output: [],
        });
        inputOutput.$parent = extensionElements;
        extensionElements.values.push(inputOutput);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      const newOutput = bpmnFactory.create("xflow:Output", {
        name: this.nextId("Output_"),
      });
      
      // Create nested elements separately to set parent properly
      const variable = bpmnFactory.create("xflow:Variable", { name: "" });
      const source = bpmnFactory.create("xflow:Source", { value: "" });
      
      variable.$parent = newOutput;
      source.$parent = newOutput;
      
      newOutput.variable = variable;
      newOutput.source = source;

      // Set parent for proper namespace handling
      newOutput.$parent = inputOutput;
      if (newOutput.variable) {
        newOutput.variable.$parent = newOutput;
      }
      if (newOutput.source) {
        newOutput.source.$parent = newOutput;
      }

      inputOutput.output = [...(inputOutput.output || []), newOutput];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: inputOutput,
        properties: {
          output: inputOutput.output,
        },
      });
    };
  }

  // 创建 Callee 列表组
  private createCalleeListGroup(element: BpmnElement) {
    const businessObject = getBusinessObject(element);
    const callee = this.getCalleeElement(businessObject);
    
    // 每个 serviceTask 只有一个 callee，所以 items 数组只有一个 item
    // 即使 callee 不存在，也显示一个 item，让用户可以直接输入
    const items = [{
      id: element.id + "-callee-0",
      label: "Callee",
      entries: this.createCalleeEntries(element.id + "-callee-0", element, callee),
      autoFocusEntry: element.id + "-callee-0-module",
    }];

    return {
      items,
      add: undefined, // 不显示添加按钮，因为始终显示一个 item
    };
  }

  // 创建 Callee 条目
  private createCalleeEntries(
    idPrefix: string,
    element: BpmnElement,
    callee: any
  ): any[] {
    return [
      {
        id: idPrefix + "-module",
        component: this.createCachedComponent(
          `callee-module-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            const commandStack = this.injector.get("commandStack");

            const getValue = () => {
              const bo = getBusinessObject(props.element);
              const currentCallee = this.getCalleeElement(bo);
              return currentCallee ? (currentCallee.module || "") : "";
            };

            const setValue = (value: string) => {
              const bo = getBusinessObject(props.element);
              let currentCallee = this.getCalleeElement(bo);
              
              // 如果 callee 不存在，创建它
              if (!currentCallee) {
                const bpmnFactory = this.injector.get("bpmnFactory");
                let extensionElements = bo.extensionElements;
                
                if (!extensionElements) {
                  extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
                    values: [],
                  });
                  bo.extensionElements = extensionElements;
                  commandStack.execute("element.updateModdleProperties", {
                    element: props.element,
                    moddleElement: bo,
                    properties: { extensionElements },
                  });
                }

                if (!extensionElements.values) {
                  extensionElements.values = [];
                }

                currentCallee = bpmnFactory.create("xflow:Callee", {
                  module: "",
                  cmdid: "",
                });
                currentCallee.$parent = extensionElements;
                extensionElements.values.push(currentCallee);
                commandStack.execute("element.updateModdleProperties", {
                  element: props.element,
                  moddleElement: extensionElements,
                  properties: {
                    values: extensionElements.values,
                  },
                });
              }
              
              currentCallee.module = value || undefined;
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: currentCallee,
                properties: {
                  module: currentCallee.module,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Module"),
              getValue,
              setValue,
              debounce,
              description: translate("The module name of the callee"),
              tooltip: translate("Enter the module name for the callee"),
              placeholder: translate("Enter module name"),
            });
          }
        ),
      },
      {
        id: idPrefix + "-cmdid",
        component: this.createCachedComponent(
          `callee-cmdid-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");
            const commandStack = this.injector.get("commandStack");

            const getValue = () => {
              const bo = getBusinessObject(props.element);
              const currentCallee = this.getCalleeElement(bo);
              return currentCallee ? (currentCallee.cmdid || "") : "";
            };

            const setValue = (value: string) => {
              const bo = getBusinessObject(props.element);
              let currentCallee = this.getCalleeElement(bo);
              
              // 如果 callee 不存在，创建它
              if (!currentCallee) {
                const bpmnFactory = this.injector.get("bpmnFactory");
                let extensionElements = bo.extensionElements;
                
                if (!extensionElements) {
                  extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
                    values: [],
                  });
                  bo.extensionElements = extensionElements;
                  commandStack.execute("element.updateModdleProperties", {
                    element: props.element,
                    moddleElement: bo,
                    properties: { extensionElements },
                  });
                }

                if (!extensionElements.values) {
                  extensionElements.values = [];
                }

                currentCallee = bpmnFactory.create("xflow:Callee", {
                  module: "",
                  cmdid: "",
                });
                currentCallee.$parent = extensionElements;
                extensionElements.values.push(currentCallee);
                commandStack.execute("element.updateModdleProperties", {
                  element: props.element,
                  moddleElement: extensionElements,
                  properties: {
                    values: extensionElements.values,
                  },
                });
              }
              
              currentCallee.cmdid = value || undefined;
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: currentCallee,
                properties: {
                  cmdid: currentCallee.cmdid,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("CmdId"),
              getValue,
              setValue,
              debounce,
              description: translate("The command ID of the callee"),
              tooltip: translate("Enter the command ID for the callee"),
              placeholder: translate("Enter command ID"),
            });
          }
        ),
      },
    ];
  }

  // 创建 RequestParameterAssignments 列表组
  private createRequestParameterAssignmentsListGroup(element: BpmnElement) {
    const assignments = this.getRequestParameterAssignments(element) || [];

    const items = assignments.map((assignment: any, index: number) => {
      const id = element.id + "-request-assignment-" + index;
      return {
        id,
        label: assignment.name || assignment.target || assignment.source || `Assignment ${index + 1}`,
        entries: this.createAssignmentEntries(id, element, assignment),
        autoFocusEntry: id + "-name",
        remove: this.createRequestParameterAssignmentRemoveHandler(element, assignment),
      };
    });

    return {
      items,
      add: this.createRequestParameterAssignmentAddHandler(element),
    };
  }

  // 创建 FlowVariableAssignments 列表组
  private createFlowVariableAssignmentsListGroup(element: BpmnElement) {
    const assignments = this.getFlowVariableAssignments(element) || [];

    const items = assignments.map((assignment: any, index: number) => {
      const id = element.id + "-flow-assignment-" + index;
      return {
        id,
        label: assignment.name || assignment.target || assignment.source || `Assignment ${index + 1}`,
        entries: this.createFlowVariableAssignmentEntries(id, element, assignment),
        autoFocusEntry: id + "-name",
        remove: this.createFlowVariableAssignmentRemoveHandler(element, assignment),
      };
    });

    return {
      items,
      add: this.createFlowVariableAssignmentAddHandler(element),
    };
  }

  // 创建 Assignment 条目（用于 RequestParameterAssignments）
  private createAssignmentEntries(
    idPrefix: string,
    element: BpmnElement,
    assignment: any
  ): any[] {
    return [
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `assignment-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return assignment.name || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: assignment,
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
        id: idPrefix + "-target",
        component: this.createCachedComponent(
          `assignment-target-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return assignment.target || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: assignment,
                properties: {
                  target: value,
                },
              });
            };

            return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Target"),
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
          `assignment-source-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return assignment.source || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: assignment,
                properties: {
                  source: value,
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

  // 创建 FlowVariable Assignment 条目（target 必须以 "$FLOW" 开头）
  private createFlowVariableAssignmentEntries(
    idPrefix: string,
    element: BpmnElement,
    assignment: any
  ): any[] {
    return [
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `flow-assignment-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return assignment.name || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: assignment,
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
        id: idPrefix + "-target",
        component: this.createCachedComponent(
          `flow-assignment-target-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return assignment.target || "";
            };

            const setValue = (value: string) => {
              // 保存值，验证将在 validate 函数中进行
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: assignment,
                properties: {
                  target: value,
                },
              });
            };

            // 验证函数：检查 target 是否以 "$FLOW" 开头
            const validate = (value: string): string | null => {
              if (!value || !value.trim()) {
                return null; // 允许为空（用户可以稍后填写）
              }
              if (!value.startsWith("$FLOW")) {
                return translate('Target must start with "$FLOW"');
              }
              return null; // 验证通过
            };

            // 创建 blur 事件处理函数
                const handleBlur = (event: Event) => {
                  const target = event.target as HTMLInputElement;
                  const value = target.value;
                  
                  // 如果 target 以 $FLOW. 开头，自动添加 Declaration
                  if (value && value.trim().startsWith("$FLOW.")) {
                    const trimmedValue = value.trim();
                    // 提取 $FLOW. 后面的部分（支持 $FLOW.xxx 或 $FLOW.xxx.yyy 等）
                    const fieldValue = trimmedValue.substring(6); // "$FLOW." 长度为 6
                    if (fieldValue && fieldValue.trim()) {
                      // assignment 必须有 name
                      const assignmentName = assignment.name;
                      if (assignmentName) {
                        // assignment 的 name 作为 declaration 的 name，$FLOW.xxx 的 xxx 作为 field
                        this.ensureDeclarationExists(props.element, assignmentName, fieldValue.trim());
                      } else {
                        console.warn(`Assignment missing name, cannot create declaration for: ${value}`);
                      }
                    }
                  }
                };

            // 创建 TextFieldEntry
            const entry = TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Target"),
              getValue,
              setValue,
              debounce,
              validate,
              description: translate('Target must start with "$FLOW"'),
            });

            // 在组件挂载后添加 blur 事件监听器
            // 使用 MutationObserver 确保在 DOM 渲染完成后添加监听器
            const observer = new MutationObserver(() => {
              const inputElement = document.querySelector(`[data-entry-id="${props.id}"] input, #${props.id} input`) as HTMLInputElement;
              if (inputElement && !inputElement.dataset.blurHandlerAdded) {
                inputElement.addEventListener('blur', handleBlur);
                inputElement.dataset.blurHandlerAdded = 'true';
                observer.disconnect(); // 找到后停止观察
              }
            });

            // 延迟启动观察，确保 DOM 已开始渲染
            setTimeout(() => {
              // 先尝试直接查找
              const inputElement = document.querySelector(`[data-entry-id="${props.id}"] input, #${props.id} input`) as HTMLInputElement;
              if (inputElement && !inputElement.dataset.blurHandlerAdded) {
                inputElement.addEventListener('blur', handleBlur);
                inputElement.dataset.blurHandlerAdded = 'true';
              } else {
                // 如果没找到，开始观察 DOM 变化
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                });
                
                // 设置超时，避免无限观察
                setTimeout(() => {
                  observer.disconnect();
                }, 5000);
              }
            }, 100);

            return entry;
          }
        ),
      },
      {
        id: idPrefix + "-source",
        component: this.createCachedComponent(
          `flow-assignment-source-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return assignment.source || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: assignment,
                properties: {
                  source: value,
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

  // 创建 RequestParameter Assignment 删除处理器
  private createRequestParameterAssignmentRemoveHandler(element: BpmnElement, assignment: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);
      const requestParameterAssignments = this.getRequestParameterAssignmentsElement(businessObject);

      if (!requestParameterAssignments) {
        return;
      }

      const assignments = (requestParameterAssignments.assignment || []).filter(
        (item: any) => item !== assignment
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: requestParameterAssignments,
        properties: {
          assignment: assignments,
        },
      });
    };
  }

  // 创建 RequestParameter Assignment 添加处理器
  private createRequestParameterAssignmentAddHandler(element: BpmnElement) {
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

      let requestParameterAssignments = this.getRequestParameterAssignmentsElement(businessObject);
      if (!requestParameterAssignments) {
        requestParameterAssignments = bpmnFactory.create("xflow:RequestParameterAssignments", {
          assignment: [],
        });
        requestParameterAssignments.$parent = extensionElements;
        extensionElements.values.push(requestParameterAssignments);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      const newAssignment = bpmnFactory.create("xflow:Assignment", {
        name: this.nextId("Assignment_"),
        target: "",
        source: "",
      });

      // Set parent for proper namespace handling
      newAssignment.$parent = requestParameterAssignments;

      requestParameterAssignments.assignment = [
        ...(requestParameterAssignments.assignment || []),
        newAssignment,
      ];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: requestParameterAssignments,
        properties: {
          assignment: requestParameterAssignments.assignment,
        },
      });
    };
  }

  // 创建 FlowVariable Assignment 删除处理器
  private createFlowVariableAssignmentRemoveHandler(element: BpmnElement, assignment: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);
      const flowVariableAssignments = this.getFlowVariableAssignmentsElement(businessObject);

      if (!flowVariableAssignments) {
        return;
      }

      const assignments = (flowVariableAssignments.assignment || []).filter(
        (item: any) => item !== assignment
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: flowVariableAssignments,
        properties: {
          assignment: assignments,
        },
      });
    };
  }

  // 创建 FlowVariable Assignment 添加处理器
  private createFlowVariableAssignmentAddHandler(element: BpmnElement) {
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

      let flowVariableAssignments = this.getFlowVariableAssignmentsElement(businessObject);
      if (!flowVariableAssignments) {
        flowVariableAssignments = bpmnFactory.create("xflow:FlowVariableAssignments", {
          assignment: [],
        });
        flowVariableAssignments.$parent = extensionElements;
        extensionElements.values.push(flowVariableAssignments);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      // Flow Variable Assignment 的 target 必须以 "$FLOW" 开头，设置默认值
      const newAssignment = bpmnFactory.create("xflow:Assignment", {
        name: this.nextId("Assignment_"),
        target: "$FLOW",
        source: "",
      });

      // Set parent for proper namespace handling
      newAssignment.$parent = flowVariableAssignments;

      flowVariableAssignments.assignment = [
        ...(flowVariableAssignments.assignment || []),
        newAssignment,
      ];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: flowVariableAssignments,
        properties: {
          assignment: flowVariableAssignments.assignment,
        },
      });
    };
  }

  // Process 扩展属性组
  private createProcessExtensionGroup(
    element: BpmnElement,
    businessObject: any
  ): PropertiesPanelGroup {
    return {
      id: "processExtension",
      label: this.translate("Process Extension"),
      entries: [
        // Flow Variable Declarations 列表组
        {
          id: "flowVariableDeclarations",
          label: this.translate("Flow Variable Declarations"),
          component: ListGroup,
          ...this.createDeclarationsListGroup(element),
        } as any,
      ],
    };
  }

  // 获取 Declarations 扩展元素
  private getDeclarationsElement(businessObject: any): any {
    if (
      !businessObject.extensionElements ||
      !businessObject.extensionElements.values
    ) {
      return null;
    }
    return businessObject.extensionElements.values.find(
      (el: any) => el.$type === "xflow:Declarations"
    );
  }

  // 获取所有 Declarations
  private getDeclarations(element: BpmnElement): any[] {
    const businessObject = getBusinessObject(element);
    const declarations = this.getDeclarationsElement(businessObject);
    return declarations ? declarations.declaration || [] : [];
  }

  // 收集所有实际使用的 Flow Variable（从所有 FlowVariableAssignments 中）
  private collectUsedFlowVariables(): Set<string> {
    const elementRegistry = this.injector.get("elementRegistry");
    const usedVariables = new Set<string>();

    // 遍历所有元素，查找包含 FlowVariableAssignments 的元素
    const allElements = elementRegistry.getAll();
    for (const element of allElements) {
      const businessObject = getBusinessObject(element);
      
      // 检查元素的 FlowVariableAssignments
      const flowVariableAssignments = this.getFlowVariableAssignmentsElement(businessObject);
      if (flowVariableAssignments && flowVariableAssignments.assignment) {
        for (const assignment of flowVariableAssignments.assignment) {
          const target = assignment.target;
          if (target && typeof target === 'string' && target.trim().startsWith("$FLOW.")) {
            const trimmedValue = target.trim();
            const fieldValue = trimmedValue.substring(6); // "$FLOW." 长度为 6
            if (fieldValue && fieldValue.trim() && assignment.name) {
              // 使用 name::field 作为唯一标识
              const key = `${assignment.name}::${fieldValue.trim()}`;
              usedVariables.add(key);
            }
          }
        }
      }

      // 检查 MessageEventDefinition 的 FlowVariableAssignments
      const messageEventDefinition = this.getMessageEventDefinition(businessObject);
      if (messageEventDefinition) {
        const messageFlowVariableAssignments = this.getFlowVariableAssignmentsElement(messageEventDefinition);
        if (messageFlowVariableAssignments && messageFlowVariableAssignments.assignment) {
          for (const assignment of messageFlowVariableAssignments.assignment) {
            const target = assignment.target;
            if (target && typeof target === 'string' && target.trim().startsWith("$FLOW.")) {
              const trimmedValue = target.trim();
              const fieldValue = trimmedValue.substring(6);
              if (fieldValue && fieldValue.trim() && assignment.name) {
                const key = `${assignment.name}::${fieldValue.trim()}`;
                usedVariables.add(key);
              }
            }
          }
        }
      }
    }

    return usedVariables;
  }

  // 清理未使用的 Declarations
  private cleanupUnusedDeclarations(element: BpmnElement): void {
    const elementRegistry = this.injector.get("elementRegistry");
    const commandStack = this.injector.get("commandStack");
    const businessObject = getBusinessObject(element);

    const declarations = this.getDeclarationsElement(businessObject);
    if (!declarations || !declarations.declaration || declarations.declaration.length === 0) {
      return;
    }

    // 收集所有实际使用的变量
    const usedVariables = this.collectUsedFlowVariables();

    // 过滤出未使用的声明
    const existingDeclarations = declarations.declaration || [];
    const usedDeclarations = existingDeclarations.filter((decl: any) => {
      const key = `${decl.name || ''}::${decl.field || ''}`;
      return usedVariables.has(key);
    });

    // 如果有未使用的声明被删除，更新 declarations
    if (usedDeclarations.length !== existingDeclarations.length) {
      const removedCount = existingDeclarations.length - usedDeclarations.length;
      console.log(`Cleaning up ${removedCount} unused Flow Variable Declarations`);
      
      // 确保 declarations 对象存在且有效
      if (!declarations || !declarations.$parent) {
        console.warn("Declarations object is invalid, skipping cleanup");
        return;
      }

      // 创建新的数组，避免直接修改原数组
      const newDeclarationArray = [...usedDeclarations];
      
      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: declarations,
        properties: {
          declaration: newDeclarationArray,
        },
      });
    }
  }

  // 创建 Declarations 列表组
  private createDeclarationsListGroup(element: BpmnElement) {
    // 延迟清理未使用的声明，避免在属性面板渲染时立即执行命令
    // 使用 setTimeout 确保清理操作在下一个事件循环中执行
    setTimeout(() => {
      try {
        this.cleanupUnusedDeclarations(element);
      } catch (error) {
        console.warn("Failed to cleanup unused declarations:", error);
      }
    }, 0);
    
    const declarations = this.getDeclarations(element) || [];

    const items = declarations.map((declaration: any, index: number) => {
      const id = element.id + "-declaration-" + index;
      return {
        id,
        label: declaration.name || declaration.field || `Declaration ${index + 1}`,
        entries: this.createDeclarationEntries(id, element, declaration),
        autoFocusEntry: id + "-name",
        remove: this.createDeclarationRemoveHandler(element, declaration),
      };
    });

    return {
      items,
      add: this.createDeclarationAddHandler(element),
    };
  }

  // 创建 Declaration 条目
  private createDeclarationEntries(
    idPrefix: string,
    element: BpmnElement,
    declaration: any
  ): any[] {
    return [
      {
        id: idPrefix + "-name",
        component: this.createCachedComponent(
          `declaration-name-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            const getValue = () => {
              return declaration.name || "";
            };

            const setValue = (value: string) => {
      commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: declaration,
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
        id: idPrefix + "-field",
        component: this.createCachedComponent(
          `declaration-field-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

  const getValue = () => {
              return declaration.field || "";
            };

            const setValue = (value: string) => {
              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: declaration,
                properties: {
                  field: value,
                },
              });
  };

  return TextFieldEntry({
              id: props.id,
              element: props.element,
              label: translate("Field"),
    getValue,
    setValue,
    debounce,
  });
}
        ),
      },
      {
        id: idPrefix + "-type",
        component: this.createCachedComponent(
          `declaration-type-${idPrefix}`,
          () => (props: { element: BpmnElement; id: string }) => {
            const commandStack = this.injector.get("commandStack");
            const translate = this.injector.get("translate");
            const debounce = this.injector.get("debounceInput");

            // DeclarationType 枚举值：String, Integer, Boolean
            const getOptions = () => {
              return [
                { value: "String", label: translate("String") },
                { value: "Integer", label: translate("Integer") },
                { value: "Boolean", label: translate("Boolean") },
              ];
            };

            const getValue = () => {
              // 从 $attrs 或直接属性中获取 type
              const type = declaration.$attrs?.type || declaration.type;
              return type || "";
            };

            const setValue = (value: string) => {
              // 确保 $attrs 存在
              if (!declaration.$attrs) {
                declaration.$attrs = {};
              }
              declaration.$attrs.type = value || undefined;
              declaration.type = value || undefined;

              commandStack.execute("element.updateModdleProperties", {
                element: props.element,
                moddleElement: declaration,
                properties: {
                  type: value || undefined,
                },
              });
            };

            return SelectEntry({
              id: props.id,
              element: props.element,
              label: translate("Type"),
              getValue,
              setValue,
              getOptions,
              debounce,
            });
          }
        ),
      },
    ];
  }

  // 创建 Declaration 删除处理器
  private createDeclarationRemoveHandler(element: BpmnElement, declaration: any) {
    return (event: Event) => {
      event.stopPropagation();
      const commandStack = this.injector.get("commandStack");
      const businessObject = getBusinessObject(element);
      const declarations = this.getDeclarationsElement(businessObject);

      if (!declarations) {
        return;
      }

      const declarationList = (declarations.declaration || []).filter(
        (item: any) => item !== declaration
      );

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: declarations,
        properties: {
          declaration: declarationList,
        },
      });
    };
  }

  // 创建 Declaration 添加处理器
  private createDeclarationAddHandler(element: BpmnElement) {
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

      let declarations = this.getDeclarationsElement(businessObject);
      if (!declarations) {
        declarations = bpmnFactory.create("xflow:Declarations", {
          declaration: [],
        });
        declarations.$parent = extensionElements;
        extensionElements.values.push(declarations);
        commandStack.execute("element.updateModdleProperties", {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.values,
          },
        });
      }

      const newDeclaration = bpmnFactory.create("xflow:Declaration", {
        name: this.nextId("Declaration_"),
        field: "",
        type: "String", // 默认类型
      });

      // Set parent for proper namespace handling
      newDeclaration.$parent = declarations;

      declarations.declaration = [
        ...(declarations.declaration || []),
        newDeclaration,
      ];

      commandStack.execute("element.updateModdleProperties", {
        element,
        moddleElement: declarations,
        properties: {
          declaration: declarations.declaration,
        },
      });
    };
  }

  // 确保 Declaration 存在（如果不存在则自动添加）
  private ensureDeclarationExists(element: BpmnElement, declarationName: string, fieldValue: string): void {
    const elementRegistry = this.injector.get("elementRegistry");
    const bpmnFactory = this.injector.get("bpmnFactory");
    const commandStack = this.injector.get("commandStack");

    // 查找 Process 元素
    const processElement = this.findProcessElement(elementRegistry);
    if (!processElement) {
      console.warn("Cannot find Process element to add declaration");
      return;
    }

    const processBusinessObject = getBusinessObject(processElement);
    
    // 获取现有的 Declarations
    let declarations = this.getDeclarationsElement(processBusinessObject);
    
    // 检查是否已存在相同 name 和 field 的 Declaration
    const existingDeclarations = declarations ? declarations.declaration || [] : [];
    const exists = existingDeclarations.some(
      (decl: any) => decl.name === declarationName && decl.field === fieldValue
    );

    if (exists) {
      // 已存在，不需要添加
      return;
    }

    // 确保 extensionElements 存在
    let extensionElements = processBusinessObject.extensionElements;
    if (!extensionElements) {
      extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
        values: [],
      });
      processBusinessObject.extensionElements = extensionElements;
      commandStack.execute("element.updateModdleProperties", {
        element: processElement,
        moddleElement: processBusinessObject,
        properties: { extensionElements },
      });
    }

    // 确保 values 数组存在
    if (!extensionElements.values) {
      extensionElements.values = [];
    }

    // 如果 Declarations 不存在，创建它
    if (!declarations) {
      declarations = bpmnFactory.create("xflow:Declarations", {
        declaration: [],
      });
      declarations.$parent = extensionElements;
      extensionElements.values.push(declarations);
      commandStack.execute("element.updateModdleProperties", {
        element: processElement,
        moddleElement: extensionElements,
        properties: {
          values: extensionElements.values,
        },
      });
    }

    // 创建新的 Declaration
    const newDeclaration = bpmnFactory.create("xflow:Declaration", {
      name: declarationName,
      field: fieldValue,
      type: "String", // 默认类型
    });

    // Set parent for proper namespace handling
    newDeclaration.$parent = declarations;

    // 添加到 declarations 列表
    declarations.declaration = [
      ...(declarations.declaration || []),
      newDeclaration,
    ];

    commandStack.execute("element.updateModdleProperties", {
      element: processElement,
      moddleElement: declarations,
      properties: {
        declaration: declarations.declaration,
      },
    });
  }

  // 查找 Process 元素
  private findProcessElement(elementRegistry: any): BpmnElement | null {
    // 遍历所有元素，找到类型为 bpmn:Process 的元素
    const allElements = elementRegistry.getAll();
    for (const element of allElements) {
      if (is(element, "bpmn:Process")) {
        return element;
      }
    }
    return null;
  }

  // 初始化 Flow Variable Declarations：分析所有 assignment 并自动添加 Declaration
  private initializeFlowVariableDeclarations(): void {
    const elementRegistry = this.injector.get("elementRegistry");
    const bpmnFactory = this.injector.get("bpmnFactory");
    const commandStack = this.injector.get("commandStack");

    // 查找 Process 元素
    const processElement = this.findProcessElement(elementRegistry);
    if (!processElement) {
      console.warn("Cannot find Process element to initialize declarations");
      return;
    }

    const processBusinessObject = getBusinessObject(processElement);

    // 收集所有 Flow Variable Assignment 中的信息（name 和 field）
    interface DeclarationInfo {
      name: string;
      field: string;
    }
    const declarationInfos = new Map<string, DeclarationInfo>(); // 使用 name+field 作为 key

    // 遍历所有元素，查找包含 FlowVariableAssignments 的元素
    const allElements = elementRegistry.getAll();
    for (const element of allElements) {
      const businessObject = getBusinessObject(element);
      const flowVariableAssignments = this.getFlowVariableAssignmentsElement(businessObject);
      
      if (flowVariableAssignments && flowVariableAssignments.assignment) {
        for (const assignment of flowVariableAssignments.assignment) {
          const target = assignment.target;
          if (target && typeof target === 'string' && target.trim().startsWith("$FLOW.")) {
            const trimmedValue = target.trim();
            const fieldValue = trimmedValue.substring(6); // "$FLOW." 长度为 6
            if (fieldValue && fieldValue.trim()) {
              // assignment 必须有 name，如果没有则跳过（或使用默认值）
              const assignmentName = assignment.name;
              if (assignmentName) {
                const key = `${assignmentName}::${fieldValue.trim()}`;
                if (!declarationInfos.has(key)) {
                  declarationInfos.set(key, {
                    name: assignmentName, // assignment 的 name 作为 declaration 的 name
                    field: fieldValue.trim(), // $FLOW.xxx 的 xxx 作为 declaration 的 field
                  });
                }
              } else {
                console.warn(`Assignment missing name, skipping: target=${target}`);
              }
            }
          }
        }
      }
    }

    if (declarationInfos.size === 0) {
      console.log("No Flow Variable Assignments found, skipping initialization");
      return;
    }

    console.log(`Found ${declarationInfos.size} unique Flow Variable declarations:`, Array.from(declarationInfos.values()));

    // 获取现有的 Declarations
    let declarations = this.getDeclarationsElement(processBusinessObject);
    const existingDeclarations = declarations ? declarations.declaration || [] : [];
    const existingKeys = new Set(
      existingDeclarations.map((decl: any) => `${decl.name || ''}::${decl.field || ''}`)
    );

    // 找出需要添加的声明（去重）
    const declarationsToAdd = Array.from(declarationInfos.values()).filter(
      info => !existingKeys.has(`${info.name}::${info.field}`)
    );

    if (declarationsToAdd.length === 0) {
      console.log("All Flow Variables already declared, no need to add");
      return;
    }

    console.log(`Adding ${declarationsToAdd.length} new Flow Variable Declarations:`, declarationsToAdd);

    // 确保 extensionElements 存在
    let extensionElements = processBusinessObject.extensionElements;
    if (!extensionElements) {
      extensionElements = bpmnFactory.create("bpmn:ExtensionElements", {
        values: [],
      });
      processBusinessObject.extensionElements = extensionElements;
      commandStack.execute("element.updateModdleProperties", {
        element: processElement,
        moddleElement: processBusinessObject,
        properties: { extensionElements },
      });
    }

    // 确保 values 数组存在
    if (!extensionElements.values) {
      extensionElements.values = [];
    }

    // 如果 Declarations 不存在，创建它
    if (!declarations) {
      declarations = bpmnFactory.create("xflow:Declarations", {
        declaration: [],
      });
      declarations.$parent = extensionElements;
      extensionElements.values.push(declarations);
      commandStack.execute("element.updateModdleProperties", {
        element: processElement,
        moddleElement: extensionElements,
        properties: {
          values: extensionElements.values,
        },
      });
    }

    // 添加新的 Declarations
    const newDeclarations = declarationsToAdd.map(info => {
      const newDeclaration = bpmnFactory.create("xflow:Declaration", {
        name: info.name,
        field: info.field,
        type: "String", // 默认类型
      });
      newDeclaration.$parent = declarations;
      return newDeclaration;
    });

    // 合并现有的和新的 declarations
    declarations.declaration = [
      ...(declarations.declaration || []),
      ...newDeclarations,
    ];

    commandStack.execute("element.updateModdleProperties", {
      element: processElement,
      moddleElement: declarations,
      properties: {
        declaration: declarations.declaration,
      },
    });

    console.log(`Successfully initialized ${newDeclarations.length} Flow Variable Declarations`);
  }

  // Event 扩展属性组
  private createEventExtensionGroup(
    element: BpmnElement,
    businessObject: any
  ): PropertiesPanelGroup {
    return {
      id: "eventExtension",
      label: this.translate("Event Extension"),
      entries: [
        // Allowed Sources 输入框
        {
          id: "allowedSources",
          element: element,
          component: this.createCachedComponent(
            "event-allowedSources",
            () => (props: { element: BpmnElement; id: string }) => {
              const translate = this.injector.get("translate");
              const debounce = this.injector.get("debounceInput");
              const modeling = this.injector.get("modeling");

              const getValue = () => {
                const bo = getBusinessObject(props.element);
                return bo.$attrs?.allowedSources || bo.allowedSources || "";
              };

              const setValue = (value: string) => {
                modeling.updateProperties(props.element, {
                  allowedSources: value || undefined,
                });
              };

              return TextFieldEntry({
                id: props.id,
                element: props.element,
                label: translate("Allowed Sources"),
                getValue,
                setValue,
                debounce,
                description: translate("Multiple sources separated by commas"),
                placeholder: translate("Enter sources separated by commas"),
              });
            }
          ),
          isEdited: () => false,
        },
      ],
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
