<template>
  <div class="reach-strategy-chart">
    <div class="chart-header">
      <h4 class="chart-title">📈 触达策略流程图</h4>
      <div class="header-actions">
        <a-button
          v-if="hasMermaidCode && !showMermaid"
          size="small"
          type="link"
          @click="showMermaid = true"
        >
          查看流程图
        </a-button>
        <a-button
          v-if="hasMermaidCode && showMermaid"
          size="small"
          type="link"
          @click="showMermaid = false"
        >
          查看卡片
        </a-button>
        <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
      </div>
    </div>

    <div class="chart-content">
      <!-- Mermaid Flowchart -->
      <div class="mermaid-container" ref="mermaidContainer">
        <div v-if="loading || isRendering" class="chart-loading">
          <a-spin />
          <span>{{ isRendering ? '渲染流程图中...' : '生成流程图中...' }}</span>
        </div>

        <!-- Mermaid SVG Display -->
        <div v-else-if="showMermaid && mermaidSvg" class="mermaid-svg-container" v-html="mermaidSvg"></div>

        <!-- Mermaid Render Error Fallback -->
        <div v-else-if="showMermaid && mermaidError" class="mermaid-error">
          <div class="error-icon">⚠️</div>
          <div class="error-message">流程图渲染失败: {{ mermaidError }}</div>
          <a-button size="small" @click="showMermaid = false">显示卡片视图</a-button>
        </div>

        <!-- Card-based Visual (fallback or default) -->
        <div v-else class="flowchart-visual">
          <!-- Stage Cards -->
          <div class="stages-wrapper">
            <div v-for="(stage, index) in data.stages" :key="stage.name" class="stage-row">
              <div class="stage-card" :class="getStageClass(index)">
                <div class="stage-header">
                  <span class="stage-icon">{{ getStageIcon(index) }}</span>
                  <span class="stage-name">{{ stage.name }}</span>
                </div>
                <div class="stage-body">
                  <div class="stage-section">
                    <span class="section-label">触达渠道</span>
                    <div class="channel-tags">
                      <a-tag v-for="channel in stage.channels" :key="channel" size="small" color="blue">
                        {{ channel }}
                      </a-tag>
                    </div>
                  </div>
                  <div class="stage-section">
                    <span class="section-label">关键动作</span>
                    <div class="action-list">
                      <div v-for="action in stage.actions" :key="action" class="action-item">
                        <span class="action-bullet">•</span>
                        <span>{{ action }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="index < data.stages.length - 1" class="stage-connector">
                <div class="connector-line"></div>
                <div class="connector-arrow">↓</div>
              </div>
            </div>
          </div>

          <!-- Mermaid Code (Hidden, for reference) -->
          <details v-if="hasMermaidCode" class="mermaid-code-details">
            <summary>查看 Mermaid 代码</summary>
            <pre class="mermaid-code">{{ data.mermaidCode }}</pre>
          </details>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="chart-actions">
        <a-button
          v-if="!confirmed && !disabled"
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
        >
          确定
        </a-button>
        <span v-if="confirmed" class="confirmed-text">
          ✓ 已确认触达策略
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useMermaidParser } from '../composables/useMermaidParser'

export interface ReachStrategyStage {
  name: string
  channels: string[]
  actions: string[]
}

export interface ReachStrategyData {
  mermaidCode: string
  stages: ReachStrategyStage[]
  confirmed: boolean
}

interface Props {
  messageId: string
  data: ReachStrategyData
  disabled?: boolean
}

interface Emits {
  (e: 'confirm', data: ReachStrategyData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Mermaid parser composable
const { isRendering, renderMermaid, cleanupMermaidSvg } = useMermaidParser()

// State
const loading = ref(false)
const confirming = ref(false)
const mermaidContainer = ref<HTMLElement>()
const showMermaid = ref(false)
const mermaidSvg = ref<string | null>(null)
const mermaidError = ref<string | null>(null)

// Computed
const confirmed = computed(() => props.data?.confirmed || false)
const hasMermaidCode = computed(() => !!props.data?.mermaidCode?.trim())

// Watch for mermaid display toggle
watch(showMermaid, async (show) => {
  if (show && hasMermaidCode.value && !mermaidSvg.value) {
    await renderMermaidChart()
  }
})

// Watch for data changes
watch(() => props.data?.mermaidCode, async (newCode, oldCode) => {
  if (newCode !== oldCode && showMermaid.value) {
    mermaidSvg.value = null
    mermaidError.value = null
    await renderMermaidChart()
  }
})

// Render Mermaid chart
const renderMermaidChart = async () => {
  if (!props.data?.mermaidCode?.trim()) {
    mermaidError.value = '没有可用的 Mermaid 代码'
    return
  }

  mermaidError.value = null

  try {
    const result = await renderMermaid(props.data.mermaidCode, props.messageId)

    if (result.success && result.svg) {
      mermaidSvg.value = result.svg
    } else {
      mermaidError.value = result.error || '渲染失败'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    mermaidError.value = errorMessage
    console.error('Mermaid render error:', error)
  }
}

const getStageClass = (index: number): string => {
  const classes = ['awareness', 'interest', 'conversion', 'retention']
  return classes[index % classes.length] || 'awareness'
}

const getStageIcon = (index: number): string => {
  const icons = ['👀', '💡', '🎯', '🔄']
  return icons[index % icons.length] || '👀'
}

const handleConfirm = async () => {
  if (props.disabled || confirmed.value) return

  confirming.value = true
  try {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 300))

    const updatedData: ReachStrategyData = {
      ...props.data,
      confirmed: true
    }
    emit('confirm', updatedData)
  } finally {
    confirming.value = false
  }
}

// Cleanup on unmount
onUnmounted(() => {
  cleanupMermaidSvg(props.messageId)
})
</script>

<style scoped>
.reach-strategy-chart {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  margin-left: 0;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mermaid-container {
  background-color: #fff;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #e8e8e8;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #8c8c8c;
}

/* Mermaid SVG Container */
.mermaid-svg-container {
  padding: 16px;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.mermaid-svg-container :deep(svg) {
  max-width: 100%;
  height: auto;
}

/* Mermaid Error Display */
.mermaid-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.mermaid-error .error-icon {
  font-size: 32px;
}

.mermaid-error .error-message {
  color: #ff4d4f;
  font-size: 13px;
}

.flowchart-visual {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.stage-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.stage-card {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid;
  background-color: #fff;
}

.stage-card.awareness {
  border-color: #1890ff;
}

.stage-card.interest {
  border-color: #52c41a;
}

.stage-card.conversion {
  border-color: #fa8c16;
}

.stage-card.retention {
  border-color: #722ed1;
}

.stage-header {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.stage-card.awareness .stage-header {
  background-color: #e6f7ff;
  color: #1890ff;
}

.stage-card.interest .stage-header {
  background-color: #f6ffed;
  color: #52c41a;
}

.stage-card.conversion .stage-header {
  background-color: #fff7e6;
  color: #fa8c16;
}

.stage-card.retention .stage-header {
  background-color: #f9f0ff;
  color: #722ed1;
}

.stage-icon {
  font-size: 18px;
}

.stage-name {
  font-size: 14px;
}

.stage-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stage-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.channel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #595959;
}

.action-bullet {
  color: #8c8c8c;
}

.stage-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.connector-line {
  width: 2px;
  height: 16px;
  background-color: #d9d9d9;
}

.connector-arrow {
  font-size: 14px;
  color: #8c8c8c;
}

.mermaid-code-details {
  margin-top: 12px;
  border-top: 1px dashed #e8e8e8;
  padding-top: 12px;
}

.mermaid-code-details summary {
  cursor: pointer;
  color: #8c8c8c;
  font-size: 12px;
}

.mermaid-code {
  margin-top: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  color: #595959;
}

.chart-actions {
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
</style>
