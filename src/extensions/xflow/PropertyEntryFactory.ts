import {
  TextFieldEntry,
  SelectEntry,
  NumberFieldEntry,
  TextAreaEntry,
  CheckboxEntry,
  ToggleSwitchEntry,
  FeelEntry,
  FeelNumberEntry,
  FeelTextAreaEntry,
  FeelCheckboxEntry,
  FeelToggleSwitchEntry,
  TemplatingEntry,
  FeelTemplatingEntry,
  DescriptionEntry,
  ListEntry,
  SimpleEntry,
} from "@bpmn-io/properties-panel";
import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";
import { useService } from "bpmn-js-properties-panel";
import type { BpmnElement } from "../shared/types";

export type EntryFactory =
  | typeof TextFieldEntry
  | typeof SelectEntry
  | typeof NumberFieldEntry
  | typeof TextAreaEntry
  | typeof CheckboxEntry
  | typeof ToggleSwitchEntry
  | typeof FeelEntry
  | typeof FeelNumberEntry
  | typeof FeelTextAreaEntry
  | typeof FeelCheckboxEntry
  | typeof FeelToggleSwitchEntry
  | typeof TemplatingEntry
  | typeof FeelTemplatingEntry
  | typeof DescriptionEntry
  | typeof ListEntry
  | typeof SimpleEntry;

// 属性条目属性接口
export interface EntryProps {
  element: BpmnElement;
  id: string;
  label: string;
  getValue: () => string;
  setValue: (value: string) => void;
  debounce?: any;
  placeholder?: string;
  description?: string;
  tooltip?: string;
  validate?: (value: string) => string | null;
  disabled?: boolean;
  [key: string]: any; // 允许其他属性
}

// 属性配置接口
export interface PropertyConfig {
  propertyPath: string;
  label: string;
  description?: string;
  tooltip?: string;
  placeholder?: string;
  elementType?: string; // 用于指定要查找的扩展元素类型
}

// 辅助函数：通过元素类型查找扩展元素
function findExtensionElementByType(
  businessObject: any,
  elementType: string
): any {
  if (
    !businessObject.extensionElements ||
    !businessObject.extensionElements.values
  ) {
    return null;
  }

  return businessObject.extensionElements.values.find(
    (el: any) => el.$type === elementType
  );
}

// 组件缓存，避免重复创建
const componentCache = new Map<string, any>();

// 工厂方法：创建属性组件
export function createPropertyComponent(
  entry: EntryFactory,
  config: PropertyConfig
) {
  // 创建缓存键
  const cacheKey = `${entry.name}-${config.propertyPath}-${config.elementType || 'default'}`;
  
  // 如果缓存中存在，直接返回
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey);
  }
  
  // 创建新组件并缓存
  const component = (props: { element: BpmnElement; id: string }) => {
    const { element, id } = props;
    const modeling = useService("modeling");
    const translate = useService("translate");
    const debounce = useService("debounceInput");
    const commandStack = useService("commandStack");

    const getValue = (): string => {
      const businessObject = getBusinessObject(props.element);

      // 如果指定了元素类型，使用类型查找而不是路径解析
      if (config.elementType) {
        const extensionElement = findExtensionElementByType(
          businessObject,
          config.elementType
        );
        if (extensionElement) {
          // 从 propertyPath 中提取属性名（去掉 extensionElements.values[0]. 部分）
          const pathParts = config.propertyPath.split(".");
          const propertyName = pathParts[pathParts.length - 1]; // 取最后一部分作为属性名
          return propertyName ? extensionElement[propertyName] || "" : "";
        }
        return "";
      }

      // 支持嵌套属性路径，如 'extensionElements.xflow:module.value'
      const pathParts = config.propertyPath.split(".");
      let value: any = businessObject;

      for (const part of pathParts) {
        if (value && typeof value === "object") {
          // 处理数组索引，如 'values[0]'
          if (part.includes("[") && part.includes("]")) {
            const [property, indexStr] = part.split("[");
            if (property && indexStr) {
              const index = parseInt(indexStr.replace("]", ""), 10);
              if (
                value[property] &&
                Array.isArray(value[property]) &&
                value[property][index]
              ) {
                value = value[property][index];
              } else {
                return "";
              }
            } else {
              return "";
            }
          }
          // 处理带命名空间的属性，如 'xflow:module'
          else if (part.includes(":")) {
            const [namespace, property] = part.split(":");
            if (namespace && property) {
              value = value[`${namespace}:${property}`] || value[property];
            } else {
              value = value[part];
            }
          } else {
            value = value[part];
          }
        } else {
          return "";
        }
      }

      return value || "";
    };

    const setValue = (value: string): void => {
      if (!modeling) {
        console.warn("Modeling service not available");
        return;
      }

      const businessObject = getBusinessObject(props.element);

      // 如果指定了元素类型，使用类型查找而不是路径解析
      if (config.elementType) {
        // 通过 businessObject 获取 moddle 实例
        const moddle = businessObject.$model;

        // 确保 extensionElements 存在
        if (!businessObject.extensionElements) {
          businessObject.extensionElements = moddle.create(
            "bpmn:ExtensionElements"
          );
        }
        if (!businessObject.extensionElements.values) {
          businessObject.extensionElements.values = [];
        }

        // 查找或创建对应的扩展元素
        let extensionElement = businessObject.extensionElements.values.find(
          (el: any) => el.$type === config.elementType
        );
        if (!extensionElement) {
          // 使用 moddle 创建扩展元素，确保具有正确的 $descriptor
          // 根据元素类型设置不同的初始属性
          let initialProperties: any = {};
          if (config.elementType === 'xflow:XFlowInput') {
            initialProperties = { 
              name: '', 
              variable: moddle.create('xflow:XFlowVariable', { name: '' })
            };
          } else if (config.elementType === 'xflow:XFlowOutput') {
            initialProperties = { 
              name: '', 
              variable: moddle.create('xflow:XFlowVariable', { name: '' }), 
              source: moddle.create('xflow:XFlowSource', { value: '' })
            };
          } else if (config.elementType === 'xflow:XFlowVariable') {
            initialProperties = { name: '' };
          } else if (config.elementType === 'xflow:XFlowSource') {
            initialProperties = { value: '' };
          } else {
            // 默认使用 value 属性
            initialProperties = { value: "" };
          }
          
          extensionElement = moddle.create(config.elementType, initialProperties);
          businessObject.extensionElements.values.push(extensionElement);
        }

        // 从 propertyPath 中提取属性名
        const propertyName = config.propertyPath;
        if (propertyName) {
          extensionElement[propertyName] = value;
        }

        // 使用 commandStack 支持撤销/重做
        commandStack.execute('element.updateModdleProperties', {
          element: props.element,
          moddleElement: businessObject,
          properties: {
            extensionElements: businessObject.extensionElements,
          }
        });
        return;
      }

      // 处理简单属性
      const pathParts = config.propertyPath.split(".");
      if (pathParts.length === 1) {
        // 简单属性
        commandStack.execute('element.updateModdleProperties', {
          element: props.element,
          moddleElement: businessObject,
          properties: {
            [config.propertyPath]: value,
          }
        });
      } else {
        // 处理扩展元素
        if (pathParts[0] === "extensionElements" && config.elementType) {
          // 通过 businessObject 获取 moddle 实例
          const moddle = businessObject.$model;

          // 确保 extensionElements 存在
          if (!businessObject.extensionElements) {
            businessObject.extensionElements = moddle.create(
              "bpmn:ExtensionElements"
            );
          }
          if (!businessObject.extensionElements.values) {
            businessObject.extensionElements.values = [];
          }

          // 使用配置中的 elementType 确定元素类型
          const elementType = config.elementType;
          const propertyName = pathParts[pathParts.length - 1]; // 最后一个部分是属性名

          // 查找或创建对应的扩展元素
          let extensionElement = businessObject.extensionElements.values.find(
            (el: any) => el.$type === elementType
          );
          if (!extensionElement) {
            // 使用 moddle 创建扩展元素，确保具有正确的 $descriptor
            // 根据元素类型设置不同的初始属性
            let initialProperties: any = {};
            if (elementType === 'xflow:XFlowInput') {
              initialProperties = { 
                name: '', 
                variable: moddle.create('xflow:XFlowVariable', { name: '' })
              };
            } else if (elementType === 'xflow:XFlowOutput') {
              initialProperties = { 
                name: '', 
                variable: moddle.create('xflow:XFlowVariable', { name: '' }), 
                source: moddle.create('xflow:XFlowSource', { value: '' })
              };
            } else if (elementType === 'xflow:XFlowVariable') {
              initialProperties = { name: '' };
            } else if (elementType === 'xflow:XFlowSource') {
              initialProperties = { value: '' };
            } else {
              // 默认使用 value 属性
              initialProperties = { value: "" };
            }
            
            extensionElement = moddle.create(elementType, initialProperties);
            businessObject.extensionElements.values.push(extensionElement);
          }

          // 更新值
          if (propertyName) {
            extensionElement[propertyName] = value;
          }

          // 触发更新
          commandStack.execute('element.updateModdleProperties', {
            element: props.element,
            moddleElement: businessObject,
            properties: {
              extensionElements: businessObject.extensionElements,
            }
          });
          return;
        }

        // 其他嵌套属性处理
        const lastPart = pathParts.pop()!;
        let target: any = businessObject;

        // 确保嵌套对象存在
        for (const part of pathParts) {
          // 处理数组索引，如 'values[0]'
          if (part.includes("[") && part.includes("]")) {
            const [property, indexStr] = part.split("[");
            if (property && indexStr) {
              const index = parseInt(indexStr.replace("]", ""), 10);

              if (!target[property]) {
                target[property] = [];
              }
              if (!target[property][index]) {
                target[property][index] = {};
              }
              target = target[property][index];
            }
          }
          // 处理带命名空间的属性
          else {
            let actualPart = part;
            if (part.includes(":")) {
              const [namespace, property] = part.split(":");
              if (namespace && property) {
                actualPart = `${namespace}:${property}`;
              }
            }

            if (!target[actualPart]) {
              target[actualPart] = {};
            }
            target = target[actualPart];
          }
        }

        // 更新属性
        target[lastPart] = value;

        // 触发更新
        const updateObj: any = {};
        let current = updateObj;
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (part) {
            // 处理数组索引
            if (part.includes("[") && part.includes("]")) {
              const [property, indexStr] = part.split("[");
              if (property && indexStr) {
                const index = parseInt(indexStr.replace("]", ""), 10);

                if (!current[property]) {
                  current[property] = [];
                }
                if (!current[property][index]) {
                  current[property][index] = {};
                }
                current = current[property][index];
              }
            }
            // 处理带命名空间的属性
            else {
              let actualPart = part;
              if (part.includes(":")) {
                const [namespace, property] = part.split(":");
                if (namespace && property) {
                  actualPart = `${namespace}:${property}`;
                }
              }
              current[actualPart] = {};
              current = current[actualPart];
            }
          }
        }

        commandStack.execute('element.updateModdleProperties', {
          element: props.element,
          moddleElement: businessObject,
          properties: updateObj
        });
      }
    };

    const entryProps: EntryProps = {
      id,
      element,
      description: translate(config.description || ""),
      label: translate(config.label),
      getValue,
      setValue,
      debounce,
      tooltip: translate(config.tooltip || ""),
      placeholder: config.placeholder,
    };

    return entry(entryProps);
  };
  
  // 缓存组件并返回
  componentCache.set(cacheKey, component);
  return component;
}

// 简化的工厂方法：直接创建属性配置对象
export function createPropertyEntry(
  id: string,
  element: BpmnElement,
  entry: EntryFactory,
  config: PropertyConfig
) {
  return {
    id,
    element,
    component: createPropertyComponent(entry, config),
    isEdited: () => false,
  };
}
