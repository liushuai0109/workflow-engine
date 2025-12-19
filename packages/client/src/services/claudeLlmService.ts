/**
 * Claude LLM Service
 * 集成 Claude API、工具执行、对话管理的完整服务
 */

import { ClaudeAPIClient } from './claude/ClaudeAPIClient'
import type { ClaudeMessage, ClaudeTool } from './claude/ClaudeAPIClient'
import { ClaudeToolExecutor, extractToolUses, hasToolUse } from './claude/toolExecutor'
import type { ToolExecutorConfig, ToolExecutionResult } from './claude/toolExecutor'
import { convertGeminiToClaudeMessages } from './claude/messageAdapter'
import { getClaudeTools } from './llmTools'
import type { LLMConfig } from '../config/llmConfig'
import { getLLMConfig } from '../config/llmConfig'

/**
 * 对话上下文管理
 */
export interface ConversationContext {
  messages: ClaudeMessage[]
  systemPrompt?: string
  tools?: ClaudeTool[]
  enableCache?: boolean
}

/**
 * Claude LLM Service
 */
export class ClaudeLLMService {
  private client: ClaudeAPIClient
  private executor: ClaudeToolExecutor
  private context: ConversationContext
  private config: LLMConfig

  constructor(
    executorConfig: ToolExecutorConfig,
    systemPrompt?: string,
    customConfig?: Partial<LLMConfig>
  ) {
    // 初始化配置
    this.config = { ...getLLMConfig(), ...customConfig }

    // 初始化 Claude API Client
    this.client = new ClaudeAPIClient({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model
    })

    // 初始化工具执行器
    this.executor = new ClaudeToolExecutor(executorConfig)

    // 初始化对话上下文
    this.context = {
      messages: [],
      systemPrompt,
      tools: getClaudeTools(),
      enableCache: this.config.enableCache
    }
  }

  /**
   * 发送消息并处理 Tool Use (Function Calling)
   * 自动处理工具调用循环，直到获得最终响应
   */
  async sendMessage(userMessage: string, maxToolRounds: number = 5): Promise<string> {
    // 添加用户消息到上下文
    this.context.messages.push({
      role: 'user',
      content: userMessage
    })

    let currentRound = 0
    let finalResponse = ''

    while (currentRound < maxToolRounds) {
      // 调用 Claude API
      const response = await this.client.generateWithTools(
        this.context.messages,
        this.context.tools || [],
        {
          systemPrompt: this.context.systemPrompt,
          enableCache: this.context.enableCache,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature
        }
      )

      // 添加 Claude 响应到上下文
      this.context.messages.push({
        role: 'assistant',
        content: response.content
      })

      // 检查是否包含 Tool Use
      if (!hasToolUse(response.content)) {
        // 没有工具调用，提取文本响应
        finalResponse = this.extractTextFromContent(response.content)
        break
      }

      // 提取并执行 Tool Use
      const toolUses = extractToolUses(response.content)
      const executionResults = await this.executor.executeTools(toolUses)

      // 将工具执行结果添加到上下文
      const toolResults = this.executor.formatResultsForClaude(executionResults)
      this.context.messages.push({
        role: 'user',
        content: toolResults as any
      })

      currentRound++

      // 检查是否所有工具执行成功
      const hasErrors = executionResults.some(r => !r.success)
      if (hasErrors && currentRound >= maxToolRounds) {
        // 达到最大轮次且有错误，返回错误信息
        const errorMsg = this.formatToolErrors(executionResults)
        finalResponse = `工具执行遇到问题：\n${errorMsg}`
        break
      }
    }

    if (currentRound >= maxToolRounds && !finalResponse) {
      finalResponse = '对话轮次超过限制，请简化您的请求。'
    }

    return finalResponse
  }

  /**
   * 流式发送消息（不支持 Tool Use）
   * 用于普通对话场景
   */
  async *sendMessageStream(userMessage: string): AsyncGenerator<string> {
    // 添加用户消息到上下文
    this.context.messages.push({
      role: 'user',
      content: userMessage
    })

    // 流式调用 Claude API
    const stream = this.client.generateContentStream(
      this.context.messages,
      {
        systemPrompt: this.context.systemPrompt,
        enableCache: this.context.enableCache,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature
      }
    )

    let fullResponse = ''
    for await (const chunk of stream) {
      fullResponse += chunk
      yield chunk
    }

    // 将完整响应添加到上下文
    this.context.messages.push({
      role: 'assistant',
      content: fullResponse
    })
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.context.messages = []
  }

  /**
   * 获取对话历史
   */
  getHistory(): ClaudeMessage[] {
    return [...this.context.messages]
  }

  /**
   * 更新系统提示词
   */
  updateSystemPrompt(systemPrompt: string): void {
    this.context.systemPrompt = systemPrompt
  }

  /**
   * 更新工具列表
   */
  updateTools(tools: ClaudeTool[]): void {
    this.context.tools = tools
  }

  /**
   * 更新工具执行器配置
   */
  updateExecutorConfig(config: Partial<ToolExecutorConfig>): void {
    this.executor.updateConfig(config)
  }

  /**
   * 从 Claude content 中提取纯文本
   */
  private extractTextFromContent(content: any): string {
    if (typeof content === 'string') {
      return content
    }

    if (Array.isArray(content)) {
      const textBlocks = content.filter(block => block.type === 'text')
      return textBlocks.map(block => block.text).join('\n')
    }

    return ''
  }

  /**
   * 格式化工具执行错误
   */
  private formatToolErrors(results: ToolExecutionResult[]): string {
    const errors = results
      .filter(r => !r.success)
      .map(r => `- ${r.toolName}: ${r.error}`)

    return errors.join('\n')
  }

  /**
   * 导出对话历史（用于调试或持久化）
   */
  exportContext(): ConversationContext {
    return {
      messages: [...this.context.messages],
      systemPrompt: this.context.systemPrompt,
      tools: this.context.tools,
      enableCache: this.context.enableCache
    }
  }

  /**
   * 导入对话历史
   */
  importContext(context: ConversationContext): void {
    this.context = {
      messages: [...context.messages],
      systemPrompt: context.systemPrompt,
      tools: context.tools || getClaudeTools(),
      enableCache: context.enableCache ?? this.config.enableCache
    }
  }
}

/**
 * 创建用于 BPMN 编辑器的 Claude LLM Service
 */
export function createBpmnClaudeLLMService(
  editorOperations: ToolExecutorConfig,
  systemPrompt: string
): ClaudeLLMService {
  return new ClaudeLLMService(editorOperations, systemPrompt)
}
