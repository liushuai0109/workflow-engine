/**
 * Marketing Plan Form Composable
 * 封装营销方案表单的生成、验证和转换逻辑
 */

import { ref, reactive } from 'vue'
import type { MarketingPlan } from '../services/marketingPlanApiService'

// 表单数据类型
export interface MarketingPlanFormData {
  title: string
  dateRange: [string, string]
  objectives: string
  channels: string[]
  targetAudience: string
  strategies: string
}

// AI 输出格式规范（JSON Schema）
// 定义 AI 应该返回的营销方案数据结构
export interface AIMarketingPlanOutput {
  // 中文字段名（AI 常用）
  活动主题?: string
  活动名称?: string
  开始时间?: string
  结束时间?: string
  活动时间?: string | { 开始: string; 结束: string }
  活动目标?: string
  触达渠道?: string[] | string
  活动人群?: string
  目标人群?: string
  活动策略?: string

  // 英文字段名（结构化）
  title?: string
  name?: string
  timeline?: {
    startDate?: string
    endDate?: string
    start?: string
    end?: string
  }
  dateRange?: [string, string] | { start: string; end: string }
  objectives?: string | {
    primary?: string
    secondary?: string[]
  }
  channels?: Array<string | { name?: string; value?: string; type?: string }>
  targetAudience?: string | {
    segments?: string[]
    demographics?: string[]
    description?: string
  }
  strategies?: string | Array<string | { name?: string; approach?: string; description?: string }>
}

// 解析结果类型
export interface ParseResult {
  success: boolean
  data: MarketingPlanFormData
  error?: string
  rawContent?: string
}

// 渠道选项
export const channelOptions = [
  { label: '微信公众号', value: 'wechat_official' },
  { label: '微信小程序', value: 'wechat_mini' },
  { label: '抖音', value: 'douyin' },
  { label: '小红书', value: 'xiaohongshu' },
  { label: '微博', value: 'weibo' },
  { label: '短信', value: 'sms' },
  { label: '邮件', value: 'email' },
  { label: 'APP Push', value: 'app_push' },
  { label: '线下活动', value: 'offline' }
]

// 表单验证规则
export const formRules = {
  title: [
    { required: true, message: '请输入活动主题', trigger: 'blur' },
    { min: 2, max: 100, message: '活动主题长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  dateRange: [
    { required: true, message: '请选择活动时间', trigger: 'change', type: 'array' }
  ],
  objectives: [
    { required: true, message: '请输入活动目标', trigger: 'blur' },
    { min: 10, message: '请详细描述活动目标（至少10个字符）', trigger: 'blur' }
  ],
  channels: [
    { required: true, message: '请选择至少一个触达渠道', trigger: 'change', type: 'array', min: 1 }
  ],
  targetAudience: [
    { required: true, message: '请描述目标人群', trigger: 'blur' },
    { min: 10, message: '请详细描述目标人群（至少10个字符）', trigger: 'blur' }
  ],
  strategies: [
    { required: true, message: '请描述营销策略', trigger: 'blur' },
    { min: 10, message: '请详细描述营销策略（至少10个字符）', trigger: 'blur' }
  ]
}

export function useMarketingPlanForm() {
  // 表单数据
  const formData = ref<MarketingPlanFormData>({
    title: '',
    dateRange: ['', ''],
    objectives: '',
    channels: [],
    targetAudience: '',
    strategies: ''
  })

  // 表单是否已提交
  const isSubmitted = ref(false)

  // 表单是否正在提交
  const isSubmitting = ref(false)

  /**
   * 获取空的表单数据
   */
  const getEmptyFormData = (): MarketingPlanFormData => ({
    title: '',
    dateRange: ['', ''],
    objectives: '',
    channels: [],
    targetAudience: '',
    strategies: ''
  })

  /**
   * 尝试从文本中提取 JSON
   * 支持多种格式: ```json```, ````, 纯 JSON, 带前后文的 JSON
   */
  const extractJSONFromText = (text: string): object | null => {
    // 策略1: 提取 ```json ... ``` 代码块
    const jsonCodeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
      try {
        return JSON.parse(jsonCodeBlockMatch[1].trim())
      } catch (e) {
        console.warn('Failed to parse JSON from code block:', e)
      }
    }

    // 策略2: 提取 ``` ... ``` 代码块（无语言标识）
    const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        const content = codeBlockMatch[1].trim()
        // 检查是否像 JSON
        if (content.startsWith('{') || content.startsWith('[')) {
          return JSON.parse(content)
        }
      } catch (e) {
        console.warn('Failed to parse JSON from generic code block:', e)
      }
    }

    // 策略3: 尝试直接解析整个响应为 JSON
    try {
      const trimmed = text.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return JSON.parse(trimmed)
      }
    } catch (e) {
      // 不是纯 JSON
    }

    // 策略4: 提取文本中的 JSON 对象 {...}
    const jsonObjectMatch = text.match(/\{[\s\S]*"(?:活动主题|title|活动目标|objectives)"[\s\S]*\}/)
    if (jsonObjectMatch) {
      try {
        // 找到完整的 JSON 对象
        const start = text.indexOf(jsonObjectMatch[0])
        let depth = 0
        let end = start
        for (let i = start; i < text.length; i++) {
          if (text[i] === '{') depth++
          if (text[i] === '}') depth--
          if (depth === 0) {
            end = i + 1
            break
          }
        }
        return JSON.parse(text.substring(start, end))
      } catch (e) {
        console.warn('Failed to parse embedded JSON object:', e)
      }
    }

    return null
  }

  /**
   * 从纯文本中提取营销方案字段（无 JSON 时的回退策略）
   * 支持 Markdown 格式的标题和内容
   */
  const extractFieldsFromText = (text: string): Partial<MarketingPlanFormData> => {
    const result: Partial<MarketingPlanFormData> = {}

    // 提取活动主题/标题
    const titlePatterns = [
      /(?:活动主题|活动名称|营销主题|主题)[：:]\s*(.+?)(?:\n|$)/,
      /(?:##?\s*)?(?:活动主题|活动名称|营销主题|主题)\s*\n\s*(.+?)(?:\n|$)/,
      /^#\s*(.+?)(?:\n|$)/m
    ]
    for (const pattern of titlePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.title = match[1].trim()
        break
      }
    }

    // 提取活动时间
    const datePatterns = [
      /(?:活动时间|活动日期|时间范围)[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-~至到]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /(?:开始时间|开始日期)[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})[\s\S]*?(?:结束时间|结束日期)[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-~至到]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
    ]
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match && match[1] && match[2]) {
        result.dateRange = [match[1].replace(/\//g, '-'), match[2].replace(/\//g, '-')]
        break
      }
    }

    // 提取活动目标
    const objectivesPatterns = [
      /(?:活动目标|营销目标|目标)[：:]\s*([\s\S]+?)(?=\n(?:触达渠道|活动人群|活动策略|##|\*\*|$))/i,
      /(?:##?\s*)?(?:活动目标|营销目标)\s*\n([\s\S]+?)(?=\n(?:##|触达渠道|活动人群|活动策略|\*\*))/i
    ]
    for (const pattern of objectivesPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.objectives = match[1].trim()
        break
      }
    }

    // 提取触达渠道
    const channelPatterns = [
      /(?:触达渠道|营销渠道|渠道)[：:]\s*([\s\S]+?)(?=\n(?:活动人群|活动策略|##|\*\*|$))/i,
      /(?:##?\s*)?(?:触达渠道|营销渠道)\s*\n([\s\S]+?)(?=\n(?:##|活动人群|活动策略|\*\*))/i
    ]
    for (const pattern of channelPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        // 尝试解析渠道列表
        const channelText = match[1].trim()
        const channels: string[] = []

        // 检查是否包含已知渠道
        const knownChannels = [
          { patterns: ['微信公众号', '公众号'], value: 'wechat_official' },
          { patterns: ['微信小程序', '小程序'], value: 'wechat_mini' },
          { patterns: ['抖音'], value: 'douyin' },
          { patterns: ['小红书'], value: 'xiaohongshu' },
          { patterns: ['微博'], value: 'weibo' },
          { patterns: ['短信', 'SMS'], value: 'sms' },
          { patterns: ['邮件', '电子邮件', 'Email'], value: 'email' },
          { patterns: ['APP Push', 'APP推送', '推送'], value: 'app_push' },
          { patterns: ['线下活动', '线下'], value: 'offline' }
        ]

        for (const channel of knownChannels) {
          for (const pattern of channel.patterns) {
            if (channelText.includes(pattern)) {
              channels.push(channel.value)
              break
            }
          }
        }

        if (channels.length > 0) {
          result.channels = channels
        }
        break
      }
    }

    // 提取活动人群
    const audiencePatterns = [
      /(?:活动人群|目标人群|受众)[：:]\s*([\s\S]+?)(?=\n(?:活动策略|##|\*\*|$))/i,
      /(?:##?\s*)?(?:活动人群|目标人群)\s*\n([\s\S]+?)(?=\n(?:##|活动策略|\*\*))/i
    ]
    for (const pattern of audiencePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.targetAudience = match[1].trim()
        break
      }
    }

    // 提取活动策略
    const strategyPatterns = [
      /(?:活动策略|营销策略|策略)[：:]\s*([\s\S]+?)(?=\n(?:##|\*\*|$)|$)/i,
      /(?:##?\s*)?(?:活动策略|营销策略)\s*\n([\s\S]+?)$/i
    ]
    for (const pattern of strategyPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        result.strategies = match[1].trim()
        break
      }
    }

    return result
  }

  /**
   * 从 AI 响应中生成表单初始值
   * AI 应该返回包含营销方案的 JSON 或结构化文本
   *
   * 返回 ParseResult 包含解析是否成功的标识
   */
  const parseAIResponse = (aiResponse: string): ParseResult => {
    const emptyData = getEmptyFormData()

    if (!aiResponse || typeof aiResponse !== 'string') {
      return {
        success: false,
        data: emptyData,
        error: 'AI 响应为空或格式不正确',
        rawContent: aiResponse
      }
    }

    try {
      // 策略1: 尝试提取 JSON
      const jsonData = extractJSONFromText(aiResponse)
      if (jsonData) {
        const formData = parseAIDataToFormData(jsonData)
        // 检查是否解析出了有效数据
        const hasValidData = formData.title || formData.objectives || formData.strategies
        if (hasValidData) {
          return {
            success: true,
            data: formData,
            rawContent: aiResponse
          }
        }
      }

      // 策略2: 从纯文本中提取字段
      const textFields = extractFieldsFromText(aiResponse)
      if (Object.keys(textFields).length > 0) {
        const formData: MarketingPlanFormData = {
          ...emptyData,
          ...textFields
        }
        // 检查是否解析出了有效数据
        const hasValidData = formData.title || formData.objectives || formData.strategies
        if (hasValidData) {
          return {
            success: true,
            data: formData,
            rawContent: aiResponse
          }
        }
      }

      // 策略3: 解析失败，返回原始内容
      return {
        success: false,
        data: emptyData,
        error: '无法从 AI 响应中解析出营销方案数据',
        rawContent: aiResponse
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return {
        success: false,
        data: emptyData,
        error: error instanceof Error ? error.message : '解析过程发生未知错误',
        rawContent: aiResponse
      }
    }
  }

  /**
   * 从 AI 响应中生成表单初始值（兼容旧 API）
   * @deprecated 请使用 parseAIResponse 获取更详细的解析结果
   */
  const generateFormFromAIResponse = (aiResponse: string): MarketingPlanFormData => {
    const result = parseAIResponse(aiResponse)
    return result.data
  }

  /**
   * 解析 AI 数据到表单格式
   * 支持多种字段名格式（中英文）和数据结构
   */
  const parseAIDataToFormData = (data: any): MarketingPlanFormData => {
    // 解析标题
    const title = data.title || data.name || data.活动主题 || data.活动名称 || ''

    // 解析日期范围
    let dateRange: [string, string] = ['', '']
    if (data.timeline) {
      dateRange = [
        data.timeline.startDate || data.timeline.start || '',
        data.timeline.endDate || data.timeline.end || ''
      ]
    } else if (data.dateRange) {
      if (Array.isArray(data.dateRange)) {
        dateRange = [data.dateRange[0] || '', data.dateRange[1] || '']
      } else if (typeof data.dateRange === 'object') {
        dateRange = [data.dateRange.start || '', data.dateRange.end || '']
      }
    } else if (data.活动时间) {
      if (typeof data.活动时间 === 'string') {
        // 尝试解析 "2024-01-01 至 2024-01-31" 格式
        const match = data.活动时间.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-~至到]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
        if (match) {
          dateRange = [match[1].replace(/\//g, '-'), match[2].replace(/\//g, '-')]
        }
      } else if (typeof data.活动时间 === 'object') {
        dateRange = [data.活动时间.开始 || data.活动时间.start || '', data.活动时间.结束 || data.活动时间.end || '']
      }
    } else if (data.开始时间 || data.结束时间) {
      dateRange = [data.开始时间 || '', data.结束时间 || '']
    }

    // 解析目标
    let objectives = ''
    if (typeof data.objectives === 'string') {
      objectives = data.objectives
    } else if (data.objectives?.primary) {
      objectives = data.objectives.primary
      if (data.objectives.secondary && Array.isArray(data.objectives.secondary)) {
        objectives += '\n' + data.objectives.secondary.join('\n')
      }
    } else {
      objectives = data.活动目标 || ''
    }

    // 解析渠道
    let channels: string[] = []
    const rawChannels = data.channels || data.触达渠道
    if (Array.isArray(rawChannels)) {
      channels = rawChannels.map((c: any) => {
        if (typeof c === 'string') {
          // 尝试将中文渠道名映射到 value
          const channelMap: Record<string, string> = {
            '微信公众号': 'wechat_official',
            '公众号': 'wechat_official',
            '微信小程序': 'wechat_mini',
            '小程序': 'wechat_mini',
            '抖音': 'douyin',
            '小红书': 'xiaohongshu',
            '微博': 'weibo',
            '短信': 'sms',
            'SMS': 'sms',
            '邮件': 'email',
            '电子邮件': 'email',
            'Email': 'email',
            'APP Push': 'app_push',
            'APP推送': 'app_push',
            '推送': 'app_push',
            '线下活动': 'offline',
            '线下': 'offline'
          }
          return channelMap[c] || c
        }
        return c.value || c.name || ''
      }).filter(Boolean)
    } else if (typeof rawChannels === 'string') {
      // 尝试从逗号分隔的字符串解析
      channels = rawChannels.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
    }

    // 解析目标人群
    let targetAudience = ''
    const rawAudience = data.targetAudience || data.活动人群 || data.目标人群
    if (typeof rawAudience === 'string') {
      targetAudience = rawAudience
    } else if (rawAudience) {
      const parts: string[] = []
      if (rawAudience.segments) {
        parts.push(...(Array.isArray(rawAudience.segments) ? rawAudience.segments : [rawAudience.segments]))
      }
      if (rawAudience.demographics) {
        parts.push(...(Array.isArray(rawAudience.demographics) ? rawAudience.demographics : [rawAudience.demographics]))
      }
      if (rawAudience.description) {
        parts.push(rawAudience.description)
      }
      targetAudience = parts.join(', ')
    }

    // 解析策略
    let strategies = ''
    const rawStrategies = data.strategies || data.活动策略
    if (typeof rawStrategies === 'string') {
      strategies = rawStrategies
    } else if (Array.isArray(rawStrategies)) {
      strategies = rawStrategies.map((s: any) => {
        if (typeof s === 'string') return s
        return s.name || s.approach || s.description || ''
      }).filter(Boolean).join('\n')
    }

    return {
      title,
      dateRange,
      objectives,
      channels,
      targetAudience,
      strategies
    }
  }

  /**
   * 从 MarketingPlan 转换为表单数据
   */
  const planToFormData = (plan: MarketingPlan): MarketingPlanFormData => {
    return {
      title: plan.title || '',
      dateRange: [
        plan.timeline?.startDate || '',
        plan.timeline?.endDate || ''
      ],
      objectives: plan.objectives?.primary || '',
      channels: plan.channels?.map(c => c.name) || [],
      targetAudience: plan.targetAudience?.segments?.join(', ') || '',
      strategies: plan.strategies?.map(s => s.name).join('\n') || ''
    }
  }

  /**
   * 从表单数据转换为 MarketingPlan
   */
  const formDataToPlan = (data: MarketingPlanFormData): Partial<MarketingPlan> => {
    return {
      title: data.title,
      timeline: {
        startDate: data.dateRange[0],
        endDate: data.dateRange[1]
      },
      objectives: {
        primary: data.objectives
      },
      channels: data.channels.map(channelValue => {
        const option = channelOptions.find(o => o.value === channelValue)
        return {
          name: option?.label || channelValue,
          type: channelValue.includes('offline') ? 'offline' as const : 'online' as const,
          priority: 'medium' as const
        }
      }),
      targetAudience: {
        segments: data.targetAudience.split(/[,，]/).map(s => s.trim()).filter(Boolean)
      },
      strategies: data.strategies.split('\n').filter(Boolean).map((strategyText, index) => ({
        name: strategyText.trim(),
        channel: data.channels[index % data.channels.length] || 'unknown',
        approach: strategyText.trim()
      }))
    }
  }

  /**
   * 重置表单
   */
  const resetForm = () => {
    formData.value = {
      title: '',
      dateRange: ['', ''],
      objectives: '',
      channels: [],
      targetAudience: '',
      strategies: ''
    }
    isSubmitted.value = false
    isSubmitting.value = false
  }

  /**
   * 验证表单
   */
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!formData.value.title || formData.value.title.length < 2) {
      errors.push('请输入有效的活动主题')
    }

    if (!formData.value.dateRange[0] || !formData.value.dateRange[1]) {
      errors.push('请选择活动时间范围')
    }

    if (!formData.value.objectives || formData.value.objectives.length < 10) {
      errors.push('请详细描述活动目标')
    }

    if (!formData.value.channels || formData.value.channels.length === 0) {
      errors.push('请选择至少一个触达渠道')
    }

    if (!formData.value.targetAudience || formData.value.targetAudience.length < 10) {
      errors.push('请详细描述目标人群')
    }

    if (!formData.value.strategies || formData.value.strategies.length < 10) {
      errors.push('请详细描述营销策略')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 设置表单数据
   */
  const setFormData = (data: Partial<MarketingPlanFormData>) => {
    formData.value = {
      ...formData.value,
      ...data
    }
  }

  return {
    formData,
    formRules,
    channelOptions,
    isSubmitted,
    isSubmitting,
    // 新的解析方法（推荐使用）
    parseAIResponse,
    // 工具方法
    extractJSONFromText,
    extractFieldsFromText,
    getEmptyFormData,
    // 兼容旧 API
    generateFormFromAIResponse,
    parseAIDataToFormData,
    // 转换方法
    planToFormData,
    formDataToPlan,
    resetForm,
    validateForm,
    setFormData
  }
}
