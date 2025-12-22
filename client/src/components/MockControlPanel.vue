<template>
  <div class="mock-control-panel">
    <div class="panel-header">
      <h3>Mock 执行控制</h3>
    </div>

    <div class="panel-content">
      <!-- 执行状态 -->
      <a-form :label-width="80">
        <a-form-item label="执行状态">
          <a-tag :theme="statusTagTheme" variant="light-outline">
            {{ executionStatus || '未开始' }}
          </a-tag>
        </a-form-item>

        <!-- 当前节点 -->
        <a-form-item v-if="currentNodeIds.length > 0" label="当前节点">
          <div class="value">{{ currentNodeIds.join(', ') }}</div>
        </a-form-item>

        <!-- 实例ID -->
        <a-form-item v-if="currentInstanceId" label="实例ID">
          <div class="value-small">{{ currentInstanceId }}</div>
        </a-form-item>
      </a-form>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <a-button
          type="primary"
          block
          @click="handleStart"
          :loading="isLoading"
          :disabled="!!(currentInstanceId && currentStatus !== 'completed' && currentStatus !== 'failed')"
        >
          开始执行
        </a-button>
        <a-button
          type="success"
          block
          @click="handleStep"
          :loading="isLoading"
          :disabled="!currentInstanceId || currentStatus === 'completed' || currentStatus === 'failed'"
        >
          单步 (Step)
        </a-button>
      </div>

      <!-- 错误信息 -->
      <a-alert v-if="errorMessage" type="error" :message="errorMessage" close />

      <!-- 执行结果 -->
      <div v-if="lastResult" class="result-section">
        <a-collapse :default-value="[]">
          <a-collapse-panel header="Business Response" value="business">
            <pre>{{ JSON.stringify(lastResult.businessResponse, null, 2) }}</pre>
          </a-collapse-panel>
          <a-collapse-panel header="Engine Response" value="engine">
            <pre>{{ JSON.stringify(lastResult.engineResponse, null, 2) }}</pre>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockService, type ExecuteResult, type MockExecution } from '../services/mockService'

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

const currentInstanceId = ref<string | null>(null)
const currentNodeIds = ref<string[]>([])
const currentStatus = ref<string>('')
const isLoading = ref(false)
const errorMessage = ref('')
const lastResult = ref<ExecuteResult | null>(null)

const executionStatus = computed(() => {
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

const statusClass = computed(() => {
  if (!currentStatus.value) return ''
  return `status-${currentStatus.value}`
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

const handleStart = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    console.log('Starting mock execution for workflow:', props.workflowId)
    const result = await mockService.executeWorkflow(props.workflowId, {
      bpmnXml: props.bpmnXml, // Pass BPMN XML
      initialVariables: {},
      nodeMockData: {}, // Can be enhanced to allow user input
    })

    console.log('Mock execution result:', result)

    // Check if result has the expected structure
    if (!result || !result.engineResponse) {
      throw new Error('Invalid response structure: engineResponse is missing')
    }

    lastResult.value = result
    currentInstanceId.value = result.engineResponse.instanceId
    currentNodeIds.value = result.engineResponse.currentNodeIds
    currentStatus.value = result.engineResponse.status

    // Emit legacy format for backwards compatibility
    emit('executionUpdate', {
      id: result.engineResponse.instanceId,
      workflowId: props.workflowId,
      status: convertStatus(result.engineResponse.status),
      currentNodeId: result.engineResponse.currentNodeIds[0] || '',
      variables: result.engineResponse.variables,
      executedNodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Mock execution error:', error)
    errorMessage.value = error instanceof Error ? error.message : '执行失败'
  } finally {
    isLoading.value = false
  }
}

const handleStep = async () => {
  if (!currentInstanceId.value) {
    await handleStart()
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await mockService.stepExecution(currentInstanceId.value, {
      businessParams: {},
      nodeMockData: {}, // Can be enhanced to allow user input
    })

    lastResult.value = result
    currentNodeIds.value = result.engineResponse.currentNodeIds
    currentStatus.value = result.engineResponse.status

    // Emit legacy format for backwards compatibility
    emit('executionUpdate', {
      id: result.engineResponse.instanceId,
      workflowId: props.workflowId,
      status: convertStatus(result.engineResponse.status),
      currentNodeId: result.engineResponse.currentNodeIds[0] || '',
      variables: result.engineResponse.variables,
      executedNodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '单步执行失败'
  } finally {
    isLoading.value = false
  }
}

const convertStatus = (status: string): 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped' => {
  const statusMap: Record<string, any> = {
    'pending': 'pending',
    'running': 'running',
    'paused': 'paused',
    'completed': 'completed',
    'failed': 'failed',
    'cancelled': 'stopped',
  }
  return statusMap[status] || 'running'
}
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
</style>

