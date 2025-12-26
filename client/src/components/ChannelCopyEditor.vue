<template>
  <div class="channel-copy-editor">
    <div class="editor-header">
      <h4 class="editor-title">✍️ 个性化渠道文案</h4>
      <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
    </div>

    <div class="editor-content">
      <p class="editor-hint">以下是为各渠道生成的个性化文案，您可以编辑后确认：</p>

      <div class="copies-list">
        <div
          v-for="(copy, index) in localCopies"
          :key="copy.channel"
          class="copy-card"
        >
          <div class="copy-header">
            <span class="channel-icon">{{ getChannelIcon(copy.channel) }}</span>
            <span class="channel-name">{{ getChannelLabel(copy.channel) }}</span>
            <a-tag v-if="isEdited(index)" color="orange" size="small">已编辑</a-tag>
          </div>

          <div class="copy-body">
            <div class="copy-field">
              <label class="field-label">标题</label>
              <a-input
                v-model:value="copy.title"
                :disabled="disabled || confirmed"
                placeholder="请输入文案标题"
                @change="markEdited(index)"
              />
            </div>

            <div class="copy-field">
              <label class="field-label">内容</label>
              <a-textarea
                v-model:value="copy.content"
                :disabled="disabled || confirmed"
                placeholder="请输入文案内容"
                :rows="3"
                :maxlength="500"
                show-count
                @change="markEdited(index)"
              />
            </div>

            <div v-if="copy.imageUrl" class="copy-field">
              <label class="field-label">配图</label>
              <div class="image-preview">
                <img :src="copy.imageUrl" alt="配图" />
              </div>
            </div>
          </div>

          <div class="copy-footer">
            <a-button
              v-if="!disabled && !confirmed"
              size="small"
              type="link"
              @click="resetCopy(index)"
            >
              重置
            </a-button>
            <span class="char-count">{{ copy.content.length }}/500</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="editor-actions">
        <a-button
          v-if="!confirmed && !disabled"
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
          :disabled="!isValid"
        >
          确定
        </a-button>
        <span v-if="confirmed" class="confirmed-text">
          ✓ 渠道文案已确认
        </span>
        <span v-if="!confirmed && !isValid" class="hint-text">
          请确保所有渠道都填写了标题和内容
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

export interface ChannelCopy {
  channel: string
  title: string
  content: string
  imageUrl?: string
}

export interface ChannelCopyData {
  copies: ChannelCopy[]
  confirmed: boolean
}

interface Props {
  messageId: string
  data: ChannelCopyData
  disabled?: boolean
}

interface Emits {
  (e: 'confirm', data: ChannelCopyData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Channel info mapping
const channelInfo: Record<string, { icon: string; label: string }> = {
  wechat_official: { icon: '💬', label: '微信公众号' },
  wechat_mini: { icon: '🔲', label: '微信小程序' },
  douyin: { icon: '🎵', label: '抖音' },
  xiaohongshu: { icon: '📕', label: '小红书' },
  weibo: { icon: '🐦', label: '微博' },
  sms: { icon: '📱', label: '短信' },
  email: { icon: '📧', label: '邮件' },
  app_push: { icon: '🔔', label: 'APP Push' }
}

// Local state
const localCopies = ref<ChannelCopy[]>([])
const originalCopies = ref<ChannelCopy[]>([])
const editedIndices = ref<Set<number>>(new Set())
const confirming = ref(false)

// Initialize from props
watch(() => props.data, (newData) => {
  if (newData?.copies) {
    localCopies.value = newData.copies.map(c => ({ ...c }))
    originalCopies.value = newData.copies.map(c => ({ ...c }))
    editedIndices.value = new Set()
  }
}, { immediate: true, deep: true })

const confirmed = computed(() => props.data?.confirmed || false)

const isValid = computed(() => {
  return localCopies.value.every(c => c.title.trim() && c.content.trim())
})

const getChannelIcon = (channel: string): string => {
  return channelInfo[channel]?.icon || '📄'
}

const getChannelLabel = (channel: string): string => {
  return channelInfo[channel]?.label || channel
}

const isEdited = (index: number): boolean => {
  return editedIndices.value.has(index)
}

const markEdited = (index: number) => {
  editedIndices.value.add(index)
}

const resetCopy = (index: number) => {
  if (props.disabled || confirmed.value) return

  const original = originalCopies.value[index]
  if (original && localCopies.value[index]) {
    localCopies.value[index] = { ...original }
    editedIndices.value.delete(index)
  }
}

const handleConfirm = async () => {
  if (props.disabled || confirmed.value || !isValid.value) return

  confirming.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const updatedData: ChannelCopyData = {
      copies: localCopies.value.map(c => ({ ...c })),
      confirmed: true
    }
    emit('confirm', updatedData)
  } finally {
    confirming.value = false
  }
}
</script>

<style scoped>
.channel-copy-editor {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.editor-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  margin-left: auto;
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-hint {
  margin: 0;
  font-size: 14px;
  color: #595959;
}

.copies-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.copy-card {
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.copy-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.channel-icon {
  font-size: 18px;
}

.channel-name {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  flex: 1;
}

.copy-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.copy-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #595959;
}

.image-preview {
  width: 120px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.copy-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #fafafa;
  border-top: 1px solid #e8e8e8;
}

.char-count {
  font-size: 12px;
  color: #8c8c8c;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.confirmed-text {
  color: #52c41a;
  font-size: 14px;
  font-weight: 500;
}

.hint-text {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
