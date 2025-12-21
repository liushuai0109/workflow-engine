<template>
  <div class="execution-timeline">
    <div class="panel-header">
      <h3>执行历史</h3>
      <div class="header-actions">
        <a-button
          type="text"
         
          size="small"
          @click="jumpToPrevious"
          :disabled="!selectedHistoryId || histories.findIndex(h => h.id === selectedHistoryId) <= 0"
          title="上一个"
        >
          ↑
        </a-button>
        <a-button
          type="text"
         
          size="small"
          @click="jumpToNext"
          :disabled="!selectedHistoryId || histories.findIndex(h => h.id === selectedHistoryId) >= histories.length - 1"
          title="下一个"
        >
          ↓
        </a-button>
        <a-button type="text" @click="$emit('close')">×</a-button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="histories.length === 0" class="empty-state">
        暂无执行历史
      </div>

      <t-timeline v-else layout="vertical">
        <t-timeline-item
          v-for="(history, index) in histories"
          :key="history.id"
          :class="{ active: selectedHistoryId === history.id }"
          :dot-color="selectedHistoryId === history.id ? 'primary' : 'default'"
          @click="selectHistory(history)"
        >
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="node-name">{{ history.nodeName || history.nodeId }}</span>
              <span class="execution-time">{{ formatTime(history.executedAt) }}</span>
            </div>
            <div class="timeline-details">
              <div class="detail-item">
                <span class="label">节点类型:</span>
                <span class="value">{{ getNodeTypeName(history.nodeType) }}</span>
              </div>
              <div v-if="history.executionTimeMs" class="detail-item">
                <span class="label">执行时间:</span>
                <span class="value">{{ history.executionTimeMs }}ms</span>
              </div>
              <div v-if="history.errorMessage" class="detail-item error">
                <span class="label">错误:</span>
                <span class="value">{{ history.errorMessage }}</span>
              </div>
            </div>
          </div>
        </t-timeline-item>
      </t-timeline>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface ExecutionHistory {
  id: string
  executionId: string
  nodeId: string
  nodeName?: string
  nodeType: number
  inputData: Record<string, any>
  outputData: Record<string, any>
  variablesBefore: Record<string, any>
  variablesAfter: Record<string, any>
  executionTimeMs?: number
  errorMessage?: string
  executedAt: string
}

interface Props {
  histories: ExecutionHistory[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  historySelected: [history: ExecutionHistory]
}>()

const selectedHistoryId = ref<string | null>(null)

const selectHistory = (history: ExecutionHistory) => {
  selectedHistoryId.value = history.id
  emit('historySelected', history)
}

// 跳转到指定历史记录
const jumpToHistory = (index: number) => {
  const history = props.histories[index]
  if (history && index >= 0 && index < props.histories.length) {
    selectHistory(history)
  }
}

// 跳转到上一个历史记录
const jumpToPrevious = () => {
  const currentIndex = props.histories.findIndex(h => h.id === selectedHistoryId.value)
  if (currentIndex > 0) {
    jumpToHistory(currentIndex - 1)
  }
}

// 跳转到下一个历史记录
const jumpToNext = () => {
  const currentIndex = props.histories.findIndex(h => h.id === selectedHistoryId.value)
  if (currentIndex >= 0 && currentIndex < props.histories.length - 1) {
    jumpToHistory(currentIndex + 1)
  }
}

// 暴露方法供父组件调用
defineExpose({
  jumpToHistory,
  jumpToPrevious,
  jumpToNext,
})

const formatTime = (time: string): string => {
  const date = new Date(time)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
}

const getNodeTypeName = (nodeType: number): string => {
  const typeMap: Record<number, string> = {
    1: '开始事件',
    2: '结束事件',
    3: '用户任务',
    4: '服务任务',
    5: '排他网关',
    6: '并行网关',
  }
  return typeMap[nodeType] || `类型 ${nodeType}`
}
</script>

<style scoped>
.execution-timeline {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 400px;
  max-height: 500px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nav-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #e6f7ff;
  border-color: #1890ff;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
}

.close-btn:hover {
  color: #000;
}

.panel-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.panel-content :deep(.a-timeline-item) {
  cursor: pointer;
  transition: all 0.2s;
}

.panel-content :deep(.a-timeline-item:hover) {
  opacity: 0.8;
}

.panel-content :deep(.a-timeline-item.active) {
  opacity: 1;
}

.timeline-content {
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px;
}

.panel-content :deep(.a-timeline-item.active) .timeline-content {
  background: #e6f7ff;
  border-color: #1890ff;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.node-name {
  font-size: 14px;
  font-weight: 600;
}

.execution-time {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.timeline-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item {
  font-size: 12px;
  display: flex;
  gap: 8px;
}

.detail-item.error {
  color: #ff4d4f;
}

.detail-item .label {
  color: #666;
}

.detail-item .value {
  color: #333;
  font-weight: 500;
}
</style>

