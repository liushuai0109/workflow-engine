<template>
  <div class="mock-control-panel">
    <div class="panel-header">
      <h3>Mock 执行控制</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <div class="panel-content">
      <!-- 执行状态 -->
      <div class="status-section">
        <div class="status-label">执行状态:</div>
        <div class="status-value" :class="statusClass">
          {{ executionStatus || '未开始' }}
        </div>
      </div>

      <!-- 当前节点 -->
      <div v-if="currentExecution?.currentNodeId" class="current-node-section">
        <div class="label">当前节点:</div>
        <div class="value">{{ currentExecution.currentNodeId }}</div>
      </div>

      <!-- 执行进度 -->
      <div v-if="currentExecution" class="progress-section">
        <div class="label">执行进度:</div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ currentExecution.executedNodes.length }} / {{ totalNodes }}
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button
          v-if="!currentExecution || currentExecution.status === 'completed' || currentExecution.status === 'failed' || currentExecution.status === 'stopped'"
          class="btn btn-primary"
          @click="handleStart"
          :disabled="isLoading"
        >
          开始执行
        </button>
        <button
          v-else-if="currentExecution.status === 'running'"
          class="btn btn-secondary"
          @click="handlePause"
          :disabled="isLoading"
        >
          暂停
        </button>
        <button
          v-else-if="currentExecution.status === 'paused'"
          class="btn btn-primary"
          @click="handleContinue"
          :disabled="isLoading"
        >
          继续
        </button>
        <button
          v-if="currentExecution && currentExecution.status !== 'completed' && currentExecution.status !== 'stopped'"
          class="btn btn-step"
          @click="handleStep"
          :disabled="isLoading"
        >
          单步执行
        </button>
        <button
          v-if="currentExecution && currentExecution.status !== 'completed' && currentExecution.status !== 'stopped'"
          class="btn btn-danger"
          @click="handleStop"
          :disabled="isLoading"
        >
          停止
        </button>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { mockService, type MockExecution } from '../services/mockService'

interface Props {
  workflowId: string
  configId?: string
  bpmnXml?: string // BPMN XML 内容，用于无数据库模式
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  executionUpdate: [execution: MockExecution]
}>()

const currentExecution = ref<MockExecution | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const totalNodes = ref(0)
let pollInterval: number | null = null

const executionStatus = computed(() => {
  if (!currentExecution.value) return null
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    failed: '执行失败',
    stopped: '已停止',
  }
  return statusMap[currentExecution.value.status] || currentExecution.value.status
})

const statusClass = computed(() => {
  if (!currentExecution.value) return ''
  return `status-${currentExecution.value.status}`
})

const progressPercentage = computed(() => {
  if (!currentExecution.value || totalNodes.value === 0) return 0
  return Math.round(
    (currentExecution.value.executedNodes.length / totalNodes.value) * 100
  )
})

const handleStart = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const execution = await mockService.executeWorkflow(props.workflowId, {
      configId: props.configId,
      bpmnXml: props.bpmnXml, // 传递 BPMN XML
    })
    currentExecution.value = execution
    emit('executionUpdate', execution)
    startPolling(execution.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '执行失败'
  } finally {
    isLoading.value = false
  }
}

const handleStep = async () => {
  if (!currentExecution.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const execution = await mockService.stepExecution(currentExecution.value.id)
    currentExecution.value = execution
    emit('executionUpdate', execution)

    if (execution.status === 'completed' || execution.status === 'failed') {
      stopPolling()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '单步执行失败'
  } finally {
    isLoading.value = false
  }
}

const handleContinue = async () => {
  if (!currentExecution.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const execution = await mockService.continueExecution(currentExecution.value.id)
    currentExecution.value = execution
    emit('executionUpdate', execution)
    startPolling(execution.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '继续执行失败'
  } finally {
    isLoading.value = false
  }
}

const handlePause = () => {
  // TODO: 实现暂停功能（需要后端支持）
  console.log('Pause not yet implemented')
}

const handleStop = async () => {
  if (!currentExecution.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const execution = await mockService.stopExecution(currentExecution.value.id)
    currentExecution.value = execution
    emit('executionUpdate', execution)
    stopPolling()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '停止执行失败'
  } finally {
    isLoading.value = false
  }
}

const startPolling = (executionId: string) => {
  stopPolling()
  pollInterval = window.setInterval(async () => {
    try {
      const execution = await mockService.getExecution(executionId)
      currentExecution.value = execution
      emit('executionUpdate', execution)

      if (
        execution.status === 'completed' ||
        execution.status === 'failed' ||
        execution.status === 'stopped'
      ) {
        stopPolling()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // 如果是 404 错误（执行不存在），停止轮询
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        console.warn('Execution not found, stopping polling:', executionId)
        stopPolling()
        errorMessage.value = '执行已不存在（可能服务器已重启）'
      } else {
        console.error('Failed to poll execution status:', error)
      }
    }
  }, 1000) // 每秒轮询一次
}

const stopPolling = () => {
  if (pollInterval !== null) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.mock-control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
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
}

.status-section {
  margin-bottom: 16px;
}

.status-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.status-value {
  font-size: 14px;
  font-weight: 600;
}

.status-pending {
  color: #999;
}

.status-running {
  color: #1890ff;
}

.status-paused {
  color: #faad14;
}

.status-completed {
  color: #52c41a;
}

.status-failed {
  color: #ff4d4f;
}

.status-stopped {
  color: #999;
}

.current-node-section,
.progress-section {
  margin-bottom: 16px;
}

.label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.value {
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  flex: 1;
  min-width: 80px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-secondary {
  background: #faad14;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #ffc53d;
}

.btn-step {
  background: #52c41a;
  color: white;
}

.btn-step:hover:not(:disabled) {
  background: #73d13d;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #ff7875;
}

.error-message {
  margin-top: 12px;
  padding: 8px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
}
</style>

