/**
 * 消息格式适配器
 * 将 Gemini 消息格式转换为 Claude 消息格式
 */

import type { Message as GeminiMessage } from '../llmService'
import type { ClaudeMessage, ContentBlock } from './ClaudeAPIClient'

/**
 * 将 Gemini 消息转换为 Claude 消息
 */
export function convertGeminiToClaudeMessage(geminiMessage: GeminiMessage): ClaudeMessage {
  const role = geminiMessage.role === 'model' ? 'assistant' : 'user'

  // 如果只有一个文本 part，直接使用字符串
  const firstPart = geminiMessage.parts[0]
  if (geminiMessage.parts.length === 1 && firstPart?.text) {
    return {
      role,
      content: firstPart.text
    }
  }

  // 如果有多个 part 或包含 function call/response，使用 ContentBlock 数组
  const content: ContentBlock[] = []

  for (const part of geminiMessage.parts) {
    if (part.text) {
      content.push({
        type: 'text',
        text: part.text
      })
    }

    if (part.functionCall) {
      // Gemini function call 转 Claude tool use
      content.push({
        type: 'tool_use',
        id: `tool_${Date.now()}`,
        name: part.functionCall.name,
        input: part.functionCall.args
      })
    }

    if (part.functionResponse) {
      // Gemini function response 转 Claude tool result
      content.push({
        type: 'tool_result',
        tool_use_id: part.functionResponse.id,
        content: JSON.stringify(part.functionResponse.response)
      })
    }
  }

  return {
    role,
    content: content.length > 0 ? content : ''
  }
}

/**
 * 批量转换消息数组
 */
export function convertGeminiMessagesToClaude(geminiMessages: GeminiMessage[]): ClaudeMessage[] {
  return geminiMessages.map(convertGeminiToClaudeMessage)
}

/**
 * 将 Claude 消息转换为简单的对话格式（用于历史记录）
 */
export function claudeMessageToConversation(claudeMessage: ClaudeMessage): {
  role: 'user' | 'assistant'
  content: string
} {
  const role = claudeMessage.role
  let content = ''

  if (typeof claudeMessage.content === 'string') {
    content = claudeMessage.content
  } else {
    // 提取文本内容
    content = claudeMessage.content
      .filter(block => block.type === 'text')
      .map(block => block.text || '')
      .join('')
  }

  return { role, content }
}

/**
 * 创建简单的用户消息
 */
export function createUserMessage(text: string): ClaudeMessage {
  return {
    role: 'user',
    content: text
  }
}

/**
 * 创建助手消息
 */
export function createAssistantMessage(text: string): ClaudeMessage {
  return {
    role: 'assistant',
    content: text
  }
}
