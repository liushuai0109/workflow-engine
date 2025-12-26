<template>
  <div class="marketing-plan-preview">
    <!-- Panel Header -->
    <div class="preview-header">
      <div class="header-content">
        <h3 class="preview-title">📋 营销方案预览</h3>
      </div>
      <div v-if="mermaidCode || bpmnXml || plan" class="header-actions">
        <a-button-group size="small">
          <a-button
            :type="previewMode === 'plan' ? 'primary' : 'default'"
            @click="previewMode = 'plan'"
            :disabled="!plan"
          >
            📄 方案
          </a-button>
          <a-button
            v-if="mermaidCode"
            :type="previewMode === 'mermaid' ? 'primary' : 'default'"
            @click="previewMode = 'mermaid'"
          >
            📊 触达策略
          </a-button>
          <a-button
            v-if="bpmnXml"
            :type="previewMode === 'bpmn' ? 'primary' : 'default'"
            @click="previewMode = 'bpmn'"
          >
            🔄 执行流程
          </a-button>
        </a-button-group>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!plan && !loading && !bpmnXml && !mermaidCode" class="empty-state">
      <div class="empty-icon">💡</div>
      <div class="empty-text">暂无方案</div>
      <div class="empty-subtitle">
        开始与营销智能体对话，<br />生成您的专属营销方案
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="loading-state">
      <a-spin size="large" />
      <div class="loading-text">加载方案中...</div>
    </div>

    <!-- Mermaid Preview Mode (触达策略流程图) -->
    <div v-else-if="previewMode === 'mermaid' && mermaidCode" class="mermaid-preview-container">
      <div class="mermaid-preview-content">
        <div v-if="isMermaidRendering" class="mermaid-loading">
          <a-spin size="large" />
          <div class="loading-text">渲染流程图中...</div>
        </div>
        <div v-else-if="mermaidSvg" class="mermaid-svg-container" v-html="mermaidSvg"></div>
        <div v-else-if="mermaidError" class="mermaid-error">
          <span>⚠️ Mermaid 加载失败: {{ mermaidError }}</span>
        </div>
        <div v-else class="mermaid-empty">
          <span>暂无流程图数据</span>
        </div>
      </div>
    </div>

    <!-- BPMN Preview Mode (执行流程图) -->
    <div v-else-if="previewMode === 'bpmn' && bpmnXml" class="bpmn-preview-container">
      <div class="bpmn-preview-content">
        <div ref="bpmnContainer" class="bpmn-canvas"></div>
        <div class="bpmn-controls">
          <a-button size="small" @click="zoomIn" title="放大">
            <template #icon>+</template>
          </a-button>
          <a-button size="small" @click="zoomOut" title="缩小">
            <template #icon>−</template>
          </a-button>
          <a-button size="small" @click="zoomToFit" title="适应画布">
            ⌂
          </a-button>
        </div>
      </div>
      <div v-if="bpmnError" class="bpmn-error">
        <span>⚠️ BPMN 加载失败: {{ bpmnError }}</span>
      </div>
    </div>

    <!-- Plan Content -->
    <div v-else-if="previewMode === 'plan' && plan" class="preview-content">
      <!-- Status Badge -->
      <div class="plan-status">
        <a-tag :color="getStatusColor(plan.status)">
          {{ getStatusText(plan.status) }}
        </a-tag>
      </div>

      <!-- Basic Info Section -->
      <section class="preview-section">
        <h4 class="section-title">📄 基本信息</h4>
        <div class="section-content">
          <div class="info-item">
            <span class="info-label">活动主题</span>
            <span class="info-value">{{ plan.title }}</span>
          </div>
          <div v-if="plan.description" class="info-item">
            <span class="info-label">活动描述</span>
            <span class="info-value">{{ plan.description }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">版本</span>
            <span class="info-value">v{{ plan.version }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ formatDate(plan.createdAt) }}</span>
          </div>
        </div>
      </section>

      <!-- Timeline Section -->
      <section class="preview-section">
        <h4 class="section-title">📅 活动时间</h4>
        <div class="section-content">
          <div class="info-item">
            <span class="info-label">开始日期</span>
            <span class="info-value">{{ formatDate(plan.timeline.startDate) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">结束日期</span>
            <span class="info-value">{{ formatDate(plan.timeline.endDate) }}</span>
          </div>
          <div v-if="plan.timeline.milestones && plan.timeline.milestones.length > 0" class="milestones">
            <div class="info-label">关键里程碑</div>
            <div v-for="(milestone, index) in plan.timeline.milestones" :key="index" class="milestone-item">
              <div class="milestone-date">{{ formatDate(milestone.date) }}</div>
              <div class="milestone-name">{{ milestone.name }}</div>
              <div v-if="milestone.deliverables.length > 0" class="milestone-deliverables">
                <ul>
                  <li v-for="(deliverable, i) in milestone.deliverables" :key="i">{{ deliverable }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Objectives Section -->
      <section class="preview-section">
        <h4 class="section-title">🎯 活动目标</h4>
        <div class="section-content">
          <div class="info-item">
            <span class="info-label">主要目标</span>
            <span class="info-value">{{ plan.objectives.primary }}</span>
          </div>
          <div v-if="plan.objectives.secondary && plan.objectives.secondary.length > 0" class="info-item">
            <span class="info-label">次要目标</span>
            <ul class="list-content">
              <li v-for="(objective, index) in plan.objectives.secondary" :key="index">{{ objective }}</li>
            </ul>
          </div>
          <div v-if="plan.objectives.kpis && plan.objectives.kpis.length > 0" class="kpis">
            <div class="info-label">关键绩效指标（KPI）</div>
            <div v-for="(kpi, index) in plan.objectives.kpis" :key="index" class="kpi-item">
              <span class="kpi-metric">{{ kpi.metric }}</span>
              <span class="kpi-target">目标: {{ kpi.target }}</span>
              <span class="kpi-timeframe">时间: {{ kpi.timeframe }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Channels Section -->
      <section class="preview-section">
        <h4 class="section-title">📱 触达渠道</h4>
        <div class="section-content">
          <div class="channels-grid">
            <div v-for="(channel, index) in plan.channels" :key="index" class="channel-card">
              <div class="channel-header">
                <span class="channel-name">{{ channel.name }}</span>
                <a-tag :color="getPriorityColor(channel.priority)">{{ channel.priority }}</a-tag>
              </div>
              <div class="channel-type">
                <a-tag>{{ channel.type === 'online' ? '线上' : '线下' }}</a-tag>
              </div>
              <div v-if="channel.budget" class="channel-budget">
                预算: ¥{{ channel.budget.toLocaleString() }}
              </div>
              <div v-if="channel.description" class="channel-description">
                {{ channel.description }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Target Audience Section -->
      <section class="preview-section">
        <h4 class="section-title">👥 活动人群</h4>
        <div class="section-content">
          <div v-if="plan.targetAudience.demographics && plan.targetAudience.demographics.length > 0" class="info-item">
            <span class="info-label">人口统计特征</span>
            <div class="tags-list">
              <a-tag v-for="(demo, index) in plan.targetAudience.demographics" :key="index" color="blue">
                {{ demo }}
              </a-tag>
            </div>
          </div>
          <div v-if="plan.targetAudience.interests && plan.targetAudience.interests.length > 0" class="info-item">
            <span class="info-label">兴趣偏好</span>
            <div class="tags-list">
              <a-tag v-for="(interest, index) in plan.targetAudience.interests" :key="index" color="green">
                {{ interest }}
              </a-tag>
            </div>
          </div>
          <div v-if="plan.targetAudience.behaviors && plan.targetAudience.behaviors.length > 0" class="info-item">
            <span class="info-label">行为特征</span>
            <div class="tags-list">
              <a-tag v-for="(behavior, index) in plan.targetAudience.behaviors" :key="index" color="orange">
                {{ behavior }}
              </a-tag>
            </div>
          </div>
          <div v-if="plan.targetAudience.segments && plan.targetAudience.segments.length > 0" class="info-item">
            <span class="info-label">人群分层</span>
            <div class="tags-list">
              <a-tag v-for="(segment, index) in plan.targetAudience.segments" :key="index" color="purple">
                {{ segment }}
              </a-tag>
            </div>
          </div>
          <div v-if="plan.targetAudience.estimatedSize" class="info-item">
            <span class="info-label">预估覆盖人数</span>
            <span class="info-value">{{ plan.targetAudience.estimatedSize.toLocaleString() }} 人</span>
          </div>
        </div>
      </section>

      <!-- Strategies Section -->
      <section class="preview-section">
        <h4 class="section-title">🎨 活动策略</h4>
        <div class="section-content">
          <div v-for="(strategy, index) in plan.strategies" :key="index" class="strategy-card">
            <div class="strategy-header">
              <span class="strategy-name">{{ strategy.name }}</span>
              <a-tag>{{ strategy.channel }}</a-tag>
            </div>
            <div class="strategy-approach">
              <strong>方法:</strong> {{ strategy.approach }}
            </div>
            <div v-if="strategy.tactics && strategy.tactics.length > 0" class="strategy-tactics">
              <strong>战术:</strong>
              <ul>
                <li v-for="(tactic, i) in strategy.tactics" :key="i">{{ tactic }}</li>
              </ul>
            </div>
            <div class="strategy-footer">
              <span v-if="strategy.budget" class="strategy-budget">
                预算: ¥{{ strategy.budget.toLocaleString() }}
              </span>
              <span v-if="strategy.expectedOutcome" class="strategy-outcome">
                预期: {{ strategy.expectedOutcome }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Budget Section -->
      <section v-if="plan.budget" class="preview-section">
        <h4 class="section-title">💰 预算汇总</h4>
        <div class="section-content">
          <div class="budget-total">
            <span class="budget-label">总预算</span>
            <span class="budget-amount">{{ plan.budget.currency }} {{ plan.budget.total.toLocaleString() }}</span>
          </div>
          <div v-if="plan.budget.breakdown && plan.budget.breakdown.length > 0" class="budget-breakdown">
            <div class="info-label">预算明细</div>
            <div v-for="(item, index) in plan.budget.breakdown" :key="index" class="budget-item">
              <span class="budget-category">{{ item.category }}</span>
              <span class="budget-percentage">{{ item.percentage }}%</span>
              <span class="budget-amount-sm">¥{{ item.amount.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { MarketingPlan, MarketingPlanStatus } from '../services/marketingPlanApiService'

interface Props {
  plan: MarketingPlan | null
  loading: boolean
  mermaidCode?: string
  bpmnXml?: string
}

const props = defineProps<Props>()

// Preview mode: 'plan' | 'mermaid' | 'bpmn'
const previewMode = ref<'plan' | 'mermaid' | 'bpmn'>('plan')

// Mermaid Viewer state
const mermaidContainer = ref<HTMLElement>()
const mermaidSvg = ref<string>('')
const mermaidError = ref<string | null>(null)
const isMermaidRendering = ref(false)

// BPMN Viewer state
const bpmnContainer = ref<HTMLElement>()
const bpmnError = ref<string | null>(null)
let bpmnViewer: any = null

// Dynamic import for Mermaid
const renderMermaid = async (code: string) => {
  if (!code?.trim()) {
    mermaidError.value = '没有 Mermaid 代码'
    return
  }

  isMermaidRendering.value = true
  mermaidError.value = null

  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    })

    const { svg } = await mermaid.render(`mermaid-preview-${Date.now()}`, code)
    mermaidSvg.value = svg
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    mermaidError.value = errorMessage
    console.error('Mermaid render error:', error)
  } finally {
    isMermaidRendering.value = false
  }
}

// Dynamic import for BPMN Viewer (to reduce initial bundle size)
const loadBpmnViewer = async () => {
  if (bpmnViewer) return bpmnViewer

  try {
    // Use dynamic import to load bpmn-js Viewer
    const BpmnModule = await import('bpmn-js/lib/NavigatedViewer')
    const BpmnViewer = BpmnModule.default
    return BpmnViewer
  } catch (error) {
    console.error('Failed to load BPMN Viewer:', error)
    throw error
  }
}

// Initialize BPMN viewer
const initBpmnViewer = async () => {
  if (!bpmnContainer.value || !props.bpmnXml) return

  try {
    bpmnError.value = null

    const BpmnViewer = await loadBpmnViewer()

    // Cleanup existing viewer
    if (bpmnViewer) {
      bpmnViewer.destroy()
    }

    // Create new viewer
    bpmnViewer = new BpmnViewer({
      container: bpmnContainer.value,
      keyboard: {
        bindTo: document
      }
    })

    // Import XML
    await bpmnViewer.importXML(props.bpmnXml)

    // Fit to viewport
    const canvas = bpmnViewer.get('canvas')
    canvas.zoom('fit-viewport')

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    bpmnError.value = errorMessage
    console.error('BPMN viewer initialization error:', error)
  }
}

// Zoom controls
const zoomIn = () => {
  if (!bpmnViewer) return
  const canvas = bpmnViewer.get('canvas')
  const currentZoom = canvas.zoom()
  canvas.zoom(currentZoom * 1.2)
}

const zoomOut = () => {
  if (!bpmnViewer) return
  const canvas = bpmnViewer.get('canvas')
  const currentZoom = canvas.zoom()
  canvas.zoom(currentZoom * 0.8)
}

const zoomToFit = () => {
  if (!bpmnViewer) return
  const canvas = bpmnViewer.get('canvas')
  canvas.zoom('fit-viewport')
}

// Watch for Mermaid code changes
watch(() => props.mermaidCode, async (newCode) => {
  if (newCode) {
    // Auto-switch to mermaid mode when mermaid code is provided
    previewMode.value = 'mermaid'
    await nextTick()
    await renderMermaid(newCode)
  }
}, { immediate: true })

// Watch for BPMN XML changes
watch(() => props.bpmnXml, async (newXml) => {
  if (newXml) {
    // Auto-switch to BPMN mode when BPMN XML is provided
    previewMode.value = 'bpmn'
    await nextTick()
    await initBpmnViewer()
  }
}, { immediate: true })

// Watch for preview mode changes
watch(previewMode, async (mode) => {
  if (mode === 'mermaid' && props.mermaidCode && !mermaidSvg.value) {
    await nextTick()
    await renderMermaid(props.mermaidCode)
  } else if (mode === 'bpmn' && props.bpmnXml) {
    await nextTick()
    await initBpmnViewer()
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }
})

// Status color mapping
const getStatusColor = (status: MarketingPlanStatus): string => {
  const colors: Record<MarketingPlanStatus, string> = {
    draft: 'default',
    review: 'blue',
    approved: 'green',
    active: 'orange',
    completed: 'purple'
  }
  return colors[status] || 'default'
}

// Status text mapping
const getStatusText = (status: MarketingPlanStatus): string => {
  const texts: Record<MarketingPlanStatus, string> = {
    draft: '草稿',
    review: '审核中',
    approved: '已批准',
    active: '进行中',
    completed: '已完成'
  }
  return texts[status] || status
}

// Priority color mapping
const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
  const colors = {
    high: 'red',
    medium: 'orange',
    low: 'default'
  }
  return colors[priority] || 'default'
}

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.marketing-plan-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
}

/* Header */
.preview-header {
  padding: 16px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  flex: 1;
}

.header-actions {
  flex-shrink: 0;
}

.preview-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 18px;
  font-weight: 500;
  color: #595959;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #8c8c8c;
  line-height: 1.6;
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-text {
  color: #8c8c8c;
  font-size: 14px;
}

/* Mermaid Preview */
.mermaid-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

.mermaid-preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: auto;
  min-height: 400px;
}

.mermaid-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #8c8c8c;
}

.mermaid-svg-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mermaid-svg-container :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-error {
  padding: 12px 16px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
}

.mermaid-empty {
  color: #8c8c8c;
  font-size: 14px;
}

/* BPMN Preview */
.bpmn-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bpmn-preview-content {
  flex: 1;
  position: relative;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  margin: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.bpmn-canvas {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.bpmn-canvas :deep(svg) {
  width: 100%;
  height: 100%;
}

.bpmn-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bpmn-controls .ant-btn {
  min-width: 32px;
  padding: 4px 8px;
}

.bpmn-error {
  padding: 12px 16px;
  margin: 0 16px 16px 16px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
}

/* Content */
.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.plan-status {
  margin-bottom: 16px;
}

/* Section */
.preview-section {
  margin-bottom: 24px;
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.section-content {
  font-size: 14px;
  color: #595959;
}

/* Info Items */
.info-item {
  margin-bottom: 12px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  display: inline-block;
  min-width: 100px;
  font-weight: 500;
  color: #8c8c8c;
  margin-right: 8px;
}

.info-value {
  color: #262626;
}

.list-content {
  margin: 4px 0 0 108px;
  padding-left: 20px;
}

.list-content li {
  margin-bottom: 4px;
}

/* Milestones */
.milestones {
  margin-top: 8px;
}

.milestone-item {
  margin: 8px 0;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.milestone-date {
  font-size: 12px;
  color: #8c8c8c;
}

.milestone-name {
  font-weight: 500;
  margin: 4px 0;
}

.milestone-deliverables ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
  font-size: 13px;
}

/* KPIs */
.kpis {
  margin-top: 8px;
}

.kpi-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  margin: 4px 0;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
}

.kpi-metric {
  font-weight: 500;
  flex: 1;
}

.kpi-target {
  color: #1890ff;
}

.kpi-timeframe {
  color: #8c8c8c;
}

/* Channels Grid */
.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.channel-card {
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.channel-name {
  font-weight: 500;
  font-size: 14px;
}

.channel-type {
  margin-bottom: 4px;
}

.channel-budget {
  font-size: 13px;
  color: #52c41a;
  font-weight: 500;
  margin: 4px 0;
}

.channel-description {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 8px;
  line-height: 1.4;
}

/* Tags */
.tags-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Strategy Cards */
.strategy-card {
  margin-bottom: 12px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.strategy-card:last-child {
  margin-bottom: 0;
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.strategy-name {
  font-weight: 500;
  font-size: 14px;
}

.strategy-approach {
  margin-bottom: 8px;
  font-size: 13px;
}

.strategy-tactics {
  margin-bottom: 8px;
  font-size: 13px;
}

.strategy-tactics ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
}

.strategy-tactics li {
  margin-bottom: 2px;
}

.strategy-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e8e8e8;
}

.strategy-budget {
  color: #52c41a;
  font-weight: 500;
}

.strategy-outcome {
  font-style: italic;
}

/* Budget */
.budget-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #e6f7ff;
  border-radius: 6px;
  margin-bottom: 12px;
}

.budget-label {
  font-weight: 500;
  color: #262626;
}

.budget-amount {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.budget-breakdown {
  margin-top: 8px;
}

.budget-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 4px 0;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
}

.budget-category {
  flex: 1;
}

.budget-percentage {
  margin: 0 12px;
  color: #8c8c8c;
}

.budget-amount-sm {
  font-weight: 500;
  color: #1890ff;
}

/* Scrollbar */
.preview-content::-webkit-scrollbar {
  width: 6px;
}

.preview-content::-webkit-scrollbar-track {
  background: transparent;
}

.preview-content::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
