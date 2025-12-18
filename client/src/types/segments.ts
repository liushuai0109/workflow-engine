/**
 * User Segment Types
 *
 * Defines types for user segmentation, targeting, and audience management.
 * Supports demographic, behavioral, lifecycle, and value-based segmentation.
 */

/**
 * User segment types
 */
export enum SegmentType {
  /** Demographic segmentation (age, gender, location, etc.) */
  Demographic = 'demographic',

  /** Behavioral segmentation (activity, engagement, feature usage) */
  Behavioral = 'behavioral',

  /** Lifecycle segmentation (new, active, at-risk, churned) */
  Lifecycle = 'lifecycle',

  /** Value-based segmentation (LTV, purchase amount, tier) */
  Value = 'value'
}

/**
 * Logical operators for combining conditions
 */
export enum LogicalOperator {
  /** All conditions must be true */
  AND = 'AND',

  /** At least one condition must be true */
  OR = 'OR'
}

/**
 * Condition operators for segment rules
 */
export enum ConditionOperator {
  /** Exact match */
  Equals = 'equals',

  /** Not equal to */
  NotEquals = 'not_equals',

  /** Greater than */
  GreaterThan = 'greater_than',

  /** Less than */
  LessThan = 'less_than',

  /** Greater than or equal */
  GreaterThanOrEqual = 'gte',

  /** Less than or equal */
  LessThanOrEqual = 'lte',

  /** Between two values (inclusive) */
  Between = 'between',

  /** String contains substring */
  Contains = 'contains',

  /** Value in list */
  In = 'in',

  /** Value not in list */
  NotIn = 'not_in',

  /** Matches regular expression */
  Matches = 'matches',

  /** Exists (field has a value) */
  Exists = 'exists',

  /** Does not exist (field is null/undefined) */
  NotExists = 'not_exists'
}

/**
 * Segment condition definition
 *
 * Represents a single rule in a segment definition.
 */
export interface SegmentCondition {
  /** Field name to evaluate (e.g., "age", "session_count", "last_purchase_date") */
  field: string

  /** Comparison operator */
  operator: ConditionOperator

  /** Value to compare against (type depends on field and operator) */
  value: string | number | boolean | string[] | number[] | [number, number]

  /** Optional field data type for validation */
  fieldType?: 'string' | 'number' | 'boolean' | 'date' | 'array'

  /** Optional description of this condition */
  description?: string
}

/**
 * User segment definition
 *
 * Represents a group of users matching specific criteria.
 */
export interface UserSegment {
  /** Unique segment identifier */
  id: string

  /** Human-readable segment name */
  name: string

  /** Optional detailed description */
  description?: string

  /** Segment type category */
  type: SegmentType

  /** List of conditions defining the segment */
  conditions: SegmentCondition[]

  /** How to combine conditions (AND/OR) */
  operator: LogicalOperator

  /** Whether this is a predefined template */
  isTemplate?: boolean

  /** Tags for categorization */
  tags?: string[]

  /** Creation timestamp */
  createdAt?: Date

  /** Last update timestamp */
  updatedAt?: Date

  /** User who created the segment */
  createdBy?: string

  /** Estimated user count matching this segment */
  estimatedCount?: number
}

/**
 * Segment template for quick setup
 *
 * Predefined segment configurations that users can customize.
 */
export interface SegmentTemplate {
  /** Unique template identifier */
  id: string

  /** Template name */
  name: string

  /** Detailed description */
  description: string

  /** Segment type */
  type: SegmentType

  /** Icon or emoji */
  icon: string

  /** Predefined conditions */
  conditions: SegmentCondition[]

  /** Logical operator */
  operator: LogicalOperator

  /** Categorization tags */
  tags: string[]

  /** Priority/order for display */
  order?: number

  /** Whether template is active */
  active?: boolean
}

/**
 * Segment evaluation result
 *
 * Result of evaluating a user against segment conditions.
 */
export interface SegmentEvaluationResult {
  /** Segment ID that was evaluated */
  segmentId: string

  /** User ID that was evaluated */
  userId: string

  /** Whether user matches the segment */
  matches: boolean

  /** Timestamp of evaluation */
  evaluatedAt: Date

  /** Individual condition results (for debugging) */
  conditionResults?: ConditionResult[]

  /** Reason for match/no-match */
  reason?: string
}

/**
 * Individual condition evaluation result
 */
export interface ConditionResult {
  /** Condition that was evaluated */
  condition: SegmentCondition

  /** Whether condition passed */
  passed: boolean

  /** Actual value from user data */
  actualValue?: any

  /** Error message if evaluation failed */
  error?: string
}

/**
 * Segment statistics
 *
 * Analytics data for a segment.
 */
export interface SegmentStats {
  /** Segment ID */
  segmentId: string

  /** Current user count */
  userCount: number

  /** Percentage of total users */
  percentage: number

  /** Growth rate (users added in last 30 days) */
  growthRate: number

  /** Average user value (if applicable) */
  avgUserValue?: number

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Segment membership record
 *
 * Tracks user membership in segments.
 */
export interface SegmentMembership {
  /** User ID */
  userId: string

  /** Segment ID */
  segmentId: string

  /** When user entered segment */
  joinedAt: Date

  /** When user left segment (null if still member) */
  leftAt?: Date

  /** How user entered segment */
  source: 'automatic' | 'manual' | 'import'

  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Segment field definition
 *
 * Metadata about fields that can be used in segment conditions.
 */
export interface SegmentField {
  /** Field name */
  name: string

  /** Display label */
  label: string

  /** Field data type */
  type: 'string' | 'number' | 'boolean' | 'date' | 'array'

  /** Field category (for grouping in UI) */
  category: 'demographic' | 'behavioral' | 'transaction' | 'custom'

  /** Description of what this field represents */
  description?: string

  /** Supported operators for this field */
  supportedOperators: ConditionOperator[]

  /** Example values */
  examples?: string[]

  /** Whether field is indexed for fast queries */
  indexed?: boolean
}

/**
 * Segment builder configuration
 *
 * Configuration for the segment builder UI component.
 */
export interface SegmentBuilderConfig {
  /** Available fields */
  fields: SegmentField[]

  /** Available templates */
  templates: SegmentTemplate[]

  /** Maximum number of conditions per segment */
  maxConditions: number

  /** Whether to show estimated user count */
  showEstimatedCount: boolean

  /** Whether to allow nested conditions (future feature) */
  allowNested: boolean
}

/**
 * Default segment field definitions
 */
export const DEFAULT_SEGMENT_FIELDS: SegmentField[] = [
  // Demographic fields
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    category: 'demographic',
    description: 'User age in years',
    supportedOperators: [
      ConditionOperator.Equals,
      ConditionOperator.GreaterThan,
      ConditionOperator.LessThan,
      ConditionOperator.Between
    ],
    examples: ['25', '18-35']
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'string',
    category: 'demographic',
    description: 'User gender',
    supportedOperators: [ConditionOperator.Equals, ConditionOperator.In],
    examples: ['male', 'female', 'other']
  },
  {
    name: 'country',
    label: 'Country',
    type: 'string',
    category: 'demographic',
    description: 'User country',
    supportedOperators: [ConditionOperator.Equals, ConditionOperator.In],
    examples: ['US', 'CN', 'UK']
  },
  {
    name: 'city',
    label: 'City',
    type: 'string',
    category: 'demographic',
    description: 'User city',
    supportedOperators: [ConditionOperator.Equals, ConditionOperator.Contains],
    examples: ['Beijing', 'New York', 'London']
  },

  // Behavioral fields
  {
    name: 'session_count',
    label: 'Session Count',
    type: 'number',
    category: 'behavioral',
    description: 'Total number of sessions',
    supportedOperators: [
      ConditionOperator.Equals,
      ConditionOperator.GreaterThan,
      ConditionOperator.LessThan,
      ConditionOperator.GreaterThanOrEqual
    ],
    examples: ['10', '50']
  },
  {
    name: 'last_session_date',
    label: 'Last Session Date',
    type: 'date',
    category: 'behavioral',
    description: 'Date of most recent session',
    supportedOperators: [
      ConditionOperator.GreaterThanOrEqual,
      ConditionOperator.LessThanOrEqual,
      ConditionOperator.Between
    ],
    examples: ['2024-01-01', 'NOW-7d']
  },
  {
    name: 'engagement_score',
    label: 'Engagement Score',
    type: 'number',
    category: 'behavioral',
    description: 'Calculated engagement score (0-100)',
    supportedOperators: [
      ConditionOperator.GreaterThan,
      ConditionOperator.LessThan,
      ConditionOperator.GreaterThanOrEqual,
      ConditionOperator.Between
    ],
    examples: ['60', '80-100']
  },

  // Transaction fields
  {
    name: 'total_purchases',
    label: 'Total Purchases',
    type: 'number',
    category: 'transaction',
    description: 'Total number of purchases',
    supportedOperators: [
      ConditionOperator.Equals,
      ConditionOperator.GreaterThan,
      ConditionOperator.GreaterThanOrEqual
    ],
    examples: ['5', '10']
  },
  {
    name: 'customer_lifetime_value',
    label: 'Customer Lifetime Value',
    type: 'number',
    category: 'transaction',
    description: 'Total value of customer',
    supportedOperators: [
      ConditionOperator.GreaterThan,
      ConditionOperator.Between
    ],
    examples: ['1000', '5000']
  },
  {
    name: 'subscription_tier',
    label: 'Subscription Tier',
    type: 'string',
    category: 'transaction',
    description: 'Current subscription level',
    supportedOperators: [ConditionOperator.Equals, ConditionOperator.In],
    examples: ['free', 'premium', 'enterprise']
  }
]

/**
 * Helper function to validate segment condition
 */
export function validateCondition(condition: SegmentCondition): { valid: boolean; error?: string } {
  if (!condition.field) {
    return { valid: false, error: 'Field is required' }
  }

  if (!condition.operator) {
    return { valid: false, error: 'Operator is required' }
  }

  if (condition.value === undefined || condition.value === null) {
    return { valid: false, error: 'Value is required' }
  }

  // Type-specific validation
  if (condition.operator === ConditionOperator.Between) {
    if (!Array.isArray(condition.value) || condition.value.length !== 2) {
      return { valid: false, error: 'Between operator requires array of 2 values' }
    }
  }

  return { valid: true }
}

/**
 * Helper function to validate entire segment
 */
export function validateSegment(segment: UserSegment): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!segment.name || segment.name.trim().length === 0) {
    errors.push('Segment name is required')
  }

  if (!segment.conditions || segment.conditions.length === 0) {
    errors.push('At least one condition is required')
  }

  segment.conditions.forEach((condition, index) => {
    const result = validateCondition(condition)
    if (!result.valid) {
      errors.push(`Condition ${index + 1}: ${result.error}`)
    }
  })

  return { valid: errors.length === 0, errors }
}
