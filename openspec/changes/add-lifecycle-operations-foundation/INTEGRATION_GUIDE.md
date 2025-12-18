# Lifecycle Operations Integration Guide

This guide explains how to integrate the lifecycle operations components into your BPMN editor application.

---

## Quick Start

### 1. Import the LifecyclePanel Component

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

## Using Individual Components

### LifecycleStageSelector

For assigning AARRR lifecycle stages to elements:

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

For creating target user segments:

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

For configuring workflow triggers:

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

For managing workflow-level metadata:

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

## Using the LifecycleIntegration Helper

The `LifecycleIntegration` helper provides functions for working with BPMN elements:

### Setting Lifecycle Metadata on Elements

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

### Getting Lifecycle Metadata from Elements

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

### Setting Workflow Metadata

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

### Exporting Lifecycle Data

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

## Complete Integration Example

Here's a complete example of integrating lifecycle operations into BpmnEditor.vue:

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

## Data Flow

### 1. User Interaction → Component → Service → Element

```
User selects "Activation" stage
  ↓
LifecycleStageSelector emits change event
  ↓
Parent component calls setLifecycleMetadata()
  ↓
LifecycleIntegration helper updates BPMN element
  ↓
Element now has lifecycle metadata in extensionElements
```

### 2. Element → Service → Component → Display

```
User selects BPMN element
  ↓
Parent component calls getLifecycleMetadata()
  ↓
LifecycleIntegration helper reads from element
  ↓
Component displays current stage
```

### 3. Save → Convert → Storage

```
User saves workflow
  ↓
BpmnModeler.saveXML()
  ↓
BpmnAdapter converts XPMN → BPMN
  ↓
Lifecycle metadata preserved in extensionElements
  ↓
Saved to file/backend
```

---

## Styling Elements by Lifecycle Stage

You can automatically style elements based on their lifecycle stage:

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

## Validation

Validate lifecycle data before saving:

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

## Best Practices

### 1. Always Validate Before Saving

```typescript
// Before saving workflow
if (!validateWorkflow(metadata)) {
  alert('Please fix validation errors')
  return
}
```

### 2. Provide Visual Feedback

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

### 3. Auto-save Lifecycle Data

```typescript
// Listen for changes and auto-save
eventBus.on('commandStack.changed', debounce(() => {
  saveLifecycleData()
}, 1000))
```

### 4. Load Lifecycle Data on Diagram Import

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

## Troubleshooting

### Component not updating?

Make sure you're passing reactive refs:

```typescript
// ✅ Correct
const modeler = ref<any>(null)
const selectedElement = ref<any>(null)

// ❌ Wrong
let modeler: any = null
let selectedElement: any = null
```

### Metadata not persisting?

Ensure XFlow extension is registered:

```typescript
new BpmnModeler({
  moddleExtensions: {
    xflow: xflowExtension  // Must include this!
  }
})
```

### Styles not applying?

Check that the modeler has the 'modeling' module:

```typescript
const modeling = modeler.get('modeling')
if (modeling) {
  modeling.setColor(element, { stroke: color })
}
```

---

## Next Steps

1. Add the LifecyclePanel to your BpmnEditor
2. Test element selection and lifecycle assignment
3. Create example workflows with lifecycle metadata
4. Test save/load with lifecycle data
5. Customize styling and behavior as needed

For more examples, see the `examples/` directory in the project.
