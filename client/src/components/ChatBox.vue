<template>
  <div
    class="chat-box-container"
    :class="{ 'show-conversations': showConversationList }"
  >
    <!-- 头部 -->
    <div class="chat-header">
      <div class="header-left">
        <span class="chat-icon">💬</span>
        <span class="chat-title">AI 助手</span>
      </div>
      <div class="header-right">
        <a-button
          @click.stop="toggleConversationList"
          type="text"
         
          :title="showConversationList ? '隐藏会话列表' : '显示会话列表'"
        >
          ☰
        </a-button>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="chat-body">
      <!-- 会话列表面板 -->
      <div v-show="showConversationList" class="conversation-list">
        <div class="conversation-list-header">
          <span class="list-title">会话列表</span>
          <a-button @click="createNewConversation" type="text" title="新建会话">
            +
          </a-button>
        </div>
        <a-list v-if="conversations.length > 0" class="conversation-items">
          <a-list-item
            v-for="conv in conversations"
            :key="conv.id"
            :class="{ 'active': conv.id === currentConversationId }"
            @click="switchConversation(conv.id)"
          >
            <a-list-item-meta>
              <template #title>
                <div class="conversation-title">{{ conv.title || '新会话' }}</div>
              </template>
              <template #description>
                <div class="conversation-time">{{ formatConversationTime(conv.updatedAt) }}</div>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button
                @click.stop="deleteConversationItem(conv.id)"
                size="small"
                danger
                title="删除会话"
              >
                ×
              </a-button>
            </template>
          </a-list-item>
        </a-list>
        <div v-else class="no-conversations">
          暂无会话
        </div>
      </div>

      <!-- 主聊天区域 -->
      <div class="main-chat-area">
        <div class="messages-container" ref="messagesContainer">
          <div
            v-for="(message, index) in messages"
            :key="index"
            class="message"
            :class="message.role"
          >
            <div class="message-avatar">
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>

          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0" class="welcome-message">
            <div class="welcome-icon">👋</div>
            <div class="welcome-text">你好！我是 AI 助手</div>
            <div class="welcome-subtitle">有什么我可以帮助你的吗？</div>
          </div>

          <!-- 加载指示器 -->
          <div v-if="isLoading" class="message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="loading-container">
                <a-spin size="small" />
                <span class="loading-text">AI 正在思考...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="chat-input-area">
          <div class="input-wrapper">
            <a-textarea
              v-model:value="inputMessage"
              @pressEnter="handlePressEnter"
              placeholder="输入消息..."
              :autosize="{ minRows: 1, maxRows: 5 }"
              ref="textareaRef"
            />
            <a-button
              @click="sendMessage"
              type="primary"
              shape="circle"
              size="small"
              :disabled="!canSend"
              title="发送 (Enter)"
            >
              <span class="send-icon">↑</span>
            </a-button>
          </div>
          <div class="input-hint">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, watch, onMounted, computed } from 'vue'
import { Modal } from 'ant-design-vue'
import { chatApiService, type ChatConversation } from '../services/chatApiService'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 响应式数据
const isLoading = ref(false)
const inputMessage = ref('')
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()

// 会话管理
const showConversationList = ref(false)
const conversations = ref<ChatConversation[]>([])
const currentConversationId = ref<string | null>(null)
const isLoadingConversations = ref(false)

// 定义事件
const emit = defineEmits<{
  sendMessage: [message: string]
}>()

// 计算是否可以发送
const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && !isLoading.value
})

// 发送消息
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  // 不在这里添加用户消息，由父组件的 Claude 服务统一管理
  // 只清空输入框
  inputMessage.value = ''

  // 设置加载状态
  isLoading.value = true

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 触发发送消息事件，父组件会调用 Claude API
  emit('sendMessage', message)
}

// 添加用户消息（供外部调用）
const addUserMessage = (content: string) => {
  messages.value.push({
    role: 'user',
    content,
    timestamp: new Date()
  })
  nextTick(() => {
    scrollToBottom()
  })
}

// 添加助手消息（供外部调用）
const addAssistantMessage = (content: string) => {
  messages.value.push({
    role: 'assistant',
    content,
    timestamp: new Date()
  })
  nextTick(() => {
    scrollToBottom()
  })
}

// 设置加载状态（供外部调用）
const setLoading = (loading: boolean) => {
  isLoading.value = loading
  if (!loading) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 键盘事件处理（Ant Design Textarea pressEnter 事件）
const handlePressEnter = (e: KeyboardEvent) => {
  // Shift + Enter 换行，不发送
  if (e.shiftKey) {
    return
  }
  // Enter 发送消息
  e.preventDefault()
  sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化时间
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 会话管理函数
const toggleConversationList = () => {
  showConversationList.value = !showConversationList.value
  if (showConversationList.value && conversations.value.length === 0) {
    loadConversations()
  }
}

const loadConversations = async () => {
  if (isLoadingConversations.value) return

  isLoadingConversations.value = true
  try {
    const response = await chatApiService.listConversations(1, 20)
    conversations.value = response.data || []
  } catch (error) {
    console.error('Failed to load conversations:', error)
    conversations.value = []
  } finally {
    isLoadingConversations.value = false
  }
}

const createNewConversation = async () => {
  try {
    const newConv = await chatApiService.createConversation(`会话 ${Date.now()}`)
    conversations.value.unshift(newConv)
    await switchConversation(newConv.id)
  } catch (error) {
    console.error('Failed to create conversation:', error)
  }
}

const switchConversation = async (conversationId: string) => {
  if (currentConversationId.value === conversationId) return

  try {
    const response = await chatApiService.getConversation(conversationId)
    currentConversationId.value = conversationId

    // 加载消息到界面
    messages.value = response.data.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.createdAt)
    }))

    // 存储到 LocalStorage
    localStorage.setItem('claude_conversation_id', conversationId)

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Failed to switch conversation:', error)
  }
}

const deleteConversationItem = async (conversationId: string) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个会话吗？',
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      try {
        await chatApiService.deleteConversation(conversationId)
        conversations.value = conversations.value.filter(c => c.id !== conversationId)

        // 如果删除的是当前会话，清空消息
        if (currentConversationId.value === conversationId) {
          currentConversationId.value = null
          messages.value = []
          localStorage.removeItem('claude_conversation_id')
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error)
      }
    }
  })
}

const formatConversationTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

// 组件挂载时加载会话ID（如果存在）
onMounted(async () => {
  const savedConversationId = localStorage.getItem('claude_conversation_id')
  if (savedConversationId) {
    currentConversationId.value = savedConversationId
    try {
      // 尝试加载会话消息
      const response = await chatApiService.getConversation(savedConversationId)
      messages.value = response.data.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt)
      }))
      await nextTick()
      scrollToBottom()
    } catch (error) {
      console.error('Failed to load conversation on mount:', error)
      // 如果加载失败，清除无效的会话ID
      localStorage.removeItem('claude_conversation_id')
      currentConversationId.value = null
    }
  }
})

// 暴露方法给父组件
defineExpose({
  addUserMessage,
  addAssistantMessage,
  setLoading,
  messages, // 暴露 messages 以便父组件可以直接访问
  scrollToBottom // 暴露滚动方法
})
</script>

<style scoped>
.chat-box-container {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
}

/* 头部 - Ant Design 风格 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px;
  background: #1890ff;
  color: white;
  user-select: none;
  flex-shrink: 0;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-icon {
  font-size: 20px;
}

.chat-title {
  font-size: 16px;
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: 4px;
}

.header-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn {
  font-size: 24px;
  line-height: 1;
}

/* 消息区域 - Ant Design 风格 */
.chat-body {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  background: #fafafa;
}

.main-chat-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  background: #ffffff;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fafafa;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

/* 消息样式 - Ant Design 风格 */
.message {
  display: flex;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.message.user .message-avatar {
  background: #1890ff;
  color: white;
}

.message.assistant .message-avatar {
  background: #52c41a;
  color: white;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0; /* 允许 flex 子元素正确收缩 */
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 8px;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.5715;
  max-width: 100%;
  white-space: pre-wrap;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.09);
}

.message.user .message-text {
  background: #1890ff;
  color: white;
  border-radius: 8px 8px 2px 8px;
}

.message.assistant .message-text {
  background: #ffffff;
  color: rgba(0, 0, 0, 0.85);
  border: 1px solid #d9d9d9;
  border-radius: 8px 8px 8px 2px;
}

.message-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  padding: 0 4px;
}

/* 欢迎消息 - Ant Design 风格 */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: rgba(0, 0, 0, 0.45);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-text {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

/* 加载指示器 - Ant Design 风格 */
.loading-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 8px 8px 8px 2px;
}

.loading-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

/* 输入区域 - Ant Design 风格 */
.chat-input-area {
  border-top: 1px solid #f0f0f0;
  padding: 12px;
  background: #ffffff;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-wrapper :deep(.ant-input-textarea) {
  flex: 1;
}

.input-wrapper :deep(.ant-input) {
  border-radius: 6px;
  border-color: #d9d9d9;
  font-size: 14px;
  line-height: 1.5715;
}

.input-wrapper :deep(.ant-input:hover) {
  border-color: #40a9ff;
}

.input-wrapper :deep(.ant-input:focus) {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.input-wrapper :deep(.ant-btn-primary) {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  background: #1890ff;
  border-color: #1890ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.input-wrapper :deep(.ant-btn-primary:hover) {
  background: #40a9ff;
  border-color: #40a9ff;
}

.input-wrapper :deep(.ant-btn-primary:disabled) {
  background: #f5f5f5;
  border-color: #d9d9d9;
  color: rgba(0, 0, 0, 0.25);
}

.send-icon {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.input-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 8px;
  text-align: center;
}

/* 会话列表样式 - Ant Design 风格 */
.conversation-list {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

.conversation-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
}

.list-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
  background: #ffffff;
}

.conversation-items :deep(.ant-list-item) {
  cursor: pointer;
  transition: all 0.3s;
  padding: 12px 16px;
  border-left: 3px solid transparent;
}

.conversation-items :deep(.ant-list-item:hover) {
  background: #f5f5f5;
}

.conversation-items :deep(.ant-list-item.active) {
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.conversation-title {
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.no-conversations {
  padding: 48px 20px;
  text-align: center;
  color: rgba(0, 0, 0, 0.25);
  font-size: 14px;
}

/* 当显示会话列表时，调整聊天主体布局 */
.chat-box-container.show-conversations .messages-container {
  flex: 1;
  min-width: 0;
}
</style>
