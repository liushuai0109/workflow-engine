// BPMN 扩展相关类型定义

export interface CustomField {
  name: string
  value: string
  type: 'text' | 'number' | 'date' | 'boolean'
}

export interface UserTaskExtension {
  priority?: 'high' | 'medium' | 'low'
  approvalLevel?: number
  assignee?: string
  dueDate?: string
  customFields?: CustomField[]
}

export interface BpmnElement {
  id: string
  type: string
  businessObject: any
  width?: number
  height?: number
  x?: number
  y?: number
}

export interface BpmnRenderer {
  drawShape(parentNode: SVGElement, element: BpmnElement): SVGElement
}

export interface TextRenderer {
  // Text renderer interface
}

export interface EventBus {
  fire(event: string, data?: any): void
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

export interface ElementFactory {
  createShape(descriptor: any): any
}

export interface Injector {
  get(name: string): any
}

export interface Canvas {
  addShape(element: any, position: { x: number; y: number }): any
  viewbox(): any
  viewbox(viewbox: any): void
}

export interface Modeling {
  connect(source: any, target: any, connection: any): void
  updateProperties(element: any, properties: any): void
}

export interface ElementRegistry {
  get(id: string): any
}

export interface Translate {
  (key: string): string
}

export interface PropertiesPanel {
  registerProvider(provider: any): void
}

export interface ModdleExtension {
  name: string
  uri: string
  prefix: string
  xml: {
    tagAlias: string
  }
  types: Array<{
    name: string
    extends?: string[]
    properties: Array<{
      name: string
      type: string
      isMany?: boolean
      isAttr?: boolean
    }>
  }>
}

// 添加 $inject 属性类型
export interface Injectable {
  $inject?: string[]
}

// 声明全局类型扩展
declare global {
  interface Function {
    $inject?: string[]
  }
}

export interface PropertiesPanelEntry {
  id: string
  element: BpmnElement
  component: any
  isEdited: (element: BpmnElement) => boolean
}

export interface PropertiesPanelGroup {
  id: string
  label: string
  component?: any
  entries?: PropertiesPanelEntry[]
}

export interface BpmnRenderer {
  drawShape(parentNode: SVGElement, element: BpmnElement): SVGElement
}

export interface TextRenderer {
  // Text renderer interface
}

export interface EventBus {
  fire(event: string, data?: any): void
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

export interface ElementFactory {
  createShape(descriptor: any): any
}

export interface Injector {
  get(name: string): any
}

export interface Canvas {
  addShape(element: any, position: { x: number; y: number }): any
  viewbox(): any
  viewbox(viewbox: any): void
}

export interface Modeling {
  connect(source: any, target: any, connection: any): void
  updateProperties(element: any, properties: any): void
}

export interface ElementRegistry {
  get(id: string): any
}

export interface Translate {
  (key: string): string
}

export interface PropertiesPanel {
  registerProvider(provider: any): void
}

export interface ModdleExtension {
  name: string
  uri: string
  prefix: string
  xml: {
    tagAlias: string
  }
  types: Array<{
    name: string
    extends?: string[]
    properties: Array<{
      name: string
      type: string
      isMany?: boolean
      isAttr?: boolean
    }>
  }>
}
