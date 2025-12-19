/**
 * Event and Workflow Execution Types
 *
 * Defines event data structures, workflow execution context,
 * and event tracking for the lifecycle operations platform.
 */

import type { EventType } from './triggers'

/**
 * Device information
 */
export interface DeviceInfo {
  /** Device type */
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown'

  /** Operating system */
  os: string

  /** OS version */
  osVersion?: string

  /** Browser name */
  browser: string

  /** Browser version */
  browserVersion?: string

  /** Screen resolution */
  screenResolution: string

  /** Viewport size */
  viewportSize?: string

  /** User agent string */
  userAgent: string

  /** Device manufacturer */
  manufacturer?: string

  /** Device model */
  model?: string
}

/**
 * Location information
 */
export interface LocationInfo {
  /** Country code (ISO 3166-1 alpha-2) */
  country: string

  /** Country name */
  countryName?: string

  /** City */
  city?: string

  /** Region/state */
  region?: string

  /** Postal code */
  postalCode?: string

  /** Latitude */
  latitude?: number

  /** Longitude */
  longitude?: number

  /** Timezone */
  timezone?: string

  /** IP address */
  ipAddress?: string
}

/**
 * Standard event schema
 *
 * Base structure for all events in the system.
 */
export interface UserEvent {
  /** Unique event identifier */
  eventId: string

  /** User ID who triggered the event */
  userId: string

  /** Session ID */
  sessionId: string

  /** Event type (from EventType enum or custom) */
  eventType: EventType | string

  /** Event timestamp */
  timestamp: Date

  // Optional context
  /** Custom event properties */
  eventProperties?: Record<string, any>

  /** Device information */
  deviceInfo?: DeviceInfo

  /** Location information */
  location?: LocationInfo

  /** Referrer URL */
  referrer?: string

  /** Current page URL */
  pageUrl?: string

  /** Page title */
  pageTitle?: string

  /** Campaign tracking */
  campaign?: {
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
  }

  /** A/B test variants */
  experiments?: Record<string, string>

  /** Custom dimensions */
  customDimensions?: Record<string, string>
}

/**
 * Event batch
 *
 * Collection of events for batch processing.
 */
export interface EventBatch {
  /** Batch identifier */
  batchId: string

  /** Events in this batch */
  events: UserEvent[]

  /** Batch timestamp */
  timestamp: Date

  /** Source of events */
  source: string

  /** Total event count */
  eventCount: number
}

/**
 * Event validation result
 */
export interface EventValidationResult {
  /** Whether event is valid */
  valid: boolean

  /** Validation errors */
  errors: string[]

  /** Validation warnings */
  warnings: string[]

  /** Validated event (with defaults applied) */
  event?: UserEvent
}

/**
 * Workflow execution context
 *
 * Complete state and context for a running workflow instance.
 */
export interface WorkflowExecutionContext {
  /** Unique workflow identifier */
  workflowId: string

  /** Unique instance identifier */
  instanceId: string

  /** User ID */
  userId: string

  /** Current step/element ID */
  currentStep: string

  /** Execution status */
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'timeout'

  /** Start time */
  startTime: Date

  /** End time (when completed/failed/cancelled) */
  endTime?: Date

  /** Execution duration in milliseconds */
  duration?: number

  // Execution data
  /** Workflow variables */
  variables: Record<string, any>

  /** Intermediate results from steps */
  intermediateResults: Record<string, any>

  /** Input data that triggered the workflow */
  inputData?: any

  /** Output data from workflow */
  outputData?: any

  // Progress tracking
  /** Completed steps */
  completedSteps: string[]

  /** Pending steps */
  pendingSteps: string[]

  /** Failed steps */
  failedSteps: string[]

  /** Current step index */
  currentStepIndex: number

  /** Total steps */
  totalSteps: number

  // Error tracking
  /** Execution errors */
  errors: ExecutionError[]

  /** Retry count */
  retryCount: number

  /** Maximum retries allowed */
  maxRetries: number

  /** Last error */
  lastError?: ExecutionError

  // Metadata
  /** Workflow version */
  workflowVersion: string

  /** Trigger source */
  triggerSource: 'manual' | 'scheduled' | 'event' | 'threshold'

  /** Trigger details */
  triggerData?: any

  /** Priority */
  priority: number

  /** Tags */
  tags: string[]

  /** Parent execution (for sub-workflows) */
  parentExecutionId?: string

  /** Child executions */
  childExecutionIds?: string[]
}

/**
 * Execution error
 */
export interface ExecutionError {
  /** Error type/code */
  errorType: string

  /** Error message */
  errorMessage: string

  /** Step that failed */
  failedStep: string

  /** Stack trace */
  stackTrace?: string

  /** Timestamp */
  timestamp: Date

  /** Whether error is recoverable */
  recoverable: boolean

  /** Retry attempt number */
  retryAttempt?: number

  /** Additional error context */
  context?: Record<string, any>
}

/**
 * Workflow execution step
 *
 * Individual step within a workflow execution.
 */
export interface ExecutionStep {
  /** Step identifier */
  stepId: string

  /** Step name */
  stepName: string

  /** Step type */
  stepType: 'task' | 'gateway' | 'event' | 'subprocess'

  /** Step status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

  /** Start time */
  startTime?: Date

  /** End time */
  endTime?: Date

  /** Duration in milliseconds */
  duration?: number

  /** Input data */
  input?: any

  /** Output data */
  output?: any

  /** Error (if failed) */
  error?: ExecutionError

  /** Retry count */
  retryCount: number
}

/**
 * Workflow execution summary
 *
 * High-level overview of workflow execution.
 */
export interface WorkflowExecutionSummary {
  instanceId: string
  workflowId: string
  workflowName: string
  userId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'timeout'
  startTime: Date
  endTime?: Date
  duration?: number
  completedSteps: number
  totalSteps: number
  successRate: number
}

/**
 * Workflow execution history entry
 */
export interface ExecutionHistoryEntry {
  instanceId: string
  workflowId: string
  userId: string
  status: 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime: Date
  duration: number
  triggerSource: string
  errorMessage?: string
}

/**
 * Event stream subscription
 *
 * Configuration for subscribing to event streams.
 */
export interface EventSubscription {
  /** Subscription identifier */
  subscriptionId: string

  /** Subscription name */
  name: string

  /** Event types to subscribe to */
  eventTypes: (EventType | string)[]

  /** Event filters */
  filters?: Record<string, any>

  /** Webhook URL for delivery */
  webhookUrl?: string

  /** Whether subscription is active */
  active: boolean

  /** Delivery method */
  deliveryMethod: 'webhook' | 'queue' | 'stream'

  /** Retry policy */
  retryPolicy?: {
    maxRetries: number
    retryDelay: number // milliseconds
    backoffMultiplier: number
  }

  /** Created at */
  createdAt: Date

  /** Updated at */
  updatedAt: Date
}

/**
 * Event delivery status
 */
export interface EventDelivery {
  /** Delivery identifier */
  deliveryId: string

  /** Event ID */
  eventId: string

  /** Subscription ID */
  subscriptionId: string

  /** Delivery status */
  status: 'pending' | 'delivered' | 'failed' | 'retrying'

  /** Delivery timestamp */
  timestamp: Date

  /** Number of attempts */
  attempts: number

  /** Last attempt time */
  lastAttemptTime?: Date

  /** Next retry time */
  nextRetryTime?: Date

  /** Error message (if failed) */
  errorMessage?: string

  /** Response code (for webhooks) */
  responseCode?: number

  /** Response body */
  responseBody?: string
}

/**
 * Dead letter queue entry
 *
 * Failed events/executions that need manual intervention.
 */
export interface DeadLetterEntry {
  /** Entry identifier */
  entryId: string

  /** Type of failed item */
  type: 'event' | 'execution' | 'delivery'

  /** Item data */
  data: any

  /** Failure reason */
  failureReason: string

  /** Failure timestamp */
  failedAt: Date

  /** Number of retries attempted */
  retriesAttempted: number

  /** Whether entry has been resolved */
  resolved: boolean

  /** Resolution timestamp */
  resolvedAt?: Date

  /** Resolution action taken */
  resolutionAction?: string

  /** Resolved by user */
  resolvedBy?: string
}

/**
 * Event analytics
 *
 * Aggregated event statistics.
 */
export interface EventAnalytics {
  /** Time period */
  period: {
    start: Date
    end: Date
  }

  /** Event type */
  eventType: EventType | string

  /** Total events */
  totalEvents: number

  /** Unique users */
  uniqueUsers: number

  /** Events per user */
  eventsPerUser: number

  /** Event distribution by hour */
  hourlyDistribution: Record<number, number>

  /** Event distribution by day of week */
  dayOfWeekDistribution: Record<string, number>

  /** Top properties */
  topProperties?: Record<string, any>

  /** Growth rate */
  growthRate?: number
}

/**
 * Workflow execution analytics
 */
export interface WorkflowExecutionAnalytics {
  /** Workflow ID */
  workflowId: string

  /** Time period */
  period: {
    start: Date
    end: Date
  }

  /** Total executions */
  totalExecutions: number

  /** Successful executions */
  successfulExecutions: number

  /** Failed executions */
  failedExecutions: number

  /** Success rate */
  successRate: number

  /** Average duration */
  avgDuration: number

  /** Median duration */
  medianDuration: number

  /** P95 duration */
  p95Duration: number

  /** Total users affected */
  totalUsers: number

  /** Executions per user */
  executionsPerUser: number

  /** Common failure reasons */
  failureReasons: Record<string, number>

  /** Performance trend */
  trend: 'improving' | 'degrading' | 'stable'
}

/**
 * Helper function to validate event
 */
export function validateEvent(event: Partial<UserEvent>): EventValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!event.eventId) errors.push('eventId is required')
  if (!event.userId) errors.push('userId is required')
  if (!event.sessionId) errors.push('sessionId is required')
  if (!event.eventType) errors.push('eventType is required')
  if (!event.timestamp) errors.push('timestamp is required')

  // Warnings
  if (!event.deviceInfo) warnings.push('deviceInfo is recommended')
  if (!event.location) warnings.push('location is recommended')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    event: errors.length === 0 ? (event as UserEvent) : undefined
  }
}

/**
 * Helper function to create execution context
 */
export function createExecutionContext(
  workflowId: string,
  userId: string,
  triggerSource: 'manual' | 'scheduled' | 'event' | 'threshold'
): WorkflowExecutionContext {
  return {
    workflowId,
    instanceId: generateInstanceId(),
    userId,
    currentStep: '',
    status: 'pending',
    startTime: new Date(),
    variables: {},
    intermediateResults: {},
    completedSteps: [],
    pendingSteps: [],
    failedSteps: [],
    currentStepIndex: 0,
    totalSteps: 0,
    errors: [],
    retryCount: 0,
    maxRetries: 3,
    workflowVersion: '1.0.0',
    triggerSource,
    priority: 0,
    tags: []
  }
}

/**
 * Helper function to generate instance ID
 */
function generateInstanceId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Helper function to calculate execution success rate
 */
export function calculateSuccessRate(
  successful: number,
  total: number
): number {
  if (total === 0) return 0
  return Math.round((successful / total) * 100 * 100) / 100
}

/**
 * Helper function to check if execution is terminal state
 */
export function isTerminalState(
  status: WorkflowExecutionContext['status']
): boolean {
  return ['completed', 'failed', 'cancelled', 'timeout'].includes(status)
}
