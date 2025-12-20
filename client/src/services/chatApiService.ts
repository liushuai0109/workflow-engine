/**
 * Chat API Service
 * 提供聊天记录相关的 API 调用
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  messageCount?: number
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, any>
  sequence: number
  createdAt: string
}

export interface CreateConversationRequest {
  title?: string
}

export interface AddMessageRequest {
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, any>
}

export interface BatchAddMessagesRequest {
  messages: AddMessageRequest[]
}

export interface ListConversationsResponse {
  success: boolean
  data: ChatConversation[]
  metadata?: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface GetConversationResponse {
  success: boolean
  data: {
    conversation: ChatConversation
    messages: ChatMessage[]
  }
}

class ChatApiService {
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
   * 创建新会话
   */
  async createConversation(title?: string): Promise<ChatConversation> {
    const response = await this.request<{ success: boolean; data: ChatConversation }>(
      '/chat/conversations',
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      }
    )
    return response.data
  }

  /**
   * 获取会话列表
   */
  async listConversations(
    page: number = 1,
    pageSize: number = 20,
    orderBy: string = 'lastMessageAt',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<ListConversationsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      orderBy,
      order,
    })
    return this.request<ListConversationsResponse>(
      `/chat/conversations?${params.toString()}`
    )
  }

  /**
   * 获取会话详情（包含消息列表）
   */
  async getConversation(conversationId: string): Promise<GetConversationResponse> {
    return this.request<GetConversationResponse>(
      `/chat/conversations/${conversationId}`
    )
  }

  /**
   * 更新会话标题
   */
  async updateConversation(conversationId: string, title: string): Promise<ChatConversation> {
    const response = await this.request<{ success: boolean; data: ChatConversation }>(
      `/chat/conversations/${conversationId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }
    )
    return response.data
  }

  /**
   * 删除会话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.request(`/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    })
  }

  /**
   * 添加消息到会话
   */
  async addMessage(
    conversationId: string,
    message: AddMessageRequest
  ): Promise<ChatMessage> {
    const response = await this.request<{ success: boolean; data: ChatMessage }>(
      `/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(message),
      }
    )
    return response.data
  }

  /**
   * 批量添加消息到会话
   */
  async batchAddMessages(
    conversationId: string,
    messages: AddMessageRequest[]
  ): Promise<ChatMessage[]> {
    const response = await this.request<{ success: boolean; data: ChatMessage[] }>(
      `/chat/conversations/${conversationId}/messages/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ messages }),
      }
    )
    return response.data
  }
}

// 导出单例
export const chatApiService = new ChatApiService()

