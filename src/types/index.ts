// BPMN 相关类型定义
export interface BpmnOptions {
  propertiesPanel?: {
    parent?: string
    create?: any
  }
  additionalModules?: any[]
  moddleExtensions?: any[]
  keyboard?: {
    bindTo?: Document | HTMLElement
  }
}

export interface BpmnModelerInstance {
  importXML: (xml: string) => Promise<any>
  saveXML: (options?: any) => Promise<{ xml: string }>
  saveSVG: (options?: any) => Promise<{ svg: string }>
  get: (name: string) => any
  on: (event: string, callback: Function) => void
  off: (event: string, callback: Function) => void
  destroy: () => void
}

export interface BpmnEvent {
  element?: any
  originalEvent?: Event
  type?: string
}

export interface FileOperationResult {
  success: boolean
  message?: string
  data?: any
}

export interface AutoSaveData {
  xml: string
  timestamp: number
  filename?: string
}

// Context Pad 自定义按钮类型
export interface ContextPadButton {
  group: string
  className: string
  title: string
  action: {
    click: (event: any, element: any) => void
  }
  html?: string
}

// Properties Panel 相关类型
export interface PropertiesPanelConfig {
  parent: string
  create: any
}

// 文件验证结果
export interface FileValidationResult {
  isValid: boolean
  error?: string
  size?: number
  type?: string
}

// ============================================================================
// Lifecycle Operations Types
// ============================================================================

// Lifecycle management types
export * from './lifecycle'

// User segmentation types
export * from './segments'

// Workflow trigger types
export * from './triggers'

// Success metrics types
export * from './metrics'

// User profile types
export * from './userProfile'

// Event and execution types
export * from './events'
