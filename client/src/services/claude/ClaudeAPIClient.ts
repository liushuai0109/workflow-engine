/**
 * Claude API 客户端
 * 实现与 Claude API 的通信，支持文本生成、流式响应和 Tool Use
 */

import { llmConfig } from '../../config/llmConfig'

// 消息格式
export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, any>
  content?: string | any[]
  is_error?: boolean
}

// Tool Use 专用类型
export type ToolUseBlock = ContentBlock & {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, any>
}

// 工具定义
export interface ClaudeTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required?: string[]
  }
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  enum?: any[]
  items?: ToolParameter
}

// API 请求格式
export interface ClaudeAPIRequest {
  model: string
  max_tokens: number
  messages: ClaudeMessage[]
  system?: string | SystemBlock[]
  tools?: ClaudeTool[]
  temperature?: number
  stream?: boolean
}

export interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

// API 响应格式
export interface ClaudeAPIResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use'
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

// 流式响应事件
export interface StreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop'
  index?: number
  delta?: {
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
  content_block?: ContentBlock
  message?: Partial<ClaudeAPIResponse>
  usage?: ClaudeAPIResponse['usage']
}

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  enableCache?: boolean
}

/**
 * Claude API 客户端类
 */
export interface ClaudeAPIClientConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export class ClaudeAPIClient {
  private apiKey: string
  private baseUrl: string
  private model: string
  private defaultMaxTokens: number
  private defaultTemperature: number

  constructor(config?: ClaudeAPIClientConfig) {
    const defaultConfig = llmConfig.getConfig()
    this.apiKey = config?.apiKey ?? defaultConfig.apiKey
    this.baseUrl = config?.baseUrl ?? defaultConfig.baseUrl
    this.model = config?.model ?? defaultConfig.model
    this.defaultMaxTokens = config?.maxTokens ?? defaultConfig.maxTokens
    this.defaultTemperature = config?.temperature ?? defaultConfig.temperature
  }

  /**
   * 基本文本生成（非流式）
   */
  async generateContent(
    messages: ClaudeMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const response = await this.makeRequest(messages, options)

    // 提取文本内容
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    return textContent
  }

  /**
   * 流式文本生成
   */
  async *generateContentStream(
    messages: ClaudeMessage[],
    options?: GenerateOptions
  ): AsyncGenerator<string, void, unknown> {
    const requestBody = this.buildRequestBody(messages, options, true)

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw await this.handleError(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const event: StreamEvent = JSON.parse(data)

            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              yield event.delta.text || ''
            }
          } catch (e) {
            console.warn('解析流事件失败:', e)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 带工具的生成（Tool Use）
   */
  async generateWithTools(
    messages: ClaudeMessage[],
    tools: ClaudeTool[],
    options?: GenerateOptions
  ): Promise<ClaudeAPIResponse> {
    const response = await this.makeRequest(messages, options, tools)
    return response
  }

  /**
   * 发起 API 请求
   */
  private async makeRequest(
    messages: ClaudeMessage[],
    options?: GenerateOptions,
    tools?: ClaudeTool[]
  ): Promise<ClaudeAPIResponse> {
    const requestBody = this.buildRequestBody(messages, options, false, tools)

    // 调试：打印请求信息
    console.log('🌐 API Request:', {
      model: requestBody.model,
      messagesCount: requestBody.messages.length,
      hasSystem: !!requestBody.system,
      systemType: typeof requestBody.system,
      systemPreview: requestBody.system ? (typeof requestBody.system === 'string' ? requestBody.system.substring(0, 100) : JSON.stringify(requestBody.system).substring(0, 100)) : 'none',
      toolsCount: requestBody.tools?.length || 0,
      temperature: requestBody.temperature
    })

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw await this.handleError(response)
    }

    return await response.json()
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(
    messages: ClaudeMessage[],
    options?: GenerateOptions,
    stream: boolean = false,
    tools?: ClaudeTool[]
  ): ClaudeAPIRequest {
    const requestBody: ClaudeAPIRequest = {
      model: this.model,
      max_tokens: options?.maxTokens || this.defaultMaxTokens,
      messages,
      temperature: options?.temperature ?? this.defaultTemperature,
      stream
    }

    // 添加 system prompt
    if (options?.systemPrompt) {
      if (options.enableCache) {
        // 使用 Prompt Caching
        requestBody.system = [
          {
            type: 'text',
            text: options.systemPrompt,
            cache_control: { type: 'ephemeral' }
          }
        ]
      } else {
        requestBody.system = options.systemPrompt
      }
    }

    // 添加 tools
    if (tools && tools.length > 0) {
      requestBody.tools = tools
    }

    return requestBody
  }

  /**
   * 获取请求头
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    }
  }

  /**
   * 处理 API 错误
   */
  private async handleError(response: Response): Promise<Error> {
    let errorMessage = `API 请求失败: ${response.status} ${response.statusText}`

    try {
      const errorData = await response.json()
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
    } catch {
      // 无法解析错误响应，使用默认消息
    }

    return new Error(errorMessage)
  }

  /**
   * 更新配置
   */
  updateConfig(apiKey?: string, baseUrl?: string, model?: string): void {
    if (apiKey) this.apiKey = apiKey
    if (baseUrl) this.baseUrl = baseUrl
    if (model) this.model = model
  }
}

// 导出单例
export const claudeAPIClient = new ClaudeAPIClient()
