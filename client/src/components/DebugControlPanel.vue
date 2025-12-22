<template>
  <div class="debug-control-panel">
    <div class="panel-header">
      <h3>Debug 控制</h3>
    </div>

    <div class="panel-content">
      <!-- 会话状态 -->
      <a-form :label-width="80">
        <a-form-item label="会话状态">
          <a-tag :theme="statusTagTheme" variant="light-outline">
            {{ sessionStatus || '未启动' }}
          </a-tag>
        </a-form-item>

        <!-- 当前节点 -->
        <a-form-item v-if="currentSession?.currentNodeId" label="当前节点">
          <div class="value">{{ currentSession.currentNodeId }}</div>
        </a-form-item>

        <!-- 断点数量 -->
        <a-form-item v-if="currentSession" label="断点数量">
          <div class="value">{{ currentSession.breakpoints.length }}</div>
        </a-form-item>
      </a-form>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <a-button
          type="primary"
          block
          @click="handleStart"
          :loading="isLoading"
          :disabled="currentSession && currentSession.status !== 'stopped'"
        >
          启动 Debug
        </a-button>
        <a-button
          type="success"
          block
          @click="handleStep"
          :loading="isLoading"
          :disabled="currentSession && currentSession.status === 'stopped'"
        >
          单步 (Step)
        </a-button>
        <a-button
          type="primary"
          block
          @click="handleContinue"
          :loading="isLoading"
          :disabled="!currentSession || currentSession.status !== 'paused'"
        >
          继续 (Continue)
        </a-button>
        <a-button
          type="danger"
          block
          @click="handleStop"
          :loading="isLoading"
          :disabled="!currentSession || currentSession.status === 'stopped'"
        >
          停止 (Stop)
        </a-button>
      </div>

      <!-- 错误信息 -->
      <a-alert v-if="errorMessage" type="error" :message="errorMessage" close />
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

const statusTagTheme = computed((): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
  if (!currentSession.value) return 'default'
  const themeMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    pending: 'default',
    running: 'primary',
    paused: 'warning',
    completed: 'success',
    stopped: 'default',
  }
  return themeMap[currentSession.value.status] || 'default'
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
  // If no session exists, start one first
  if (!currentSession.value) {
    await handleStart()
    // Wait a bit for session to start
    await new Promise(resolve => setTimeout(resolve, 500))
  }

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

.value {
  font-size: 14px;
  font-weight: 600;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  margin-bottom: 16px;
}
</style>

