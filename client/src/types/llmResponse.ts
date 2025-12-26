/**
 * LLM 响应类型定义
 *
 * 用于定义 MarketAgent 返回的结构化响应格式
 */

import type { MarketingPlanFormData } from '../composables/useMarketingPlanForm'

// LLM 响应类型枚举
export type LLMResponseType =
  | 'plan_form'                  // 营销方案表单
  | 'audience_selector'          // 人群选择界面
  | 'audience_recommendation'    // 人群推荐详情
  | 'reach_strategy'             // 触达策略流程图（Mermaid 格式）
  | 'product_config'             // 商品推荐配置
  | 'smart_strategy'             // 智能策略详情
  | 'channel_selector'           // 推广渠道选择
  | 'channel_copy'               // 个性化渠道文案
  | 'bpmn_flow'                  // BPMN 可执行流程图
  | 'campaign_report'            // 活动复盘报告
  | 'text'                       // 纯文本回复

// 人群数据
export interface AudienceItem {
  id: string
  name: string
  description: string
  size: number
}

// 人群选择器数据
export interface AudienceSelectorData {
  audiences: AudienceItem[]
  selected?: string | null
}

// 人群推荐数据
export interface AudienceRecommendationData {
  audienceId: string
  audienceName: string
  size: number
  marketShare: number
  conversionRate: number
  valueTags: string[]
  profileTags: string[]
  confirmed: boolean
}

// 触达策略数据
export interface ReachStrategyStage {
  name: string
  channels: string[]
  actions: string[]
}

export interface LLMReachStrategyData {
  mermaidCode?: string
  stages: ReachStrategyStage[]
  confirmed: boolean
}

// 商品配置数据
export interface ProductItem {
  id: string
  name: string
  category: string
  price: number
  selected: boolean
}

export interface CouponItem {
  id: string
  name: string
  discount: string
  conditions: string
  selected: boolean
}

export interface BenefitItem {
  id: string
  name: string
  description: string
  selected: boolean
}

export interface LLMProductConfigData {
  products: ProductItem[]
  coupons: CouponItem[]
  benefits: BenefitItem[]
  confirmed: boolean
}

// 智能策略数据
export interface StrategyRule {
  condition: string
  action: string
  priority: number
}

export interface LLMSmartStrategyData {
  strategyName: string
  description: string
  rules: StrategyRule[]
  expectedConversion: number
  confirmed: boolean
}

// 渠道选择器数据
export interface LLMChannelSelectorData {
  channels: string[]
  selectedChannels: string[]
  confirmed: boolean
}

// 渠道文案数据
export interface ChannelCopyItem {
  channel: string
  title: string
  content: string
  imageUrl?: string
}

export interface LLMChannelCopyData {
  copies: ChannelCopyItem[]
  confirmed: boolean
}

// BPMN 流程数据
export interface BpmnNode {
  id: string
  type: 'start' | 'end' | 'service' | 'user' | 'timer' | 'gateway'
  name: string
  description?: string
  config?: Record<string, string>
}

export interface BpmnConnection {
  from: string
  to: string
  label?: string
}

export interface BpmnSummary {
  estimatedReach: number
  duration: string
  automatedNodes: number
  manualNodes: number
}

export interface LLMBpmnFlowData {
  nodes: BpmnNode[]
  connections: BpmnConnection[]
  summary: BpmnSummary
  bpmnXml?: string
  confirmed: boolean
}

// 活动报告指标
export interface CampaignMetric {
  name: string
  value: number
  unit?: string
  target?: number
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
}

// 渠道表现
export interface ChannelPerformance {
  channel: string
  channelName: string
  reach: number
  clicks: number
  conversions: number
  conversionRate: number
}

// 洞察项
export interface InsightItem {
  type: 'success' | 'improvement' | 'warning'
  title: string
  description: string
}

// 优化建议
export interface RecommendationItem {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface LLMCampaignReportData {
  campaignId: string
  campaignName: string
  status: 'running' | 'completed' | 'paused'
  timeline: {
    startDate: string
    endDate: string
  }
  metrics: CampaignMetric[]
  channelPerformance: ChannelPerformance[]
  insights: InsightItem[]
  recommendations: RecommendationItem[]
}

// LLM 响应的数据联合类型
export type LLMResponseData =
  | MarketingPlanFormData
  | AudienceSelectorData
  | AudienceRecommendationData
  | LLMReachStrategyData
  | LLMProductConfigData
  | LLMSmartStrategyData
  | LLMChannelSelectorData
  | LLMChannelCopyData
  | LLMBpmnFlowData
  | LLMCampaignReportData
  | string  // for text type

// LLM 响应接口
export interface LLMResponse {
  responseType: LLMResponseType
  data: LLMResponseData
  message: string
}

// 解析结果接口
export interface LLMParseResult {
  success: boolean
  response?: LLMResponse
  error?: string
  rawContent?: string
}
