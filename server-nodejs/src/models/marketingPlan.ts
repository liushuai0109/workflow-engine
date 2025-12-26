export interface MarketingPlan {
  id: string;
  conversationId: string;
  version: number;
  status: MarketingPlanStatus;
  createdAt: Date;
  updatedAt: Date;

  // Core Fields
  title: string;
  description?: string;

  // Timeline
  timeline: {
    startDate: string;
    endDate: string;
    milestones?: Array<{
      date: string;
      name: string;
      deliverables: string[];
    }>;
  };

  // Objectives
  objectives: {
    primary: string;
    secondary?: string[];
    kpis?: Array<{
      metric: string;
      target: string;
      timeframe: string;
    }>;
  };

  // Channels
  channels: Array<{
    name: string;
    type: 'online' | 'offline';
    priority: 'high' | 'medium' | 'low';
    budget?: number;
    description?: string;
  }>;

  // Target Audience
  targetAudience: {
    demographics?: string[];
    interests?: string[];
    behaviors?: string[];
    segments?: string[];
    estimatedSize?: number;
  };

  // Strategies
  strategies: Array<{
    name: string;
    channel: string;
    approach: string;
    tactics?: string[];
    budget?: number;
    expectedOutcome?: string;
  }>;

  // Budget Summary
  budget?: {
    total: number;
    currency: string;
    breakdown?: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };

  // Raw AI content
  rawContent?: string;
}

export enum MarketingPlanStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  filterConditions: FilterCondition[];
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: string | number | string[];
  label: string;
}

export interface AudienceRecommendation {
  audienceId: string;
  audienceName: string;

  // Core metrics
  size: number;
  marketShare: number; // 0-1
  conversionRate: number; // 0-1

  // Editable tags
  valueTags: string[];
  profileTags: string[];

  // Detailed demographics
  demographics?: {
    ageDistribution?: Array<{ range: string; percentage: number }>;
    genderDistribution?: Array<{ gender: string; percentage: number }>;
    regionDistribution?: Array<{ region: string; percentage: number }>;
  };

  // Behaviors
  behaviors?: string[];

  // Recommendation reason
  recommendationReason?: string;
}

export interface FlowChartData {
  id: string;
  type: 'user_journey';
  title: string;
  nodes: Array<{
    id: string;
    type: 'stage' | 'action' | 'decision' | 'touchpoint';
    label: string;
    description?: string;
    channel?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
  diagramData: string;
  generatedAt: Date;
}
