/**
 * Workflow Metrics Types
 *
 * Defines types for workflow metadata, success metrics, and KPIs.
 */

/**
 * Workflow purpose categories
 */
export enum WorkflowPurpose {
  /** New user onboarding */
  Onboarding = 'Onboarding',

  /** User engagement and retention */
  Engagement = 'Engagement',

  /** Conversion optimization */
  Conversion = 'Conversion',

  /** Long-term retention */
  Retention = 'Retention',

  /** Win-back inactive users */
  Winback = 'Winback',

  /** Cross-sell and upsell */
  Monetization = 'Monetization',

  /** Referral and advocacy */
  Referral = 'Referral'
}

/**
 * Standard metric names
 */
export enum MetricName {
  // Conversion metrics
  ConversionRate = 'conversion_rate',
  SignupConversionRate = 'signup_conversion_rate',
  PurchaseConversionRate = 'purchase_conversion_rate',

  // Engagement metrics
  EngagementRate = 'engagement_rate',
  ActiveUserRate = 'active_user_rate',
  SessionFrequency = 'session_frequency',
  AvgSessionDuration = 'avg_session_duration',

  // Completion metrics
  CompletionRate = 'completion_rate',
  OnboardingCompletionRate = 'onboarding_completion_rate',
  TaskCompletionRate = 'task_completion_rate',

  // Revenue metrics
  RevenueGenerated = 'revenue_generated',
  AvgOrderValue = 'avg_order_value',
  CustomerLifetimeValue = 'customer_lifetime_value',
  RevenuePerUser = 'revenue_per_user',

  // Activation metrics
  UserActivationCount = 'user_activation_count',
  TimeToActivation = 'time_to_activation',
  ActivationRate = 'activation_rate',

  // Retention metrics
  ChurnRate = 'churn_rate',
  RetentionRate = 'retention_rate',
  DailyActiveUsers = 'daily_active_users',
  WeeklyActiveUsers = 'weekly_active_users',
  MonthlyActiveUsers = 'monthly_active_users',

  // Performance metrics
  TimeToConversion = 'time_to_conversion',
  TimeToFirstValue = 'time_to_first_value',
  AvgResponseTime = 'avg_response_time',

  // Interaction metrics
  ClickThroughRate = 'click_through_rate',
  OpenRate = 'open_rate',
  ResponseRate = 'response_rate',

  // Referral metrics
  ReferralRate = 'referral_rate',
  ViralCoefficient = 'viral_coefficient',
  SharesPerUser = 'shares_per_user',

  // Reactivation metrics
  ReactivationRate = 'reactivation_rate'
}

/**
 * Metric unit types
 */
export enum MetricUnit {
  Percentage = '%',
  Count = 'count',
  Currency = '$',
  Seconds = 'seconds',
  Minutes = 'minutes',
  Hours = 'hours',
  Days = 'days',
  Ratio = 'ratio'
}

/**
 * Metric definition with target value
 */
export interface WorkflowMetric {
  /** Metric identifier (use MetricName enum or custom string) */
  name: MetricName | string

  /** Human-readable display name */
  displayName: string

  /** Target value to achieve */
  target?: number

  /** Actual measured value */
  actual?: number

  /** Unit of measurement */
  unit?: MetricUnit | string

  /** Detailed description */
  description?: string

  /** Calculation formula (for documentation) */
  formula?: string

  /** Whether higher is better (vs lower is better) */
  higherIsBetter?: boolean

  /** Data source for this metric */
  source?: string

  /** Last updated timestamp */
  lastUpdated?: Date
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  /** Unique workflow identifier */
  id: string

  /** Workflow name */
  name: string

  /** Detailed description */
  description?: string

  /** Primary purpose/category */
  purpose: WorkflowPurpose

  /** Owner/responsible person */
  owner?: string

  /** Categorization tags */
  tags: string[]

  /** Success metrics and KPIs */
  metrics: WorkflowMetric[]

  // Versioning
  /** Semantic version (major.minor.patch) */
  version: string

  /** Creation timestamp */
  createdAt: Date

  /** Last update timestamp */
  updatedAt: Date

  /** Created by user ID */
  createdBy?: string

  /** Last updated by user ID */
  updatedBy?: string

  // Status
  /** Current workflow status */
  status: WorkflowStatus

  /** Whether workflow is published */
  published: boolean

  /** Publication date */
  publishedAt?: Date

  // Additional metadata
  /** Associated campaign IDs */
  campaignIds?: string[]

  /** Target audience segments */
  targetSegments?: string[]

  /** Expected user volume */
  expectedVolume?: number

  /** Business impact estimate */
  businessImpact?: 'low' | 'medium' | 'high' | 'critical'

  /** Custom fields */
  customFields?: Record<string, any>
}

/**
 * Workflow status
 */
export enum WorkflowStatus {
  /** Draft/work in progress */
  Draft = 'draft',

  /** Ready for review */
  Review = 'review',

  /** Approved and ready to activate */
  Approved = 'approved',

  /** Currently active */
  Active = 'active',

  /** Temporarily paused */
  Paused = 'paused',

  /** Permanently archived */
  Archived = 'archived',

  /** Deprecated (replaced by newer version) */
  Deprecated = 'deprecated'
}

/**
 * Workflow version history entry
 */
export interface WorkflowVersion {
  /** Version number */
  version: string

  /** Change description */
  changeDescription: string

  /** Changed by user */
  changedBy: string

  /** Change timestamp */
  changedAt: Date

  /** Previous version */
  previousVersion?: string

  /** Major, minor, or patch change */
  changeType: 'major' | 'minor' | 'patch'

  /** Full workflow snapshot (optional, for rollback) */
  snapshot?: any
}

/**
 * Metric performance data
 */
export interface MetricPerformance {
  /** Metric name */
  metricName: string

  /** Data points over time */
  dataPoints: MetricDataPoint[]

  /** Aggregate statistics */
  stats: MetricStats

  /** Target value */
  target?: number

  /** Whether target is met */
  targetMet: boolean
}

/**
 * Single metric data point
 */
export interface MetricDataPoint {
  /** Timestamp */
  timestamp: Date

  /** Measured value */
  value: number

  /** Sample size */
  sampleSize?: number

  /** Confidence interval */
  confidenceInterval?: [number, number]
}

/**
 * Metric statistics
 */
export interface MetricStats {
  /** Current value */
  current: number

  /** Previous value (for comparison) */
  previous?: number

  /** Change from previous */
  change?: number

  /** Percentage change */
  changePercentage?: number

  /** Minimum value */
  min: number

  /** Maximum value */
  max: number

  /** Average value */
  average: number

  /** Median value */
  median?: number

  /** Standard deviation */
  stdDev?: number

  /** Trend direction */
  trend: 'up' | 'down' | 'stable'
}

/**
 * Workflow performance summary
 */
export interface WorkflowPerformanceSummary {
  /** Workflow ID */
  workflowId: string

  /** Workflow name */
  workflowName: string

  /** Total executions */
  totalExecutions: number

  /** Successful executions */
  successfulExecutions: number

  /** Failed executions */
  failedExecutions: number

  /** Success rate */
  successRate: number

  /** Average execution time (milliseconds) */
  avgExecutionTime: number

  /** Total users affected */
  totalUsersAffected: number

  /** Metric performances */
  metricPerformances: MetricPerformance[]

  /** Overall health score (0-100) */
  healthScore: number

  /** Last updated */
  lastUpdated: Date
}

/**
 * Default metric configurations
 */
export const DEFAULT_METRICS_BY_PURPOSE: Record<WorkflowPurpose, WorkflowMetric[]> = {
  [WorkflowPurpose.Onboarding]: [
    {
      name: MetricName.OnboardingCompletionRate,
      displayName: 'Onboarding Completion Rate',
      target: 0.75,
      unit: MetricUnit.Percentage,
      description: 'Percentage of users who complete the onboarding flow',
      higherIsBetter: true
    },
    {
      name: MetricName.TimeToActivation,
      displayName: 'Time to Activation',
      target: 300,
      unit: MetricUnit.Seconds,
      description: 'Average time for users to reach activation milestone',
      higherIsBetter: false
    }
  ],
  [WorkflowPurpose.Engagement]: [
    {
      name: MetricName.EngagementRate,
      displayName: 'Engagement Rate',
      target: 0.60,
      unit: MetricUnit.Percentage,
      description: 'Percentage of users actively engaging with content',
      higherIsBetter: true
    },
    {
      name: MetricName.SessionFrequency,
      displayName: 'Session Frequency',
      target: 4,
      unit: MetricUnit.Count,
      description: 'Average sessions per user per week',
      higherIsBetter: true
    }
  ],
  [WorkflowPurpose.Conversion]: [
    {
      name: MetricName.ConversionRate,
      displayName: 'Conversion Rate',
      target: 0.25,
      unit: MetricUnit.Percentage,
      description: 'Percentage of users converting to desired action',
      higherIsBetter: true
    },
    {
      name: MetricName.TimeToConversion,
      displayName: 'Time to Conversion',
      target: 7,
      unit: MetricUnit.Days,
      description: 'Average days from signup to conversion',
      higherIsBetter: false
    }
  ],
  [WorkflowPurpose.Retention]: [
    {
      name: MetricName.RetentionRate,
      displayName: 'Retention Rate',
      target: 0.70,
      unit: MetricUnit.Percentage,
      description: '30-day retention rate',
      higherIsBetter: true
    },
    {
      name: MetricName.ChurnRate,
      displayName: 'Churn Rate',
      target: 0.05,
      unit: MetricUnit.Percentage,
      description: 'Monthly churn rate',
      higherIsBetter: false
    }
  ],
  [WorkflowPurpose.Winback]: [
    {
      name: MetricName.ReactivationRate,
      displayName: 'Reactivation Rate',
      target: 0.20,
      unit: MetricUnit.Percentage,
      description: 'Percentage of dormant users reactivated',
      higherIsBetter: true
    } as WorkflowMetric
  ],
  [WorkflowPurpose.Monetization]: [
    {
      name: MetricName.RevenueGenerated,
      displayName: 'Revenue Generated',
      target: 10000,
      unit: MetricUnit.Currency,
      description: 'Total revenue from workflow',
      higherIsBetter: true
    },
    {
      name: MetricName.AvgOrderValue,
      displayName: 'Average Order Value',
      target: 50,
      unit: MetricUnit.Currency,
      description: 'Average transaction value',
      higherIsBetter: true
    }
  ],
  [WorkflowPurpose.Referral]: [
    {
      name: MetricName.ReferralRate,
      displayName: 'Referral Rate',
      target: 0.15,
      unit: MetricUnit.Percentage,
      description: 'Percentage of users who refer others',
      higherIsBetter: true
    },
    {
      name: MetricName.ViralCoefficient,
      displayName: 'Viral Coefficient',
      target: 1.2,
      unit: MetricUnit.Ratio,
      description: 'Average referrals per user',
      higherIsBetter: true
    }
  ]
}

/**
 * Helper function to get default metrics for a workflow purpose
 */
export function getDefaultMetrics(purpose: WorkflowPurpose): WorkflowMetric[] {
  return DEFAULT_METRICS_BY_PURPOSE[purpose] || []
}

/**
 * Helper function to calculate metric health score (0-100)
 */
export function calculateMetricHealth(metric: WorkflowMetric): number {
  if (metric.target === undefined || metric.actual === undefined) {
    return 50 // Unknown
  }

  const ratio = metric.actual / metric.target
  const score = metric.higherIsBetter
    ? Math.min(ratio * 100, 100)
    : Math.max((2 - ratio) * 100, 0)

  return Math.round(score)
}

/**
 * Helper function to calculate overall workflow health
 */
export function calculateWorkflowHealth(metrics: WorkflowMetric[]): number {
  if (metrics.length === 0) return 50

  const scores = metrics.map(calculateMetricHealth)
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return Math.round(avgScore)
}
