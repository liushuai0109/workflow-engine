/**
 * Claude LLM Service
 * 集成 Claude API、工具执行、对话管理的完整服务
 */

import { ClaudeAPIClient } from './claude/ClaudeAPIClient'
import type { ClaudeMessage, ClaudeTool } from './claude/ClaudeAPIClient'
import { ClaudeToolExecutor, extractToolUses, hasToolUse } from './claude/toolExecutor'
import type { ToolExecutorConfig, ToolExecutionResult } from './claude/toolExecutor'
import { getClaudeTools } from './llmTools'
import type { LLMConfig } from '../config/llmConfig'
import { getLLMConfig } from '../config/llmConfig'
import { chatApiService, type ChatMessage } from './chatApiService'

/**
 * JavaScript 最大安全整数值
 */
export const DEFAULT_MAX_TOOL_ROUNDS = Number.MAX_SAFE_INTEGER

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
  private conversationId: string | null = null
  private useDatabase: boolean = true

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
   * 创建新会话
   */
  async createConversation(title?: string): Promise<string> {
    if (!this.useDatabase) {
      return ''
    }

    try {
      const conv = await chatApiService.createConversation(title)
      this.conversationId = conv.id
      
      // 保存会话ID到 LocalStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('claude_conversation_id', conv.id)
        } catch (e) {
          console.warn('Failed to save conversation ID to localStorage:', e)
        }
      }
      
      return conv.id
    } catch (error) {
      console.warn('Failed to create conversation, falling back to LocalStorage:', error)
      this.useDatabase = false
      return ''
    }
  }

  /**
   * 从 LocalStorage 加载会话ID
   */
  loadConversationIdFromStorage(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    try {
      return localStorage.getItem('claude_conversation_id')
    } catch (e) {
      console.warn('Failed to load conversation ID from localStorage:', e)
      return null
    }
  }

  /**
   * 清除会话ID（从 LocalStorage 和内存）
   */
  clearConversationId(): void {
    this.conversationId = null
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('claude_conversation_id')
      } catch (e) {
        console.warn('Failed to remove conversation ID from localStorage:', e)
      }
    }
  }

  /**
   * 获取当前会话ID
   */
  getCurrentConversationId(): string | null {
    return this.conversationId
  }

  /**
   * 保存助手消息到数据库
   * 供外部调用，用于保存处理后的显示内容
   */
  async saveAssistantMessage(content: string): Promise<void> {
    await this.saveMessage('assistant', content)
  }

  /**
   * 从数据库加载会话
   */
  async loadConversation(conversationId: string): Promise<ConversationContext> {
    if (!this.useDatabase) {
      throw new Error('Database not available')
    }

    try {
      console.log('📥 loadConversation called with ID:', conversationId)
      const response = await chatApiService.getConversation(conversationId)
      console.log('📥 API response:', response)
      console.log('📥 Response data:', response.data)
      console.log('📥 Messages from API:', response.data.messages)
      
      this.conversationId = conversationId

      // 转换消息格式
      const messages: ClaudeMessage[] = response.data.messages.map((msg, index) => {
        console.log(`📝 Converting message ${index + 1}:`, {
          role: msg.role,
          contentType: typeof msg.content,
          contentLength: typeof msg.content === 'string' ? msg.content.length : 'N/A',
          hasMetadata: !!(msg.metadata && Object.keys(msg.metadata).length > 0)
        })
        
        const claudeMsg: ClaudeMessage = {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content // msg.content 应该是字符串
        }

        // 如果有 metadata 且包含 tool_use 信息，需要恢复
        if (msg.metadata && Object.keys(msg.metadata).length > 0) {
          console.log('📝 Message has metadata:', msg.metadata)
          // 这里可以根据 metadata 恢复 tool_use 等复杂内容
          // 暂时只保存 content
        }

        return claudeMsg
      })

      console.log('📝 Converted messages:', messages.length, 'messages')
      console.log('📝 Messages details:', messages.map(m => ({
        role: m.role,
        contentType: typeof m.content,
        contentPreview: typeof m.content === 'string' ? m.content.substring(0, 50) : 'N/A'
      })))

      this.context = {
        messages,
        systemPrompt: this.context.systemPrompt,
        tools: this.context.tools,
        enableCache: this.context.enableCache
      }

      const exported = this.exportContext()
      console.log('📤 Exported context:', {
        messageCount: exported.messages.length,
        hasSystemPrompt: !!exported.systemPrompt,
        toolsCount: exported.tools?.length || 0
      })
      
      return exported
    } catch (error) {
      console.error('❌ Failed to load conversation:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
      throw error
    }
  }

  /**
   * 保存消息到数据库
   */
  private async saveMessage(role: 'user' | 'assistant', content: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.useDatabase || !this.conversationId) {
      return
    }

    try {
      await chatApiService.addMessage(this.conversationId, {
        role,
        content,
        metadata
      })
    } catch (error) {
      console.warn('Failed to save message to database:', error)
      // 不抛出错误，允许继续执行
    }
  }

  /**
   * 发送消息并处理 Tool Use (Function Calling)
   * 自动处理工具调用循环，直到获得最终响应
   */
  async sendMessage(userMessage: string, maxToolRounds: number = DEFAULT_MAX_TOOL_ROUNDS): Promise<string> {
    // 如果没有会话 ID，创建新会话
    if (!this.conversationId && this.useDatabase) {
      try {
        // 使用第一条消息的前 50 字符作为标题
        const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage
        await this.createConversation(title)
      } catch (error) {
        console.warn('Failed to create conversation, continuing without database:', error)
        this.useDatabase = false
      }
    }

    // 添加用户消息到上下文
    this.context.messages.push({
      role: 'user',
      content: userMessage
    })

    // 保存用户消息到数据库
    await this.saveMessage('user', userMessage)

    let currentRound = 0
    let finalResponse = ''

    while (currentRound < maxToolRounds) {
      // 调试：打印工具数量
      console.log(`🔧 Round ${currentRound + 1}: Sending request with ${this.context.tools?.length || 0} tools`)
      if (currentRound === 0 && this.context.tools && this.context.tools.length > 0) {
        console.log('📋 Available tools:', this.context.tools.map(t => t.name))
      }
      // 调试：打印系统提示词前100个字符
      if (currentRound === 0) {
        console.log('📝 System prompt preview:', this.context.systemPrompt.substring(0, 200))
      }

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

      console.log(`📨 Response stop_reason: ${response.stop_reason}, content blocks: ${response.content.length}`)
      if (response.content.length > 0) {
        console.log('📦 Content types:', response.content.map(c => c.type))
      }

      // 添加 Claude 响应到上下文
      this.context.messages.push({
        role: 'assistant',
        content: response.content
      })

      // 检查是否包含 Tool Use
      if (!hasToolUse(response.content)) {
        // 没有工具调用，提取文本响应
        finalResponse = this.extractTextFromContent(response.content)

        // ⚠️ 注意：不在这里保存助手响应
        // 由调用方（BpmnEditorPage）在处理 displayMessage 后保存
        // 确保数据库保存的是用户看到的最终内容，而不是原始 API 响应

        break
      }

      // 提取并执行 Tool Use
      const toolUses = extractToolUses(response.content)
      const executionResults = await this.executor.executeTools(toolUses)

      // 将工具执行结果添加到上下文（仅用于 Claude API，不保存到数据库）
      const toolResults = this.executor.formatResultsForClaude(executionResults)
      this.context.messages.push({
        role: 'user',
        content: toolResults as any
      })

      // ⚠️ 注意：不保存工具执行结果到数据库
      // 工具调用是内部流程，用户不需要看到这些中间消息
      // 只保存用户的原始消息和 AI 的最终响应

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
