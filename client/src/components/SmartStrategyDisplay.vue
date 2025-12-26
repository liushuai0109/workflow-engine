<template>
  <div class="smart-strategy-display">
    <div class="display-header">
      <h4 class="display-title">🧠 智能策略</h4>
      <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
    </div>

    <div class="display-content">
      <!-- Strategy Overview -->
      <div class="strategy-overview">
        <div class="overview-item">
          <span class="overview-label">策略名称</span>
          <span class="overview-value">{{ data.strategyName }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-label">预期转化率</span>
          <span class="overview-value conversion-rate">{{ data.expectedConversion }}%</span>
        </div>
      </div>

      <!-- Description -->
      <div v-if="data.description" class="strategy-description">
        <p>{{ data.description }}</p>
      </div>

      <!-- Rules Section -->
      <div class="rules-section">
        <div class="section-header">
          <span class="section-icon">📋</span>
          <span class="section-title">策略规则</span>
        </div>
        <div class="rules-list">
          <div
            v-for="(rule, index) in data.rules"
            :key="index"
            class="rule-card"
          >
            <div class="rule-number">{{ index + 1 }}</div>
            <div class="rule-content">
              <div class="rule-condition">
                <span class="rule-label">触发条件</span>
                <span class="rule-text">{{ rule.condition }}</span>
              </div>
              <div class="rule-arrow">→</div>
              <div class="rule-action">
                <span class="rule-label">执行动作</span>
                <span class="rule-text">{{ rule.action }}</span>
              </div>
            </div>
            <div class="rule-priority">
              <a-tag :color="getPriorityColor(rule.priority)" size="small">
                优先级 {{ rule.priority }}
              </a-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="display-actions">
        <a-button
          v-if="!confirmed && !disabled"
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
        >
          确定
        </a-button>
        <span v-if="confirmed" class="confirmed-text">
          ✓ 智能策略已确认
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface StrategyRule {
  condition: string
  action: string
  priority: number
}

export interface SmartStrategyData {
  strategyName: string
  description: string
  rules: StrategyRule[]
  expectedConversion: number
  confirmed: boolean
}

interface Props {
  messageId: string
  data: SmartStrategyData
  disabled?: boolean
}

interface Emits {
  (e: 'confirm', data: SmartStrategyData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const confirming = ref(false)

const confirmed = computed(() => props.data?.confirmed || false)

const getPriorityColor = (priority: number): string => {
  if (priority === 1) return 'red'
  if (priority === 2) return 'orange'
  if (priority === 3) return 'blue'
  return 'default'
}

const handleConfirm = async () => {
  if (props.disabled || confirmed.value) return

  confirming.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const updatedData: SmartStrategyData = {
      ...props.data,
      confirmed: true
    }
    emit('confirm', updatedData)
  } finally {
    confirming.value = false
  }
}
</script>

<style scoped>
.smart-strategy-display {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.display-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.display-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  margin-left: auto;
}

.display-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.strategy-overview {
  display: flex;
  gap: 24px;
  padding: 16px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 12px;
  color: #8c8c8c;
}

.overview-value {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.conversion-rate {
  color: #52c41a;
}

.strategy-description {
  padding: 12px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.strategy-description p {
  margin: 0;
  font-size: 14px;
  color: #595959;
  line-height: 1.6;
}

.rules-section {
  background-color: #fff;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.rule-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1890ff;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.rule-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rule-condition,
.rule-action {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-label {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
}

.rule-text {
  font-size: 13px;
  color: #262626;
}

.rule-arrow {
  color: #8c8c8c;
  font-size: 16px;
  flex-shrink: 0;
}

.rule-priority {
  flex-shrink: 0;
}

.display-actions {
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

/* Responsive */
@media (max-width: 600px) {
  .rule-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .rule-arrow {
    transform: rotate(90deg);
    align-self: center;
  }
}
</style>
