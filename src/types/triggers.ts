/**
 * Workflow Trigger Types
 *
 * Defines types for workflow execution triggers including time-based,
 * event-based, threshold-based, and manual triggers.
 */

import type { ConditionOperator } from './segments'

/**
 * Trigger types for workflow execution
 */
export enum TriggerType {
  /** Scheduled/time-based trigger (cron, interval, delay) */
  Scheduled = 'scheduled',

  /** Event-based trigger (user actions, system events) */
  Event = 'event',

  /** Threshold/data-based trigger (metrics, scores, counts) */
  Threshold = 'threshold',

  /** Manual trigger (operator-initiated) */
  Manual = 'manual'
}

/**
 * Standard event types for event-based triggers
 */
export enum EventType {
  // User lifecycle events
  UserSignup = 'user.signup',
  UserLogin = 'user.login',
  UserLogout = 'user.logout',
  ProfileUpdate = 'user.profile_update',
  AccountCreated = 'user.account_created',
  AccountDeleted = 'user.account_deleted',

  // Engagement events
  PageView = 'engagement.page_view',
  FeatureClick = 'engagement.feature_click',
  ContentView = 'engagement.content_view',
  SearchPerformed = 'engagement.search',
  ShareAction = 'engagement.share',
  SessionStart = 'engagement.session_start',
  SessionEnd = 'engagement.session_end',

  // Transaction events
  PurchaseComplete = 'transaction.purchase_complete',
  PurchaseRefunded = 'transaction.refund',
  CartAdd = 'transaction.cart_add',
  CartRemove = 'transaction.cart_remove',
  CheckoutStart = 'transaction.checkout_start',
  PaymentFailed = 'transaction.payment_failed',
  SubscriptionStarted = 'transaction.subscription_started',
  SubscriptionCancelled = 'transaction.subscription_cancelled',

  // Milestone events
  MilestoneReached = 'milestone.reached',
  LevelUp = 'milestone.level_up',
  AchievementUnlocked = 'milestone.achievement',
  GoalCompleted = 'milestone.goal_completed',

  // Communication events
  EmailOpened = 'communication.email_opened',
  EmailClicked = 'communication.email_clicked',
  PushNotificationClicked = 'communication.push_clicked',
  SMSReceived = 'communication.sms_received',

  // Custom event
  Custom = 'custom'
}

/**
 * Schedule type for time-based triggers
 */
export enum ScheduleType {
  /** Cron expression (e.g., "0 9 * * *") */
  Cron = 'cron',

  /** Fixed interval (e.g., every N milliseconds) */
  Interval = 'interval',

  /** Delay after an event (e.g., N milliseconds after signup) */
  Delay = 'delay',

  /** Time window (between start and end times) */
  TimeWindow = 'time_window'
}

/**
 * Schedule configuration for time-based triggers
 */
export interface Schedule {
  /** Schedule type */
  type: ScheduleType

  /** Cron expression (for type='cron') */
  expression?: string

  /** Interval in milliseconds (for type='interval') */
  interval?: number

  /** Delay in milliseconds (for type='delay') */
  delay?: number

  /** Start time ISO 8601 (for type='time_window') */
  startTime?: string

  /** End time ISO 8601 (for type='time_window') */
  endTime?: string

  /** Timezone (e.g., 'UTC', 'America/New_York', 'user' for user's timezone) */
  timezone?: string

  /** Whether schedule is currently active */
  enabled?: boolean

  /** Optional schedule description */
  description?: string
}

/**
 * Trigger condition for evaluation
 */
export interface TriggerCondition {
  /** Field to evaluate */
  field: string

  /** Comparison operator */
  operator: ConditionOperator

  /** Value to compare against */
  value: any

  /** Optional field type for validation */
  fieldType?: 'string' | 'number' | 'boolean' | 'date'
}

/**
 * Event filter for event-based triggers
 */
export interface EventFilter {
  /** Property name in event data */
  property: string

  /** Comparison operator */
  operator: ConditionOperator

  /** Value to match */
  value: any

  /** Optional description */
  description?: string
}

/**
 * Workflow trigger definition
 */
export interface Trigger {
  /** Unique trigger identifier */
  id: string

  /** Trigger name */
  name: string

  /** Trigger type */
  type: TriggerType

  /** Optional description */
  description?: string

  // Event-based configuration
  /** Event type (for type='event') */
  event?: EventType | string

  /** Event filters (for type='event') */
  eventFilters?: EventFilter[]

  // Schedule-based configuration
  /** Schedule configuration (for type='scheduled') */
  schedule?: Schedule

  // Threshold-based configuration
  /** Threshold conditions (for type='threshold') */
  thresholds?: TriggerCondition[]

  /** Threshold check frequency in milliseconds (for type='threshold') */
  checkInterval?: number

  // General configuration
  /** Whether trigger is enabled */
  enabled: boolean

  /** Maximum number of executions (0 = unlimited) */
  maxExecutions?: number

  /** Current execution count */
  executionCount?: number

  /** Priority (higher = more important) */
  priority?: number

  /** Tags for categorization */
  tags?: string[]

  // Metadata
  /** Creation timestamp */
  createdAt?: Date

  /** Last update timestamp */
  updatedAt?: Date

  /** Created by user */
  createdBy?: string
}

/**
 * Trigger template for quick setup
 */
export interface TriggerTemplate {
  /** Unique template identifier */
  id: string

  /** Template name */
  name: string

  /** Detailed description */
  description: string

  /** Trigger type */
  type: TriggerType

  /** Icon or emoji */
  icon: string

  /** Category for grouping */
  category: string

  /** Example event (for type='event') */
  event?: EventType | string

  /** Example filters (for type='event') */
  exampleFilters?: EventFilter[]

  /** Example schedule (for type='scheduled') */
  exampleSchedule?: Schedule

  /** Example thresholds (for type='threshold') */
  exampleThresholds?: TriggerCondition[]

  /** Tags */
  tags?: string[]

  /** Display order */
  order?: number
}

/**
 * Trigger execution record
 */
export interface TriggerExecution {
  /** Execution ID */
  executionId: string

  /** Trigger ID */
  triggerId: string

  /** Workflow instance ID */
  workflowInstanceId: string

  /** When triggered */
  triggeredAt: Date

  /** What caused the trigger */
  triggerSource: 'scheduled' | 'event' | 'threshold' | 'manual'

  /** Event data (if applicable) */
  eventData?: any

  /** Threshold values (if applicable) */
  thresholdValues?: Record<string, any>

  /** Execution status */
  status: 'pending' | 'success' | 'failed' | 'skipped'

  /** Error message if failed */
  error?: string

  /** Execution duration in milliseconds */
  duration?: number
}

/**
 * Trigger statistics
 */
export interface TriggerStats {
  /** Trigger ID */
  triggerId: string

  /** Total executions */
  totalExecutions: number

  /** Successful executions */
  successfulExecutions: number

  /** Failed executions */
  failedExecutions: number

  /** Average execution time in milliseconds */
  avgExecutionTime: number

  /** Last execution timestamp */
  lastExecutedAt?: Date

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Cron schedule presets
 */
export const CRON_PRESETS = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_9AM: '0 9 * * *',
  EVERY_DAY_NOON: '0 12 * * *',
  EVERY_DAY_6PM: '0 18 * * *',
  EVERY_MONDAY_9AM: '0 9 * * 1',
  EVERY_WEEK_SUNDAY: '0 0 * * 0',
  FIRST_OF_MONTH: '0 0 1 * *'
} as const

/**
 * Helper function to validate cron expression
 *
 * Basic validation - full cron validation should use a library
 */
export function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(' ')
  return parts.length === 5 || parts.length === 6
}

/**
 * Helper function to validate schedule
 */
export function validateSchedule(schedule: Schedule): { valid: boolean; error?: string } {
  switch (schedule.type) {
    case ScheduleType.Cron:
      if (!schedule.expression) {
        return { valid: false, error: 'Cron expression is required' }
      }
      if (!isValidCronExpression(schedule.expression)) {
        return { valid: false, error: 'Invalid cron expression format' }
      }
      break

    case ScheduleType.Interval:
      if (!schedule.interval || schedule.interval <= 0) {
        return { valid: false, error: 'Interval must be greater than 0' }
      }
      break

    case ScheduleType.Delay:
      if (schedule.delay === undefined || schedule.delay < 0) {
        return { valid: false, error: 'Delay must be 0 or greater' }
      }
      break

    case ScheduleType.TimeWindow:
      if (!schedule.startTime || !schedule.endTime) {
        return { valid: false, error: 'Start and end times are required for time window' }
      }
      break
  }

  return { valid: true }
}

/**
 * Helper function to validate trigger
 */
export function validateTrigger(trigger: Trigger): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!trigger.name || trigger.name.trim().length === 0) {
    errors.push('Trigger name is required')
  }

  switch (trigger.type) {
    case TriggerType.Event:
      if (!trigger.event) {
        errors.push('Event type is required for event-based triggers')
      }
      break

    case TriggerType.Scheduled:
      if (!trigger.schedule) {
        errors.push('Schedule is required for scheduled triggers')
      } else {
        const scheduleValidation = validateSchedule(trigger.schedule)
        if (!scheduleValidation.valid) {
          errors.push(scheduleValidation.error!)
        }
      }
      break

    case TriggerType.Threshold:
      if (!trigger.thresholds || trigger.thresholds.length === 0) {
        errors.push('At least one threshold condition is required')
      }
      break
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Helper function to format schedule as human-readable text
 */
export function formatSchedule(schedule: Schedule): string {
  switch (schedule.type) {
    case ScheduleType.Cron:
      // Map common cron expressions to readable text
      const preset = Object.entries(CRON_PRESETS).find(([, expr]) => expr === schedule.expression)
      if (preset) {
        return preset[0].replace(/_/g, ' ').toLowerCase()
      }
      return `Cron: ${schedule.expression}`

    case ScheduleType.Interval:
      const hours = Math.floor(schedule.interval! / (1000 * 60 * 60))
      const minutes = Math.floor((schedule.interval! % (1000 * 60 * 60)) / (1000 * 60))
      if (hours > 0) {
        return `Every ${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`
      }
      return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`

    case ScheduleType.Delay:
      const delayHours = Math.floor(schedule.delay! / (1000 * 60 * 60))
      const delayMinutes = Math.floor((schedule.delay! % (1000 * 60 * 60)) / (1000 * 60))
      if (delayHours > 0) {
        return `${delayHours} hour${delayHours > 1 ? 's' : ''} after event`
      }
      return `${delayMinutes} minute${delayMinutes > 1 ? 's' : ''} after event`

    case ScheduleType.TimeWindow:
      return `Between ${schedule.startTime} and ${schedule.endTime}`

    default:
      return 'Unknown schedule type'
  }
}
