<template>
  <div
    class="chat-box-container"
    :class="{ 'minimized': isMinimized }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="handleMouseDown"
  >
    <!-- 头部 -->
    <div class="chat-header" @mousedown.stop="startDrag">
      <div class="header-left">
        <span class="chat-icon">💬</span>
        <span class="chat-title">AI 助手</span>
      </div>
      <div class="header-right">
        <button
          @click.stop="toggleMinimize"
          class="header-btn"
          :title="isMinimized ? '展开' : '最小化'"
        >
          {{ isMinimized ? '▢' : '−' }}
        </button>
        <button
          @click.stop="closeChat"
          class="header-btn close-btn"
          title="关闭"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 消息区域 -->
    <div v-show="!isMinimized" class="chat-body">
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
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="input-wrapper">
          <textarea
            v-model="inputMessage"
            @keydown.enter="handleKeyDown"
            placeholder="输入消息..."
            class="chat-input"
            rows="1"
            ref="textareaRef"
          ></textarea>
          <button
            @click="sendMessage"
            class="send-btn"
            :disabled="!inputMessage.trim() || isLoading"
            title="发送 (Enter)"
          >
            <span class="send-icon">↑</span>
          </button>
        </div>
        <div class="input-hint">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, watch } from 'vue'

// 定义消息类型
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 响应式数据
const isMinimized = ref(false)
const isLoading = ref(false)
const inputMessage = ref('')
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()

// 位置和拖动状态
const position = reactive({ x: window.innerWidth - 420, y: window.innerHeight - 620 })
const isDragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

// 定义事件
const emit = defineEmits<{
  close: []
  sendMessage: [message: string]
}>()

// 切换最小化
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

// 关闭聊天框
const closeChat = () => {
  emit('close')
}

// 发送消息
const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  })

  inputMessage.value = ''

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 触发发送消息事件
  emit('sendMessage', message)

  // 模拟 AI 回复（实际应该由父组件处理）
  // isLoading.value = true
  // setTimeout(() => {
  //   addAssistantMessage('这是一个示例回复。实际的 LLM 集成将在后续实现。')
  //   isLoading.value = false
  // }, 1000)
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

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
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

// 拖动相关函数
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragOffset.x = e.clientX - position.x
  dragOffset.y = e.clientY - position.y

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  let newX = e.clientX - dragOffset.x
  let newY = e.clientY - dragOffset.y

  // 边界限制
  const maxX = window.innerWidth - 400
  const maxY = window.innerHeight - 100

  newX = Math.max(0, Math.min(newX, maxX))
  newY = Math.max(0, Math.min(newY, maxY))

  position.x = newX
  position.y = newY
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const handleMouseDown = (e: MouseEvent) => {
  // 将此聊天框置于最前
  const target = e.currentTarget as HTMLElement
  target.style.zIndex = '10000'
}

// 自动调整 textarea 高度
watch(inputMessage, () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
    }
  })
})

// 暴露方法给父组件
defineExpose({
  addAssistantMessage,
  setLoading
})
</script>

<style scoped>
.chat-box-container {
  position: fixed;
  width: 400px;
  height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  transition: height 0.3s ease;
}

.chat-box-container.minimized {
  height: 56px;
}

/* 头部 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  cursor: move;
  user-select: none;
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
  font-weight: 600;
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

.header-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.close-btn {
  font-size: 24px;
  line-height: 1;
}

/* 消息区域 */
.chat-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 消息样式 */
.message {
  display: flex;
  gap: 8px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
  line-height: 1.5;
}

.message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 4px 12px;
}

.message.assistant .message-text {
  background: #f3f4f6;
  color: #374151;
  border-radius: 12px 12px 12px 4px;
}

.message-time {
  font-size: 11px;
  color: #9ca3af;
  padding: 0 4px;
}

/* 欢迎消息 */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.welcome-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 14px;
  color: #9ca3af;
}

/* 加载指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  background: #f3f4f6;
  border-radius: 12px 12px 12px 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 输入区域 */
.chat-input-area {
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  max-height: 120px;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #667eea;
}

.chat-input::placeholder {
  color: #9ca3af;
}

.send-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  font-size: 20px;
  font-weight: bold;
}

.input-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
  text-align: center;
}
</style>
