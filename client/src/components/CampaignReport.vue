<template>
  <div class="campaign-report">
    <div class="report-header">
      <h4 class="report-title">📊 活动复盘报告</h4>
      <a-badge v-if="data.status === 'completed'" status="success" text="已完成" class="status-badge" />
      <a-badge v-else-if="data.status === 'running'" status="processing" text="进行中" class="status-badge" />
    </div>

    <div class="report-content">
      <!-- Campaign Overview -->
      <div class="report-section">
        <div class="section-header">
          <span class="section-icon">📋</span>
          <span class="section-title">活动概览</span>
        </div>
        <div class="overview-grid">
          <div class="overview-item">
            <span class="overview-label">活动名称</span>
            <span class="overview-value">{{ data.campaignName }}</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">执行时间</span>
            <span class="overview-value">{{ data.timeline.startDate }} ~ {{ data.timeline.endDate }}</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">活动状态</span>
            <span class="overview-value" :class="getStatusClass(data.status)">
              {{ getStatusLabel(data.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="report-section">
        <div class="section-header">
          <span class="section-icon">📈</span>
          <span class="section-title">核心指标</span>
        </div>
        <div class="metrics-grid">
          <div v-for="metric in data.metrics" :key="metric.name" class="metric-card">
            <div class="metric-header">
              <span class="metric-name">{{ metric.name }}</span>
              <span v-if="metric.trend" class="metric-trend" :class="getTrendClass(metric.trend)">
                {{ getTrendIcon(metric.trend) }} {{ Math.abs(metric.trendValue || 0) }}%
              </span>
            </div>
            <div class="metric-value">{{ formatMetricValue(metric.value, metric.unit) }}</div>
            <div v-if="metric.target" class="metric-target">
              目标: {{ formatMetricValue(metric.target, metric.unit) }}
              <span v-if="metric.value !== undefined && metric.target" class="target-achievement">
                ({{ getAchievementRate(metric.value, metric.target) }}%)
              </span>
            </div>
            <div v-if="metric.target" class="metric-progress">
              <div
                class="progress-bar"
                :style="{ width: getProgressWidth(metric.value, metric.target) }"
                :class="getProgressClass(metric.value, metric.target)"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Channel Performance -->
      <div v-if="data.channelPerformance && data.channelPerformance.length > 0" class="report-section">
        <div class="section-header">
          <span class="section-icon">📢</span>
          <span class="section-title">渠道表现</span>
        </div>
        <div class="channel-table">
          <div class="table-header">
            <span class="col-channel">渠道</span>
            <span class="col-reach">触达量</span>
            <span class="col-click">点击量</span>
            <span class="col-conversion">转化量</span>
            <span class="col-rate">转化率</span>
          </div>
          <div
            v-for="channel in data.channelPerformance"
            :key="channel.channel"
            class="table-row"
          >
            <span class="col-channel">
              <span class="channel-icon">{{ getChannelIcon(channel.channel) }}</span>
              {{ channel.channelName }}
            </span>
            <span class="col-reach">{{ formatNumber(channel.reach) }}</span>
            <span class="col-click">{{ formatNumber(channel.clicks) }}</span>
            <span class="col-conversion">{{ formatNumber(channel.conversions) }}</span>
            <span class="col-rate" :class="getRateClass(channel.conversionRate)">
              {{ channel.conversionRate.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- AI Insights -->
      <div v-if="data.insights && data.insights.length > 0" class="report-section">
        <div class="section-header">
          <span class="section-icon">💡</span>
          <span class="section-title">AI 洞察分析</span>
        </div>
        <div class="insights-list">
          <div
            v-for="(insight, index) in data.insights"
            :key="index"
            class="insight-card"
            :class="getInsightClass(insight.type)"
          >
            <div class="insight-icon">{{ getInsightIcon(insight.type) }}</div>
            <div class="insight-content">
              <div class="insight-title">{{ insight.title }}</div>
              <div class="insight-description">{{ insight.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div v-if="data.recommendations && data.recommendations.length > 0" class="report-section">
        <div class="section-header">
          <span class="section-icon">🎯</span>
          <span class="section-title">优化建议</span>
        </div>
        <div class="recommendations-list">
          <div
            v-for="(rec, index) in data.recommendations"
            :key="index"
            class="recommendation-item"
          >
            <div class="recommendation-number">{{ index + 1 }}</div>
            <div class="recommendation-content">
              <div class="recommendation-title">{{ rec.title }}</div>
              <div class="recommendation-description">{{ rec.description }}</div>
              <a-tag v-if="rec.priority" :color="getPriorityColor(rec.priority)" size="small">
                {{ getPriorityLabel(rec.priority) }}
              </a-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="report-actions">
        <a-button type="primary" @click="handleExport">
          导出报告
        </a-button>
        <a-button @click="handleShare">
          分享报告
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { message as antMessage } from 'ant-design-vue'

export interface CampaignMetric {
  name: string
  value: number
  unit?: string
  target?: number
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
}

export interface ChannelPerformance {
  channel: string
  channelName: string
  reach: number
  clicks: number
  conversions: number
  conversionRate: number
}

export interface CampaignInsight {
  type: 'success' | 'warning' | 'info' | 'improvement'
  title: string
  description: string
}

export interface CampaignRecommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface CampaignReportData {
  campaignId: string
  campaignName: string
  status: 'running' | 'completed' | 'paused'
  timeline: {
    startDate: string
    endDate: string
  }
  metrics: CampaignMetric[]
  channelPerformance?: ChannelPerformance[]
  insights?: CampaignInsight[]
  recommendations?: CampaignRecommendation[]
}

interface Props {
  messageId: string
  data: CampaignReportData
  disabled?: boolean
}

interface Emits {
  (e: 'export'): void
  (e: 'share'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Channel icon mapping
const channelIcons: Record<string, string> = {
  wechat_official: '💬',
  wechat_mini: '🔲',
  douyin: '🎵',
  xiaohongshu: '📕',
  weibo: '🐦',
  sms: '📱',
  email: '📧',
  app_push: '🔔'
}

const getStatusClass = (status: string): string => {
  const classMap: Record<string, string> = {
    running: 'status-running',
    completed: 'status-completed',
    paused: 'status-paused'
  }
  return classMap[status] || ''
}

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    running: '进行中',
    completed: '已完成',
    paused: '已暂停'
  }
  return labelMap[status] || status
}

const getTrendClass = (trend: 'up' | 'down' | 'stable'): string => {
  const classMap: Record<string, string> = {
    up: 'trend-up',
    down: 'trend-down',
    stable: 'trend-stable'
  }
  return classMap[trend] || ''
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  const iconMap: Record<string, string> = {
    up: '↑',
    down: '↓',
    stable: '→'
  }
  return iconMap[trend] || ''
}

const formatMetricValue = (value: number | undefined, unit?: string): string => {
  if (value === undefined) return '-'

  let formattedValue: string
  if (value >= 10000) {
    formattedValue = (value / 10000).toFixed(1) + '万'
  } else if (value >= 1000) {
    formattedValue = (value / 1000).toFixed(1) + 'k'
  } else {
    formattedValue = value.toLocaleString()
  }

  if (unit === '%') {
    return value.toFixed(2) + '%'
  }
  if (unit === '元' || unit === '¥') {
    return '¥' + formattedValue
  }
  return formattedValue + (unit ? unit : '')
}

const getAchievementRate = (value: number, target: number): string => {
  if (!target) return '0'
  return ((value / target) * 100).toFixed(0)
}

const getProgressWidth = (value: number | undefined, target: number | undefined): string => {
  if (!value || !target) return '0%'
  const percentage = Math.min((value / target) * 100, 100)
  return percentage + '%'
}

const getProgressClass = (value: number | undefined, target: number | undefined): string => {
  if (!value || !target) return 'progress-low'
  const percentage = (value / target) * 100
  if (percentage >= 100) return 'progress-high'
  if (percentage >= 70) return 'progress-medium'
  return 'progress-low'
}

const getChannelIcon = (channel: string): string => {
  return channelIcons[channel] || '📄'
}

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const getRateClass = (rate: number): string => {
  if (rate >= 5) return 'rate-high'
  if (rate >= 2) return 'rate-medium'
  return 'rate-low'
}

const getInsightClass = (type: CampaignInsight['type']): string => {
  const classMap: Record<CampaignInsight['type'], string> = {
    success: 'insight-success',
    warning: 'insight-warning',
    info: 'insight-info',
    improvement: 'insight-improvement'
  }
  return classMap[type] || 'insight-info'
}

const getInsightIcon = (type: CampaignInsight['type']): string => {
  const iconMap: Record<CampaignInsight['type'], string> = {
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
    improvement: '📈'
  }
  return iconMap[type] || 'ℹ️'
}

const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
  const colorMap: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'blue'
  }
  return colorMap[priority] || 'default'
}

const getPriorityLabel = (priority: 'high' | 'medium' | 'low'): string => {
  const labelMap: Record<string, string> = {
    high: '高优先',
    medium: '中优先',
    low: '低优先'
  }
  return labelMap[priority] || priority
}

const handleExport = () => {
  emit('export')
  antMessage.info('导出功能开发中...')
}

const handleShare = () => {
  emit('share')
  antMessage.info('分享功能开发中...')
}
</script>

<style scoped>
.campaign-report {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.report-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.report-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.status-badge {
  margin-left: auto;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-section {
  background-color: #fff;
  border-radius: 6px;
  padding: 16px;
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

/* Overview */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
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
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.status-running {
  color: #1890ff;
}

.status-completed {
  color: #52c41a;
}

.status-paused {
  color: #faad14;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-size: 12px;
  color: #8c8c8c;
}

.metric-trend {
  font-size: 11px;
  font-weight: 500;
}

.trend-up {
  color: #52c41a;
}

.trend-down {
  color: #ff4d4f;
}

.trend-stable {
  color: #8c8c8c;
}

.metric-value {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.metric-target {
  font-size: 11px;
  color: #8c8c8c;
}

.target-achievement {
  color: #1890ff;
  margin-left: 4px;
}

.metric-progress {
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-high {
  background-color: #52c41a;
}

.progress-medium {
  background-color: #faad14;
}

.progress-low {
  background-color: #ff4d4f;
}

/* Channel Table */
.channel-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 10px 12px;
  align-items: center;
}

.table-header {
  background-color: #fafafa;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.table-row {
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  color: #262626;
}

.table-row:last-child {
  border-bottom: none;
}

.col-channel {
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-icon {
  font-size: 14px;
}

.rate-high {
  color: #52c41a;
  font-weight: 500;
}

.rate-medium {
  color: #faad14;
  font-weight: 500;
}

.rate-low {
  color: #ff4d4f;
  font-weight: 500;
}

/* Insights */
.insights-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid;
}

.insight-success {
  background-color: #f6ffed;
  border-color: #b7eb8f;
}

.insight-warning {
  background-color: #fffbe6;
  border-color: #ffe58f;
}

.insight-info {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.insight-improvement {
  background-color: #f9f0ff;
  border-color: #d3adf7;
}

.insight-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.insight-content {
  flex: 1;
  min-width: 0;
}

.insight-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.insight-description {
  font-size: 13px;
  color: #595959;
  line-height: 1.5;
}

/* Recommendations */
.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.recommendation-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1890ff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.recommendation-content {
  flex: 1;
  min-width: 0;
}

.recommendation-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.recommendation-description {
  font-size: 13px;
  color: #595959;
  line-height: 1.5;
  margin-bottom: 8px;
}

/* Actions */
.report-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-header,
  .table-row {
    grid-template-columns: 1.5fr 1fr 1fr;
  }

  .col-click,
  .col-conversion {
    display: none;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
