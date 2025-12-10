<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button @click="openFile" class="btn btn-primary">
          <span class="icon">📁</span>
          Open XPMN
        </button>
        <button @click="saveFile" class="btn btn-secondary" :disabled="!currentDiagram">
          <span class="icon">💾</span>
          Save XPMN
        </button>
        <button @click="newDiagram" class="btn btn-outline">
          <span class="icon">🆕</span>
          New
        </button>
        <button
          @click="toggleFlowVisualization"
          class="btn"
          :class="{ 'btn-flow-active': isFlowVisualizationEnabled }"
          :disabled="!currentDiagram"
          :title="isFlowVisualizationEnabled ? '关闭流量可视化' : '启用流量可视化'"
        >
          <span class="icon">📊</span>
          {{ isFlowVisualizationEnabled ? '关闭流量' : '显示流量' }}
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- XPMN 编辑器 -->
      <div class="editor-container">
        <BpmnEditor v-if="currentDiagram" ref="bpmnEditor" :xml="currentDiagram" @error="handleError"
          @shown="handleShown" @loading="handleLoading" @changed="handleDiagramChanged" />

        <!-- 欢迎界面 -->
        <div v-else class="welcome-screen">
          <div class="welcome-content">
            <h1>XPMN Explorer</h1>
            <p>Create and edit XPMN diagrams with ease</p>
            <div class="welcome-actions">
              <button @click="openFile" class="btn btn-primary btn-large">
                <span class="icon">📁</span>
                Open XPMN File
              </button>
              <button @click="newDiagram" class="btn btn-outline btn-large">
                <span class="icon">🆕</span>
                Create New Diagram
              </button>
            </div>
            <div class="drag-hint">
              <p>Or drag and drop a XPMN file here</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Properties Panel -->
      <div class="properties-panel" id="properties-panel"></div>
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
    <input ref="fileInput" type="file" accept=".bpmn,.xml,.xpmn" @change="handleFileSelect" style="display: none" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import BpmnEditor from '../components/BpmnEditor.vue'
import { LocalStorageService } from '../services/localStorageService'
import { convertFromXPMNToBPMN, convertFromBPMNToXPMN } from '../extensions/xflow/BpmnAdapter/BpmnAdapter'
import type { BpmnOptions, FileOperationResult, FileValidationResult } from '../types'

// 响应式数据
const currentDiagram = ref<string>('')
const isLoading = ref<boolean>(false)
const hasError = ref<boolean>(false)
const errorMessage = ref<string>('')
const lastSaved = ref<Date | null>(null)
const fileInput = ref<HTMLInputElement>()
const bpmnEditor = ref<any>()
const isFlowVisualizationEnabled = ref<boolean>(false)

// 文件操作
const openFile = (): void => {
  fileInput.value?.click()
}

const saveFile = async (): Promise<void> => {
  if (!bpmnEditor.value) return

  try {
    // 从 BpmnEditor 获取最新的 XML 内容（XPMN 格式）
    const bpmnXml = await bpmnEditor.value.getXml()
    
    // 将 XPMN 格式转换为 XPMN 格式用于保存
    let xmlToSave = bpmnXml
    let conversionSucceeded = false
    try {
      xmlToSave = convertFromBPMNToXPMN(bpmnXml)
      // 验证转换结果是否真的是 XPMN 格式（根元素应该是 definitions 而不是 bpmn:definitions）
      const isXpmnFormat = xmlToSave.includes('<definitions') && !xmlToSave.includes('<bpmn:definitions')
      if (isXpmnFormat) {
        conversionSucceeded = true
      } else {
        console.warn('XPMN conversion returned invalid format, saving as XPMN format')
        xmlToSave = bpmnXml // 使用原始 XPMN 格式
      }
    } catch (conversionError) {
      console.warn('XPMN conversion failed, saving as XPMN format:', conversionError)
      // 如果转换失败，使用原始 XPMN 格式
      xmlToSave = bpmnXml
    }
    
    const blob = new Blob([xmlToSave], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // 根据转换是否成功决定文件扩展名
    a.download = conversionSucceeded ? 'diagram.xpmn' : 'diagram.bpmn'
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
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/XPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/XPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js" exporterVersion="9.4.0">
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
      
      // 尝试将 XPMN 格式转换为 XPMN 格式
      let bpmnContent = content
      try {
        // 检查是否是 XPMN 格式（根元素是 definitions 而不是 bpmn:definitions）
        const isXpmnFormat = (content.includes('<definitions') && !content.includes('<bpmn:definitions')) ||
                             (content.includes('<process') && !content.includes('bpmn:process'))
        if (isXpmnFormat) {
          bpmnContent = convertFromXPMNToBPMN(content)
          console.log('Converted XPMN to XPMN format', bpmnContent)
        }
      } catch (conversionError) {
        console.error('XPMN conversion failed:', conversionError)
        // 如果转换失败，抛出错误而不是使用原始内容
        throw new Error(`Failed to convert XPMN to XPMN: ${conversionError}`)
      }
      
      if (isValidBpmnXml(bpmnContent)) {
        currentDiagram.value = bpmnContent

        // 保存到 localStorage（保存转换后的 XPMN 格式）
        if (LocalStorageService.isAvailable()) {
          LocalStorageService.saveDiagram(bpmnContent, file.name)
        }

        showStatus(`File loaded: ${file.name}`, 'success')
      } else {
        console.log('Invalid XPMN content', bpmnContent)
        showStatus('Invalid XPMN content', 'error')
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
  const allowedTypes = ['.bpmn', '.xml', '.xpmn']
  const fileName = file.name.toLowerCase()

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' }
  }

  if (!allowedTypes.some(type => fileName.endsWith(type))) {
    return { isValid: false, error: 'Please select a XPMN or XML file' }
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

    // 检查是否包含 XPMN 命名空间
    return content.includes('http://www.omg.org/spec/XPMN/20100524/MODEL')
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
  console.error('XPMN error:', err)
  hasError.value = true
  errorMessage.value = err.message || 'Unknown error occurred'
  isLoading.value = false
}

const handleShown = (): void => {
  console.log('XPMN diagram shown')
  isLoading.value = false
  hasError.value = false
  errorMessage.value = ''
}

const handleLoading = (): void => {
  console.log('XPMN diagram loading')
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
}

const handleDiagramChanged = (xml: string): void => {
  currentDiagram.value = xml
  console.log('Diagram changed')
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

// 生命周期
onMounted(async () => {
  console.log('XPMN Explorer initialized')

  // 尝试从 localStorage 加载保存的图表
  if (LocalStorageService.isAvailable() && LocalStorageService.hasSavedDiagram()) {
    const savedDiagram = LocalStorageService.loadDiagram()
    if (savedDiagram && !currentDiagram.value) {
      console.log('Loading saved diagram from localStorage:', savedDiagram.name)
      // 检查是否是 XPMN 格式，如果是则转换为 XPMN
      let xmlContent = savedDiagram.xml
      const isXpmnFormat = (xmlContent.includes('<definitions') && !xmlContent.includes('<bpmn:definitions')) ||
                           (xmlContent.includes('<process') && !xmlContent.includes('bpmn:process'))
      if (isXpmnFormat) {
        try {
          
          xmlContent = convertFromXPMNToBPMN(xmlContent)
          console.log('Converted XPMN to XPMN format from localStorage', xmlContent)
        } catch (conversionError) {
          console.error('XPMN conversion failed from localStorage:', conversionError)
        }
      }
      currentDiagram.value = xmlContent
    }
  }
})

onBeforeUnmount(() => {
  console.log('XPMN Explorer cleanup')
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.btn-flow-active {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.btn-flow-active:hover:not(:disabled) {
  background: #d97706;
  border-color: #d97706;
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
}

.editor-container {
  flex: 1;
  position: relative;
  background: white;
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
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
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
</style>

