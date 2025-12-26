<template>
  <div class="marketing-plan-form" :class="{ 'form-submitted': submitted }">
    <div class="form-header">
      <h4>📋 营销方案表单</h4>
      <span v-if="submitted" class="submitted-badge">已提交</span>
    </div>

    <a-form
      :model="formData"
      :rules="formRules"
      layout="vertical"
      :disabled="submitted"
      ref="formRef"
    >
      <!-- 活动主题 -->
      <a-form-item label="活动主题" name="title" class="form-field">
        <a-input
          id="form_item_title"
          v-model:value="formData.title"
          placeholder="例如：双十一大促销活动"
          :disabled="submitted"
        />
      </a-form-item>

      <!-- 活动时间 -->
      <a-form-item label="活动时间" name="dateRange" class="form-field">
        <a-range-picker
          id="form_item_dateRange"
          v-model:value="dateRangeValue"
          format="YYYY-MM-DD"
          style="width: 100%"
          :disabled="submitted"
        />
      </a-form-item>

      <!-- 活动目标 -->
      <a-form-item label="活动目标" name="objectives" class="form-field">
        <a-textarea
          id="form_item_objectives"
          v-model:value="formData.objectives"
          placeholder="描述活动的主要目标和预期成果..."
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :disabled="submitted"
        />
      </a-form-item>

      <!-- 触达渠道 -->
      <a-form-item label="触达渠道" name="channels" class="form-field">
        <a-select
          id="form_item_channels"
          v-model:value="formData.channels"
          mode="multiple"
          placeholder="选择一个或多个渠道"
          :options="channelOptions"
          :disabled="submitted"
        />
      </a-form-item>

      <!-- 目标人群 -->
      <a-form-item label="目标人群" name="targetAudience" class="form-field">
        <a-textarea
          id="form_item_targetAudience"
          v-model:value="formData.targetAudience"
          placeholder="描述目标用户群体的特征..."
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :disabled="submitted"
        />
      </a-form-item>

      <!-- 营销策略 -->
      <a-form-item label="营销策略" name="strategies" class="form-field">
        <a-textarea
          id="form_item_strategies"
          v-model:value="formData.strategies"
          placeholder="描述具体的营销策略和执行方案..."
          :auto-size="{ minRows: 3, maxRows: 6 }"
          :disabled="submitted"
        />
      </a-form-item>

      <!-- 提交按钮 -->
      <a-form-item v-if="!submitted">
        <a-button
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
          block
          size="large"
        >
          {{ submitting ? '提交中...' : '确定提交' }}
        </a-button>
      </a-form-item>
    </a-form>

    <!-- 已提交状态提示 -->
    <div v-if="submitted" class="submitted-indicator">
      <CheckCircleOutlined class="success-icon" />
      <span>方案已提交，请在右侧查看完整内容</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useMarketingPlanForm, type MarketingPlanFormData } from '../composables/useMarketingPlanForm'

interface Props {
  messageId: string
  initialData?: Partial<MarketingPlanFormData>
  disabled?: boolean
  submitting?: boolean
}

interface Emits {
  (e: 'submit', formData: MarketingPlanFormData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Use composable
const {
  formData,
  formRules,
  channelOptions,
  isSubmitted,
  validateForm,
  setFormData
} = useMarketingPlanForm()

const submitted = ref(props.disabled || false)
const formRef = ref()

// Convert string dates to Dayjs objects for RangePicker
const dateRangeValue = computed<[Dayjs, Dayjs] | [string, string]>({
  get() {
    const [start, end] = formData.value.dateRange
    if (start && end) {
      return [dayjs(start), dayjs(end)]
    }
    return ['', '']
  },
  set(value: [Dayjs, Dayjs] | [string, string]) {
    if (value && value[0] && value[1]) {
      // Convert Dayjs to string format
      const start = typeof value[0] === 'string' ? value[0] : value[0].format('YYYY-MM-DD')
      const end = typeof value[1] === 'string' ? value[1] : value[1].format('YYYY-MM-DD')
      formData.value.dateRange = [start, end]
    } else {
      formData.value.dateRange = ['', '']
    }
  }
})

// Initialize form data
if (props.initialData) {
  setFormData(props.initialData)
}

// Watch for disabled prop changes
watch(() => props.disabled, (newVal) => {
  submitted.value = newVal || false
})

// Handle form submission
const handleSubmit = async () => {
  try {
    // Validate Ant Design form
    await formRef.value?.validate()

    // Additional validation
    const validation = validateForm()
    if (!validation.valid) {
      validation.errors.forEach(error => message.warning(error))
      return
    }

    // Emit submit event
    emit('submit', formData.value)

    // Mark as submitted
    submitted.value = true
    isSubmitted.value = true

    message.success('方案已提交')
  } catch (error) {
    console.error('Form validation failed:', error)
    message.error('请完善表单信息')
  }
}
</script>

<style scoped>
.marketing-plan-form {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
}

.form-submitted {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.form-header h4 {
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

.form-field {
  margin-bottom: 16px;
}

.form-field :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.form-field :deep(.ant-form-item-label > label) {
  font-size: 13px;
  font-weight: 500;
  color: #595959;
}

.form-field :deep(.ant-input),
.form-field :deep(.ant-input-textarea),
.form-field :deep(.ant-select-selector) {
  font-size: 13px;
}

.form-field :deep(.ant-picker) {
  width: 100%;
}

/* Disabled state styling */
.form-submitted :deep(.ant-input-disabled),
.form-submitted :deep(.ant-input-textarea-disabled),
.form-submitted :deep(.ant-select-disabled .ant-select-selector) {
  background: #f5f5f5;
  color: #595959;
  cursor: not-allowed;
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

/* Button styling */
:deep(.ant-btn-primary) {
  height: 40px;
  font-size: 14px;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .marketing-plan-form {
    padding: 12px;
  }

  .form-header h4 {
    font-size: 14px;
  }
}
</style>
