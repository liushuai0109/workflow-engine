// XFlow BPMN 扩展模块的主入口文件

// XFlow 统一扩展（推荐使用）
export * from './xflow'

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
