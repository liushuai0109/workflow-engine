<template>
  <div class="debug-control-panel">
    <div class="panel-header">
      <h3>Debug 控制</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <div class="panel-content">
      <!-- 会话状态 -->
      <div class="status-section">
        <div class="status-label">会话状态:</div>
        <div class="status-value" :class="statusClass">
          {{ sessionStatus || '未启动' }}
        </div>
      </div>

      <!-- 当前节点 -->
      <div v-if="currentSession?.currentNodeId" class="current-node-section">
        <div class="label">当前节点:</div>
        <div class="value">{{ currentSession.currentNodeId }}</div>
      </div>

      <!-- 断点数量 -->
      <div v-if="currentSession" class="breakpoints-section">
        <div class="label">断点数量:</div>
        <div class="value">{{ currentSession.breakpoints.length }}</div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button
          v-if="!currentSession || currentSession.status === 'stopped'"
          class="btn btn-primary"
          @click="handleStart"
          :disabled="isLoading"
        >
          启动 Debug
        </button>
        <button
          v-else-if="currentSession.status === 'running'"
          class="btn btn-secondary"
          @click="handlePause"
          :disabled="isLoading"
        >
          暂停
        </button>
        <button
          v-else-if="currentSession.status === 'paused'"
          class="btn btn-primary"
          @click="handleContinue"
          :disabled="isLoading"
        >
          继续
        </button>
        <button
          v-if="currentSession && currentSession.status !== 'stopped'"
          class="btn btn-step"
          @click="handleStep"
          :disabled="isLoading"
        >
          单步执行
        </button>
        <button
          v-if="currentSession && currentSession.status !== 'stopped'"
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
import { ref, computed, onBeforeUnmount } from 'vue'
import { debugService, type DebugSession } from '../services/debugService'

interface Props {
  workflowId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  sessionUpdate: [session: DebugSession]
}>()

const currentSession = ref<DebugSession | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
let pollInterval: number | null = null

const sessionStatus = computed(() => {
  if (!currentSession.value) return null
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    stopped: '已停止',
  }
  return statusMap[currentSession.value.status] || currentSession.value.status
})

const statusClass = computed(() => {
  if (!currentSession.value) return ''
  return `status-${currentSession.value.status}`
})

const handleStart = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const session = await debugService.startDebug(props.workflowId, {})
    currentSession.value = session
    emit('sessionUpdate', session)
    startPolling(session.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '启动 Debug 失败'
  } finally {
    isLoading.value = false
  }
}

const handleStep = async () => {
  if (!currentSession.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const session = await debugService.stepSession(currentSession.value.id)
    currentSession.value = session
    emit('sessionUpdate', session)

    if (session.status === 'completed' || session.status === 'stopped') {
      stopPolling()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '单步执行失败'
  } finally {
    isLoading.value = false
  }
}

const handleContinue = async () => {
  if (!currentSession.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const session = await debugService.continueSession(currentSession.value.id)
    currentSession.value = session
    emit('sessionUpdate', session)
    startPolling(session.id)
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
  if (!currentSession.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const session = await debugService.stopSession(currentSession.value.id)
    currentSession.value = session
    emit('sessionUpdate', session)
    stopPolling()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '停止 Debug 失败'
  } finally {
    isLoading.value = false
  }
}

const startPolling = (sessionId: string) => {
  stopPolling()
  pollInterval = window.setInterval(async () => {
    try {
      const session = await debugService.getSession(sessionId)
      currentSession.value = session
      emit('sessionUpdate', session)

      if (session.status === 'completed' || session.status === 'stopped') {
        stopPolling()
      }
    } catch (error) {
      console.error('Failed to poll session status:', error)
    }
  }, 1000)
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
.debug-control-panel {
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

.status-section,
.current-node-section,
.breakpoints-section {
  margin-bottom: 16px;
}

.status-label,
.label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.status-value,
.value {
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

.status-stopped {
  color: #999;
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

