<template>
  <div class="audience-selector" :class="{ 'selector-submitted': submitted }">
    <div class="selector-header">
      <h4>👥 选择目标人群</h4>
      <span v-if="submitted" class="submitted-badge">已选择</span>
    </div>

    <div class="audience-list">
      <div
        v-for="audience in audiences"
        :key="audience.id"
        class="audience-item"
        :class="{ 'selected': selectedId === audience.id, 'disabled': submitted }"
        @click="!submitted && handleSelect(audience.id)"
      >
        <div class="audience-header">
          <div class="audience-name">
            <span class="radio-icon">{{ selectedId === audience.id ? '●' : '○' }}</span>
            {{ audience.name }}
          </div>
          <div class="audience-size">{{ formatNumber(audience.size) }}人</div>
        </div>
        <div class="audience-description">{{ audience.description }}</div>
      </div>

      <div
        class="audience-item create-new"
        :class="{ 'disabled': submitted }"
        @click="!submitted && handleCreateNew()"
      >
        <div class="create-new-content">
          <span class="plus-icon">+</span>
          <span>新建人群</span>
        </div>
      </div>
    </div>

    <div v-if="!submitted" class="selector-actions">
      <a-button
        type="primary"
        @click="handleSubmit"
        :disabled="!selectedId"
        block
        size="large"
      >
        确定选择
      </a-button>
    </div>

    <div v-if="submitted" class="submitted-indicator">
      <CheckCircleOutlined class="success-icon" />
      <span>已选择：{{ getSelectedAudienceName() }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'

interface Audience {
  id: string
  name: string
  description: string
  size: number
}

interface Props {
  messageId: string
  audiences: Audience[]
  initialSelected?: string | null
  disabled?: boolean
}

interface Emits {
  (e: 'select', audienceId: string): void
  (e: 'createNew'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedId = ref<string | null>(props.initialSelected || null)
const submitted = ref(props.disabled || false)

// Watch for disabled prop changes
watch(() => props.disabled, (newVal) => {
  submitted.value = newVal || false
})

// Handle audience selection
const handleSelect = (id: string) => {
  if (submitted.value) return
  selectedId.value = id
}

// Handle create new audience
const handleCreateNew = () => {
  if (submitted.value) return
  message.info('新建人群功能开发中')
  emit('createNew')
}

// Handle submit
const handleSubmit = () => {
  if (!selectedId.value) {
    message.warning('请先选择一个人群')
    return
  }

  submitted.value = true
  emit('select', selectedId.value)
  message.success('人群已选择')
}

// Get selected audience name
const getSelectedAudienceName = () => {
  const audience = props.audiences.find(a => a.id === selectedId.value)
  return audience?.name || ''
}

// Format number with thousand separator
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN')
}
</script>

<style scoped>
.audience-selector {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
}

.selector-submitted {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.selector-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.submitted-badge {
  display: inline-block;
  padding: 2px 12px;
  background: #52c41a;
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.audience-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.audience-item {
  padding: 12px 16px;
  background: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.audience-item:hover:not(.disabled) {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.audience-item.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.audience-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.audience-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.audience-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.radio-icon {
  font-size: 16px;
  color: #1890ff;
}

.audience-size {
  font-size: 13px;
  font-weight: 500;
  color: #1890ff;
}

.audience-description {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.5;
}

.audience-item.create-new {
  border-style: dashed;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.create-new-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1890ff;
}

.plus-icon {
  font-size: 20px;
  font-weight: bold;
}

.selector-actions {
  margin-top: 16px;
}

.selector-actions :deep(.ant-btn) {
  height: 40px;
  font-size: 14px;
  font-weight: 500;
}

.submitted-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  font-size: 13px;
  color: #52c41a;
  margin-top: 8px;
}

.success-icon {
  font-size: 16px;
}
</style>
