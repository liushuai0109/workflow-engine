<template>
  <div class="audience-recommendation" :class="{ 'recommendation-confirmed': confirmed }">
    <div class="recommendation-header">
      <h4>📊 人群推荐详情</h4>
      <span v-if="confirmed" class="confirmed-badge">已确认</span>
    </div>

    <div class="recommendation-content">
      <!-- Audience Info -->
      <div class="info-section">
        <div class="info-title">{{ recommendation.audienceName }}</div>
        <div class="info-metrics">
          <div class="metric-item">
            <div class="metric-label">人群规模</div>
            <div class="metric-value">{{ formatNumber(recommendation.size) }}人</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">大盘占比</div>
            <div class="metric-value">{{ recommendation.marketShare }}%</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">转化概率</div>
            <div class="metric-value">{{ recommendation.conversionRate }}%</div>
          </div>
        </div>
      </div>

      <!-- Value Tags -->
      <div class="tags-section value-tags-section">
        <div class="tags-header">
          <span class="tags-label">价值分层标签</span>
          <a-button
            v-if="!confirmed"
            class="value-tags-edit-button"
            type="link"
            size="small"
            @click="editingValueTags = true"
          >
            编辑
          </a-button>
        </div>
        <div v-if="!editingValueTags" class="tags-list">
          <a-tag v-for="tag in localValueTags" :key="tag" color="blue">{{ tag }}</a-tag>
        </div>
        <div v-else class="tags-edit">
          <a-input
            v-model:value="valueTagsInput"
            placeholder="输入标签，用逗号分隔"
            @pressEnter="saveValueTags"
          />
          <div class="tags-actions">
            <a-button size="small" @click="saveValueTags">保存</a-button>
            <a-button size="small" @click="cancelValueTagsEdit">取消</a-button>
          </div>
        </div>
      </div>

      <!-- Profile Tags -->
      <div class="tags-section profile-tags-section">
        <div class="tags-header">
          <span class="tags-label">画像指标标签</span>
          <a-button
            v-if="!confirmed"
            type="link"
            size="small"
            @click="editingProfileTags = true"
          >
            编辑
          </a-button>
        </div>
        <div v-if="!editingProfileTags" class="tags-list">
          <a-tag v-for="tag in localProfileTags" :key="tag" color="green">{{ tag }}</a-tag>
        </div>
        <div v-else class="tags-edit">
          <a-input
            v-model:value="profileTagsInput"
            placeholder="输入标签，用逗号分隔"
            @pressEnter="saveProfileTags"
          />
          <div class="tags-actions">
            <a-button size="small" @click="saveProfileTags">保存</a-button>
            <a-button size="small" @click="cancelProfileTagsEdit">取消</a-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!confirmed" class="recommendation-actions">
      <a-button
        type="primary"
        @click="handleConfirm"
        block
        size="large"
      >
        确认人群
      </a-button>
    </div>

    <div v-if="confirmed" class="confirmed-indicator">
      <CheckCircleOutlined class="success-icon" />
      <span>人群已确认，流程图生成中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'

interface RecommendationData {
  audienceId: string
  audienceName: string
  size: number
  marketShare: number
  conversionRate: number
  valueTags: string[]
  profileTags: string[]
  confirmed: boolean
}

interface Props {
  messageId: string
  recommendation: RecommendationData
  disabled?: boolean
}

interface Emits {
  (e: 'confirm', data: RecommendationData): void
  (e: 'updateValueTags', tags: string[]): void
  (e: 'updateProfileTags', tags: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const confirmed = ref(props.disabled || props.recommendation.confirmed || false)
const localValueTags = ref([...props.recommendation.valueTags])
const localProfileTags = ref([...props.recommendation.profileTags])
const editingValueTags = ref(false)
const editingProfileTags = ref(false)
const valueTagsInput = ref(localValueTags.value.join(', '))
const profileTagsInput = ref(localProfileTags.value.join(', '))

// Watch for disabled prop changes
watch(() => props.disabled, (newVal) => {
  confirmed.value = newVal || false
})

// Save value tags
const saveValueTags = () => {
  const tags = valueTagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  localValueTags.value = tags
  editingValueTags.value = false
  emit('updateValueTags', tags)
  message.success('价值分层标签已更新')
}

// Cancel value tags edit
const cancelValueTagsEdit = () => {
  valueTagsInput.value = localValueTags.value.join(', ')
  editingValueTags.value = false
}

// Save profile tags
const saveProfileTags = () => {
  const tags = profileTagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  localProfileTags.value = tags
  editingProfileTags.value = false
  emit('updateProfileTags', tags)
  message.success('画像指标标签已更新')
}

// Cancel profile tags edit
const cancelProfileTagsEdit = () => {
  profileTagsInput.value = localProfileTags.value.join(', ')
  editingProfileTags.value = false
}

// Handle confirm
const handleConfirm = () => {
  confirmed.value = true
  const updatedData: RecommendationData = {
    ...props.recommendation,
    valueTags: localValueTags.value,
    profileTags: localProfileTags.value,
    confirmed: true
  }
  emit('confirm', updatedData)
  message.success('人群已确认')
}

// Format number with thousand separator
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN')
}
</script>

<style scoped>
.audience-recommendation {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
}

.recommendation-confirmed {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.recommendation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.recommendation-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  display: inline-block;
  padding: 2px 12px;
  background: #52c41a;
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.recommendation-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 12px;
}

.info-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metric-item {
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.tags-section {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
}

.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tags-label {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tags-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tags-actions {
  display: flex;
  gap: 8px;
}

.recommendation-actions {
  margin-top: 16px;
}

.recommendation-actions :deep(.ant-btn) {
  height: 40px;
  font-size: 14px;
  font-weight: 500;
}

.confirmed-indicator {
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
