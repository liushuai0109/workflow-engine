/**
 * Audience Selection Composable
 * 封装人群选择和推荐的逻辑
 */

import { ref, computed } from 'vue'

// 人群基础信息
export interface Audience {
  id: string
  name: string
  description: string
  size: number
  filterConditions?: FilterCondition[]
  createdAt?: string
  updatedAt?: string
}

// 筛选条件
export interface FilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains'
  value: string | number | string[]
  label: string
}

// 人群推荐详情
export interface AudienceRecommendation {
  audienceId: string
  audienceName: string
  size: number
  marketShare: number // 百分比 0-100
  conversionRate: number // 百分比 0-100
  valueTags: string[] // 价值分层标签（可编辑）
  profileTags: string[] // 画像指标标签（可编辑）
  demographics?: {
    ageDistribution?: Array<{ range: string; percentage: number }>
    genderDistribution?: Array<{ gender: string; percentage: number }>
    regionDistribution?: Array<{ region: string; percentage: number }>
  }
  behaviors?: string[]
  recommendationReason?: string
  confirmed: boolean
}

// Mock 人群数据
const MOCK_AUDIENCES: Audience[] = [
  {
    id: 'aud-1',
    name: '高价值会员',
    description: '近3个月消费>5000元，活跃度高',
    size: 50000,
    filterConditions: [
      { field: 'total_spend_90d', operator: 'gt', value: 5000, label: '近3个月消费>5000元' },
      { field: 'activity_score', operator: 'gt', value: 80, label: '活跃度分数>80' }
    ]
  },
  {
    id: 'aud-2',
    name: '新用户',
    description: '注册时间<30天，未完成首购',
    size: 120000,
    filterConditions: [
      { field: 'register_days', operator: 'lt', value: 30, label: '注册时间<30天' },
      { field: 'first_purchase', operator: 'eq', value: 0, label: '未完成首购' }
    ]
  },
  {
    id: 'aud-3',
    name: '流失预警用户',
    description: '60天未活跃，曾是高价值用户',
    size: 35000,
    filterConditions: [
      { field: 'last_active_days', operator: 'gt', value: 60, label: '60天未活跃' },
      { field: 'historical_value', operator: 'eq', value: 'high', label: '曾是高价值用户' }
    ]
  }
]

// Mock 人群推荐数据
const MOCK_RECOMMENDATIONS: Record<string, Omit<AudienceRecommendation, 'confirmed'>> = {
  'aud-1': {
    audienceId: 'aud-1',
    audienceName: '高价值会员',
    size: 50000,
    marketShare: 15,
    conversionRate: 32,
    valueTags: ['高净值', '活跃用户', '复购率高'],
    profileTags: ['25-35岁', '一线城市', '白领', '高消费能力'],
    demographics: {
      ageDistribution: [
        { range: '18-24', percentage: 15 },
        { range: '25-34', percentage: 45 },
        { range: '35-44', percentage: 30 },
        { range: '45+', percentage: 10 }
      ],
      genderDistribution: [
        { gender: '女', percentage: 62 },
        { gender: '男', percentage: 38 }
      ],
      regionDistribution: [
        { region: '一线城市', percentage: 55 },
        { region: '二线城市', percentage: 30 },
        { region: '其他', percentage: 15 }
      ]
    },
    behaviors: ['频繁浏览新品', '参与会员活动', '使用优惠券'],
    recommendationReason: '该人群具有高购买力和品牌忠诚度，是促销活动的核心目标群体'
  },
  'aud-2': {
    audienceId: 'aud-2',
    audienceName: '新用户',
    size: 120000,
    marketShare: 25,
    conversionRate: 18,
    valueTags: ['新用户', '潜力用户', '待转化'],
    profileTags: ['18-30岁', '多渠道', '价格敏感'],
    demographics: {
      ageDistribution: [
        { range: '18-24', percentage: 40 },
        { range: '25-34', percentage: 45 },
        { range: '35-44', percentage: 12 },
        { range: '45+', percentage: 3 }
      ],
      genderDistribution: [
        { gender: '女', percentage: 55 },
        { gender: '男', percentage: 45 }
      ],
      regionDistribution: [
        { region: '一线城市', percentage: 35 },
        { region: '二线城市', percentage: 40 },
        { region: '其他', percentage: 25 }
      ]
    },
    behaviors: ['浏览但未购买', '关注优惠信息', '比较多个商品'],
    recommendationReason: '新用户群体规模大，通过首购优惠可有效提升转化率'
  },
  'aud-3': {
    audienceId: 'aud-3',
    audienceName: '流失预警用户',
    size: 35000,
    marketShare: 8,
    conversionRate: 12,
    valueTags: ['流失风险', '曾高价值', '需唤醒'],
    profileTags: ['30-45岁', '高历史消费', '长期未活跃'],
    demographics: {
      ageDistribution: [
        { range: '18-24', percentage: 10 },
        { range: '25-34', percentage: 35 },
        { range: '35-44', percentage: 40 },
        { range: '45+', percentage: 15 }
      ],
      genderDistribution: [
        { gender: '女', percentage: 58 },
        { gender: '男', percentage: 42 }
      ],
      regionDistribution: [
        { region: '一线城市', percentage: 45 },
        { region: '二线城市', percentage: 35 },
        { region: '其他', percentage: 20 }
      ]
    },
    behaviors: ['历史高频购买', '参与过会员活动', '近期无互动'],
    recommendationReason: '曾是高价值用户，通过专属优惠和关怀可有效挽回'
  }
}

export function useAudienceSelection() {
  // 人群列表
  const audiences = ref<Audience[]>([])

  // 当前选中的人群 ID
  const selectedAudienceId = ref<string | null>(null)

  // 人群推荐详情
  const recommendation = ref<AudienceRecommendation | null>(null)

  // 加载状态
  const loading = ref(false)
  const loadingRecommendation = ref(false)

  // 错误状态
  const error = ref<string | null>(null)

  // 获取当前选中的人群
  const selectedAudience = computed(() => {
    if (!selectedAudienceId.value) return null
    return audiences.value.find(a => a.id === selectedAudienceId.value) || null
  })

  /**
   * 获取已划分的人群列表
   * 当前使用 Mock 数据，后续可对接真实 API
   */
  const fetchAudiences = async (): Promise<Audience[]> => {
    loading.value = true
    error.value = null

    try {
      // TODO: 替换为真实 API 调用
      // const response = await fetch('/api/audiences')
      // const data = await response.json()
      // audiences.value = data.audiences

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500))

      // 使用 Mock 数据
      audiences.value = [...MOCK_AUDIENCES]
      return audiences.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取人群列表失败'
      console.error('Failed to fetch audiences:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取人群推荐详情
   * @param audienceId 人群 ID
   */
  const fetchRecommendation = async (audienceId: string): Promise<AudienceRecommendation | null> => {
    loadingRecommendation.value = true
    error.value = null

    try {
      // TODO: 替换为真实 API 调用
      // const response = await fetch(`/api/audiences/${audienceId}/recommendation`)
      // const data = await response.json()
      // recommendation.value = { ...data, confirmed: false }

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 800))

      // 使用 Mock 数据
      const mockData = MOCK_RECOMMENDATIONS[audienceId]
      if (mockData) {
        recommendation.value = { ...mockData, confirmed: false }
        return recommendation.value
      }

      error.value = '未找到该人群的推荐详情'
      return null
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取推荐详情失败'
      console.error('Failed to fetch recommendation:', e)
      return null
    } finally {
      loadingRecommendation.value = false
    }
  }

  /**
   * 选择人群
   * @param audienceId 人群 ID
   */
  const selectAudience = (audienceId: string) => {
    selectedAudienceId.value = audienceId
    // 清除之前的推荐数据
    recommendation.value = null
  }

  /**
   * 更新价值分层标签
   * @param tags 新的标签数组
   */
  const updateValueTags = (tags: string[]) => {
    if (recommendation.value) {
      recommendation.value.valueTags = tags
    }
  }

  /**
   * 更新画像指标标签
   * @param tags 新的标签数组
   */
  const updateProfileTags = (tags: string[]) => {
    if (recommendation.value) {
      recommendation.value.profileTags = tags
    }
  }

  /**
   * 确认人群选择
   */
  const confirmSelection = async (): Promise<boolean> => {
    if (!recommendation.value) {
      error.value = '请先选择人群并获取推荐详情'
      return false
    }

    try {
      // TODO: 调用后端 API 保存确认
      // await fetch(`/api/audiences/${selectedAudienceId.value}/confirm`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     valueTags: recommendation.value.valueTags,
      //     profileTags: recommendation.value.profileTags
      //   })
      // })

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300))

      recommendation.value.confirmed = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '确认选择失败'
      console.error('Failed to confirm selection:', e)
      return false
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    audiences.value = []
    selectedAudienceId.value = null
    recommendation.value = null
    error.value = null
  }

  /**
   * 创建新人群（占位功能）
   */
  const createNewAudience = () => {
    // TODO: 实现创建新人群的逻辑
    console.log('Create new audience - not implemented yet')
    error.value = '新建人群功能暂未开放'
  }

  return {
    // State
    audiences,
    selectedAudienceId,
    selectedAudience,
    recommendation,
    loading,
    loadingRecommendation,
    error,

    // Methods
    fetchAudiences,
    fetchRecommendation,
    selectAudience,
    updateValueTags,
    updateProfileTags,
    confirmSelection,
    reset,
    createNewAudience
  }
}
