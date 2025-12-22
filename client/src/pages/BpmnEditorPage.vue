<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-button @click="openFile" type="primary">
          <template #icon><FolderOpenOutlined /></template>
          Open BPMN
        </a-button>
        <a-button @click="saveFile" :disabled="!currentDiagram">
          <template #icon><SaveOutlined /></template>
          Save BPMN
        </a-button>
        <a-button @click="newDiagram">
          <template #icon><FileAddOutlined /></template>
          New
        </a-button>
        <a-button
          @click="toggleFlowVisualization"
          :type="isFlowVisualizationEnabled ? 'primary' : 'default'"
          :disabled="!currentDiagram"
          :title="isFlowVisualizationEnabled ? '关闭流量可视化' : '启用流量可视化'"
        >
          <template #icon><LineChartOutlined /></template>
          {{ isFlowVisualizationEnabled ? '关闭流量' : '显示流量' }}
        </a-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- BPMN 编辑器 -->
      <div class="editor-container">
        <a-spin :spinning="isAIProcessing" tip="AI 正在处理流程图..." size="large">
          <BpmnEditor v-if="currentDiagram" ref="bpmnEditor" :xml="currentDiagram" @error="handleError"
            @shown="handleShown" @loading="handleLoading" @changed="handleDiagramChanged" />

          <!-- 欢迎界面 -->
          <div v-else class="welcome-screen">
            <div class="welcome-content">
              <h1>BPMN Explorer</h1>
              <p>Create and edit BPMN diagrams with ease</p>
              <div class="welcome-actions">
                <a-button @click="openFile" type="primary" size="large">
                  <template #icon><FolderOpenOutlined /></template>
                  Open BPMN File
                </a-button>
                <a-button @click="newDiagram" size="large">
                  <template #icon><FileAddOutlined /></template>
                  Create New Diagram
                </a-button>
              </div>
              <div class="drag-hint">
                <p>Or drag and drop a BPMN file here</p>
              </div>
            </div>
          </div>
        </a-spin>
      </div>

      <!-- 右侧统一面板 -->
      <RightPanelContainer
        v-if="currentDiagram"
        ref="rightPanelRef"
        :active-tab="activeRightPanelTab"
        :workflow-id="getWorkflowId"
        :bpmn-xml="currentDiagram"
        :config-id="selectedMockConfigId"
        @tab-change="handleRightPanelTabChange"
        @mock-execution-update="handleMockExecutionUpdate"
        @debug-session-update="handleDebugSessionUpdate"
        @interceptor-session-update="handleInterceptorSessionUpdate"
        @chat-message="handleChatMessage"
      />
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span v-if="isLoading" class="status-loading">Loading...</span>
        <span v-else-if="hasError" class="status-error">Error: {{ errorMessage }}</span>
        <span v-else-if="currentDiagram" class="status-success">Ready</span>
        <span v-else class="status-info">No diagram loaded</span>
      </div>
      <div class="status-right">
        <span v-if="lastSaved" class="status-saved">
          Last saved: {{ formatTime(lastSaved) }}
        </span>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept=".bpmn,.xml" @change="handleFileSelect" style="display: none" />

    <!-- Mock 配置面板 -->
    <MockConfigPanel
      v-if="showMockConfigPanel && currentDiagram"
      :workflow-id="getWorkflowId || ''"
      @close="showMockConfigPanel = false"
      @config-selected="handleMockConfigSelected"
    />

    <!-- 变量监视面板 -->
      <VariableWatchPanel
        v-if="showVariablePanel && currentDiagram"
        :variables="debugVariables"
        :previous-variables="previousDebugVariables"
        @close="showVariablePanel = false"
      />

    <!-- 执行历史时间线 -->
    <ExecutionTimeline
      v-if="showTimelinePanel && currentDiagram"
      :histories="executionHistories"
      @close="showTimelinePanel = false"
      @history-selected="handleHistorySelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import {
  FolderOpenOutlined,
  SaveOutlined,
  FileAddOutlined,
  LineChartOutlined
} from '@ant-design/icons-vue'
import BpmnEditor from '../components/BpmnEditor.vue'
import RightPanelContainer from '../components/RightPanelContainer.vue'
import MockConfigPanel from '../components/MockConfigPanel.vue'
import VariableWatchPanel from '../components/VariableWatchPanel.vue'
import ExecutionTimeline from '../components/ExecutionTimeline.vue'
import { LocalStorageService } from '../services/localStorageService'
import { visualizationService } from '../services/visualizationService'
import { contextMenuService } from '../services/contextMenuService'
import type { MockExecution } from '../services/mockService'
import { debugService, type DebugSession } from '../services/debugService'
import type { InterceptSession } from '../services/interceptorService'
import type { ExecutionHistory } from '../components/ExecutionTimeline.vue'
import { llmService } from '../services/llmService'
import type { Message, FunctionCall } from '../services/llmService'
import { BPMN_SYSTEM_PROMPT } from '../prompts/bpmnSystemPrompt'
import { EDITOR_SYSTEM_PROMPT } from '../prompts/editorSystemPrompt'
import { CLAUDE_BPMN_SYSTEM_PROMPT } from '../prompts/claudeBpmnSystemPrompt'
import { availableTools } from '../services/llmTools'
import { editorOperationService } from '../services/editorOperationService'
import { createBpmnClaudeLLMService } from '../services/claudeLlmService'
import { createClaudeEditorBridge, waitForEditor } from '../services/claudeEditorBridge'
import type { FileValidationResult } from '../types'

// 配置：使用 Claude 还是 Gemini
// Claude: 使用 Claude Sonnet 4.5 + Tool Use (推荐)
// Gemini: 使用原有的 Gemini 实现
const USE_CLAUDE = true

// 配置：是否使用 Function Calling 模式（仅 Gemini）
// 注意：Function Calling 需要官方 Gemini API 支持
// 中转 API (api.aicodewith.com) 可能不支持，建议使用 XML 模式
const USE_FUNCTION_CALLING = false

// 响应式数据
const currentDiagram = ref<string>('')
const isLoading = ref<boolean>(false)
const isAIProcessing = ref<boolean>(false) // AI 处理中的状态
const hasError = ref<boolean>(false)
const errorMessage = ref<string>('')
const lastSaved = ref<Date | null>(null)
const fileInput = ref<HTMLInputElement>()
const bpmnEditor = ref<any>()
const isFlowVisualizationEnabled = ref<boolean>(false)
const rightPanelRef = ref<any>() // RightPanelContainer 组件引用

// Mock 和 Debug 相关状态
const showMockConfigPanel = ref<boolean>(false)
const showVariablePanel = ref<boolean>(false)
const showTimelinePanel = ref<boolean>(false)
const selectedMockConfigId = ref<string | undefined>()
const currentWorkflowId = ref<string>('')
const debugVariables = ref<Record<string, any>>({})
const previousDebugVariables = ref<Record<string, any>>({})
const executionHistories = ref<ExecutionHistory[]>([])

// 右侧面板 Tab 状态
const activeRightPanelTab = ref<'properties' | 'chat' | 'mock' | 'debug' | 'interceptor'>('properties')

// 当图表改变时，更新工作流 ID
watch(() => currentDiagram.value, () => {
  if (currentDiagram.value) {
    const match = currentDiagram.value.match(/<bpmn:process[^>]+id="([^"]+)"/)
    if (match && match[1]) {
      currentWorkflowId.value = match[1]
    }
  }
}, { immediate: true })

// 计算当前工作流 ID（从 BPMN XML 中提取或使用默认值）
const getWorkflowId = computed((): string => {
  // TODO: 从 BPMN XML 中提取 workflow ID
  // 暂时使用时间戳作为临时 ID
  if (!currentWorkflowId.value && currentDiagram.value) {
    // 尝试从 XML 中提取 process ID
    const match = currentDiagram.value.match(/<bpmn:process[^>]+id="([^"]+)"/)
    if (match && match[1]) {
      currentWorkflowId.value = match[1]
    } else {
      currentWorkflowId.value = `workflow-${Date.now()}`
    }
  }
  return currentWorkflowId.value || `workflow-${Date.now()}`
})

// UserTask 约束验证
const validateUserTaskConstraints = (modeler: any): {
  valid: boolean
  errors: string[]
} => {
  const elementRegistry = modeler.get('elementRegistry')
  const errors: string[] = []

  // 1. 收集所有 BoundaryEvent，按 attachedToRef 分组
  const boundaryEvents = elementRegistry.filter((el: any) => el.type === 'bpmn:BoundaryEvent')
  const boundaryEventsByAttached = new Map<string, any[]>()

  boundaryEvents.forEach((be: any) => {
    const attachedToRef = be.businessObject.attachedToRef?.id
    if (attachedToRef) {
      if (!boundaryEventsByAttached.has(attachedToRef)) {
        boundaryEventsByAttached.set(attachedToRef, [])
      }
      boundaryEventsByAttached.get(attachedToRef)!.push(be)
    }
  })

  // 2. 检查所有 UserTask
  const userTasks = elementRegistry.filter((el: any) => el.type === 'bpmn:UserTask')

  userTasks.forEach((task: any) => {
    const outgoing = task.businessObject.outgoing || []
    if (outgoing.length === 0) {
      // UserTask 没有 outgoing 是允许的（流程终点）
      return
    }

    // 检查每条 outgoing 连线的 sourceRef
    outgoing.forEach((flow: any) => {
      const sourceRef = flow.sourceRef?.id
      if (sourceRef === task.id) {
        // 违规：连线直接从 UserTask 出发
        errors.push(
          `❌ UserTask "${task.businessObject.name || task.id}" 有直接的 outgoing 连线。\n` +
          `所有从 UserTask 出发的连线必须从 BoundaryEvent 出发。\n\n` +
          `修复建议：\n` +
          `1. 删除从 UserTask 直接连出的连线\n` +
          `2. 在 UserTask 上创建 BoundaryEvent（如"完成"、"通过"、"拒绝"等）\n` +
          `3. 从 BoundaryEvent 创建连线到下一个节点`
        )
      }
    })

    // 检查是否有 BoundaryEvent
    const hasBoundaryEvents = boundaryEventsByAttached.has(task.id)
    if (!hasBoundaryEvents && outgoing.length > 0) {
      errors.push(
        `❌ UserTask "${task.businessObject.name || task.id}" 有 outgoing 连线但没有附加 BoundaryEvent。\n\n` +
        `修复建议：在该 UserTask 上创建至少一个 BoundaryEvent。`
      )
    }
  })

  return { valid: errors.length === 0, errors }
}

// 文件操作
const openFile = (): void => {
  fileInput.value?.click()
}

const saveFile = async (): Promise<void> => {
  if (!bpmnEditor.value) return

  try {
    // 步骤 1: 保存前验证 UserTask 约束
    const modeler = bpmnEditor.value.getModeler()
    if (!modeler) {
      showStatus('编辑器未初始化', 'error')
      return
    }

    const validationResult = validateUserTaskConstraints(modeler)

    if (!validationResult.valid) {
      // 验证失败，显示详细错误信息
      const errorMsg = validationResult.errors.join('\n\n' + '='.repeat(50) + '\n\n')
      alert(
        `❌ 无法保存：BPMN 结构不符合约束规则\n\n` +
        `${errorMsg}\n\n` +
        `📋 UserTask 约束规则：\n` +
        `所有从 UserTask 出发的连线必须从 BoundaryEvent 出发，不能直接连接。\n\n` +
        `这个约束确保流程图的语义清晰，明确定义每个任务的所有可能出口。`
      )
      hasError.value = true
      errorMessage.value = validationResult.errors[0].split('\n')[0] // 状态栏显示第一个错误的第一行
      return
    }

    // 步骤 2: 验证通过，继续保存
    // 从 BpmnEditor 获取最新的 XML 内容（BPMN 格式）
    const bpmnXml = await bpmnEditor.value.getXml()

    const blob = new Blob([bpmnXml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.bpmn'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // 手动触发 changed 事件来更新 currentDiagram
    await bpmnEditor.value.triggerChanged()

    lastSaved.value = new Date()
    showStatus('File saved successfully', 'success')
  } catch (error) {
    console.error('Save error:', error)
    showStatus('Failed to save file', 'error')
  }
}

const newDiagram = (): void => {
  const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js" exporterVersion="9.4.0">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="New Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

  currentDiagram.value = defaultXml

  // 保存到 localStorage
  if (LocalStorageService.isAvailable()) {
    LocalStorageService.saveDiagram(defaultXml, 'New Diagram')
  }

  showStatus('New diagram created', 'success')
}

// 文件处理
const handleFileSelect = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  processFile(file)
}

const processFile = (file: File): void => {
  const validation = validateFile(file)
  if (!validation.isValid) {
    showStatus(validation.error || 'Invalid file', 'error')
    return
  }

  isLoading.value = true
  hasError.value = false

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string

      if (isValidBpmnXml(content)) {
        currentDiagram.value = content

        // 保存到 localStorage
        if (LocalStorageService.isAvailable()) {
          LocalStorageService.saveDiagram(content, file.name)
        }

        showStatus(`File loaded: ${file.name}`, 'success')
      } else {
        console.log('Invalid BPMN content', content)
        showStatus('Invalid BPMN content', 'error')
      }
    } catch (error) {
      console.error('File processing error:', error)
      showStatus('Failed to process file', 'error')
    } finally {
      isLoading.value = false
    }
  }

  reader.onerror = () => {
    showStatus('Failed to read file', 'error')
    isLoading.value = false
  }

  reader.readAsText(file, 'UTF-8')
}

// 文件验证
const validateFile = (file: File): FileValidationResult => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['.bpmn', '.xml']
  const fileName = file.name.toLowerCase()

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' }
  }

  if (!allowedTypes.some(type => fileName.endsWith(type))) {
    return { isValid: false, error: 'Please select a BPMN or XML file' }
  }

  return { isValid: true, size: file.size, type: file.type }
}

const isValidBpmnXml = (content: string): boolean => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    console.error('isValidBpmnXml', parseError);
    if (parseError) return false

    // 检查是否包含 BPMN 命名空间
    return content.includes('http://www.omg.org/spec/BPMN/20100524/MODEL')
  } catch {
    return false
  }
}

// 状态管理
const showStatus = (message: string, type: 'success' | 'error' | 'info'): void => {
  errorMessage.value = message
  hasError.value = type === 'error'

  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  }
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}

// 事件处理
const handleError = (err: Error): void => {
  console.error('BPMN error:', err)
  hasError.value = true
  errorMessage.value = err.message || 'Unknown error occurred'
  isLoading.value = false
}

// Mock 和 Debug 控制函数
const toggleMockPanel = () => {
  console.log('Toggle Mock Panel, current tab:', activeRightPanelTab.value)
  activeRightPanelTab.value = activeRightPanelTab.value === 'mock' ? 'properties' : 'mock'
  console.log('Mock Panel tab after toggle:', activeRightPanelTab.value)
}

const toggleDebugPanel = () => {
  console.log('Toggle Debug Panel, current tab:', activeRightPanelTab.value)
  activeRightPanelTab.value = activeRightPanelTab.value === 'debug' ? 'properties' : 'debug'
  if (activeRightPanelTab.value === 'debug') {
    showVariablePanel.value = true
    showTimelinePanel.value = true
    console.log('Debug Panel opened, showing variable and timeline panels')
  }
  console.log('Debug Panel tab after toggle:', activeRightPanelTab.value)
}

const toggleInterceptorPanel = () => {
  console.log('Toggle Interceptor Panel, current tab:', activeRightPanelTab.value)
  activeRightPanelTab.value = activeRightPanelTab.value === 'interceptor' ? 'properties' : 'interceptor'
  console.log('Interceptor Panel tab after toggle:', activeRightPanelTab.value)
}

// 处理右侧面板 Tab 切换
const handleRightPanelTabChange = async (tab: string) => {
  activeRightPanelTab.value = tab as 'properties' | 'chat' | 'mock' | 'debug' | 'interceptor'

  // 如果切换到聊天 Tab，滚动到底部并加载历史
  if (tab === 'chat') {
    await nextTick()
    // 滚动到底部
    if (rightPanelRef.value && rightPanelRef.value.scrollToBottom) {
      // 延迟执行确保组件已完全渲染
      setTimeout(() => {
        rightPanelRef.value.scrollToBottom()
      }, 100)
    }

    // 如果使用 Claude 并且还未初始化，加载历史
    if (USE_CLAUDE) {
      await loadChatHistoryForTab()
    }
  }
}

// 为 Tab 模式加载聊天历史
const loadChatHistoryForTab = async (): Promise<void> => {
  if (!USE_CLAUDE) return

  try {
    // 初始化 Claude 服务（如果尚未初始化）
    if (!claudeService) {
      if (bpmnEditor.value) {
        const modeler = bpmnEditor.value.getModeler()
        if (modeler) {
          editorOperationService.init(modeler)
        }
      }

      const editorBridge = createClaudeEditorBridge()
      claudeService = createBpmnClaudeLLMService(editorBridge, CLAUDE_BPMN_SYSTEM_PROMPT)
    }

    // 尝试从 LocalStorage 加载会话ID
    const conversationId = claudeService.loadConversationIdFromStorage()

    if (conversationId) {
      // 加载会话但不需要更新 UI,因为 ChatBox 会在挂载时自动处理
      await claudeService.loadConversation(conversationId)
    }
  } catch (error) {
    console.error('Failed to load chat history for tab:', error)
  }
}

const handleMockExecutionUpdate = (execution: MockExecution) => {
  // 更新可视化
  if (bpmnEditor.value) {
    const modeler = bpmnEditor.value.getModeler()
    if (modeler) {
      visualizationService.init(modeler)
      visualizationService.updateVisualization(
        execution.executedNodes,
        execution.currentNodeId,
        execution.status === 'failed' ? [execution.currentNodeId] : []
      )
    }
  }
}

const handleMockConfigSelected = (config: any) => {
  selectedMockConfigId.value = config.id
  showMockConfigPanel.value = false
}

const handleDebugSessionUpdate = async (session: DebugSession) => {
  // 保存之前的变量值用于变化检测
  previousDebugVariables.value = { ...debugVariables.value }
  // 更新变量
  debugVariables.value = session.variables || {}

  // 更新可视化
  if (bpmnEditor.value) {
    const modeler = bpmnEditor.value.getModeler()
    if (modeler) {
      visualizationService.init(modeler)
      if (session.currentNodeId) {
        visualizationService.highlightNode(session.currentNodeId, 'running')
      }
    }
  }

  // 更新断点
  if (bpmnEditor.value) {
    const modeler = bpmnEditor.value.getModeler()
    if (modeler) {
      contextMenuService.setBreakpoints(session.breakpoints || [])
    }
  }

  // 如果有 executionId，获取执行历史
  if (session.executionId) {
    try {
      const result = await debugService.getExecutionHistories(session.executionId)
      executionHistories.value = result.histories
    } catch (error) {
      console.error('Failed to get execution histories:', error)
    }
  }
}

const handleInterceptorSessionUpdate = (session: InterceptSession) => {
  // 更新可视化
  if (bpmnEditor.value) {
    const modeler = bpmnEditor.value.getModeler()
    if (modeler) {
      visualizationService.init(modeler)
      // 高亮当前节点
      if (session.currentNodeIds && session.currentNodeIds.length > 0) {
        session.currentNodeIds.forEach(nodeId => {
          visualizationService.highlightNode(nodeId, 'running')
        })
      }
    }
  }
}

const handleHistorySelected = (history: ExecutionHistory) => {
  // 高亮选中的历史节点
  if (bpmnEditor.value) {
    const modeler = bpmnEditor.value.getModeler()
    if (modeler) {
      visualizationService.init(modeler)
      visualizationService.clearAllHighlights()
      visualizationService.highlightNode(history.nodeId, 'completed')
    }
  }
}

const handleShown = (): void => {
  console.log('=== BPMN diagram shown ===')
  console.log('currentDiagram value:', currentDiagram.value ? `exists (${currentDiagram.value.length} chars)` : 'empty')
  console.log('Button should be visible:', !!currentDiagram.value)
  console.log('Mock button disabled:', !currentDiagram.value)
  console.log('Debug button disabled:', !currentDiagram.value)
  isLoading.value = false
  hasError.value = false
  errorMessage.value = ''

  // 初始化可视化服务和右键菜单服务
  setTimeout(() => {
    if (bpmnEditor.value) {
      const modeler = bpmnEditor.value.getModeler()
      if (modeler) {
        visualizationService.init(modeler)
        contextMenuService.init(modeler, {
          onSetBreakpoint: (nodeId: string) => {
            console.log('Set breakpoint:', nodeId)
            // TODO: 调用 Debug API 设置断点
          },
          onRemoveBreakpoint: (nodeId: string) => {
            console.log('Remove breakpoint:', nodeId)
            // TODO: 调用 Debug API 移除断点
          },
          onViewDetails: (nodeId: string) => {
            console.log('View details:', nodeId)
            // TODO: 显示节点详情
          },
        })
      }
    }
  }, 100)
}

const handleLoading = (): void => {
  console.log('BPMN diagram loading')
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
}

const handleDiagramChanged = (xml: string): void => {
  currentDiagram.value = xml
  console.log('Diagram changed')
  console.log('currentDiagram updated, length:', xml.length)
  console.log('Buttons should now be visible:', !!currentDiagram.value)
}

// 流量可视化
const toggleFlowVisualization = (): void => {
  if (!bpmnEditor.value) return

  try {
    isFlowVisualizationEnabled.value = !isFlowVisualizationEnabled.value
    bpmnEditor.value.enableFlowVisualization(isFlowVisualizationEnabled.value)

    if (isFlowVisualizationEnabled.value) {
      showStatus('流量可视化已启用', 'success')
    } else {
      showStatus('流量可视化已关闭', 'info')
    }
  } catch (error) {
    console.error('Failed to toggle flow visualization:', error)
    showStatus('切换流量可视化失败', 'error')
    // 回退状态
    isFlowVisualizationEnabled.value = !isFlowVisualizationEnabled.value
  }
}

// 执行工具调用
const executeFunctionCall = (functionCall: FunctionCall): any => {
  const { name, args } = functionCall

  console.log(`🔧 执行工具: ${name}`, args)

  try {
    switch (name) {
      case 'createNode':
        return editorOperationService.createNode({
          id: args.id,
          name: args.name,
          type: args.type,  // 直接使用传入的 BPMN 类型
          position: { x: args.x, y: args.y },
          properties: args.properties
        })

      case 'createFlow':
        return editorOperationService.createFlow({
          id: args.id,
          sourceId: args.sourceId,
          targetId: args.targetId,
          name: args.name,
          condition: args.condition
        })

      case 'deleteNode':
        editorOperationService.deleteNode(args.nodeId)
        return { success: true, message: `已删除节点 ${args.nodeId}` }

      case 'updateNode':
        editorOperationService.updateNode(args.nodeId, { name: args.name, ...args.properties })
        return { success: true, message: `已更新节点 ${args.nodeId}` }

      case 'clearCanvas':
        editorOperationService.clearCanvas()
        return { success: true, message: '画布已清空' }

      case 'getNodes':
        const nodes = editorOperationService.getAllNodes()
        return { nodes: nodes.map(n => editorOperationService.getNodeInfo(n.id)) }

      default:
        throw new Error(`未知的工具函数: ${name}`)
    }
  } catch (error) {
    console.error(`工具执行失败: ${name}`, error)
    throw error
  }
}

// 检测消息是否是流程图相关的请求
const isFlowDiagramRequest = (message: string): boolean => {
  const keywords = ['流程', '流程图', '画', '创建', '生成', '添加', '修改', 'BPMN', '节点', '开始', '结束', '任务', '网关', '删除', '清空']
  return keywords.some(keyword => message.includes(keyword))
}

// 从文本中提取 XML 代码块
const extractXMLFromResponse = (response: string): string | null => {
  // 尝试匹配 ```xml ... ``` 或 ```... ``` 代码块
  const xmlBlockMatch = response.match(/```(?:xml)?\s*([\s\S]*?)```/)
  if (xmlBlockMatch && xmlBlockMatch[1]) {
    return xmlBlockMatch[1].trim()
  }

  // 如果没有代码块，检查是否直接是 XML（以 <?xml 或 < 开头）
  const trimmed = response.trim()
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<definitions')) {
    return trimmed
  }

  return null
}

// 为 BPMN XML 添加基础的 diagram（如果缺失）
const addBasicDiagram = (bpmnXml: string): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(bpmnXml, 'text/xml')

  // 检查是否已有 BPMNDiagram
  const existingDiagram = doc.querySelector('bpmndi\\:BPMNDiagram, BPMNDiagram')
  if (existingDiagram) {
    return bpmnXml // 已有 diagram，直接返回
  }

  // 获取 definitions 元素
  const definitions = doc.querySelector('bpmn\\:definitions, definitions')
  if (!definitions) {
    return bpmnXml
  }

  // 获取 process 元素
  const process = doc.querySelector('bpmn\\:process, process')
  if (!process) {
    return bpmnXml
  }

  const processId = process.getAttribute('id') || 'Process_1'

  // 创建 BPMNDiagram
  const diagram = doc.createElementNS('http://www.omg.org/spec/BPMN/20100524/DI', 'bpmndi:BPMNDiagram')
  diagram.setAttribute('id', 'BPMNDiagram_1')

  // 创建 BPMNPlane
  const plane = doc.createElementNS('http://www.omg.org/spec/BPMN/20100524/DI', 'bpmndi:BPMNPlane')
  plane.setAttribute('id', 'BPMNPlane_1')
  plane.setAttribute('bpmnElement', processId)

  // 获取所有节点
  const allNodes = Array.from(process.querySelectorAll('bpmn\\:startEvent, bpmn\\:endEvent, bpmn\\:subProcess, bpmn\\:userTask, bpmn\\:serviceTask, bpmn\\:exclusiveGateway, bpmn\\:parallelGateway, startEvent, endEvent, subProcess, userTask, serviceTask, exclusiveGateway, parallelGateway'))
  const flows = Array.from(process.querySelectorAll('bpmn\\:sequenceFlow, sequenceFlow'))

  // 获取节点类型的辅助函数
  const getNodeType = (node: Element): string => {
    const tagName = node.tagName || node.localName || ''
    return tagName.replace('bpmn:', '')
  }

  // 获取节点尺寸（BPMN 标准尺寸）
  const getNodeSize = (nodeType: string): { width: number; height: number } => {
    switch (nodeType) {
      case 'startEvent':
      case 'endEvent':
        return { width: 36, height: 36 }
      case 'exclusiveGateway':
      case 'parallelGateway':
        return { width: 50, height: 50 }
      case 'subProcess':
        return { width: 100, height: 80 }
      case 'userTask':
      case 'serviceTask':
        return { width: 100, height: 80 }
      default:
        return { width: 100, height: 80 }
    }
  }

  // 构建节点连接关系图
  const nodeConnections = new Map<string, { outgoing: string[] }>()
  allNodes.forEach(node => {
    const nodeId = node.getAttribute('id')
    if (nodeId) {
      nodeConnections.set(nodeId, { outgoing: [] })
    }
  })

  flows.forEach(flow => {
    const sourceRef = flow.getAttribute('sourceRef')
    if (sourceRef && nodeConnections.has(sourceRef)) {
      const targetRef = flow.getAttribute('targetRef')
      if (targetRef) {
        nodeConnections.get(sourceRef)!.outgoing.push(targetRef)
      }
    }
  })

  // 水平布局：所有节点保持在水平线上，分支节点按固定距离分行
  const nodePositions = new Map<string, { x: number; y: number; layer: number }>()
  const mainY = 157 // 主线 Y 坐标（节点中心）
  const layerSpacing = 150 // 分层间距
  let currentX = 100
  const horizontalSpacing = 200

  // 找到开始节点
  const startNodes = allNodes.filter(node => getNodeType(node) === 'startEvent')

  // 分析流程结构，识别主路径和分支
  const visited = new Set<string>()
  const nodeLayers = new Map<string, number>() // 节点所在层级（0=主线，1/-1=分支）
  const nodeColumns = new Map<string, number>() // 节点所在列

  // 第一遍：确定节点的列和层级
  const queue: Array<{ nodeId: string; column: number; layer: number }> = []

  startNodes.forEach(startNode => {
    const nodeId = startNode.getAttribute('id')
    if (nodeId) {
      queue.push({ nodeId, column: 0, layer: 0 })
    }
  })

  let maxColumn = 0

  while (queue.length > 0) {
    const { nodeId, column, layer } = queue.shift()!

    if (visited.has(nodeId)) {
      // 如果已访问，可能是回路，将其放到分支层
      const existingLayer = nodeLayers.get(nodeId) || 0
      if (layer !== existingLayer && layer !== 0) {
        // 这是一个回到主线的回路，更新层级
        nodeLayers.set(nodeId, Math.min(existingLayer, layer))
      }
      continue
    }
    visited.add(nodeId)

    nodeColumns.set(nodeId, column)
    nodeLayers.set(nodeId, layer)
    maxColumn = Math.max(maxColumn, column)

    const connections = nodeConnections.get(nodeId)
    if (connections && connections.outgoing.length > 0) {
      const currentNode = allNodes.find(n => n.getAttribute('id') === nodeId)
      const isGateway = currentNode && ['exclusiveGateway', 'parallelGateway'].includes(getNodeType(currentNode))

      if (isGateway && connections.outgoing.length > 1) {
        // 网关有多个分支
        connections.outgoing.forEach((targetId, index) => {
          // 第一个分支保持在主线（layer=0），其他分支分配到不同层
          const branchLayer = index === 0 ? layer : layer + (index > 0 ? index : -index)
          queue.push({ nodeId: targetId, column: column + 1, layer: branchLayer })
        })
      } else {
        // 单一输出，保持当前层级
        connections.outgoing.forEach(targetId => {
          queue.push({ nodeId: targetId, column: column + 1, layer })
        })
      }
    }
  }

  // 第二遍：根据列和层级计算实际位置
  allNodes.forEach(node => {
    const nodeId = node.getAttribute('id')
    if (!nodeId) return

    const column = nodeColumns.get(nodeId) || 0
    const layer = nodeLayers.get(nodeId) || 0
    const nodeType = getNodeType(node)
    const size = getNodeSize(nodeType)

    // 计算 X 坐标
    const x = currentX + column * horizontalSpacing

    // 计算 Y 坐标（以节点中心为基准，转换为左上角坐标）
    const centerY = mainY + layer * layerSpacing
    const y = centerY - size.height / 2

    nodePositions.set(nodeId, { x, y, layer })
  })

  // 为每个节点创建 BPMNShape
  allNodes.forEach(node => {
    const nodeId = node.getAttribute('id')
    if (!nodeId) return

    const position = nodePositions.get(nodeId)
    if (!position) return

    const nodeType = getNodeType(node)
    const size = getNodeSize(nodeType)

    const shape = doc.createElementNS('http://www.omg.org/spec/BPMN/20100524/DI', 'bpmndi:BPMNShape')
    shape.setAttribute('id', `${nodeId}_di`)
    shape.setAttribute('bpmnElement', nodeId)

    const bounds = doc.createElementNS('http://www.omg.org/spec/DD/20100524/DC', 'dc:Bounds')
    bounds.setAttribute('x', position.x.toString())
    bounds.setAttribute('y', position.y.toString())
    bounds.setAttribute('width', size.width.toString())
    bounds.setAttribute('height', size.height.toString())

    shape.appendChild(bounds)
    plane.appendChild(shape)
  })

  // 为每个连线创建 BPMNEdge 并计算 waypoints
  flows.forEach((flow: Element) => {
    const flowId = flow.getAttribute('id')
    if (!flowId) return

    const sourceRef = flow.getAttribute('sourceRef')
    const targetRef = flow.getAttribute('targetRef')
    if (!sourceRef || !targetRef) return

    const sourcePos = nodePositions.get(sourceRef)
    const targetPos = nodePositions.get(targetRef)
    if (!sourcePos || !targetPos) return

    const sourceNode = allNodes.find(n => n.getAttribute('id') === sourceRef)
    const targetNode = allNodes.find(n => n.getAttribute('id') === targetRef)
    if (!sourceNode || !targetNode) return

    const sourceType = getNodeType(sourceNode)
    const targetType = getNodeType(targetNode)
    const sourceSize = getNodeSize(sourceType)
    const targetSize = getNodeSize(targetType)

    // 计算节点中心点
    const sourceCenterX = sourcePos.x + sourceSize.width / 2
    const sourceCenterY = sourcePos.y + sourceSize.height / 2
    const targetCenterX = targetPos.x + targetSize.width / 2
    const targetCenterY = targetPos.y + targetSize.height / 2

    // 统计每个节点的连线数量，用于分散连接点
    const sourceOutgoingCount = flows.filter(f => f.getAttribute('sourceRef') === sourceRef).length
    const sourceOutgoingIndex = Array.from(flows)
      .filter(f => f.getAttribute('sourceRef') === sourceRef)
      .indexOf(flow)
    const targetIncomingCount = flows.filter(f => f.getAttribute('targetRef') === targetRef).length
    const targetIncomingIndex = Array.from(flows)
      .filter(f => f.getAttribute('targetRef') === targetRef)
      .indexOf(flow)

    // 计算连接点的偏移（避免重叠）
    const getEdgeOffset = (index: number, total: number, size: number): number => {
      if (total === 1) return 0
      const spacing = size / (total + 1)
      return (index + 1) * spacing - size / 2
    }

    // 判断是否为回路（backward flow）
    const sourceLayer = nodePositions.get(sourceRef)?.layer || 0
    const targetLayer = nodePositions.get(targetRef)?.layer || 0
    const isBackwardFlow = targetPos.x < sourcePos.x // 目标在源的左侧，说明是回路

    let startX: number, startY: number, endX: number, endY: number
    const waypoints: Array<{ x: number; y: number }> = []

    if (isBackwardFlow) {
      // 回路连线：需要绕过所有节点
      // 根据层级决定绕行方向
      const bypassY = sourceLayer >= 0 ? mainY + (Math.abs(sourceLayer) + 2) * layerSpacing : mainY - (Math.abs(sourceLayer) + 2) * layerSpacing

      // 起点：从源节点的下边（或上边）出发
      startX = sourceCenterX
      startY = sourceLayer >= 0 ? sourcePos.y + sourceSize.height : sourcePos.y

      // 终点：到目标节点的下边（或上边）
      endX = targetCenterX
      endY = sourceLayer >= 0 ? targetPos.y + targetSize.height : targetPos.y

      // 添加中间路径点
      waypoints.push({ x: startX, y: startY })
      waypoints.push({ x: startX, y: bypassY }) // 垂直向下/上
      waypoints.push({ x: endX, y: bypassY })   // 水平到目标X
      waypoints.push({ x: endX, y: endY })      // 垂直到目标
    } else {
      // 正向流程
      const dx = targetCenterX - sourceCenterX
      const dy = targetCenterY - sourceCenterY

      // 情况1: 目标在源的右侧且在同一层（水平流程）
      if (dx > 0 && Math.abs(dy) < 20) {
        // 从源的右边连到目标的左边
        startX = sourcePos.x + sourceSize.width
        startY = sourceCenterY + getEdgeOffset(sourceOutgoingIndex, sourceOutgoingCount, sourceSize.height * 0.6)

        endX = targetPos.x
        endY = targetCenterY + getEdgeOffset(targetIncomingIndex, targetIncomingCount, targetSize.height * 0.6)

        waypoints.push({ x: startX, y: startY })
        waypoints.push({ x: endX, y: endY })
      }
      // 情况2: 目标在源的右下方（分支向下）
      else if (dx > 0 && dy > 20) {
        // 从源的下边连到目标的左边
        startX = sourceCenterX + getEdgeOffset(sourceOutgoingIndex, sourceOutgoingCount, sourceSize.width * 0.6)
        startY = sourcePos.y + sourceSize.height

        endX = targetPos.x
        endY = targetCenterY

        waypoints.push({ x: startX, y: startY })
        waypoints.push({ x: startX, y: endY }) // 垂直到目标Y
        waypoints.push({ x: endX, y: endY })   // 水平到目标X
      }
      // 情况3: 目标在源的右上方（分支向上）
      else if (dx > 0 && dy < -20) {
        // 从源的上边连到目标的左边
        startX = sourceCenterX + getEdgeOffset(sourceOutgoingIndex, sourceOutgoingCount, sourceSize.width * 0.6)
        startY = sourcePos.y

        endX = targetPos.x
        endY = targetCenterY

        waypoints.push({ x: startX, y: startY })
        waypoints.push({ x: startX, y: endY }) // 垂直到目标Y
        waypoints.push({ x: endX, y: endY })   // 水平到目标X
      }
      // 情况4: 其他情况（默认水平）
      else {
        startX = sourcePos.x + sourceSize.width
        startY = sourceCenterY
        endX = targetPos.x
        endY = targetCenterY

        waypoints.push({ x: startX, y: startY })
        waypoints.push({ x: endX, y: endY })
      }
    }

    // 创建 BPMNEdge
    const edge = doc.createElementNS('http://www.omg.org/spec/BPMN/20100524/DI', 'bpmndi:BPMNEdge')
    edge.setAttribute('id', `${flowId}_di`)
    edge.setAttribute('bpmnElement', flowId)

    // 添加所有 waypoints
    waypoints.forEach(wp => {
      const waypoint = doc.createElementNS('http://www.omg.org/spec/DD/20100524/DI', 'di:waypoint')
      waypoint.setAttribute('x', Math.round(wp.x).toString())
      waypoint.setAttribute('y', Math.round(wp.y).toString())
      edge.appendChild(waypoint)
    })

    plane.appendChild(edge)
  })

  diagram.appendChild(plane)
  definitions.appendChild(diagram)

  // 序列化回 XML
  const serializer = new XMLSerializer()
  return serializer.serializeToString(doc)
}

// 聊天功能（支持两种模式）
const handleChatMessage = async (message: string): Promise<void> => {
  console.log('User message:', message)

  // 添加用户消息到聊天界面
  if (rightPanelRef.value && rightPanelRef.value.addUserMessage) {
    rightPanelRef.value.addUserMessage(message)
  }

  // 开启画布 Loading 状态（保留画布的 loading，只移除聊天框的独立 loading）
  isAIProcessing.value = true

  try {
    // 如果使用 Claude，走 Claude 处理流程
    if (USE_CLAUDE) {
      await handleChatWithClaude(message)
      return
    }

    // 以下是原有的 Gemini 处理流程
    // 检测是否是流程图相关请求
    const isFlowRequest = isFlowDiagramRequest(message)

    if (!isFlowRequest) {
      // 普通对话，不使用工具
      const response = await llmService.sendMessage(message)
      // 注意:现在 ChatBox 在 RightPanelContainer 内部,响应会通过 Claude 服务发送
      return
    }

    // 流程图请求，根据配置选择模式
    if (USE_FUNCTION_CALLING) {
      // 模式 1: Function Calling 直接操作编辑器
      await handleChatWithFunctionCalling(message)
    } else {
      // 模式 2: XML 生成模式
      await handleChatWithXMLGeneration(message)
    }
  } catch (error) {
    console.error('LLM API 调用失败:', error)
    showStatus('AI 处理失败', 'error')

    // 显示错误消息
    if (rightPanelRef.value && rightPanelRef.value.addChatMessage) {
      rightPanelRef.value.addChatMessage('抱歉，处理您的请求时出现错误，请稍后重试。')
    }
  } finally {
    // 清除画布 Loading 状态
    isAIProcessing.value = false
  }
}

// Claude 模式: 使用 Claude Tool Use 直接操作编辑器
let claudeService: ReturnType<typeof createBpmnClaudeLLMService> | null = null

const handleChatWithClaude = async (message: string): Promise<void> => {
  // 初始化 Claude 服务（如果尚未初始化）
  if (!claudeService) {
    // 等待编辑器初始化
    if (bpmnEditor.value) {
      const modeler = bpmnEditor.value.getModeler()
      if (modeler) {
        editorOperationService.init(modeler)
      } else {
        // 等待编辑器准备就绪
        const ready = await waitForEditor(3000)
        if (!ready) {
          throw new Error('编辑器未准备就绪，请稍后再试')
        }
        const retryModeler = bpmnEditor.value.getModeler()
        if (retryModeler) {
          editorOperationService.init(retryModeler)
        }
      }
    }

    // 创建 Claude 服务实例
    const editorBridge = createClaudeEditorBridge()
    claudeService = createBpmnClaudeLLMService(editorBridge, CLAUDE_BPMN_SYSTEM_PROMPT)

    console.log('✅ Claude 服务已初始化')
  }

  // 添加流式消息以显示操作过程
  if (rightPanelRef.value && rightPanelRef.value.addStreamingMessage) {
    rightPanelRef.value.addStreamingMessage()
  }

  // 监听编辑器操作事件
  const unsubscribe = editorOperationService.onOperation((operationMessage: string) => {
    if (rightPanelRef.value && rightPanelRef.value.appendProgressLog) {
      rightPanelRef.value.appendProgressLog(operationMessage)
    }
  })

  try {
    // 调用 Claude API，自动处理工具调用
    const response = await claudeService.sendMessage(message)

    // 将 AI 响应添加到聊天界面（使用 Markdown 替换流式消息）
    if (rightPanelRef.value && rightPanelRef.value.finalizeMessage) {
      // 如果响应为空或只包含工具调用信息，则返回简短提示
      const displayMessage = response.trim() || '✅ 操作已完成'
      rightPanelRef.value.finalizeMessage(displayMessage)

      // 保存处理后的消息到数据库
      // 确保数据库保存的是用户看到的内容，而不是原始 API 响应
      await claudeService.saveAssistantMessage(displayMessage)
    }

    // 如果流程图发生变化，更新状态
    showStatus('操作完成', 'success')
  } catch (error) {
    console.error('Claude API 调用失败:', error)

    // 错误处理：确保流式消息的 loading 状态消失
    if (rightPanelRef.value && rightPanelRef.value.finalizeMessage) {
      const errorMessage = error instanceof Error ? error.message : '处理请求时出现错误'
      const displayErrorMessage = `❌ 错误: ${errorMessage}`
      rightPanelRef.value.finalizeMessage(displayErrorMessage)

      // 保存错误消息到数据库
      await claudeService.saveAssistantMessage(displayErrorMessage)
    }

    showStatus('AI 处理失败', 'error')
  } finally {
    // 取消监听
    unsubscribe()
  }
}

// 模式 2: XML 生成模式
const handleChatWithXMLGeneration = async (message: string): Promise<void> => {
  // 如果有当前流程图，加入上下文
  let fullMessage = message
  if (currentDiagram.value && bpmnEditor.value) {
    try {
      const currentBpmnXml = await bpmnEditor.value.getXml()
      fullMessage = `当前流程图如下:\n\`\`\`xml\n${currentBpmnXml}\n\`\`\`\n\n用户请求: ${message}`
    } catch (e) {
      console.warn('无法获取当前流程图', e)
    }
  }

  // 调用 LLM 生成 BPMN
  const response = await llmService.sendMessage(fullMessage, BPMN_SYSTEM_PROMPT)

  // 尝试提取和应用 XML
  const extractedXML = extractXMLFromResponse(response)

  if (extractedXML) {
    try {
      // 添加基础的 diagram（如果 LLM 没有生成）
      let bpmnXml = addBasicDiagram(extractedXML)

      // 加载到编辑器
      if (bpmnEditor.value) {
        await bpmnEditor.value.loadDiagram(bpmnXml)

        // 获取最终的 XML（包含 bpmn-js 自动补全的信息）
        bpmnXml = await bpmnEditor.value.getXml()
        currentDiagram.value = bpmnXml

        // 保存到 localStorage
        if (LocalStorageService.isAvailable()) {
          LocalStorageService.saveDiagram(bpmnXml, 'AI Generated Diagram')
        }

        showStatus('流程图已由 AI 生成', 'success')
      }
    } catch (conversionError) {
      console.error('转换或加载流程图失败:', conversionError)
      showStatus('生成流程图失败', 'error')
    }
  } else {
    // 没有提取到 XML，只记录日志
    console.log('No XML extracted from response')
  }
}

// 模式 1: Function Calling 模式
const handleChatWithFunctionCalling = async (message: string): Promise<void> => {
  // 流程图请求，初始化编辑器操作服务
  if (bpmnEditor.value) {
    const modeler = bpmnEditor.value.getModeler()
    if (modeler) {
      editorOperationService.init(modeler)
    }
  }

  // 构建消息历史
  const messages: Message[] = [
    {
      role: 'user',
      parts: [{ text: message }]
    }
  ]

  // 最多循环调用 10 次，直到 LLM 不再调用工具
  let iterationCount = 0
  const maxIterations = 10

  while (iterationCount < maxIterations) {
    iterationCount++
    console.log(`📍 迭代 ${iterationCount}`)

    // 调用 LLM，提供工具
    const response = await llmService.generateContentWithTools(
      messages,
      availableTools,
      EDITOR_SYSTEM_PROMPT
    )

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('LLM 没有返回有效响应')
    }

    const candidate = response.candidates[0]
    if (!candidate || !candidate.content) {
      throw new Error('LLM 响应格式无效')
    }
    const parts = candidate.content.parts

    // 检查是否有文本响应
    const textPart = parts.find(p => p.text)
    if (textPart && textPart.text) {
      // LLM 返回了文本，说明操作完成
      console.log('✅ LLM 完成操作，返回文本响应')
      showStatus('流程图已更新', 'success')
      break
    }

    // 检查是否有函数调用
    const functionCallPart = parts.find(p => p.functionCall)
    if (functionCallPart && functionCallPart.functionCall) {
      const functionCall = functionCallPart.functionCall

      // 执行函数调用
      try {
        const result = executeFunctionCall(functionCall)

        // 将函数调用结果添加到消息历史
        messages.push({
          role: 'model',
          parts: [{ functionCall }]
        })

        messages.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: result
            }
          }]
        })

        // 继续下一轮，让 LLM 决定是否继续调用工具
      } catch (error) {
        // 函数执行失败，告知 LLM
        messages.push({
          role: 'model',
          parts: [{ functionCall }]
        })

        messages.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: {
                error: error instanceof Error ? error.message : String(error)
              }
            }
          }]
        })
      }
    } else {
      // 没有文本也没有函数调用，异常情况
      console.warn('LLM 没有返回文本或函数调用')
      break
    }
  }

  if (iterationCount >= maxIterations) {
    console.warn('达到最大迭代次数，停止')
    showStatus('操作复杂度超出限制', 'error')
  }
}

// 生命周期
onMounted(async () => {
  console.log('BPMN Explorer initialized')

  // 尝试从 localStorage 加载保存的图表
  if (LocalStorageService.isAvailable() && LocalStorageService.hasSavedDiagram()) {
    const savedDiagram = LocalStorageService.loadDiagram()
    if (savedDiagram && !currentDiagram.value) {
      console.log('Loading saved diagram from localStorage:', savedDiagram.name)
      currentDiagram.value = savedDiagram.xml
    }
  }
})

onBeforeUnmount(() => {
  console.log('BPMN Explorer cleanup')
  visualizationService.clearAllHighlights()
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background: #f8f9fa;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

.icon {
  font-size: 16px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  position: relative;
  background: white;
}

.editor-container :deep(.ant-spin-nested-loading) {
  height: 100%;
}

.editor-container :deep(.ant-spin-nested-loading .ant-spin-container) {
  height: 100%;
}

.editor-container :deep(.bpmn-editor) {
  height: 100%;
}

.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.welcome-content {
  text-align: center;
  max-width: 500px;
  padding: 40px;
}

.welcome-content h1 {
  font-size: 3rem;
  margin-bottom: 16px;
  font-weight: 700;
}

.welcome-content p {
  font-size: 1.2rem;
  margin-bottom: 32px;
  opacity: 0.9;
}

.welcome-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 32px;
}

.drag-hint {
  opacity: 0.8;
  font-size: 14px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
}

.status-success {
  color: #10b981;
}

.status-error {
  color: #ef4444;
}

.status-loading {
  color: #3b82f6;
}

.status-info {
  color: #6b7280;
}

.status-saved {
  color: #10b981;
}
</style>

