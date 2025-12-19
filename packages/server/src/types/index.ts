/**
 * Core Type Definitions for Backend
 */

// User Profile
export interface UserProfile {
  id: string
  email: string
  attributes: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// User Segment
export interface UserSegment {
  id: string
  name: string
  description?: string
  conditions: SegmentConditionGroup
  createdAt: Date
  updatedAt: Date
}

export interface SegmentConditionGroup {
  operator: 'AND' | 'OR'
  conditions: SegmentCondition[]
  groups?: SegmentConditionGroup[]
}

export interface SegmentCondition {
  field: string
  operator: ComparisonOperator
  value: any
}

export enum ComparisonOperator {
  Equals = 'eq',
  NotEquals = 'ne',
  GreaterThan = 'gt',
  GreaterThanOrEqual = 'gte',
  LessThan = 'lt',
  LessThanOrEqual = 'lte',
  In = 'in',
  NotIn = 'nin',
  Contains = 'contains',
  StartsWith = 'startsWith',
  EndsWith = 'endsWith'
}

// Triggers
export interface Trigger {
  id: string
  name: string
  eventType: string
  conditions: TriggerConditionGroup
  workflowId?: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TriggerConditionGroup {
  operator: 'AND' | 'OR'
  conditions: TriggerCondition[]
}

export interface TriggerCondition {
  field: string
  operator: ComparisonOperator
  value: any
}

// Workflow
export interface Workflow {
  id: string
  name: string
  description?: string
  bpmnXml: string
  version: string
  status: WorkflowStatus
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export enum WorkflowStatus {
  Draft = 'draft',
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived'
}

// Workflow Execution
export interface WorkflowExecution {
  id: string
  workflowId: string
  userId: string
  status: ExecutionStatus
  variables: Record<string, any>
  currentNodeId?: string
  startedAt: Date
  completedAt?: Date
  errorMessage?: string
}

export enum ExecutionStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: ResponseMetadata
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface ResponseMetadata {
  page?: number
  pageSize?: number
  total?: number
  hasMore?: boolean
}

// Pagination
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Date Range
export interface DateRange {
  startDate: Date
  endDate: Date
}
