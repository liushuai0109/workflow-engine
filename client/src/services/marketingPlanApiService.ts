/**
 * Marketing Plan API Service
 * 提供营销方案相关的 API 调用
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export interface MarketingPlan {
  id: string
  conversationId: string
  version: number
  status: MarketingPlanStatus
  createdAt: string
  updatedAt: string

  // Core Fields
  title: string
  description?: string

  // Timeline
  timeline: {
    startDate: string
    endDate: string
    milestones?: Array<{
      date: string
      name: string
      deliverables: string[]
    }>
  }

  // Objectives
  objectives: {
    primary: string
    secondary?: string[]
    kpis?: Array<{
      metric: string
      target: string
      timeframe: string
    }>
  }

  // Channels
  channels: Array<{
    name: string
    type: 'online' | 'offline'
    priority: 'high' | 'medium' | 'low'
    budget?: number
    description?: string
  }>

  // Target Audience
  targetAudience: {
    demographics?: string[]
    interests?: string[]
    behaviors?: string[]
    segments?: string[]
    estimatedSize?: number
  }

  // Strategies
  strategies: Array<{
    name: string
    channel: string
    approach: string
    tactics?: string[]
    budget?: number
    expectedOutcome?: string
  }>

  // Budget Summary
  budget?: {
    total: number
    currency: string
    breakdown?: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }

  // Raw AI content
  rawContent?: string
}

export enum MarketingPlanStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface CreateMarketingPlanRequest {
  conversationId: string
  title: string
  description?: string
  timeline?: MarketingPlan['timeline']
  objectives?: MarketingPlan['objectives']
  channels?: MarketingPlan['channels']
  targetAudience?: MarketingPlan['targetAudience']
  strategies?: MarketingPlan['strategies']
  budget?: MarketingPlan['budget']
  rawContent?: string
}

export interface ListMarketingPlansResponse {
  success: boolean
  data: MarketingPlan[]
  metadata?: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface GetMarketingPlanResponse {
  success: boolean
  data: MarketingPlan
}

class MarketingPlanApiService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data as T
  }

  /**
   * 创建营销方案
   */
  async createPlan(data: CreateMarketingPlanRequest): Promise<MarketingPlan> {
    const response = await this.request<{ success: boolean; data: MarketingPlan }>(
      '/marketing-plans',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    return response.data
  }

  /**
   * 获取营销方案列表
   */
  async listPlans(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: MarketingPlanStatus
      conversationId?: string
    }
  ): Promise<ListMarketingPlansResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    })

    if (filters?.status) {
      params.append('status', filters.status)
    }

    if (filters?.conversationId) {
      params.append('conversationId', filters.conversationId)
    }

    return this.request<ListMarketingPlansResponse>(
      `/marketing-plans?${params.toString()}`
    )
  }

  /**
   * 获取营销方案详情
   */
  async getPlan(id: string): Promise<GetMarketingPlanResponse> {
    return this.request<GetMarketingPlanResponse>(`/marketing-plans/${id}`)
  }

  /**
   * 更新营销方案
   */
  async updatePlan(id: string, updates: Partial<MarketingPlan>): Promise<MarketingPlan> {
    const response = await this.request<{ success: boolean; data: MarketingPlan }>(
      `/marketing-plans/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    )
    return response.data
  }

  /**
   * 删除营销方案
   */
  async deletePlan(id: string): Promise<void> {
    await this.request(`/marketing-plans/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * 通过会话 ID 获取营销方案
   * 如果方案不存在返回 null（不抛出错误）
   */
  async getPlanByConversation(conversationId: string): Promise<MarketingPlan | null> {
    const url = `${this.baseUrl}/conversations/${conversationId}/plan`
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // 404 表示方案不存在，这是正常情况
      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data as MarketingPlan
    } catch (error: any) {
      // 网络错误或其他错误
      if (error.message.includes('404') || error.message.includes('not found')) {
        return null
      }
      throw error
    }
  }
}

// 导出单例
export const marketingPlanApiService = new MarketingPlanApiService()
