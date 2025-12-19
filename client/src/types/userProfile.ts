/**
 * User Profile Types
 *
 * Defines comprehensive user profile data structures including demographics,
 * behavioral data, transaction history, and user information.
 */

/**
 * User demographics
 */
export interface Demographics {
  /** Age in years */
  age?: number

  /** Date of birth (ISO 8601) */
  dateOfBirth?: string

  /** Gender */
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'

  /** Country code (ISO 3166-1 alpha-2) */
  country?: string

  /** City name */
  city?: string

  /** Region/state */
  region?: string

  /** Postal/ZIP code */
  postalCode?: string

  /** Timezone (IANA timezone) */
  timezone?: string

  /** Preferred language (ISO 639-1) */
  language?: string

  /** Primary device type */
  deviceType?: 'desktop' | 'mobile' | 'tablet'

  /** Operating system */
  os?: string

  /** Browser */
  browser?: string
}

/**
 * User behavioral data
 *
 * Tracks user engagement and activity patterns.
 */
export interface BehavioralData {
  /** Total number of sessions */
  sessionCount: number

  /** Last session date */
  lastSessionDate?: Date

  /** Total session duration in seconds */
  totalSessionDuration: number

  /** Average session duration in seconds */
  avgSessionDuration: number

  /** Feature usage map (feature_name -> usage_count) */
  featureUsageMap: Record<string, number>

  /** Engagement score (0-100) */
  engagementScore: number

  /** Days since last activity */
  activityRecency: number

  /** Sessions per week */
  activityFrequency: number

  /** Most visited pages */
  topPages?: string[]

  /** Most used features */
  topFeatures?: string[]

  /** Total page views */
  pageViewCount?: number

  /** Total clicks */
  clickCount?: number

  /** Average pages per session */
  avgPagesPerSession?: number

  /** Bounce rate */
  bounceRate?: number
}

/**
 * User transaction data
 *
 * Tracks purchase history and monetary value.
 */
export interface TransactionData {
  /** Total number of purchases */
  totalPurchases: number

  /** Total revenue generated */
  totalRevenue: number

  /** Average order value */
  averageOrderValue: number

  /** Last purchase date */
  lastPurchaseDate?: Date

  /** Current subscription tier */
  subscriptionTier?: string

  /** Subscription start date */
  subscriptionStartDate?: Date

  /** Subscription end date (for trials/expired) */
  subscriptionEndDate?: Date

  /** Customer lifetime value */
  customerLifetimeValue: number

  /** Purchases per month */
  purchaseFrequency: number

  /** Days since last purchase */
  daysSinceLastPurchase?: number

  /** Preferred payment method */
  preferredPaymentMethod?: string

  /** Currency */
  currency?: string

  /** Total refunds */
  totalRefunds?: number

  /** Refund amount */
  refundAmount?: number

  /** Cart abandonment count */
  cartAbandonmentCount?: number
}

/**
 * User preferences
 *
 * User settings and communication preferences.
 */
export interface UserPreferences {
  /** Email notifications enabled */
  emailNotifications: boolean

  /** Push notifications enabled */
  pushNotifications: boolean

  /** SMS notifications enabled */
  smsNotifications: boolean

  /** Marketing emails enabled */
  marketingEmails: boolean

  /** Preferred communication channel */
  preferredChannel?: 'email' | 'sms' | 'push' | 'in_app'

  /** Notification frequency */
  notificationFrequency?: 'immediate' | 'daily' | 'weekly' | 'never'

  /** Theme preference */
  theme?: 'light' | 'dark' | 'auto'

  /** Language preference */
  language?: string

  /** Timezone preference */
  timezone?: string

  /** Custom preferences */
  custom?: Record<string, any>
}

/**
 * User consent and privacy
 *
 * Tracks user consent for data collection and privacy settings.
 */
export interface ConsentData {
  /** General data collection consent */
  dataCollectionConsent: boolean

  /** Marketing consent */
  marketingConsent: boolean

  /** Analytics tracking consent */
  analyticsConsent: boolean

  /** Third-party sharing consent */
  thirdPartyConsent: boolean

  /** Date consent was given */
  consentDate?: Date

  /** Date consent was last updated */
  consentUpdatedDate?: Date

  /** IP address at consent time */
  consentIpAddress?: string

  /** GDPR compliance flag */
  gdprCompliant: boolean

  /** CCPA compliance flag */
  ccpaCompliant: boolean

  /** Right to be forgotten requested */
  deletionRequested: boolean

  /** Deletion request date */
  deletionRequestDate?: Date
}

/**
 * User social data
 *
 * Social connections and referrals.
 */
export interface SocialData {
  /** Referral code */
  referralCode?: string

  /** Referred by user ID */
  referredBy?: string

  /** Referral source */
  referralSource?: string

  /** Number of successful referrals */
  referralCount: number

  /** Social media connections */
  socialConnections?: {
    facebook?: string
    twitter?: string
    linkedin?: string
    instagram?: string
    wechat?: string
  }

  /** Has shared content */
  hasShared: boolean

  /** Share count */
  shareCount: number

  /** Following count */
  followingCount?: number

  /** Followers count */
  followersCount?: number
}

/**
 * User risk and fraud data
 *
 * Risk assessment and fraud detection flags.
 */
export interface RiskData {
  /** Risk score (0-100, higher = riskier) */
  riskScore: number

  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'

  /** Fraud flags */
  fraudFlags: string[]

  /** Verification status */
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed'

  /** Identity verification date */
  verificationDate?: Date

  /** Payment verification status */
  paymentVerified: boolean

  /** Email verified */
  emailVerified: boolean

  /** Phone verified */
  phoneVerified: boolean

  /** Account locked */
  accountLocked: boolean

  /** Lock reason */
  lockReason?: string

  /** Lock date */
  lockDate?: Date
}

/**
 * Complete user profile
 *
 * Comprehensive user data structure combining all profile aspects.
 */
export interface UserProfile {
  /** Unique user identifier */
  userId: string

  /** Email address */
  email: string

  /** Full name */
  name?: string

  /** First name */
  firstName?: string

  /** Last name */
  lastName?: string

  /** Display name / username */
  displayName?: string

  /** Profile photo URL */
  photoUrl?: string

  /** Signup date */
  signupDate: Date

  /** Account status */
  accountStatus: 'active' | 'suspended' | 'deleted' | 'pending'

  // Profile data sections
  /** Demographic information */
  demographics: Demographics

  /** Behavioral data */
  behavioral: BehavioralData

  /** Transaction history */
  transactions: TransactionData

  /** User preferences */
  preferences: UserPreferences

  /** Consent and privacy */
  consent: ConsentData

  /** Social data */
  social: SocialData

  /** Risk assessment */
  risk: RiskData

  // Tags and segments
  /** User tags */
  tags: string[]

  /** Segment memberships */
  segments: string[]

  /** Custom attributes */
  customAttributes: Record<string, any>

  // Metadata
  /** Creation timestamp */
  createdAt: Date

  /** Last update timestamp */
  updatedAt: Date

  /** Last activity timestamp */
  lastActivityAt?: Date

  /** Data source */
  source?: string

  /** External IDs (for integrations) */
  externalIds?: Record<string, string>
}

/**
 * User profile summary
 *
 * Lightweight profile for list views and quick reference.
 */
export interface UserProfileSummary {
  userId: string
  email: string
  name?: string
  photoUrl?: string
  engagementScore: number
  totalRevenue: number
  lastActivityAt?: Date
  accountStatus: 'active' | 'suspended' | 'deleted' | 'pending'
}

/**
 * User profile update
 *
 * Partial update structure for modifying user profiles.
 */
export interface UserProfileUpdate {
  demographics?: Partial<Demographics>
  behavioral?: Partial<BehavioralData>
  transactions?: Partial<TransactionData>
  preferences?: Partial<UserPreferences>
  consent?: Partial<ConsentData>
  social?: Partial<SocialData>
  risk?: Partial<RiskData>
  tags?: string[]
  segments?: string[]
  customAttributes?: Record<string, any>
}

/**
 * User cohort definition
 *
 * Group of users for cohort analysis.
 */
export interface UserCohort {
  /** Cohort identifier */
  cohortId: string

  /** Cohort name */
  name: string

  /** Cohort description */
  description?: string

  /** Cohort start date */
  startDate: Date

  /** Cohort end date */
  endDate?: Date

  /** Number of users in cohort */
  userCount: number

  /** Cohort definition criteria */
  criteria: {
    signupDateStart?: Date
    signupDateEnd?: Date
    acquisitionChannel?: string
    initialSegment?: string
    customCriteria?: Record<string, any>
  }

  /** Cohort metrics */
  metrics?: {
    retentionRate?: number
    conversionRate?: number
    avgLifetimeValue?: number
    churnRate?: number
  }
}

/**
 * User activity summary
 *
 * Aggregated user activity for reporting.
 */
export interface UserActivitySummary {
  userId: string
  period: 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date

  sessions: number
  pageViews: number
  clicks: number
  duration: number // seconds
  featuresUsed: string[]
  purchases: number
  revenue: number

  comparisonToPrevious?: {
    sessionsChange: number
    pageViewsChange: number
    durationChange: number
    revenueChange: number
  }
}

/**
 * User score card
 *
 * Key performance indicators for a user.
 */
export interface UserScoreCard {
  userId: string
  generatedAt: Date

  scores: {
    engagement: number // 0-100
    value: number // 0-100
    loyalty: number // 0-100
    advocacy: number // 0-100
    risk: number // 0-100
    overall: number // 0-100
  }

  ranks: {
    engagementPercentile: number // 0-100
    valuePercentile: number // 0-100
    overallPercentile: number // 0-100
  }

  badges: string[]
  achievements: string[]
}

/**
 * Default user profile structure
 *
 * Used when creating new users.
 */
export function createDefaultUserProfile(userId: string, email: string): UserProfile {
  const now = new Date()

  return {
    userId,
    email,
    signupDate: now,
    accountStatus: 'active',

    demographics: {},

    behavioral: {
      sessionCount: 0,
      totalSessionDuration: 0,
      avgSessionDuration: 0,
      featureUsageMap: {},
      engagementScore: 0,
      activityRecency: 0,
      activityFrequency: 0
    },

    transactions: {
      totalPurchases: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      customerLifetimeValue: 0,
      purchaseFrequency: 0
    },

    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: true
    },

    consent: {
      dataCollectionConsent: true,
      marketingConsent: false,
      analyticsConsent: true,
      thirdPartyConsent: false,
      consentDate: now,
      gdprCompliant: true,
      ccpaCompliant: true,
      deletionRequested: false
    },

    social: {
      referralCount: 0,
      hasShared: false,
      shareCount: 0
    },

    risk: {
      riskScore: 0,
      riskLevel: 'low',
      fraudFlags: [],
      verificationStatus: 'unverified',
      paymentVerified: false,
      emailVerified: false,
      phoneVerified: false,
      accountLocked: false
    },

    tags: [],
    segments: [],
    customAttributes: {},

    createdAt: now,
    updatedAt: now
  }
}

/**
 * Helper function to calculate engagement score
 *
 * Based on recency, frequency, and depth of engagement.
 */
export function calculateEngagementScore(behavioral: BehavioralData): number {
  // Recency score (0-40 points) - more recent = higher score
  const recencyScore = Math.max(0, 40 - behavioral.activityRecency)

  // Frequency score (0-30 points) - sessions per week
  const frequencyScore = Math.min(30, behavioral.activityFrequency * 5)

  // Depth score (0-30 points) - features used
  const featuresUsed = Object.keys(behavioral.featureUsageMap).length
  const depthScore = Math.min(30, featuresUsed * 3)

  return Math.round(recencyScore + frequencyScore + depthScore)
}

/**
 * Helper function to determine user value tier
 */
export function getUserValueTier(transactions: TransactionData): 'bronze' | 'silver' | 'gold' | 'platinum' {
  const ltv = transactions.customerLifetimeValue

  if (ltv >= 10000) return 'platinum'
  if (ltv >= 5000) return 'gold'
  if (ltv >= 1000) return 'silver'
  return 'bronze'
}

/**
 * Helper function to check if user is at risk of churning
 */
export function isAtRiskOfChurn(behavioral: BehavioralData): boolean {
  // At risk if:
  // - Last activity > 14 days ago
  // - Engagement score < 40
  // - Declining activity frequency
  return (
    behavioral.activityRecency > 14 ||
    behavioral.engagementScore < 40 ||
    behavioral.activityFrequency < 1
  )
}
