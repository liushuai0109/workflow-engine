// XFlow 扩展模块的入口文件

export { default as XFlowRenderer } from './XFlowRenderer'
export { default as XFlowPropertiesProvider } from './XFlowPropertiesProvider'
export { default as XFlowExtensionModule } from './XFlowExtensionModule'
export { default as xflowExtension } from './xflowExtension.json'

// 导出类型
export type { 
  CustomField,
  XFlowCallee,
  UserTaskExtension,
  ServiceTaskExtension,
  ScriptTaskExtension,
  BusinessRuleTaskExtension,
  ManualTaskExtension,
  ReceiveTaskExtension,
  SendTaskExtension,
  XFlowExtension,
  TaskType,
  EXTENSION_TYPE_MAP
} from './types'
