// UserTask 扩展相关的类型定义

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

// 重新导出共享类型
export * from '../shared/types'
