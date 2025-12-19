/**
 * Core Type Definitions for Lifecycle Operations Backend
 */

// Lifecycle Stages (AARRR Model)
export enum LifecycleStage {
  Acquisition = 'Acquisition',
  Activation = 'Activation',
  Retention = 'Retention',
  Revenue = 'Revenue',
  Referral = 'Referral'
}

// User Profile
export interface UserProfile {
  id: string
  email: string
  currentLifecycleStage: LifecycleStage
  attributes: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Lifecycle Transition
export interface LifecycleTransition {
  id: string
  userId: string
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  transitionedAt: Date
  workflowExecutionId?: string
  metadata: Record<string, any>
}

// User Segment
export interface UserSegment {
  id: string
  name: string
  description?: string
  conditions: SegmentConditionGroup
  lifecycleStages: LifecycleStage[]
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
  lifecycleStages: LifecycleStage[]
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

// Lifecycle Event
export interface LifecycleEvent {
  id: string
  eventType: string
  userId?: string
  workflowExecutionId?: string
  lifecycleStage?: LifecycleStage
  eventData: Record<string, any>
  createdAt: Date
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

// Metrics
export interface DailyMetric {
  id: string
  metricDate: Date
  lifecycleStage: LifecycleStage
  metricName: string
  metricValue: number
  dimensions: Record<string, any>
}

export interface FunnelMetrics {
  stages: StageMetric[]
  period: DateRange
}

export interface StageMetric {
  stage: LifecycleStage
  userCount: number
  conversionRate: number
  averageTimeInStage: number
}

export interface DateRange {
  startDate: Date
  endDate: Date
}
