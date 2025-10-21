import type { Injectable } from '../shared/types'

// 基础类型
export interface CustomField {
  name: string
  value: string
  type: string
  required?: boolean
}

export interface XFlowModule {
  value?: string
}

export interface XFlowMethod {
  value?: string
}

// UserTask 扩展
export interface UserTaskExtension extends Injectable {
  priority?: string
  approvalLevel?: number
  assignee?: string
  dueDate?: string
  customFields?: CustomField[]
}

// ServiceTask 扩展
export interface ServiceTaskExtension extends Injectable {
  extensionElements?: {
    module?: XFlowModule
    method?: XFlowMethod
  }
}

// ScriptTask 扩展
export interface ScriptTaskExtension extends Injectable {
  scriptType?: string
  scriptEngine?: string
  timeout?: number
  retryCount?: number
}

// BusinessRuleTask 扩展
export interface BusinessRuleTaskExtension extends Injectable {
  ruleSet?: string
  ruleEngine?: string
  decisionTable?: string
}

// ManualTask 扩展
export interface ManualTaskExtension extends Injectable {
  instructions?: string
  estimatedDuration?: string
  requiredSkills?: string
}

// ReceiveTask 扩展
export interface ReceiveTaskExtension extends Injectable {
  messageType?: string
  correlationKey?: string
  timeout?: string
}

// SendTask 扩展
export interface SendTaskExtension extends Injectable {
  messageType?: string
  targetEndpoint?: string
  retryPolicy?: string
}

// 统一的 XFlow 扩展类型
export type XFlowExtension = 
  | UserTaskExtension
  | ServiceTaskExtension
  | ScriptTaskExtension
  | BusinessRuleTaskExtension
  | ManualTaskExtension
  | ReceiveTaskExtension
  | SendTaskExtension

// 任务类型枚举
export enum TaskType {
  USER_TASK = 'bpmn:UserTask',
  SERVICE_TASK = 'bpmn:ServiceTask',
  SCRIPT_TASK = 'bpmn:ScriptTask',
  BUSINESS_RULE_TASK = 'bpmn:BusinessRuleTask',
  MANUAL_TASK = 'bpmn:ManualTask',
  RECEIVE_TASK = 'bpmn:ReceiveTask',
  SEND_TASK = 'bpmn:SendTask'
}

// 扩展类型映射
export const EXTENSION_TYPE_MAP = {
  [TaskType.USER_TASK]: 'UserTaskExtension',
  [TaskType.SERVICE_TASK]: 'ServiceTaskExtension',
  [TaskType.SCRIPT_TASK]: 'ScriptTaskExtension',
  [TaskType.BUSINESS_RULE_TASK]: 'BusinessRuleTaskExtension',
  [TaskType.MANUAL_TASK]: 'ManualTaskExtension',
  [TaskType.RECEIVE_TASK]: 'ReceiveTaskExtension',
  [TaskType.SEND_TASK]: 'SendTaskExtension'
} as const
