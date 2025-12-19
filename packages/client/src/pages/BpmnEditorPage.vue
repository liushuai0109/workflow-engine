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
    <input ref="fileInput" type="file" accept=".bpmn,.xml" @change="handleFileSelect" style="display: none" />

    <!-- 客服按钮 -->
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BpmnEditor from '../components/BpmnEditor.vue'
import ChatBox from '../components/ChatBox.vue'
import { LocalStorageService } from '../services/localStorageService'
import { llmService } from '../services/llmService'
import type { Message, FunctionCall } from '../services/llmService'
import { BPMN_SYSTEM_PROMPT } from '../prompts/bpmnSystemPrompt'
import { EDITOR_SYSTEM_PROMPT } from '../prompts/editorSystemPrompt'
import { availableTools } from '../services/llmTools'
import { editorOperationService } from '../services/editorOperationService'
import type { FileValidationResult } from '../types'

// 配置：是否使用 Function Calling 模式
// 注意：Function Calling 需要官方 Gemini API 支持
// 中转 API (api.aicodewith.com) 可能不支持，建议使用 XML 模式
const USE_FUNCTION_CALLING = false

// 响应式数据
const currentDiagram = ref<string>('')
const isLoading = ref<boolean>(false)
const hasError = ref<boolean>(false)
const errorMessage = ref<string>('')
const lastSaved = ref<Date | null>(null)
const fileInput = ref<HTMLInputElement>()
const bpmnEditor = ref<any>()
const isFlowVisualizationEnabled = ref<boolean>(false)
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
          type: args.type,
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

  // 设置加载状态
  if (chatBoxRef.value) {
    chatBoxRef.value.setLoading(true)
  }

  try {
    // 检测是否是流程图相关请求
    const isFlowRequest = isFlowDiagramRequest(message)

    if (!isFlowRequest) {
      // 普通对话，不使用工具
      const response = await llmService.sendMessage(message)
      if (chatBoxRef.value) {
        chatBoxRef.value.addAssistantMessage(response)
      }
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

        // 显示成功消息
        if (chatBoxRef.value) {
          chatBoxRef.value.addAssistantMessage('✅ 流程图已生成并加载到编辑器中！')
        }

        showStatus('流程图已由 AI 生成', 'success')
      }
    } catch (conversionError) {
      console.error('转换或加载流程图失败:', conversionError)

      // 显示错误信息
      if (chatBoxRef.value) {
        chatBoxRef.value.addAssistantMessage(
          `生成了流程图定义，但加载失败：${conversionError}\n\n生成的 BPMN 代码：\n\`\`\`xml\n${extractedXML}\n\`\`\``
        )
      }
    }
  } else {
    // 没有提取到 XML，显示原始回复
    if (chatBoxRef.value) {
      chatBoxRef.value.addAssistantMessage(response)
    }
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
      if (chatBoxRef.value) {
        chatBoxRef.value.addAssistantMessage(textPart.text)
      }
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
    if (chatBoxRef.value) {
      chatBoxRef.value.addAssistantMessage('⚠️ 操作复杂度超出限制，已部分完成。')
    }
  }
}

const handleCloseChatBox = (): void => {
  showChatBox.value = false
}

const toggleChatBox = (): void => {
  showChatBox.value = !showChatBox.value
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

/* 客服按钮 */
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

