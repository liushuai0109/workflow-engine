/**
 * Marketing Agent LLM Service
 * 营销智能体 LLM 服务 - 用于分析用户需求并生成结构化营销方案响应
 */

import { ClaudeAPIClient, type ClaudeMessage } from './claude/ClaudeAPIClient'
import { getLLMConfig, type LLMConfig } from '../config/llmConfig'
import type { LLMResponseType } from '../types/llmResponse'
import type { MarketingPlanFormData } from '../composables/useMarketingPlanForm'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * 营销智能体系统提示词
 */
const MARKETING_AGENT_SYSTEM_PROMPT = `你是一个专业的营销策划智能体。你的任务是帮助用户制定营销方案。

## 角色定位
- 你是一位资深的营销策划专家，拥有丰富的数字营销和品牌推广经验
- 你擅长分析用户需求，制定针对性的营销策略
- 你能够根据用户的描述，生成结构化的营销方案

## 响应格式要求
你必须以 JSON 格式返回响应，格式如下：

\`\`\`json
{
  "responseType": "plan_form",
  "data": {
    "title": "活动主题名称",
    "dateRange": ["开始日期 YYYY-MM-DD", "结束日期 YYYY-MM-DD"],
    "objectives": "活动目标描述",
    "channels": ["渠道代码1", "渠道代码2"],
    "targetAudience": "目标人群描述",
    "strategies": "营销策略描述，可以用换行符分隔多个策略"
  },
  "message": "给用户的提示信息"
}
\`\`\`

## 可用的渠道代码
- wechat_official: 微信公众号
- wechat_mini: 微信小程序
- douyin: 抖音
- xiaohongshu: 小红书
- weibo: 微博
- sms: 短信
- email: 邮件
- app_push: APP推送
- offline_event: 线下活动
- offline_store: 线下门店

## 工作流程
1. 仔细分析用户的需求描述
2. 根据用户需求，推断合适的活动主题、时间、目标、渠道等
3. 生成结构化的营销方案 JSON 响应
4. 在 message 字段中提供友好的提示，告诉用户可以修改方案内容

## 注意事项
- 如果用户没有明确指定日期，根据活动类型推测合理的日期范围
- 渠道选择要根据目标人群和活动类型来推荐
- 策略要具体、可执行，避免空泛的描述
- 始终用中文回复
- 确保 JSON 格式正确，可以被解析`

/**
 * 营销智能体服务配置
 */
interface MarketingAgentConfig {
  conversationId?: string
  onProgress?: (log: string) => void
}

/**
 * 营销智能体 LLM 响应
 */
interface MarketingAgentResponse {
  success: boolean
  content: string
  error?: string
}

/**
 * 营销智能体服务类
 */
export class MarketingAgentService {
  private client: ClaudeAPIClient
  private config: LLMConfig
  private messages: ClaudeMessage[] = []
  private conversationId: string | null = null
  private onProgress?: (log: string) => void

  constructor(agentConfig?: MarketingAgentConfig) {
    this.config = getLLMConfig()
    this.conversationId = agentConfig?.conversationId || null
    this.onProgress = agentConfig?.onProgress

    // 初始化 Claude API Client
    this.client = new ClaudeAPIClient({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model
    })
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (log: string) => void): void {
    this.onProgress = callback
  }

  /**
   * 设置会话 ID
   */
  setConversationId(id: string): void {
    this.conversationId = id
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.messages = []
  }

  /**
   * 发送消息给营销智能体
   */
  async sendMessage(userMessage: string): Promise<MarketingAgentResponse> {
    try {
      // 添加进度日志
      this.onProgress?.('分析用户需求中...')

      // 添加用户消息到历史
      this.messages.push({
        role: 'user',
        content: userMessage
      })

      this.onProgress?.('生成营销方案...')

      // 调用 Claude API
      const response = await this.client.generateContent(
        this.messages,
        {
          systemPrompt: MARKETING_AGENT_SYSTEM_PROMPT,
          maxTokens: this.config.maxTokens,
          temperature: 0.7 // 适度创造性
        }
      )

      // 提取响应文本
      const responseText = this.extractTextFromResponse(response)

      // 添加助手响应到历史
      this.messages.push({
        role: 'assistant',
        content: responseText
      })

      this.onProgress?.('方案生成完成')

      return {
        success: true,
        content: responseText
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('Marketing Agent error:', error)

      return {
        success: false,
        content: '',
        error: errorMessage
      }
    }
  }

  /**
   * 从响应中提取文本
   */
  private extractTextFromResponse(response: any): string {
    if (typeof response === 'string') {
      return response
    }

    if (response && response.content) {
      if (Array.isArray(response.content)) {
        const textBlocks = response.content.filter((block: any) => block.type === 'text')
        return textBlocks.map((block: any) => block.text).join('\n')
      }
      if (typeof response.content === 'string') {
        return response.content
      }
    }

    return JSON.stringify(response)
  }

  /**
   * 获取对话历史
   */
  getHistory(): ClaudeMessage[] {
    return [...this.messages]
  }

  /**
   * 导入对话历史
   */
  importHistory(messages: ClaudeMessage[]): void {
    this.messages = [...messages]
  }
}

/**
 * 创建营销智能体服务实例
 */
export function createMarketingAgentService(config?: MarketingAgentConfig): MarketingAgentService {
  return new MarketingAgentService(config)
}
