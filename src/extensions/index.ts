// BPMN 扩展模块的主入口文件

// UserTask 扩展
export * from './usertask'

// 共享类型（排除与 usertask 重复的类型）
export type { 
  BpmnElement,
  BpmnRenderer,
  TextRenderer,
  EventBus,
  ElementFactory,
  Injector,
  Canvas,
  Modeling,
  ElementRegistry,
  Translate,
  PropertiesPanel,
  ModdleExtension,
  Injectable,
  PropertiesPanelEntry,
  PropertiesPanelGroup
} from './shared/types'
