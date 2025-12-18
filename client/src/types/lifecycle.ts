/**
 * Lifecycle Types
 *
 * AARRR Lifecycle Stages (Pirate Metrics) for user journey management.
 * This module defines the core lifecycle stages and metadata structures.
 */

/**
 * AARRR Lifecycle Stages (Pirate Metrics)
 *
 * The AARRR framework provides a systematic approach to user lifecycle management:
 * - Acquisition: Getting users to the platform
 * - Activation: Delivering first-time value
 * - Retention: Keeping users engaged
 * - Revenue: Monetizing the user base
 * - Referral: Encouraging viral growth
 */
export enum LifecycleStage {
  /** User Acquisition - Getting users to the platform through various channels */
  Acquisition = 'Acquisition',

  /** User Activation - First-time user experience and value delivery */
  Activation = 'Activation',

  /** User Retention - Ongoing engagement and habit formation */
  Retention = 'Retention',

  /** Revenue Generation - Converting users into paying customers */
  Revenue = 'Revenue',

  /** Referral & Viral Growth - User advocacy and viral expansion */
  Referral = 'Referral'
}

/**
 * Lifecycle stage configuration for UI display
 *
 * Used to configure how lifecycle stages appear in the editor interface.
 */
export interface LifecycleStageConfig {
  /** The lifecycle stage */
  stage: LifecycleStage

  /** Display label for the stage */
  label: string

  /** Detailed description of the stage */
  description: string

  /** Color hex code for visual representation */
  color: string

  /** Icon or emoji representing the stage */
  icon: string

  /** Display order (1-5 for AARRR) */
  order: number

  /** Example use cases for this stage */
  examples?: string[]

  /** Key metrics typically tracked at this stage */
  metrics?: string[]
}

/**
 * Lifecycle metadata attached to workflow elements
 *
 * This metadata is stored in the BPMN XML within xflow:extensionElements.
 */
export interface LifecycleMetadata {
  /** The assigned lifecycle stage */
  stage: LifecycleStage

  /** Optional custom color (overrides default stage color) */
  color?: string

  /** Optional custom icon (overrides default stage icon) */
  icon?: string

  /** Optional description for this specific assignment */
  description?: string

  /** Format version for future compatibility */
  version: string
}

/**
 * Lifecycle stage transition definition
 *
 * Defines rules for transitioning users between lifecycle stages.
 */
export interface LifecycleTransition {
  /** Source stage */
  fromStage: LifecycleStage

  /** Target stage */
  toStage: LifecycleStage

  /** Conditions that trigger this transition */
  conditions: TransitionCondition[]

  /** Whether this is an automatic or manual transition */
  automatic: boolean

  /** Optional transition delay in milliseconds */
  delay?: number
}

/**
 * Condition for lifecycle stage transition
 */
export interface TransitionCondition {
  /** Field to evaluate */
  field: string

  /** Comparison operator */
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'gte' | 'lte'

  /** Value to compare against */
  value: string | number | boolean
}

/**
 * Lifecycle stage statistics
 *
 * Aggregated metrics for a lifecycle stage across all users.
 */
export interface LifecycleStageStats {
  /** The lifecycle stage */
  stage: LifecycleStage

  /** Number of users currently in this stage */
  userCount: number

  /** Percentage of total users in this stage */
  percentage: number

  /** Average time spent in this stage (days) */
  avgDuration: number

  /** Conversion rate to next stage */
  conversionRate?: number

  /** Timestamp of last update */
  lastUpdated: Date
}

/**
 * User lifecycle history entry
 *
 * Tracks a user's progression through lifecycle stages.
 */
export interface LifecycleHistoryEntry {
  /** User ID */
  userId: string

  /** Previous stage */
  fromStage: LifecycleStage | null

  /** New stage */
  toStage: LifecycleStage

  /** Timestamp of transition */
  timestamp: Date

  /** Reason for transition */
  reason: 'automatic' | 'manual' | 'workflow'

  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Lifecycle configuration
 *
 * Global configuration for lifecycle management.
 */
export interface LifecycleConfig {
  /** Version of the lifecycle configuration */
  version: string

  /** Stage configurations */
  stages: LifecycleStageConfig[]

  /** Transition rules */
  transitions: LifecycleTransition[]

  /** Whether to enable automatic stage transitions */
  autoTransitionsEnabled: boolean

  /** Default stage for new users */
  defaultStage: LifecycleStage
}

/**
 * Default lifecycle stage configurations
 */
export const DEFAULT_LIFECYCLE_STAGES: LifecycleStageConfig[] = [
  {
    stage: LifecycleStage.Acquisition,
    label: 'Acquisition',
    description: 'Attracting and acquiring new users through various channels',
    color: '#2196F3',
    icon: '🎯',
    order: 1,
    examples: ['Landing page visits', 'Signup campaigns', 'Referral tracking'],
    metrics: ['visitor_count', 'signup_rate', 'cost_per_acquisition']
  },
  {
    stage: LifecycleStage.Activation,
    label: 'Activation',
    description: 'Delivering first-time user experience and demonstrating value',
    color: '#4CAF50',
    icon: '✨',
    order: 2,
    examples: ['Onboarding tutorials', 'First transaction', 'Profile setup'],
    metrics: ['onboarding_completion_rate', 'time_to_first_value', 'activation_rate']
  },
  {
    stage: LifecycleStage.Retention,
    label: 'Retention',
    description: 'Keeping users engaged and building habits',
    color: '#FFC107',
    icon: '🔄',
    order: 3,
    examples: ['Re-engagement emails', 'Push notifications', 'Habit formation'],
    metrics: ['daily_active_users', 'churn_rate', 'engagement_score']
  },
  {
    stage: LifecycleStage.Revenue,
    label: 'Revenue',
    description: 'Converting users into paying customers',
    color: '#9C27B0',
    icon: '💰',
    order: 4,
    examples: ['Upsell campaigns', 'Premium upgrades', 'Purchase reminders'],
    metrics: ['conversion_rate', 'customer_lifetime_value', 'revenue_per_user']
  },
  {
    stage: LifecycleStage.Referral,
    label: 'Referral',
    description: 'Encouraging users to refer others and become advocates',
    color: '#FF5722',
    icon: '🚀',
    order: 5,
    examples: ['Referral program', 'Social sharing', 'Ambassador programs'],
    metrics: ['referral_rate', 'viral_coefficient', 'shares_per_user']
  }
]

/**
 * Helper function to get stage configuration by stage
 */
export function getStageConfig(stage: LifecycleStage): LifecycleStageConfig | undefined {
  return DEFAULT_LIFECYCLE_STAGES.find(config => config.stage === stage)
}

/**
 * Helper function to get stage color
 */
export function getStageColor(stage: LifecycleStage): string {
  const config = getStageConfig(stage)
  return config?.color || '#757575'
}

/**
 * Helper function to get stage icon
 */
export function getStageIcon(stage: LifecycleStage): string {
  const config = getStageConfig(stage)
  return config?.icon || '📊'
}

/**
 * Helper function to validate lifecycle metadata version
 */
export function isCompatibleVersion(version: string): boolean {
  const [major] = version.split('.').map(Number)
  return major === 1 // Currently only v1.x.x is supported
}
