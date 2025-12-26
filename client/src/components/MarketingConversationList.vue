<template>
  <div class="conversation-list">
    <!-- Header -->
    <div class="list-header">
      <h3>营销项目</h3>
      <a-button type="primary" size="small" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        新建会话
      </a-button>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜索会话..."
        @search="handleSearch"
        allow-clear
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <a-spin />
    </div>

    <!-- Conversation List -->
    <div v-else-if="conversations.length > 0" class="conversation-items">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
        :class="{ active: conversation.id === currentId }"
        @click="handleSelect(conversation.id)"
      >
        <div class="conversation-content">
          <div class="conversation-title">{{ conversation.title || '未命名会话' }}</div>
          <div class="conversation-meta">
            <span class="message-count" v-if="conversation.messageCount">
              {{ conversation.messageCount }} 条消息
            </span>
            <span class="last-message-time">{{ formatTime(conversation.lastMessageAt) }}</span>
          </div>
        </div>
        <div class="conversation-actions" @click.stop>
          <a-dropdown :trigger="['click']">
            <a-button type="text" size="small">
              <template #icon><EllipsisOutlined /></template>
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="rename" @click="handleRename(conversation)">
                  <EditOutlined /> 重命名
                </a-menu-item>
                <a-menu-item key="delete" danger @click="handleDelete(conversation)">
                  <DeleteOutlined /> 删除
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <a-empty description="暂无会话">
        <a-button type="primary" @click="handleCreate">创建新会话</a-button>
      </a-empty>
    </div>

    <!-- Rename Modal -->
    <a-modal
      v-model:open="renameModalVisible"
      title="重命名会话"
      @ok="handleRenameConfirm"
      @cancel="handleRenameCancel"
    >
      <a-input
        v-model:value="renameTitle"
        placeholder="输入新名称"
        @press-enter="handleRenameConfirm"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import type { ChatConversation } from '../services/chatApiService'

interface Props {
  conversations: ChatConversation[]
  currentId: string | null
  loading: boolean
}

interface Emits {
  (e: 'select', id: string): void
  (e: 'create'): void
  (e: 'delete', id: string): void
  (e: 'rename', id: string, title: string): void
  (e: 'search', keyword: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// Search
const searchKeyword = ref('')

const handleSearch = (value: string) => {
  emit('search', value)
}

// Selection
const handleSelect = (id: string) => {
  emit('select', id)
}

// Create
const handleCreate = () => {
  emit('create')
}

// Rename
const renameModalVisible = ref(false)
const renameTitle = ref('')
const renamingConversation = ref<ChatConversation | null>(null)

const handleRename = (conversation: ChatConversation) => {
  renamingConversation.value = conversation
  renameTitle.value = conversation.title || ''
  renameModalVisible.value = true
}

const handleRenameConfirm = () => {
  if (!renamingConversation.value) return

  const newTitle = renameTitle.value.trim()
  if (!newTitle) {
    message.warning('请输入会话名称')
    return
  }

  emit('rename', renamingConversation.value.id, newTitle)
  renameModalVisible.value = false
  renamingConversation.value = null
  renameTitle.value = ''
}

const handleRenameCancel = () => {
  renameModalVisible.value = false
  renamingConversation.value = null
  renameTitle.value = ''
}

// Delete
const handleDelete = (conversation: ChatConversation) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除会话 "${conversation.title || '未命名会话'}" 吗？此操作不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      emit('delete', conversation.id)
    }
  })
}

// Time formatting
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  } else if (days > 0) {
    return `${days} 天前`
  } else if (hours > 0) {
    return `${hours} 小时前`
  } else if (minutes > 0) {
    return `${minutes} 分钟前`
  } else {
    return '刚刚'
  }
}
</script>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
}

/* Header */
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

/* Search Bar */
.search-bar {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

/* Conversation Items */
.conversation-items {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.conversation-item:hover {
  background-color: #fafafa;
}

.conversation-item.active {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
  padding-left: 13px;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.message-count::after {
  content: '·';
  margin-left: 8px;
  color: #d9d9d9;
}

.last-message-time {
  flex-shrink: 0;
}

/* Actions */
.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

/* Scrollbar */
.conversation-items::-webkit-scrollbar {
  width: 6px;
}

.conversation-items::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-items::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.conversation-items::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
