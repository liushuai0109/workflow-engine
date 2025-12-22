<template>
  <div class="mock-control-panel">
    <div class="panel-header">
      <h3>Mock 执行控制</h3>
      <div class="header-buttons">
        <a-button
          type="primary"
          @click="handleStart"
          :loading="isLoading"
          :disabled="!!(currentInstanceId && currentStatus !== 'completed' && currentStatus !== 'failed')"
        >
          开始执行
        </a-button>
      </div>
    </div>

    <div class="panel-content">
      <!-- 接口选择器 -->
      <div class="interface-selector">
        <a-form-item label="执行接口">
          <a-select v-model="selectedApi" style="width: 100%">
            <a-option value="/api/execute/:workflowInstanceId">POST /api/execute/:workflowInstanceId</a-option>
          </a-select>
        </a-form-item>
      </div>

      <!-- 错误信息 -->
      <a-alert v-if="errorMessage" type="error" :message="errorMessage" close />

      <!-- 执行信息展示 Tabs - 始终显示 -->
      <div class="result-tabs-section">
        <a-tabs v-model:active-key="activeTab" type="card">
          <!-- 请求/回包 Tab -->
          <a-tab-pane key="request-response" tab="请求/回包">
            <div class="split-panel">
              <div class="split-panel-top">
                <div class="panel-title">请求入参</div>
                <div class="code-editor-container">
                  <textarea
                    v-model="requestParamsJson"
                    class="code-editor"
                    placeholder="暂无请求数据"
                    spellcheck="false"
                  />
                </div>
              </div>
              <div class="split-panel-divider"></div>
              <div class="split-panel-bottom">
                <div class="panel-title">响应数据</div>
                <div class="code-editor-container">
                  <textarea
                    v-model="responseDataJson"
                    class="code-editor"
                    placeholder="暂无响应数据"
                    spellcheck="false"
                  />
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 拦截器调用 Tab -->
          <a-tab-pane key="interceptors" tab="拦截器调用">
            <div class="split-panel">
              <div class="split-panel-top">
                <div class="panel-title">拦截器列表</div>
                <div v-if="lastResult && lastResult.interceptorCalls && lastResult.interceptorCalls.length > 0" class="interceptor-list">
                  <div
                    v-for="call in lastResult.interceptorCalls"
                    :key="call.order"
                    :class="['interceptor-item', { active: selectedInterceptor === call.order }]"
                    @click="selectedInterceptor = call.order"
                  >
                    <span class="interceptor-order">{{ call.order }}</span>
                    <span class="interceptor-name">{{ call.name }}</span>
                    <span class="interceptor-time">{{ formatTime(call.timestamp) }}</span>
                  </div>
                </div>
                <div v-else class="empty-state-small">
                  暂无拦截器调用记录
                </div>
              </div>
              <div class="split-panel-divider"></div>
              <div class="split-panel-bottom">
                <div class="panel-title">拦截器详情</div>
                <div v-if="selectedInterceptorDetails" class="interceptor-details">
                  <a-tabs v-model:active-key="interceptorDetailTab" type="line" size="small">
                    <a-tab-pane key="input" tab="入参">
                      <div class="code-editor-container">
                        <textarea
                          v-model="interceptorInputJson"
                          class="code-editor"
                          placeholder="暂无入参数据"
                          spellcheck="false"
                        />
                      </div>
                    </a-tab-pane>
                    <a-tab-pane key="output" tab="回包">
                      <div class="code-editor-container">
                        <textarea
                          v-model="interceptorOutputJson"
                          class="code-editor"
                          placeholder="暂无回包数据"
                          spellcheck="false"
                        />
                      </div>
                    </a-tab-pane>
                  </a-tabs>
                </div>
                <div v-else class="empty-state-small">
                  请选择拦截器查看详情
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 日志 Tab -->
          <a-tab-pane key="logs" tab="日志">
            <div class="placeholder-panel">
              <div class="placeholder-text">
                日志功能开发中，敬请期待
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockService, type ExecuteResult, type MockExecution, type InterceptorCall } from '../services/mockService'

interface Props {
  workflowId: string
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
const selectedApi = ref('/api/execute/:workflowInstanceId')
const activeTab = ref('request-response')
const selectedInterceptor = ref<number | null>(null)
const interceptorDetailTab = ref('input')

const selectedInterceptorDetails = computed(() => {
  if (!selectedInterceptor.value || !lastResult.value?.interceptorCalls) return null
  return lastResult.value.interceptorCalls.find(call => call.order === selectedInterceptor.value)
})

const requestParamsJson = computed({
  get: () => lastResult.value?.requestParams ? formatJSON(lastResult.value.requestParams) : '',
  set: () => {
    // Read-only for now, could add edit support later
  }
})

const responseDataJson = computed({
  get: () => {
    if (!lastResult.value) return ''
    return formatJSON({
      businessResponse: lastResult.value.businessResponse,
      engineResponse: lastResult.value.engineResponse
    })
  },
  set: () => {
    // Read-only for now, could add edit support later
  }
})

const interceptorInputJson = computed({
  get: () => selectedInterceptorDetails.value?.input ? formatJSON(selectedInterceptorDetails.value.input) : '',
  set: () => {
    // Read-only for now, could add edit support later
  }
})

const interceptorOutputJson = computed({
  get: () => selectedInterceptorDetails.value?.output ? formatJSON(selectedInterceptorDetails.value.output) : '',
  set: () => {
    // Read-only for now, could add edit support later
  }
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

    // Reset interceptor selection
    selectedInterceptor.value = null

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

const formatJSON = (obj: any): string => {
  return JSON.stringify(obj, null, 2)
}

const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  } catch (e) {
    return timestamp
  }
}

const copyToClipboard = async (data: any) => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    // TODO: Show success toast
    console.log('Copied to clipboard')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<style scoped>
.mock-control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 480px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: calc(100vh - 40px);
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

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.panel-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.interface-selector {
  margin-bottom: 16px;
}

.result-tabs-section {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.split-panel {
  display: flex;
  flex-direction: column;
}

.split-panel-top {
  flex: 1;
  overflow: auto;
  padding: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 4px 4px 0 0;
  background: #fafafa;
}

.split-panel-divider {
  height: 4px;
  background: #e8e8e8;
  cursor: row-resize;
  flex-shrink: 0;
}

.split-panel-bottom {
  flex: 1;
  overflow: auto;
  padding: 8px;
  border: 1px solid #e8e8e8;
  border-top: none;
  border-radius: 0 0 4px 4px;
  background: #fafafa;
}

.panel-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  color: #333;
}

.detail-subtitle {
  font-weight: 600;
  font-size: 12px;
  margin-top: 12px;
  margin-bottom: 4px;
  color: #555;
}

.code-container {
  position: relative;
}

.code-content {
  margin: 0;
  padding: 8px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.interceptor-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.interceptor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.interceptor-item:hover {
  background: #f5f5f5;
  border-color: #1890ff;
}

.interceptor-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.interceptor-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.interceptor-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interceptor-time {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.interceptor-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-section {
  margin-bottom: 8px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: #999;
  font-size: 13px;
}

.empty-state-small {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 12px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.placeholder-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.placeholder-text {
  color: #999;
  font-size: 14px;
}

.code-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.code-editor {
  width: 100%;
  height: 100%;
  min-height: 150px;
  padding: 8px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  resize: none;
  outline: none;
  color: #333;
}

.code-editor:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.code-editor::placeholder {
  color: #bbb;
}
</style>
