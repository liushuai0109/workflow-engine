# Implementation Guide

This guide provides step-by-step instructions for implementing the User Lifecycle Operations Foundation.

## Quick Start

### Prerequisites
- Node.js v20.19.1
- npm
- Familiarity with Vue 3, TypeScript, bpmn-js

### Setup
```bash
cd /data/mm64/simonsliu/xflow/bpmn-explorer/client
npm install
npm run dev
```

---

## Implementation Flow Diagram

```mermaid
graph TD
    Start[Start Implementation] --> Types[1. Create Type Definitions]
    Types --> Config[2. Create Configuration Files]
    Config --> Services[3. Implement Services]
    Services --> Adapter[4. Enhance BpmnAdapter]
    Adapter --> Components[5. Build UI Components]
    Components --> Integration[6. Integrate with Editor]
    Integration --> Tests[7. Write Tests]
    Tests --> Migration[8. Add Migration Logic]
    Migration --> Docs[9. Update Documentation]
    Docs --> End[Complete]

    style Start fill:#e8f5e9
    style End fill:#e8f5e9
    style Types fill:#e1f5ff
    style Services fill:#fff4e6
    style Components fill:#f3e5f5
```

---

## Phase 1: Type Definitions (Tasks 1.1-1.6)

### File Structure
```
src/types/
├── lifecycle.ts         (NEW)
├── segments.ts          (NEW)
├── triggers.ts          (NEW)
├── metrics.ts           (NEW)
└── index.ts             (MODIFY - export new types)
```

### Implementation Steps

#### 1.1 Define Lifecycle Stage Enumeration

**File**: `src/types/lifecycle.ts`

```typescript
/**
 * AARRR Lifecycle Stages (Pirate Metrics)
 */
export enum LifecycleStage {
  /** User Acquisition - Getting users to the platform */
  Acquisition = 'Acquisition',

  /** User Activation - First-time user experience */
  Activation = 'Activation',

  /** User Retention - Ongoing engagement */
  Retention = 'Retention',

  /** Revenue Generation - Monetization */
  Revenue = 'Revenue',

  /** Referral & Viral Growth - User advocacy */
  Referral = 'Referral'
}

/**
 * Lifecycle stage configuration for UI display
 */
export interface LifecycleStageConfig {
  stage: LifecycleStage
  label: string
  description: string
  color: string
  icon: string
  order: number
}

/**
 * Lifecycle metadata attached to workflow elements
 */
export interface LifecycleMetadata {
  stage: LifecycleStage
  color?: string
  icon?: string
  description?: string
  version: string // Format version for future compatibility
}
```

#### 1.2 Create User Segment Types

**File**: `src/types/segments.ts`

```typescript
/**
 * User segment types
 */
export enum SegmentType {
  Demographic = 'demographic',
  Behavioral = 'behavioral',
  Lifecycle = 'lifecycle',
  Value = 'value'
}

/**
 * Logical operators for combining conditions
 */
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR'
}

/**
 * Condition operators for segment rules
 */
export enum ConditionOperator {
  Equals = 'equals',
  NotEquals = 'not_equals',
  GreaterThan = 'greater_than',
  LessThan = 'less_than',
  GreaterThanOrEqual = 'gte',
  LessThanOrEqual = 'lte',
  Between = 'between',
  Contains = 'contains',
  In = 'in',
  NotIn = 'not_in'
}

/**
 * Segment condition definition
 */
export interface SegmentCondition {
  field: string
  operator: ConditionOperator
  value: string | number | boolean | string[] | number[]
}

/**
 * User segment definition
 */
export interface UserSegment {
  id: string
  name: string
  description?: string
  type: SegmentType
  conditions: SegmentCondition[]
  operator: LogicalOperator
  isTemplate?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Segment template for quick setup
 */
export interface SegmentTemplate {
  id: string
  name: string
  description: string
  type: SegmentType
  icon: string
  conditions: SegmentCondition[]
  operator: LogicalOperator
  tags: string[]
}
```

#### 1.3 Define Trigger Types

**File**: `src/types/triggers.ts`

```typescript
/**
 * Trigger types for workflow execution
 */
export enum TriggerType {
  Scheduled = 'scheduled',
  Event = 'event',
  Threshold = 'threshold',
  Manual = 'manual'
}

/**
 * Standard event types
 */
export enum EventType {
  // User events
  UserSignup = 'user.signup',
  UserLogin = 'user.login',
  UserLogout = 'user.logout',
  ProfileUpdate = 'user.profile_update',

  // Engagement events
  PageView = 'engagement.page_view',
  FeatureClick = 'engagement.feature_click',
  SessionStart = 'engagement.session_start',
  SessionEnd = 'engagement.session_end',

  // Transaction events
  PurchaseComplete = 'transaction.purchase_complete',
  CartAdd = 'transaction.cart_add',
  CheckoutStart = 'transaction.checkout_start',
  Refund = 'transaction.refund',

  // Milestone events
  MilestoneReached = 'milestone.reached',

  // Custom
  Custom = 'custom'
}

/**
 * Schedule configuration for time-based triggers
 */
export interface Schedule {
  type: 'cron' | 'interval' | 'delay' | 'time_window'
  expression?: string // Cron expression
  interval?: number // Milliseconds
  delay?: number // Milliseconds
  startTime?: string // ISO 8601
  endTime?: string // ISO 8601
  timezone?: string
}

/**
 * Trigger condition for evaluation
 */
export interface TriggerCondition {
  field: string
  operator: ConditionOperator
  value: any
}

/**
 * Workflow trigger definition
 */
export interface Trigger {
  id: string
  name: string
  type: TriggerType
  description?: string

  // Event-based
  event?: EventType | string
  eventFilters?: TriggerCondition[]

  // Schedule-based
  schedule?: Schedule

  // Threshold-based
  thresholds?: TriggerCondition[]

  // Metadata
  enabled: boolean
  createdAt?: Date
  updatedAt?: Date
}
```

#### 1.4 Create Workflow Metadata Schema

**File**: `src/types/metrics.ts`

```typescript
/**
 * Workflow purpose categories
 */
export enum WorkflowPurpose {
  Onboarding = 'Onboarding',
  Engagement = 'Engagement',
  Conversion = 'Conversion',
  Retention = 'Retention',
  Winback = 'Winback'
}

/**
 * Standard metric names
 */
export enum MetricName {
  ConversionRate = 'conversion_rate',
  EngagementRate = 'engagement_rate',
  CompletionRate = 'completion_rate',
  RevenueGenerated = 'revenue_generated',
  UserActivationCount = 'user_activation_count',
  ChurnRate = 'churn_rate',
  TimeToConversion = 'time_to_conversion',
  ClickThroughRate = 'click_through_rate'
}

/**
 * Metric definition with target value
 */
export interface WorkflowMetric {
  name: MetricName | string
  displayName: string
  target?: number
  actual?: number
  unit?: string // '%', 'seconds', 'count', '$'
  description?: string
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  id: string
  name: string
  description?: string
  purpose: WorkflowPurpose
  owner?: string
  tags: string[]
  metrics: WorkflowMetric[]

  // Versioning
  version: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string

  // Status
  status: 'draft' | 'active' | 'paused' | 'archived'
}
```

#### 1.5 Define User Profile Structure

**File**: `src/types/userProfile.ts`

```typescript
/**
 * User demographics
 */
export interface Demographics {
  age?: number
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  country?: string
  city?: string
  timezone?: string
  language?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet'
}

/**
 * User behavioral data
 */
export interface BehavioralData {
  sessionCount: number
  lastSessionDate?: Date
  totalSessionDuration: number // seconds
  featureUsageMap: Record<string, number> // feature -> usage count
  engagementScore: number // 0-100
  activityRecency: number // days since last activity
  activityFrequency: number // sessions per week
}

/**
 * User transaction data
 */
export interface TransactionData {
  totalPurchases: number
  totalRevenue: number
  averageOrderValue: number
  lastPurchaseDate?: Date
  subscriptionTier?: string
  customerLifetimeValue: number
  purchaseFrequency: number // purchases per month
}

/**
 * Complete user profile
 */
export interface UserProfile {
  userId: string
  email: string
  name?: string
  signupDate: Date
  accountStatus: 'active' | 'suspended' | 'deleted'
  currentLifecycleStage: LifecycleStage

  demographics: Demographics
  behavioral: BehavioralData
  transactions: TransactionData

  // Privacy
  consentGiven: boolean
  consentDate?: Date

  // Metadata
  createdAt: Date
  updatedAt: Date
}
```

#### 1.6 Create Event Data Types

**File**: `src/types/events.ts`

```typescript
/**
 * Standard event schema
 */
export interface UserEvent {
  eventId: string
  userId: string
  sessionId: string
  eventType: EventType | string
  timestamp: Date

  // Optional fields
  eventProperties?: Record<string, any>
  deviceInfo?: DeviceInfo
  location?: LocationInfo
  referrer?: string
}

/**
 * Device information
 */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  screenResolution: string
}

/**
 * Location information
 */
export interface LocationInfo {
  country: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string
  instanceId: string
  userId: string
  currentStep: string
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date

  // Execution data
  variables: Record<string, any>
  intermediateResults: Record<string, any>

  // Error tracking
  errors: ExecutionError[]
  retryCount: number
  maxRetries: number
}

/**
 * Execution error
 */
export interface ExecutionError {
  errorType: string
  errorMessage: string
  failedStep: string
  stackTrace?: string
  timestamp: Date
}
```

#### Update Index

**File**: `src/types/index.ts` (append to existing)

```typescript
// Lifecycle types
export * from './lifecycle'
export * from './segments'
export * from './triggers'
export * from './metrics'
export * from './userProfile'
export * from './events'
```

---

## Phase 2: Configuration Files (Tasks 6.1-6.3)

### File Structure
```
src/config/
├── lifecycle-stages.json    (NEW)
├── user-segments.json       (NEW)
└── trigger-templates.json   (NEW)
```

### 6.1 Create Lifecycle Stages Configuration

**File**: `src/config/lifecycle-stages.json`

```json
{
  "version": "1.0",
  "stages": [
    {
      "stage": "Acquisition",
      "label": "Acquisition",
      "description": "Attracting and acquiring new users through various channels",
      "color": "#2196F3",
      "icon": "🎯",
      "order": 1,
      "examples": [
        "Landing page visits",
        "Signup campaigns",
        "Referral tracking",
        "Ad campaigns"
      ],
      "metrics": [
        "visitor_count",
        "signup_rate",
        "cost_per_acquisition",
        "channel_attribution"
      ]
    },
    {
      "stage": "Activation",
      "label": "Activation",
      "description": "Delivering first-time user experience and demonstrating value",
      "color": "#4CAF50",
      "icon": "✨",
      "order": 2,
      "examples": [
        "Onboarding tutorials",
        "First transaction",
        "Profile setup",
        "Feature discovery"
      ],
      "metrics": [
        "onboarding_completion_rate",
        "time_to_first_value",
        "feature_adoption_rate",
        "activation_rate"
      ]
    },
    {
      "stage": "Retention",
      "label": "Retention",
      "description": "Keeping users engaged and building habits",
      "color": "#FFC107",
      "icon": "🔄",
      "order": 3,
      "examples": [
        "Re-engagement emails",
        "Push notifications",
        "Content recommendations",
        "Habit formation"
      ],
      "metrics": [
        "daily_active_users",
        "weekly_active_users",
        "churn_rate",
        "engagement_score",
        "session_frequency"
      ]
    },
    {
      "stage": "Revenue",
      "label": "Revenue",
      "description": "Converting users into paying customers",
      "color": "#9C27B0",
      "icon": "💰",
      "order": 4,
      "examples": [
        "Upsell campaigns",
        "Premium upgrades",
        "Purchase reminders",
        "Subscription management"
      ],
      "metrics": [
        "conversion_rate",
        "average_order_value",
        "customer_lifetime_value",
        "revenue_per_user",
        "subscription_rate"
      ]
    },
    {
      "stage": "Referral",
      "label": "Referral",
      "description": "Encouraging users to refer others and become advocates",
      "color": "#FF5722",
      "icon": "🚀",
      "order": 5,
      "examples": [
        "Referral program",
        "Social sharing",
        "Incentive delivery",
        "Ambassador programs"
      ],
      "metrics": [
        "referral_rate",
        "viral_coefficient",
        "shares_per_user",
        "referral_conversion_rate"
      ]
    }
  ]
}
```

### 6.2 Create User Segments Configuration

**File**: `src/config/user-segments.json`

```json
{
  "version": "1.0",
  "templates": [
    {
      "id": "new_users",
      "name": "New Users",
      "description": "Users who signed up in the last 7 days",
      "type": "lifecycle",
      "icon": "🆕",
      "conditions": [
        {
          "field": "signup_date",
          "operator": "gte",
          "value": "NOW-7d"
        }
      ],
      "operator": "AND",
      "tags": ["onboarding", "activation"]
    },
    {
      "id": "active_users",
      "name": "Active Users",
      "description": "Users with high engagement in the last 30 days",
      "type": "behavioral",
      "icon": "⚡",
      "conditions": [
        {
          "field": "session_count",
          "operator": "gte",
          "value": 10
        },
        {
          "field": "last_session_date",
          "operator": "gte",
          "value": "NOW-30d"
        }
      ],
      "operator": "AND",
      "tags": ["retention", "engaged"]
    },
    {
      "id": "at_risk_users",
      "name": "At-Risk Users",
      "description": "Previously active users showing declining engagement",
      "type": "behavioral",
      "icon": "⚠️",
      "conditions": [
        {
          "field": "last_session_date",
          "operator": "between",
          "value": ["NOW-30d", "NOW-14d"]
        },
        {
          "field": "previous_engagement_score",
          "operator": "gte",
          "value": 60
        }
      ],
      "operator": "AND",
      "tags": ["retention", "winback"]
    },
    {
      "id": "vip_customers",
      "name": "VIP Customers",
      "description": "High-value customers with significant lifetime value",
      "type": "value",
      "icon": "👑",
      "conditions": [
        {
          "field": "customer_lifetime_value",
          "operator": "gte",
          "value": 1000
        },
        {
          "field": "total_purchases",
          "operator": "gte",
          "value": 5
        }
      ],
      "operator": "AND",
      "tags": ["revenue", "loyalty"]
    },
    {
      "id": "dormant_users",
      "name": "Dormant Users",
      "description": "Users with no activity in the last 30+ days",
      "type": "lifecycle",
      "icon": "😴",
      "conditions": [
        {
          "field": "last_session_date",
          "operator": "lte",
          "value": "NOW-30d"
        }
      ],
      "operator": "AND",
      "tags": ["winback", "churn"]
    },
    {
      "id": "young_professionals",
      "name": "Young Professionals",
      "description": "Users aged 25-40 in urban areas",
      "type": "demographic",
      "icon": "💼",
      "conditions": [
        {
          "field": "age",
          "operator": "between",
          "value": [25, 40]
        },
        {
          "field": "location_type",
          "operator": "equals",
          "value": "urban"
        }
      ],
      "operator": "AND",
      "tags": ["demographic", "targeting"]
    },
    {
      "id": "mobile_users",
      "name": "Mobile-First Users",
      "description": "Users primarily accessing via mobile devices",
      "type": "behavioral",
      "icon": "📱",
      "conditions": [
        {
          "field": "device_type",
          "operator": "equals",
          "value": "mobile"
        },
        {
          "field": "mobile_session_percentage",
          "operator": "gte",
          "value": 80
        }
      ],
      "operator": "AND",
      "tags": ["device", "targeting"]
    },
    {
      "id": "trial_users",
      "name": "Trial Users",
      "description": "Users currently in trial period",
      "type": "lifecycle",
      "icon": "🎫",
      "conditions": [
        {
          "field": "subscription_tier",
          "operator": "equals",
          "value": "trial"
        },
        {
          "field": "trial_end_date",
          "operator": "gte",
          "value": "NOW"
        }
      ],
      "operator": "AND",
      "tags": ["conversion", "trial"]
    },
    {
      "id": "power_users",
      "name": "Power Users",
      "description": "Highly engaged users with extensive feature usage",
      "type": "behavioral",
      "icon": "⚙️",
      "conditions": [
        {
          "field": "engagement_score",
          "operator": "gte",
          "value": 80
        },
        {
          "field": "feature_usage_count",
          "operator": "gte",
          "value": 10
        }
      ],
      "operator": "AND",
      "tags": ["engagement", "advocacy"]
    },
    {
      "id": "churned_users",
      "name": "Churned Users",
      "description": "Users with no activity in 90+ days",
      "type": "lifecycle",
      "icon": "❌",
      "conditions": [
        {
          "field": "last_session_date",
          "operator": "lte",
          "value": "NOW-90d"
        }
      ],
      "operator": "AND",
      "tags": ["churn", "lost"]
    }
  ]
}
```

### 6.3 Create Trigger Templates Configuration

**File**: `src/config/trigger-templates.json`

```json
{
  "version": "1.0",
  "templates": [
    {
      "id": "user_signup",
      "name": "User Signup",
      "description": "Triggered when a new user completes registration",
      "type": "event",
      "event": "user.signup",
      "icon": "👤",
      "category": "user_events",
      "exampleFilters": [
        {
          "field": "signup_source",
          "operator": "equals",
          "value": "web"
        }
      ]
    },
    {
      "id": "purchase_complete",
      "name": "Purchase Completed",
      "description": "Triggered when a user completes a purchase",
      "type": "event",
      "event": "transaction.purchase_complete",
      "icon": "💳",
      "category": "transaction_events",
      "exampleFilters": [
        {
          "field": "amount",
          "operator": "gte",
          "value": 100
        }
      ]
    },
    {
      "id": "daily_9am",
      "name": "Daily at 9 AM",
      "description": "Runs every day at 9:00 AM user local time",
      "type": "scheduled",
      "schedule": {
        "type": "cron",
        "expression": "0 9 * * *",
        "timezone": "user"
      },
      "icon": "🕘",
      "category": "scheduled"
    },
    {
      "id": "engagement_drop",
      "name": "Engagement Drop",
      "description": "Triggered when user engagement score drops below threshold",
      "type": "threshold",
      "icon": "📉",
      "category": "behavioral",
      "exampleThresholds": [
        {
          "field": "engagement_score",
          "operator": "lte",
          "value": 40
        }
      ]
    },
    {
      "id": "trial_ending",
      "name": "Trial Ending Soon",
      "description": "Triggered 3 days before trial expiration",
      "type": "scheduled",
      "schedule": {
        "type": "delay",
        "delay": -259200000
      },
      "icon": "⏰",
      "category": "scheduled"
    },
    {
      "id": "cart_abandoned",
      "name": "Cart Abandoned",
      "description": "Triggered when user adds items to cart but doesn't checkout",
      "type": "event",
      "event": "transaction.cart_add",
      "icon": "🛒",
      "category": "transaction_events",
      "exampleFilters": [
        {
          "field": "checkout_completed",
          "operator": "equals",
          "value": false
        }
      ]
    },
    {
      "id": "milestone_reached",
      "name": "Milestone Reached",
      "description": "Triggered when user achieves a milestone",
      "type": "event",
      "event": "milestone.reached",
      "icon": "🏆",
      "category": "engagement"
    },
    {
      "id": "weekly_digest",
      "name": "Weekly Digest",
      "description": "Runs every Monday at 8 AM",
      "type": "scheduled",
      "schedule": {
        "type": "cron",
        "expression": "0 8 * * 1",
        "timezone": "UTC"
      },
      "icon": "📧",
      "category": "scheduled"
    }
  ]
}
```

---

## Testing Strategy

### Test Pyramid

```mermaid
graph TD
    E2E[E2E Tests<br/>10%]
    Integration[Integration Tests<br/>30%]
    Unit[Unit Tests<br/>60%]

    E2E --> Integration
    Integration --> Unit

    style Unit fill:#e8f5e9
    style Integration fill:#fff4e6
    style E2E fill:#e1f5ff
```

### Test Coverage Matrix

| Component | Unit | Integration | E2E | Priority |
|-----------|------|-------------|-----|----------|
| Type Definitions | ✅ | N/A | N/A | High |
| Services | ✅ | ✅ | ❌ | High |
| BpmnAdapter | ✅ | ✅ | ❌ | Critical |
| UI Components | ✅ | ✅ | ✅ | Medium |
| Migration Logic | ✅ | ✅ | ✅ | Critical |

---

This implementation guide provides practical, step-by-step instructions with complete code examples. Continue to the next phases in `tasks.md` following this structure.
