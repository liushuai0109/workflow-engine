<template>
  <div class="interceptor-control-panel">
    <div class="panel-header">
      <h3>拦截器控制</h3>
    </div>

    <div class="panel-content">
      <!-- 会话状态 -->
      <t-form :label-width="80">
        <t-form-item label="会话状态">
          <t-tag :theme="statusTagTheme" variant="light-outline">
            {{ sessionStatus || '未启动' }}
          </t-tag>
        </t-form-item>

        <!-- 当前节点 -->
        <t-form-item v-if="currentNodeIds.length > 0" label="当前节点">
          <div class="value">{{ currentNodeIds.join(', ') }}</div>
        </t-form-item>

        <!-- 会话ID -->
        <t-form-item v-if="currentSessionId" label="会话ID">
          <div class="value-small">{{ currentSessionId }}</div>
        </t-form-item>

        <!-- 实例ID -->
        <t-form-item v-if="currentInstanceId" label="实例ID">
          <div class="value-small">{{ currentInstanceId }}</div>
        </t-form-item>

        <!-- Mock 数据配置 -->
        <t-form-item v-if="!currentSessionId" label="Mock 数据">
          <a-textarea
            v-model="mockDataJson"
            placeholder='{"nodeId": {"statusCode": 200, "body": {...}}}'
            :autosize="{ minRows: 4, maxRows: 8 }"
            :status="mockDataError ? 'error' : undefined"
            :tips="mockDataError"
          />
        </t-form-item>
      </t-form>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <a-button
          type="primary"
          block
          @click="handleInitialize"
          :loading="isLoading"
          :disabled="!!currentSessionId"
        >
          初始化
        </a-button>
        <a-button
          type="success"
          block
          @click="handleTrigger"
          :loading="isLoading"
          :disabled="!currentSessionId || currentStatus === 'completed' || currentNodeIds.length === 0"
        >
          触发节点
        </a-button>
        <a-button
          type="warning"
          block
          @click="handleViewLog"
          :loading="isLoading"
          :disabled="!currentSessionId"
        >
          {{ showLog ? '隐藏日志' : '查看日志' }}
        </a-button>
        <a-button
          type="danger"
          block
          @click="handleReset"
          :loading="isLoading"
          :disabled="!currentSessionId"
        >
          重置
        </a-button>
      </div>

      <!-- 错误信息 -->
      <t-alert v-if="errorMessage" type="error" :message="errorMessage" close />

      <!-- 执行结果 -->
      <div v-if="lastResult" class="result-section">
        <t-collapse :default-value="[]">
          <t-collapse-panel header="Business Response" value="business">
            <pre>{{ JSON.stringify(lastResult.result.businessResponse, null, 2) }}</pre>
          </t-collapse-panel>
          <t-collapse-panel header="Engine Response" value="engine">
            <pre>{{ JSON.stringify(lastResult.result.engineResponse, null, 2) }}</pre>
          </t-collapse-panel>
        </t-collapse>
      </div>

      <!-- 执行日志 -->
      <div v-if="showLog && executionLog.length > 0" class="log-section">
        <div class="log-header-title">执行日志</div>
        <div class="log-content">
          <div
            v-for="(entry, index) in executionLog"
            :key="index"
            class="log-entry"
            :class="{ 'log-mocked': entry.isMocked }"
          >
            <div class="log-header">
              <t-tag type="primary" size="small" variant="light">{{ entry.operation }}</t-tag>
              <span class="log-timestamp">{{ formatTimestamp(entry.timestamp) }}</span>
              <t-tag v-if="entry.isMocked" type="warning" size="small">Mock</t-tag>
            </div>
            <div v-if="entry.input" class="log-detail">
              <strong>输入:</strong> {{ JSON.stringify(entry.input) }}
            </div>
            <div v-if="entry.output" class="log-detail">
              <strong>输出:</strong> {{ JSON.stringify(entry.output) }}
            </div>
            <div v-if="entry.error" class="log-error">
              <strong>错误:</strong> {{ entry.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  interceptorService,
  type InterceptSession,
  type TriggerNodeResult,
  type ExecutionLogEntry,
} from '../services/interceptorService'

interface Props {
  workflowId: string
  bpmnXml?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  sessionUpdate: [session: InterceptSession]
}>()

const currentSessionId = ref<string | null>(null)
const currentInstanceId = ref<string | null>(null)
const currentNodeIds = ref<string[]>([])
const currentStatus = ref<string>('')
const mockDataJson = ref('')
const mockDataError = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const lastResult = ref<TriggerNodeResult | null>(null)
const executionLog = ref<ExecutionLogEntry[]>([])
const showLog = ref(false)

const sessionStatus = computed(() => {
  if (!currentStatus.value) return null
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    failed: '执行失败',
    stopped: '已停止',
  }
  return statusMap[currentStatus.value] || currentStatus.value
})

const statusTagTheme = computed((): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
  if (!currentStatus.value) return 'default'
  const themeMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    pending: 'default',
    running: 'primary',
    paused: 'warning',
    completed: 'success',
    failed: 'danger',
    stopped: 'default',
  }
  return themeMap[currentStatus.value] || 'default'
})

const handleInitialize = async () => {
  isLoading.value = true
  errorMessage.value = ''
  mockDataError.value = ''

  try {
    // Parse mock data JSON
    let mockData = {}
    if (mockDataJson.value.trim()) {
      try {
        mockData = JSON.parse(mockDataJson.value)
      } catch (e) {
        mockDataError.value = 'Mock 数据 JSON 格式错误'
        isLoading.value = false
        return
      }
    }

    console.log('Initializing interceptor for workflow:', props.workflowId)
    const session = await interceptorService.initializeIntercept(
      props.workflowId,
      mockData,
      {}, // initialVariables
      props.bpmnXml
    )

    console.log('Interceptor session created:', session)

    currentSessionId.value = session.sessionId
    currentInstanceId.value = session.instanceId
    currentNodeIds.value = session.currentNodeIds
    currentStatus.value = session.status

    emit('sessionUpdate', session)
  } catch (error) {
    console.error('Interceptor initialization error:', error)
    errorMessage.value = error instanceof Error ? error.message : '初始化失败'
  } finally {
    isLoading.value = false
  }
}

const handleTrigger = async () => {
  if (!currentSessionId.value || !currentInstanceId.value || currentNodeIds.value.length === 0) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await interceptorService.triggerNode(
      currentSessionId.value,
      currentInstanceId.value,
      {
        nodeId: currentNodeIds.value[0], // Trigger first current node
        businessParams: {},
      }
    )

    console.log('Trigger node result:', result)

    lastResult.value = result
    currentNodeIds.value = result.result.engineResponse.currentNodeIds
    currentStatus.value = result.result.engineResponse.status
    executionLog.value = result.executionLog

    // Fetch updated session
    const session = await interceptorService.getSession(currentSessionId.value)
    emit('sessionUpdate', session)
  } catch (error) {
    console.error('Trigger node error:', error)
    errorMessage.value = error instanceof Error ? error.message : '触发节点失败'
  } finally {
    isLoading.value = false
  }
}

const handleViewLog = async () => {
  if (!currentSessionId.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const log = await interceptorService.getExecutionLog(currentSessionId.value)
    executionLog.value = log
    showLog.value = !showLog.value
  } catch (error) {
    console.error('Get execution log error:', error)
    errorMessage.value = error instanceof Error ? error.message : '获取日志失败'
  } finally {
    isLoading.value = false
  }
}

const handleReset = async () => {
  if (!currentSessionId.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    await interceptorService.resetExecution(currentSessionId.value)

    // Reset local state
    currentSessionId.value = null
    currentInstanceId.value = null
    currentNodeIds.value = []
    currentStatus.value = ''
    lastResult.value = null
    executionLog.value = []
    showLog.value = false
  } catch (error) {
    console.error('Reset execution error:', error)
    errorMessage.value = error instanceof Error ? error.message : '重置失败'
  } finally {
    isLoading.value = false
  }
}

const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  } catch {
    return timestamp
  }
}
</script>

<style scoped>
.interceptor-control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 360px;
  max-height: 90vh;
  overflow-y: auto;
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
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
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
}

.value-small {
  font-size: 11px;
  font-family: monospace;
  color: #666;
  word-break: break-all;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  margin-bottom: 16px;
}

.result-section {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.result-section pre {
  margin-top: 8px;
  padding: 8px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.log-section {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.log-header-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: #fafafa;
}

.log-entry {
  padding: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-mocked {
  background: #fff7e6;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-timestamp {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

.log-detail {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
  word-break: break-all;
}

.log-error {
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 4px;
}
</style>
