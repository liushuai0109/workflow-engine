<template>
  <div class="bpmn-flow-chart">
    <div class="chart-header">
      <h4 class="chart-title">🔄 BPMN 可执行流程图</h4>
      <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
    </div>

    <div class="chart-content">
      <p class="chart-hint">以下是根据营销策略生成的自动化执行流程：</p>

      <!-- Flow Nodes -->
      <div class="flow-container">
        <div class="flow-nodes">
          <div
            v-for="(node, index) in data.nodes"
            :key="node.id"
            class="flow-node-wrapper"
          >
            <div class="flow-node" :class="getNodeClass(node.type)">
              <div class="node-icon">{{ getNodeIcon(node.type) }}</div>
              <div class="node-content">
                <div class="node-type">{{ getNodeTypeLabel(node.type) }}</div>
                <div class="node-name">{{ node.name }}</div>
                <div v-if="node.description" class="node-description">
                  {{ node.description }}
                </div>
                <div v-if="node.config" class="node-config">
                  <div v-for="(value, key) in node.config" :key="key" class="config-item">
                    <span class="config-key">{{ key }}:</span>
                    <span class="config-value">{{ value }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="index < data.nodes.length - 1" class="flow-connector">
              <div class="connector-line"></div>
              <div class="connector-arrow">↓</div>
              <div v-if="getConnectionLabel(index)" class="connector-label">
                {{ getConnectionLabel(index) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Execution Summary -->
      <div v-if="data.summary" class="execution-summary">
        <div class="summary-header">
          <span class="summary-icon">📊</span>
          <span class="summary-title">执行概览</span>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">预计触达人数</span>
            <span class="summary-value">{{ formatNumber(data.summary.estimatedReach) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">执行时长</span>
            <span class="summary-value">{{ data.summary.duration }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">自动化节点</span>
            <span class="summary-value">{{ data.summary.automatedNodes }} 个</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">人工审批节点</span>
            <span class="summary-value">{{ data.summary.manualNodes }} 个</span>
          </div>
        </div>
      </div>

      <!-- BPMN XML Code (Hidden) -->
      <details class="bpmn-code-details">
        <summary>查看 BPMN XML</summary>
        <pre class="bpmn-code">{{ data.bpmnXml }}</pre>
      </details>

      <!-- Action Buttons -->
      <div class="chart-actions">
        <a-button
          v-if="!confirmed && !disabled"
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
        >
          确认并执行
        </a-button>
        <a-button
          v-if="!confirmed && !disabled"
          @click="handlePreview"
        >
          预览流程
        </a-button>
        <span v-if="confirmed" class="confirmed-text">
          ✓ 流程已确认，开始执行
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface BpmnNode {
  id: string
  type: 'start' | 'end' | 'task' | 'gateway' | 'timer' | 'message' | 'service' | 'user'
  name: string
  description?: string
  config?: Record<string, string | number>
}

export interface BpmnConnection {
  from: string
  to: string
  label?: string
}

export interface BpmnSummary {
  estimatedReach: number
  duration: string
  automatedNodes: number
  manualNodes: number
}

export interface BpmnFlowData {
  nodes: BpmnNode[]
  connections: BpmnConnection[]
  summary?: BpmnSummary
  bpmnXml: string
  confirmed: boolean
}

interface Props {
  messageId: string
  data: BpmnFlowData
  disabled?: boolean
}

interface Emits {
  (e: 'confirm', data: BpmnFlowData): void
  (e: 'preview'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const confirming = ref(false)

const confirmed = computed(() => props.data?.confirmed || false)

const getNodeClass = (type: BpmnNode['type']): string => {
  const classMap: Record<BpmnNode['type'], string> = {
    start: 'node-start',
    end: 'node-end',
    task: 'node-task',
    gateway: 'node-gateway',
    timer: 'node-timer',
    message: 'node-message',
    service: 'node-service',
    user: 'node-user'
  }
  return classMap[type] || 'node-task'
}

const getNodeIcon = (type: BpmnNode['type']): string => {
  const iconMap: Record<BpmnNode['type'], string> = {
    start: '▶️',
    end: '⏹️',
    task: '📋',
    gateway: '🔀',
    timer: '⏰',
    message: '✉️',
    service: '⚙️',
    user: '👤'
  }
  return iconMap[type] || '📋'
}

const getNodeTypeLabel = (type: BpmnNode['type']): string => {
  const labelMap: Record<BpmnNode['type'], string> = {
    start: '开始事件',
    end: '结束事件',
    task: '任务节点',
    gateway: '网关',
    timer: '定时器',
    message: '消息事件',
    service: '服务任务',
    user: '人工任务'
  }
  return labelMap[type] || '任务'
}

const getConnectionLabel = (nodeIndex: number): string | undefined => {
  if (!props.data.connections || nodeIndex >= props.data.nodes.length - 1) return undefined
  const currentNode = props.data.nodes[nodeIndex]
  if (!currentNode) return undefined
  const connection = props.data.connections.find(c => c.from === currentNode.id)
  return connection?.label
}

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const handleConfirm = async () => {
  if (props.disabled || confirmed.value) return

  confirming.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const updatedData: BpmnFlowData = {
      ...props.data,
      confirmed: true
    }
    emit('confirm', updatedData)
  } finally {
    confirming.value = false
  }
}

const handlePreview = () => {
  emit('preview')
}
</script>

<style scoped>
.bpmn-flow-chart {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.chart-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  margin-left: auto;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-hint {
  margin: 0;
  font-size: 14px;
  color: #595959;
}

.flow-container {
  background-color: #fff;
  border-radius: 6px;
  padding: 20px;
  border: 1px solid #e8e8e8;
  overflow-x: auto;
}

.flow-nodes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  min-width: fit-content;
}

.flow-node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.flow-node {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid;
  background-color: #fff;
  width: 100%;
  box-sizing: border-box;
}

.node-start {
  border-color: #52c41a;
  background-color: #f6ffed;
}

.node-end {
  border-color: #ff4d4f;
  background-color: #fff2f0;
}

.node-task {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.node-gateway {
  border-color: #faad14;
  background-color: #fffbe6;
}

.node-timer {
  border-color: #722ed1;
  background-color: #f9f0ff;
}

.node-message {
  border-color: #13c2c2;
  background-color: #e6fffb;
}

.node-service {
  border-color: #eb2f96;
  background-color: #fff0f6;
}

.node-user {
  border-color: #fa8c16;
  background-color: #fff7e6;
}

.node-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-type {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.node-name {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.node-description {
  font-size: 12px;
  color: #595959;
  margin-bottom: 6px;
}

.node-config {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.config-item {
  font-size: 11px;
  background-color: rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 3px;
}

.config-key {
  color: #8c8c8c;
}

.config-value {
  color: #262626;
  margin-left: 4px;
}

.flow-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  position: relative;
}

.connector-line {
  width: 2px;
  height: 20px;
  background-color: #d9d9d9;
}

.connector-arrow {
  font-size: 14px;
  color: #8c8c8c;
}

.connector-label {
  position: absolute;
  left: calc(50% + 20px);
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #8c8c8c;
  background-color: #fafafa;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.execution-summary {
  background-color: #fff;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #e8e8e8;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.summary-icon {
  font-size: 16px;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: #8c8c8c;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

.bpmn-code-details {
  margin-top: 12px;
  border-top: 1px dashed #e8e8e8;
  padding-top: 12px;
}

.bpmn-code-details summary {
  cursor: pointer;
  color: #8c8c8c;
  font-size: 12px;
}

.bpmn-code {
  margin-top: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  white-space: pre-wrap;
  color: #595959;
  max-height: 200px;
  overflow-y: auto;
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

/* Responsive */
@media (max-width: 600px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
