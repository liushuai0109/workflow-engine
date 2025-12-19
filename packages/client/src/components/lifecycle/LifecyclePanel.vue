<template>
  <div class="lifecycle-panel">
    <div class="panel-header">
      <h3>Lifecycle Operations</h3>
      <button class="btn-toggle" @click="collapsed = !collapsed">
        {{ collapsed ? '▼' : '▲' }}
      </button>
    </div>

    <div v-if="!collapsed" class="panel-content">
      <!-- Workflow Level Metadata -->
      <div class="section">
        <div class="section-header">
          <h4>Workflow Metadata</h4>
          <button class="btn-small" @click="showWorkflowPanel = !showWorkflowPanel">
            {{ showWorkflowPanel ? 'Hide' : 'Edit' }}
          </button>
        </div>

        <div v-if="workflowMetadata && !showWorkflowPanel" class="metadata-summary">
          <div class="summary-item">
            <span class="label">Name:</span>
            <span class="value">{{ workflowMetadata.name }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Purpose:</span>
            <span class="value">{{ workflowMetadata.purpose }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Status:</span>
            <span class="value status-badge" :class="`status-${workflowMetadata.status}`">
              {{ workflowMetadata.status }}
            </span>
          </div>
        </div>

        <WorkflowMetadataPanel
          v-if="showWorkflowPanel"
          v-model="workflowMetadata"
          @save="onWorkflowSave"
        />
      </div>

      <!-- Element Level Metadata -->
      <div v-if="selectedElement" class="section">
        <div class="section-header">
          <h4>Selected Element</h4>
          <span class="element-info">{{ selectedElement.type }} ({{ selectedElement.id }})</span>
        </div>

        <!-- Lifecycle Stage -->
        <div class="subsection">
          <h5>Lifecycle Stage</h5>
          <LifecycleStageSelector
            v-model="selectedLifecycleStage"
            @change="onLifecycleStageChange"
          />
        </div>

        <div v-if="selectedLifecycleStage" class="applied-info">
          ✅ Lifecycle stage applied to element
        </div>
      </div>

      <div v-else class="no-selection">
        <p>Select an element to assign lifecycle metadata</p>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h4>Quick Actions</h4>
        <div class="actions-grid">
          <button class="action-btn" @click="showSegmentBuilder = !showSegmentBuilder">
            👥 Target Segments
          </button>
          <button class="action-btn" @click="showTriggerEditor = !showTriggerEditor">
            ⚡ Workflow Triggers
          </button>
          <button class="action-btn" @click="exportLifecycleData">
            💾 Export Data
          </button>
          <button class="action-btn" @click="viewStatistics">
            📊 Statistics
          </button>
        </div>
      </div>

      <!-- Segment Builder (Collapsible) -->
      <div v-if="showSegmentBuilder" class="section">
        <UserSegmentBuilder
          v-model="targetSegments"
          @change="onSegmentsChange"
        />
      </div>

      <!-- Trigger Editor (Collapsible) -->
      <div v-if="showTriggerEditor" class="section">
        <TriggerConditionEditor
          v-model="workflowTriggers"
          @change="onTriggersChange"
        />
      </div>

      <!-- Statistics Display -->
      <div v-if="showStatistics" class="section">
        <h4>Lifecycle Statistics</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ statistics.totalElements }}</div>
            <div class="stat-label">Total Elements</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ statistics.withLifecycle }}</div>
            <div class="stat-label">With Lifecycle</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ statistics.segments }}</div>
            <div class="stat-label">Target Segments</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ statistics.triggers }}</div>
            <div class="stat-label">Triggers</div>
          </div>
        </div>
        <button class="btn-close" @click="showStatistics = false">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { LifecycleStageSelector, UserSegmentBuilder, TriggerConditionEditor, WorkflowMetadataPanel } from '@/components/lifecycle'
import type { LifecycleStage, LifecycleMetadata } from '@/types/lifecycle'
import type { UserSegment } from '@/types/segments'
import type { Trigger } from '@/types/triggers'
import type { WorkflowMetadata } from '@/types/metrics'
import {
  getLifecycleMetadata,
  setLifecycleMetadata,
  getWorkflowMetadata,
  setWorkflowMetadata,
  applyLifecycleStyle,
  exportLifecycleData as exportData,
  getElementsWithLifecycle
} from '@/extensions/xflow/LifecycleIntegration'
import { lifecycleService } from '@/services/lifecycleService'

// Props
interface Props {
  modeler?: any
  selectedElement?: any
}

const props = defineProps<Props>()

// State
const collapsed = ref(false)
const showWorkflowPanel = ref(false)
const showSegmentBuilder = ref(false)
const showTriggerEditor = ref(false)
const showStatistics = ref(false)

const workflowMetadata = ref<WorkflowMetadata | null>(null)
const selectedLifecycleStage = ref<LifecycleStage | null>(null)
const targetSegments = ref<UserSegment[]>([])
const workflowTriggers = ref<Trigger[]>([])

// Statistics
const statistics = computed(() => {
  if (!props.modeler) {
    return { totalElements: 0, withLifecycle: 0, segments: 0, triggers: 0 }
  }

  try {
    const elementRegistry = props.modeler.get('elementRegistry')
    const allElements = elementRegistry.getAll()
    const elementsWithLifecycle = getElementsWithLifecycle(props.modeler)

    return {
      totalElements: allElements.length,
      withLifecycle: elementsWithLifecycle.length,
      segments: targetSegments.value.length,
      triggers: workflowTriggers.value.length
    }
  } catch {
    return { totalElements: 0, withLifecycle: 0, segments: 0, triggers: 0 }
  }
})

// Methods
const loadWorkflowMetadata = () => {
  if (!props.modeler) return

  try {
    const metadata = getWorkflowMetadata(props.modeler)
    if (metadata) {
      workflowMetadata.value = metadata
      if (metadata.targetSegments) {
        // Load segments if stored as IDs
      }
    }
  } catch (error) {
    console.error('Error loading workflow metadata:', error)
  }
}

const loadElementLifecycle = () => {
  if (!props.selectedElement) {
    selectedLifecycleStage.value = null
    return
  }

  try {
    const metadata = getLifecycleMetadata(props.selectedElement)
    if (metadata) {
      selectedLifecycleStage.value = metadata.stage
    } else {
      selectedLifecycleStage.value = null
    }
  } catch (error) {
    console.error('Error loading element lifecycle:', error)
  }
}

const onLifecycleStageChange = (stage: LifecycleStage | null) => {
  if (!props.selectedElement || !props.modeler || !stage) return

  try {
    const metadata: LifecycleMetadata = lifecycleService.createMetadata(stage)

    const success = setLifecycleMetadata(props.selectedElement, props.modeler, metadata)

    if (success) {
      applyLifecycleStyle(props.selectedElement, props.modeler, stage)
      console.log('Lifecycle metadata applied successfully')
    }
  } catch (error) {
    console.error('Error applying lifecycle stage:', error)
  }
}

const onWorkflowSave = (metadata: WorkflowMetadata) => {
  if (!props.modeler) return

  try {
    const success = setWorkflowMetadata(props.modeler, metadata)
    if (success) {
      workflowMetadata.value = metadata
      showWorkflowPanel.value = false
      console.log('Workflow metadata saved successfully')
    }
  } catch (error) {
    console.error('Error saving workflow metadata:', error)
  }
}

const onSegmentsChange = (segments: UserSegment[]) => {
  targetSegments.value = segments
  console.log('Target segments updated:', segments)
}

const onTriggersChange = (triggers: Trigger[]) => {
  workflowTriggers.value = triggers
  console.log('Workflow triggers updated:', triggers)
}

const exportLifecycleData = () => {
  if (!props.modeler) return

  try {
    const data = exportData(props.modeler)
    const json = JSON.stringify(data, null, 2)

    // Create download
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lifecycle-data.json'
    a.click()
    URL.revokeObjectURL(url)

    console.log('Lifecycle data exported')
  } catch (error) {
    console.error('Error exporting lifecycle data:', error)
  }
}

const viewStatistics = () => {
  showStatistics.value = !showStatistics.value
}

// Watch for modeler changes
watch(() => props.modeler, () => {
  if (props.modeler) {
    loadWorkflowMetadata()
  }
}, { immediate: true })

// Watch for element selection changes
watch(() => props.selectedElement, () => {
  loadElementLifecycle()
}, { immediate: true })
</script>

<style scoped>
.lifecycle-panel {
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-toggle {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.panel-content {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.element-info {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.subsection {
  margin-top: 12px;
}

.subsection h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.metadata-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.summary-item .label {
  font-weight: 600;
  color: #555;
  min-width: 80px;
}

.summary-item .value {
  color: #333;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-draft { background: #e0e0e0; color: #666; }
.status-active { background: #e3f2fd; color: #1976D2; }
.status-review { background: #fff3e0; color: #E65100; }

.applied-info {
  margin-top: 12px;
  padding: 8px 12px;
  background: #e8f5e9;
  border-left: 3px solid #4CAF50;
  border-radius: 4px;
  color: #2E7D32;
  font-size: 13px;
}

.no-selection {
  padding: 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-btn {
  padding: 10px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #667eea;
  background: #f8f9fa;
}

.btn-small {
  padding: 4px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-small:hover {
  background: #f0f0f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.stat-card {
  padding: 16px;
  background: white;
  border-radius: 6px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.btn-close {
  width: 100%;
  padding: 8px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-close:hover {
  background: #e0e0e0;
}
</style>
