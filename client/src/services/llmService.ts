/**
 * LLM 服务 - 用于调用 Gemini API
 */

import type { FunctionDeclaration } from './llmTools'

export interface Message {
  role: 'user' | 'model'
  parts: Array<{ text?: string, functionCall?: any, functionResponse?: any }>
}

export interface GenerateContentRequest {
  contents: Message[]
  systemInstruction?: {
    parts: Array<{ text: string }>
  }
  tools?: Array<{
    functionDeclarations: FunctionDeclaration[]
  }>
}

export interface FunctionCall {
  name: string
  args: Record<string, any>
}

export interface GenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string
        functionCall?: FunctionCall
      }>
      role: string
    }
    finishReason: string
    index: number
    safetyRatings: Array<{
      category: string
      probability: string
    }>
  }>
  promptFeedback?: {
    safetyRatings: Array<{
      category: string
      probability: string
    }>
  }
}

class LLMService {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor() {
    // 从环境变量或配置中获取，这里先硬编码
    this.apiKey = '***REMOVED***'
    this.baseUrl = 'https://api.aicodewith.com/api'
    this.model = 'gemini-3-pro-preview'
  }

  /**
   * 设置 API Key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * 设置模型
   */
  setModel(model: string): void {
    this.model = model
  }

  /**
   * 生成内容（支持 Function Calling）
   */
  async generateContentWithTools(
    messages: Message[],
    tools: FunctionDeclaration[],
    systemPrompt?: string
  ): Promise<GenerateContentResponse> {
    try {
      const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent`

      const requestBody: GenerateContentRequest = {
        contents: messages,
        tools: tools.length > 0 ? [{
          functionDeclarations: tools
        }] : undefined
      }

      // 如果提供了系统提示词，添加到请求中
      if (systemPrompt) {
        requestBody.systemInstruction = {
          parts: [{ text: systemPrompt }]
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}\n${errorText}`)
      }

      const data: GenerateContentResponse = await response.json()
      return data
    } catch (error) {
      console.error('LLM API 调用失败:', error)
      throw error
    }
  }

  /**
   * 生成内容（原有方法，保持向后兼容）
   */
  async generateContent(messages: Message[], systemPrompt?: string): Promise<string> {
    const data = await this.generateContentWithTools(messages, [], systemPrompt)

    // 提取响应文本
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const firstPart = candidate.content.parts[0]
        if (firstPart.text) {
          return firstPart.text
        }
      }
    }

    throw new Error('API 返回的响应格式不正确')
  }

  /**
   * 发送单条消息（便捷方法）
   */
  async sendMessage(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages: Message[] = [
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ]

    return this.generateContent(messages, systemPrompt)
  }

  /**
   * 发送对话消息（支持历史记录）
   */
  async sendConversation(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>, systemPrompt?: string): Promise<string> {
    // 转换对话历史格式
    const messages: Message[] = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    return this.generateContent(messages, systemPrompt)
  }

  /**
   * 流式生成内容（如果 API 支持）
   */
  async *generateContentStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
    try {
      const url = `${this.baseUrl}/v1beta/models/${this.model}:streamGenerateContent`

      const requestBody: GenerateContentRequest = {
        contents: messages
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}\n${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6)
            if (jsonStr === '[DONE]') continue

            try {
              const data: GenerateContentResponse = JSON.parse(jsonStr)
              if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0]
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                  yield candidate.content.parts[0].text
                }
              }
            } catch (e) {
              console.error('解析流数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('流式 LLM API 调用失败:', error)
      throw error
    }
  }
}

// 导出单例
export const llmService = new LLMService()
