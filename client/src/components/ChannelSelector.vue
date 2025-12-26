<template>
  <div class="channel-selector">
    <div class="selector-header">
      <h4 class="selector-title">📢 推广渠道选择</h4>
      <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
    </div>

    <div class="selector-content">
      <p class="selector-hint">请选择要投放的推广渠道（可多选）：</p>

      <div class="channels-grid">
        <div
          v-for="channel in allChannels"
          :key="channel.value"
          class="channel-card"
          :class="{
            selected: localSelected.includes(channel.value),
            disabled: disabled || confirmed
          }"
          @click="toggleChannel(channel.value)"
        >
          <a-checkbox
            :checked="localSelected.includes(channel.value)"
            :disabled="disabled || confirmed"
          />
          <div class="channel-icon">{{ channel.icon }}</div>
          <div class="channel-info">
            <div class="channel-name">{{ channel.label }}</div>
            <div class="channel-desc">{{ channel.description }}</div>
          </div>
        </div>
      </div>

      <!-- Selected Summary -->
      <div v-if="localSelected.length > 0" class="selected-summary">
        <span class="summary-label">已选择 {{ localSelected.length }} 个渠道：</span>
        <div class="selected-tags">
          <a-tag
            v-for="channelValue in localSelected"
            :key="channelValue"
            color="blue"
            :closable="!disabled && !confirmed"
            @close="removeChannel(channelValue)"
          >
            {{ getChannelLabel(channelValue) }}
          </a-tag>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="selector-actions">
        <a-button
          v-if="!confirmed && !disabled"
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
          :disabled="localSelected.length === 0"
        >
          确定
        </a-button>
        <span v-if="confirmed" class="confirmed-text">
          ✓ 推广渠道已确认
        </span>
        <span v-if="!confirmed && localSelected.length === 0" class="hint-text">
          请至少选择一个渠道
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

export interface ChannelOption {
  value: string
  label: string
  icon: string
  description: string
}

// All available channels
const allChannels: ChannelOption[] = [
  { value: 'wechat_official', label: '微信公众号', icon: '💬', description: '图文推送、服务号消息' },
  { value: 'wechat_mini', label: '微信小程序', icon: '🔲', description: '小程序订阅消息、弹窗' },
  { value: 'douyin', label: '抖音', icon: '🎵', description: '短视频推广、直播带货' },
  { value: 'xiaohongshu', label: '小红书', icon: '📕', description: '种草笔记、达人合作' },
  { value: 'weibo', label: '微博', icon: '🐦', description: '热搜推广、话题营销' },
  { value: 'sms', label: '短信', icon: '📱', description: '营销短信、验证码' },
  { value: 'email', label: '邮件', icon: '📧', description: 'EDM邮件营销' },
  { value: 'app_push', label: 'APP Push', icon: '🔔', description: 'APP推送通知' }
]

interface Props {
  messageId: string
  channels: string[] // Pre-selected channels
  selectedChannels?: string[]
  disabled?: boolean
  confirmed?: boolean
}

interface Emits {
  (e: 'confirm', channels: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state for selections
const localSelected = ref<string[]>([...(props.selectedChannels || props.channels || [])])
const confirming = ref(false)

// Watch for prop changes
watch(() => [props.selectedChannels, props.channels], ([newSelected, newChannels]) => {
  localSelected.value = [...(newSelected || newChannels || [])]
}, { deep: true })

const confirmed = computed(() => props.confirmed || false)

const getChannelLabel = (value: string): string => {
  const channel = allChannels.find(c => c.value === value)
  return channel?.label || value
}

const toggleChannel = (value: string) => {
  if (props.disabled || confirmed.value) return

  const index = localSelected.value.indexOf(value)
  if (index === -1) {
    localSelected.value.push(value)
  } else {
    localSelected.value.splice(index, 1)
  }
}

const removeChannel = (value: string) => {
  if (props.disabled || confirmed.value) return

  const index = localSelected.value.indexOf(value)
  if (index !== -1) {
    localSelected.value.splice(index, 1)
  }
}

const handleConfirm = async () => {
  if (props.disabled || confirmed.value || localSelected.value.length === 0) return

  confirming.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    emit('confirm', [...localSelected.value])
  } finally {
    confirming.value = false
  }
}
</script>

<style scoped>
.channel-selector {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.selector-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  margin-left: auto;
}

.selector-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector-hint {
  margin: 0;
  font-size: 14px;
  color: #595959;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.channel-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background-color: #fff;
  border-radius: 8px;
  border: 2px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.channel-card:hover:not(.disabled) {
  border-color: #91d5ff;
  background-color: #f6f6f6;
}

.channel-card.selected {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.channel-card.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.channel-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.channel-info {
  flex: 1;
  min-width: 0;
}

.channel-name {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.channel-desc {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
}

.selected-summary {
  padding: 12px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.summary-label {
  font-size: 13px;
  color: #8c8c8c;
  display: block;
  margin-bottom: 8px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selector-actions {
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
