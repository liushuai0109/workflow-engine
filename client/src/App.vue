<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button @click="openFile" class="btn btn-primary">
          <span class="icon">📁</span>
          Open BPMN
        </button>
        <button @click="saveFile" class="btn btn-secondary" :disabled="!currentDiagram">
          <span class="icon">💾</span>
          Save BPMN
        </button>
        <button @click="newDiagram" class="btn btn-outline">
          <span class="icon">🆕</span>
          New
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- BPMN 编辑器 -->
      <div class="editor-container">
        <BpmnEditor v-if="currentDiagram" ref="bpmnEditor" :xml="currentDiagram" @error="handleError"
          @shown="handleShown" @loading="handleLoading" @changed="handleDiagramChanged" />

        <!-- 欢迎界面 -->
        <div v-else class="welcome-screen">
          <div class="welcome-content">
            <h1>BPMN Explorer</h1>
            <p>Create and edit BPMN diagrams with ease</p>
            <div class="welcome-actions">
              <button @click="openFile" class="btn btn-primary btn-large">
                <span class="icon">📁</span>
                Open BPMN File
              </button>
              <button @click="newDiagram" class="btn btn-outline btn-large">
                <span class="icon">🆕</span>
                Create New Diagram
              </button>
            </div>
            <div class="drag-hint">
              <p>Or drag and drop a BPMN file here</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Properties Panel -->
      <div class="properties-panel" :class="{ 'hidden': !isPropertiesPanelVisible }" id="properties-panel"></div>

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

    <!-- AI助手按钮 -->
    <div
      v-if="!showChatBox"
      class="chat-toggle-btn"
      @click="toggleChatBox"
      title="打开AI助手"
    >
      <span class="avatar-icon">👤</span>
      <div class="pulse-ring"></div>
    </div>

    <!-- 聊天对话框 -->
    <ChatBox
      v-if="showChatBox"
      ref="chatBoxRef"
      @sendMessage="handleChatMessage"
      @close="handleCloseChatBox"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import BpmnEditor from './components/BpmnEditor.vue'
import ChatBox from './components/ChatBox.vue'
import { LocalStorageService } from './services/localStorageService'
import { editorOperationService } from './services/editorOperationService'
import { createBpmnClaudeLLMService } from './services/claudeLlmService'
import { createClaudeEditorBridge, waitForEditor } from './services/claudeEditorBridge'
import { CLAUDE_BPMN_SYSTEM_PROMPT } from './prompts/claudeBpmnSystemPrompt'
import type { BpmnOptions, FileOperationResult, FileValidationResult } from './types'

// 响应式数据
const currentDiagram = ref<string>('')
const isLoading = ref<boolean>(false)
const hasError = ref<boolean>(false)
const errorMessage = ref<string>('')
const lastSaved = ref<Date | null>(null)
const fileInput = ref<HTMLInputElement>()
const bpmnEditor = ref<any>()
const isPropertiesPanelVisible = ref<boolean>(true)
const bpmnModeler = ref<any>(null)
const selectedElement = ref<any>(null)
const showChatBox = ref<boolean>(false)
const chatBoxRef = ref<any>()

// 文件操作
const openFile = (): void => {
  fileInput.value?.click()
}

const saveFile = async (): Promise<void> => {
  if (!bpmnEditor.value) return

  try {
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

const handleShown = (): void => {
  console.log('BPMN diagram shown')
  isLoading.value = false
  hasError.value = false
  errorMessage.value = ''

  // Get modeler instance
  if (bpmnEditor.value) {
    bpmnModeler.value = bpmnEditor.value.getModeler()

    // Listen for element selection changes
    const eventBus = bpmnModeler.value.get('eventBus')
    eventBus.on('selection.changed', (event: any) => {
      selectedElement.value = event.newSelection[0] || null
    })
  }
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
}

// 属性面板切换事件处理
const handleTogglePanel = (event: CustomEvent) => {
  isPropertiesPanelVisible.value = event.detail.visible
}

// 生命周期
onMounted(async () => {
  console.log('BPMN Explorer initialized')

  // 监听属性面板切换事件
  window.addEventListener('toggle-properties-panel', handleTogglePanel as EventListener)

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
  // 清理事件监听器
  window.removeEventListener('toggle-properties-panel', handleTogglePanel as EventListener)
})

// AI聊天功能
let claudeService: ReturnType<typeof createBpmnClaudeLLMService> | null = null

const toggleChatBox = (): void => {
  showChatBox.value = !showChatBox.value
}

const handleCloseChatBox = (): void => {
  showChatBox.value = false
}

const handleChatMessage = async (message: string): Promise<void> => {
  console.log('User message:', message)

  // 设置加载状态
  if (chatBoxRef.value) {
    chatBoxRef.value.setLoading(true)
  }

  try {
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
            throw new Error('编辑器未准备就绪，请先创建或打开一个流程图')
          }
          const retryModeler = bpmnEditor.value.getModeler()
          if (retryModeler) {
            editorOperationService.init(retryModeler)
          }
        }
      }

      // 清空画布上的默认节点，避免与 Claude 创建的节点冲突
      console.log('🧹 清空默认流程图节点...')
      try {
        editorOperationService.clearCanvas()
        console.log('✅ 画布已清空，准备创建新流程')
      } catch (error) {
        console.warn('⚠️ 清空画布失败，将尝试处理冲突:', error)
      }

      // 创建 Claude 服务实例
      const editorBridge = createClaudeEditorBridge()
      claudeService = createBpmnClaudeLLMService(editorBridge, CLAUDE_BPMN_SYSTEM_PROMPT)

      console.log('✅ Claude 服务已初始化')
    }

    // 调用 Claude API，自动处理工具调用
    const response = await claudeService.sendMessage(message)

    // 显示响应
    if (chatBoxRef.value && response) {
      chatBoxRef.value.addAssistantMessage(response)
    }

    // 操作完成提示
    hasError.value = false
  } catch (error) {
    console.error('Claude API 调用失败:', error)

    // 显示错误消息
    if (chatBoxRef.value) {
      const errorMsg = error instanceof Error
        ? `抱歉，发生错误：${error.message}`
        : '抱歉，发生了未知错误，请稍后重试。'
      chatBoxRef.value.addAssistantMessage(errorMsg)
    }
  } finally {
    // 取消加载状态
    if (chatBoxRef.value) {
      chatBoxRef.value.setLoading(false)
    }
  }
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
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

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-secondary {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn-secondary:hover:not(:disabled) {
  background: #059669;
  border-color: #059669;
}

.btn-outline {
  background: transparent;
  border-color: #d1d5db;
}

.btn-large {
  padding: 12px 24px;
  font-size: 16px;
}

.icon {
  font-size: 16px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-container {
  flex: 1;
  position: relative;
  background: white;
  transition: margin-right 0.3s ease;
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

.properties-panel {
  width: 400px;
  min-width: 400px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  flex-shrink: 0;
}

.properties-panel.hidden {
  width: 0;
  min-width: 0;
  transform: translateX(100%);
  opacity: 0;
  border-left: none;
  border-right: none;
  pointer-events: none;
  margin: 0;
  padding: 0;
}

.properties-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.properties-header h3 {
  margin: 0;
  font-size: 16px;
  color: #374151;
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

/* AI助手按钮样式 */
.chat-toggle-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  z-index: 9998;
  transition: all 0.3s ease;
}

.chat-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.6);
}

.chat-toggle-btn:active {
  transform: scale(1.05);
}

.avatar-icon {
  font-size: 28px;
  position: relative;
  z-index: 2;
}

/* 脉冲动画 */
.pulse-ring {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.3);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>