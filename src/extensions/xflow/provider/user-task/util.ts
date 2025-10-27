import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import type { BpmnElement, Injector } from '../../../shared/types';

// 生成唯一ID
export function nextId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}_${random}`;
}

// 创建元素
export function createElement(
  elementType: string,
  properties: any,
  parent: any,
  factory: any
): any {
  const element = factory.create(elementType, properties);
  
  if (parent) {
    element.$parent = parent;
  }
  
  return element;
}

// 获取扩展元素
export function getExtension(element: any, type: string): any {
  if (!element.extensionElements) {
    return null;
  }
  
  // 检查 extensionElements 是否有 values 属性
  if (!element.extensionElements.values) {
    return null;
  }
  
  return element.extensionElements.values.find((e: any) => e.$instanceOf(type));
}

// 获取 InputOutput 扩展
export function getInputOutputExtension(element: BpmnElement): any {
  const businessObject = getBusinessObject(element);
  return getExtension(businessObject, 'xflow:inputOutput');
}

// 获取 Inputs
export function getInputs(element: BpmnElement): any[] {
  const inputOutput = getInputOutputExtension(element);
  return inputOutput ? inputOutput.input || [] : [];
}

// 获取 Outputs
export function getOutputs(element: BpmnElement): any[] {
  const inputOutput = getInputOutputExtension(element);
  return inputOutput ? inputOutput.output || [] : [];
}

// 创建 InputOutput 扩展
export function createInputOutput(
  properties: any,
  parent: any,
  bpmnFactory: any
): any {
  return createElement('xflow:inputOutput', properties, parent, bpmnFactory);
}
