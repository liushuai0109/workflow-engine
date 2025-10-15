// BPMN 相关类型定义
export interface BpmnElement {
  id: string
  type: string
  businessObject: any
}

export interface BpmnEvent {
  element?: BpmnElement
  error?: Error
  [key: string]: any
}

export interface AutoSaveData {
  xml: string
  timestamp: string
  version: string
}

export interface BpmnModelerInstance {
  importXML: (xml: string) => Promise<void>
  createDiagram: () => Promise<void>
  saveXML: (options?: { format?: boolean }) => Promise<{ xml: string }>
  destroy: () => void
  on: (event: string, callback: (event: BpmnEvent) => void) => void
  get: (service: string) => any
}

// 组件 Props 类型
export interface BpmnModelerProps {
  xml?: string | null
}

// 组件 Emits 类型
export interface BpmnModelerEmits {
  imported: [event: BpmnEvent]
  changed: [event: BpmnEvent]
  error: [error: Error]
}

// 文件操作类型
export interface FileOperation {
  open: () => void
  save: () => Promise<void>
  createNew: () => Promise<void>
}

// 自动保存相关类型
export interface AutoSaveConfig {
  enabled: boolean
  delay: number
  storageKey: string
  timeout?: NodeJS.Timeout
}
