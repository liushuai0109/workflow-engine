# 生命周期运营集成指南

本指南说明如何将生命周期运营组件集成到您的 BPMN 编辑器应用程序中。

---

## 快速开始

### 1. 导入 LifecyclePanel 组件

```vue
<template>
  <div class="editor-container">
    <!-- Your BPMN Editor -->
    <div ref="bpmnContainer" class="bpmn-container"></div>

    <!-- Add Lifecycle Panel -->
    <LifecyclePanel
      :modeler="modeler"
      :selected-element="selectedElement"
      class="lifecycle-sidebar"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import { LifecyclePanel } from '@/components/lifecycle'

const bpmnContainer = ref<HTMLElement>()
const modeler = ref<any>(null)
const selectedElement = ref<any>(null)

onMounted(() => {
  // Initialize BPMN Modeler
  modeler.value = new BpmnModeler({
    container: bpmnContainer.value,
    // ... other options
  })

  // Listen for element selection
  const eventBus = modeler.value.get('eventBus')
  eventBus.on('selection.changed', (event: any) => {
    selectedElement.value = event.newSelection[0] || null
  })
})
</script>

<style scoped>
.editor-container {
  display: flex;
  height: 100vh;
}

.bpmn-container {
  flex: 1;
}

.lifecycle-sidebar {
  width: 400px;
  border-left: 1px solid #ddd;
}
</style>
```

---

## 使用独立组件

### LifecycleStageSelector

用于为元素分配 AARRR 生命周期阶段:

```vue
<template>
  <LifecycleStageSelector
    v-model="selectedStage"
    @change="onStageChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LifecycleStageSelector } from '@/components/lifecycle'
import type { LifecycleStage } from '@/types/lifecycle'

const selectedStage = ref<LifecycleStage | null>(null)

const onStageChange = (stage: LifecycleStage | null) => {
  console.log('Selected stage:', stage)
  // Apply stage to BPMN element using LifecycleIntegration helper
}
</script>
```

### UserSegmentBuilder

用于创建目标用户分段:

```vue
<template>
  <UserSegmentBuilder
    v-model="segments"
    @change="onSegmentsChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UserSegmentBuilder } from '@/components/lifecycle'
import type { UserSegment } from '@/types/segments'

const segments = ref<UserSegment[]>([])

const onSegmentsChange = (newSegments: UserSegment[]) => {
  console.log('Segments:', newSegments)
  // Save to workflow metadata
}
</script>
```

### TriggerConditionEditor

用于配置工作流触发器:

```vue
<template>
  <TriggerConditionEditor
    v-model="triggers"
    @change="onTriggersChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TriggerConditionEditor } from '@/components/lifecycle'
import type { Trigger } from '@/types/triggers'

const triggers = ref<Trigger[]>([])

const onTriggersChange = (newTriggers: Trigger[]) => {
  console.log('Triggers:', newTriggers)
  // Save to workflow metadata
}
</script>
```

### WorkflowMetadataPanel

用于管理工作流级元数据:

```vue
<template>
  <WorkflowMetadataPanel
    v-model="metadata"
    :workflow-id="workflowId"
    @save="onSave"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WorkflowMetadataPanel } from '@/components/lifecycle'
import type { WorkflowMetadata } from '@/types/metrics'

const metadata = ref<WorkflowMetadata | null>(null)
const workflowId = ref('workflow-123')

const onSave = (savedMetadata: WorkflowMetadata) => {
  console.log('Saved:', savedMetadata)
  // Save to backend or localStorage
}
</script>
```

---

## 使用 LifecycleIntegration Helper

`LifecycleIntegration` helper 提供了处理 BPMN 元素的函数:

### 在元素上设置生命周期元数据

```typescript
import { setLifecycleMetadata, applyLifecycleStyle } from '@/extensions/xflow/LifecycleIntegration'
import { lifecycleService } from '@/services/lifecycleService'
import type { LifecycleStage } from '@/types/lifecycle'

// When user selects a lifecycle stage
function assignLifecycleStage(element: any, modeler: any, stage: LifecycleStage) {
  // Create lifecycle metadata
  const metadata = lifecycleService.createMetadata(stage, {
    description: 'User onboarding task'
  })

  // Apply to element
  const success = setLifecycleMetadata(element, modeler, metadata)

  if (success) {
    // Apply visual styling
    applyLifecycleStyle(element, modeler, stage)
    console.log('Lifecycle stage applied successfully')
  }
}
```

### 从元素获取生命周期元数据

```typescript
import { getLifecycleMetadata } from '@/extensions/xflow/LifecycleIntegration'

function loadElementLifecycle(element: any) {
  const metadata = getLifecycleMetadata(element)

  if (metadata) {
    console.log('Element stage:', metadata.stage)
    console.log('Stage color:', metadata.color)
    console.log('Stage version:', metadata.version)
  } else {
    console.log('No lifecycle metadata on this element')
  }
}
```

### 设置工作流元数据

```typescript
import { setWorkflowMetadata } from '@/extensions/xflow/LifecycleIntegration'
import { workflowMetadataService } from '@/services/workflowMetadataService'

function saveWorkflowMetadata(modeler: any) {
  // Create workflow metadata
  const metadata = workflowMetadataService.createWorkflow(
    'User Onboarding Flow',
    'Onboarding',
    'user@example.com',
    {
      description: 'Complete user onboarding workflow',
      tags: ['onboarding', 'activation'],
      status: 'active'
    }
  )

  // Apply to process element
  const success = setWorkflowMetadata(modeler, metadata)

  if (success) {
    console.log('Workflow metadata saved')
  }
}
```

### 导出生命周期数据

```typescript
import { exportLifecycleData } from '@/extensions/xflow/LifecycleIntegration'

function exportData(modeler: any) {
  const data = exportLifecycleData(modeler)

  console.log('Workflow metadata:', data.workflowMetadata)
  console.log('Element metadata:', data.elementMetadata)

  // Convert to JSON for download
  const json = JSON.stringify(data, null, 2)

  // Create download link
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lifecycle-data.json'
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## 完整集成示例

以下是将生命周期运营集成到 BpmnEditor.vue 的完整示例:

```vue
<template>
  <div class="bpmn-editor-with-lifecycle">
    <!-- BPMN Canvas -->
    <div ref="container" class="bpmn-container"></div>

    <!-- Lifecycle Sidebar -->
    <aside class="lifecycle-sidebar">
      <LifecyclePanel
        :modeler="modeler"
        :selected-element="selectedElement"
      />
    </aside>

    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <button @click="zoomIn">+</button>
      <button @click="zoomOut">−</button>
      <button @click="zoomReset">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import { LifecyclePanel } from '@/components/lifecycle'
import XFlowExtensionModule from '@/extensions/xflow/XFlowExtensionModule'
import xflowExtension from '@/extensions/xflow/xflowExtension.json'

const container = ref<HTMLElement>()
const modeler = ref<any>(null)
const selectedElement = ref<any>(null)

onMounted(async () => {
  // Initialize BPMN Modeler with XFlow extension
  modeler.value = new BpmnModeler({
    container: container.value,
    additionalModules: [
      XFlowExtensionModule
    ],
    moddleExtensions: {
      xflow: xflowExtension
    }
  })

  // Load initial diagram
  try {
    await modeler.value.importXML(initialDiagram)
  } catch (error) {
    console.error('Error loading diagram:', error)
  }

  // Listen for element selection
  const eventBus = modeler.value.get('eventBus')
  eventBus.on('selection.changed', (event: any) => {
    selectedElement.value = event.newSelection[0] || null
  })

  // Listen for diagram changes
  eventBus.on('commandStack.changed', () => {
    // Auto-save or update UI
  })
})

onBeforeUnmount(() => {
  if (modeler.value) {
    modeler.value.destroy()
  }
})

// Zoom controls
const zoomIn = () => {
  const zoomScroll = modeler.value.get('zoomScroll')
  zoomScroll.stepZoom(0.1)
}

const zoomOut = () => {
  const zoomScroll = modeler.value.get('zoomScroll')
  zoomScroll.stepZoom(-0.1)
}

const zoomReset = () => {
  const canvas = modeler.value.get('canvas')
  canvas.zoom('fit-viewport')
}

const initialDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:xflow="http://example.com/bpmn/xflow-extension"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="false">
    <startEvent id="StartEvent_1" name="Start" />
    <userTask id="Task_1" name="User Task" />
    <endEvent id="EndEvent_1" name="End" />
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </process>
</definitions>`
</script>

<style scoped>
.bpmn-editor-with-lifecycle {
  display: flex;
  height: 100vh;
  position: relative;
}

.bpmn-container {
  flex: 1;
  height: 100%;
}

.lifecycle-sidebar {
  width: 420px;
  border-left: 1px solid #e0e0e0;
  background: white;
  overflow-y: auto;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.zoom-controls button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.zoom-controls button:hover {
  background: #f5f5f5;
}
</style>
```

---

## 数据流

### 1. 用户交互 → 组件 → Service → 元素

```
用户选择 "Activation" 阶段
  ↓
LifecycleStageSelector 发出 change 事件
  ↓
父组件调用 setLifecycleMetadata()
  ↓
LifecycleIntegration helper 更新 BPMN 元素
  ↓
元素现在在 extensionElements 中具有生命周期元数据
```

### 2. 元素 → Service → 组件 → 显示

```
用户选择 BPMN 元素
  ↓
父组件调用 getLifecycleMetadata()
  ↓
LifecycleIntegration helper 从元素读取
  ↓
组件显示当前阶段
```

### 3. 保存 → 转换 → 存储

```
用户保存工作流
  ↓
BpmnModeler.saveXML()
  ↓
BpmnAdapter 转换 XPMN → BPMN
  ↓
生命周期元数据在 extensionElements 中保留
  ↓
保存到文件/后端
```

---

## 按生命周期阶段设置元素样式

您可以根据元素的生命周期阶段自动设置其样式:

```typescript
import { getElementsWithLifecycle, getLifecycleMetadata } from '@/extensions/xflow/LifecycleIntegration'
import { lifecycleService } from '@/services/lifecycleService'

function styleAllLifecycleElements(modeler: any) {
  const elements = getElementsWithLifecycle(modeler)
  const modeling = modeler.get('modeling')

  elements.forEach((element: any) => {
    const metadata = getLifecycleMetadata(element)
    if (!metadata) return

    const config = lifecycleService.getStageConfiguration(metadata.stage)
    if (!config) return

    // Apply color
    modeling.setColor(element, {
      stroke: config.color,
      fill: config.color + '20' // 20% opacity
    })
  })
}
```

---

## 验证

在保存之前验证生命周期数据:

```typescript
import { lifecycleService } from '@/services/lifecycleService'
import { workflowMetadataService } from '@/services/workflowMetadataService'

function validateWorkflow(workflowMetadata: WorkflowMetadata) {
  // Validate workflow metadata
  const validation = workflowMetadataService.validateWorkflow(workflowMetadata)

  if (!validation.valid) {
    console.error('Validation errors:', validation.errors)
    return false
  }

  return true
}

function validateLifecycleMetadata(metadata: LifecycleMetadata) {
  // Validate lifecycle metadata
  const validation = lifecycleService.validateMetadata(metadata)

  if (!validation.valid) {
    console.error('Validation errors:', validation.errors)
    return false
  }

  return true
}
```

---

## 最佳实践

### 1. 始终在保存前验证

```typescript
// Before saving workflow
if (!validateWorkflow(metadata)) {
  alert('Please fix validation errors')
  return
}
```

### 2. 提供视觉反馈

```typescript
// Show success message
function onLifecycleApplied() {
  showNotification('Lifecycle stage applied successfully', 'success')
}

// Show error message
function onError(error: Error) {
  showNotification(`Error: ${error.message}`, 'error')
}
```

### 3. 自动保存生命周期数据

```typescript
// Listen for changes and auto-save
eventBus.on('commandStack.changed', debounce(() => {
  saveLifecycleData()
}, 1000))
```

### 4. 在图表导入时加载生命周期数据

```typescript
async function loadDiagram(xml: string) {
  await modeler.value.importXML(xml)

  // Load workflow metadata
  const workflowMetadata = getWorkflowMetadata(modeler.value)
  if (workflowMetadata) {
    // Update UI with workflow metadata
  }

  // Style elements by lifecycle stage
  styleAllLifecycleElements(modeler.value)
}
```

---

## 故障排除

### 组件未更新?

确保您传递的是响应式 refs:

```typescript
// ✅ 正确
const modeler = ref<any>(null)
const selectedElement = ref<any>(null)

// ❌ 错误
let modeler: any = null
let selectedElement: any = null
```

### 元数据未持久化?

确保注册了 XFlow extension:

```typescript
new BpmnModeler({
  moddleExtensions: {
    xflow: xflowExtension  // 必须包含这个!
  }
})
```

### 样式未应用?

检查 modeler 是否有 'modeling' 模块:

```typescript
const modeling = modeler.get('modeling')
if (modeling) {
  modeling.setColor(element, { stroke: color })
}
```

---

## 后续步骤

1. 将 LifecyclePanel 添加到您的 BpmnEditor
2. 测试元素选择和生命周期分配
3. 使用生命周期元数据创建示例工作流
4. 测试带生命周期数据的保存/加载
5. 根据需要自定义样式和行为

有关更多示例,请参阅项目中的 `examples/` 目录。
