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
    (el: any) => {
      // 处理命名空间别名问题
      // XML 解析器或序列化器可能会为自定义扩展生成不同的命名空间前缀（如 ns0, ns1 等）
      // 同时，扩展定义中使用了 tagAlias: "lowerCase"，所以元素名会是小写的
      // 例如：xflow:Url 可能被解析为 ns0:url，xflow:Module 可能被解析为 ns0:module
      if (elementType === 'xflow:Url') {
        return el.$type === 'xflow:Url' || 
               el.$type === 'ns0:url' || 
               el.$type === 'url' ||
               el.$type.endsWith(':url');
      }
      
      // 处理其他扩展元素类型
      if (elementType === 'xflow:Module') {
        return el.$type === 'xflow:Module' || 
               el.$type === 'ns0:module' || 
               el.$type === 'module' ||
               el.$type.endsWith(':module');
      }
      
      if (elementType === 'xflow:Method') {
        return el.$type === 'xflow:Method' || 
               el.$type === 'ns0:method' || 
               el.$type === 'method' ||
               el.$type.endsWith(':method');
      }
      
      if (elementType === 'xflow:RequestParameterAssignments') {
        return el.$type === 'xflow:RequestParameterAssignments' || 
               el.$type === 'ns0:requestParameterAssignments' || 
               el.$type === 'ns0:requestparameterassignments' ||
               el.$type === 'requestParameterAssignments' ||
               el.$type === 'requestparameterassignments' ||
               el.$type.endsWith(':requestParameterAssignments') ||
               el.$type.endsWith(':requestparameterassignments');
      }
      
      if (elementType === 'xflow:FlowVariableAssignments') {
        return el.$type === 'xflow:FlowVariableAssignments' || 
               el.$type === 'ns0:flowVariableAssignments' || 
               el.$type === 'ns0:flowvariableassignments' ||
               el.$type === 'flowVariableAssignments' ||
               el.$type === 'flowvariableassignments' ||
               el.$type.endsWith(':flowVariableAssignments') ||
               el.$type.endsWith(':flowvariableassignments');
      }
      
      return el.$type === elementType;
    }
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
    const bpmnFactory = useService("bpmnFactory");

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
          
          // 如果属性名是 'value' 且扩展元素有 $body，说明值是作为元素体存储的
          if (propertyName === 'value' && extensionElement.$body !== undefined) {
            return extensionElement.$body || "";
          }
          
          return propertyName ? extensionElement[propertyName] || "" : "";
        }
        return "";
      }

      // 支持嵌套属性路径，如 'extensionElements.xflow:Module.value'
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
          // 处理带命名空间的属性，如 'xflow:Module'
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
        // 确保 extensionElements 存在
        if (!businessObject.extensionElements) {
          businessObject.extensionElements = bpmnFactory.create(
            "bpmn:ExtensionElements"
          );
        }
        if (!businessObject.extensionElements.values) {
          businessObject.extensionElements.values = [];
        }

        // 查找或创建对应的扩展元素
        let extensionElement = businessObject.extensionElements.values.find(
          (el: any) => {
            // 使用相同的匹配逻辑来处理命名空间别名问题
            // 支持多种可能的 $type 值以适应不同的 XML 序列化结果
            if (config.elementType === 'xflow:Url') {
              return el.$type === 'xflow:Url' || 
                     el.$type === 'ns0:url' || 
                     el.$type === 'url' ||
                     el.$type.endsWith(':url');
            }
            if (config.elementType === 'xflow:Module') {
              return el.$type === 'xflow:Module' || 
                     el.$type === 'ns0:module' || 
                     el.$type === 'module' ||
                     el.$type.endsWith(':module');
            }
            if (config.elementType === 'xflow:Method') {
              return el.$type === 'xflow:Method' || 
                     el.$type === 'ns0:method' || 
                     el.$type === 'method' ||
                     el.$type.endsWith(':method');
            }
            return el.$type === config.elementType;
          }
        );
        
        if (!extensionElement) {
          // 创建扩展元素，根据元素类型设置不同的初始属性
          if (config.elementType === 'xflow:Input') {
            extensionElement = bpmnFactory.create('xflow:Input', { name: '' });
            
            // Create variable separately to set parent
            const variable = bpmnFactory.create('xflow:Variable', { name: '' });
            variable.$parent = extensionElement;
            extensionElement.variable = variable;
          } else if (config.elementType === 'xflow:Output') {
            extensionElement = bpmnFactory.create('xflow:Output', { name: '' });
            
            // Create nested elements separately to set parent
            const variable = bpmnFactory.create('xflow:Variable', { name: '' });
            const source = bpmnFactory.create('xflow:Source', { value: '' });
            variable.$parent = extensionElement;
            source.$parent = extensionElement;
            extensionElement.variable = variable;
            extensionElement.source = source;
          } else if (config.elementType === 'xflow:Variable') {
            extensionElement = bpmnFactory.create('xflow:Variable', { name: '' });
          } else if (config.elementType === 'xflow:Source') {
            extensionElement = bpmnFactory.create('xflow:Source', { value: '' });
          } else {
            // 默认使用 value 属性
            extensionElement = bpmnFactory.create(config.elementType, { value: "" });
          }
          
          // Set parent for namespace handling
          extensionElement.$parent = businessObject.extensionElements;
          
          // Also set parent for nested elements (already set above)
          
          businessObject.extensionElements.values.push(extensionElement);
        }

        // 从 propertyPath 中提取属性名
        const propertyName = config.propertyPath;
        
        if (propertyName) {
          extensionElement[propertyName] = value;
          console.log(`Set ${propertyName} for ${extensionElement.$type}: ${value}`);
        }

        // 使用 commandStack 支持撤销/重做
        commandStack.execute('element.updateModdleProperties', {
          element: props.element,
          moddleElement: businessObject,
          properties: {
            extensionElements: businessObject.extensionElements,
          }
        });
        console.log("setValue - command executed, extensionElement:", extensionElement);
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
        // 确保 extensionElements 存在
        if (!businessObject.extensionElements) {
          businessObject.extensionElements = bpmnFactory.create(
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
            // 创建扩展元素，根据元素类型设置不同的初始属性
            if (elementType === 'xflow:Input') {
              extensionElement = bpmnFactory.create('xflow:Input', { name: '' });
              
              // Create variable separately to set parent
              const variable = bpmnFactory.create('xflow:Variable', { name: '' });
              variable.$parent = extensionElement;
              extensionElement.variable = variable;
            } else if (elementType === 'xflow:Output') {
              extensionElement = bpmnFactory.create('xflow:Output', { name: '' });
              
              // Create nested elements separately to set parent
              const variable = bpmnFactory.create('xflow:Variable', { name: '' });
              const source = bpmnFactory.create('xflow:Source', { value: '' });
              variable.$parent = extensionElement;
              source.$parent = extensionElement;
              extensionElement.variable = variable;
              extensionElement.source = source;
            } else if (elementType === 'xflow:Variable') {
              extensionElement = bpmnFactory.create('xflow:Variable', { name: '' });
            } else if (elementType === 'xflow:Source') {
              extensionElement = bpmnFactory.create('xflow:Source', { value: '' });
            } else {
              // 默认使用 value 属性
              extensionElement = bpmnFactory.create(elementType, { value: "" });
            }
            
            // Set parent for namespace handling
            extensionElement.$parent = businessObject.extensionElements;
            
            // Also set parent for nested elements (already set above)
            
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
