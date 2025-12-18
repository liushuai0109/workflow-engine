<template>
  <div class="workflow-metadata-panel">
    <div class="panel-header">
      <h3 class="panel-title">Workflow Metadata</h3>
      <span v-if="metadata" class="status-badge" :class="`status-${metadata.status}`">
        {{ metadata.status }}
      </span>
    </div>

    <div v-if="!metadata" class="empty-state">
      <p>No workflow metadata. Click "Create Workflow" to add metadata.</p>
      <button class="btn-create" @click="createWorkflow">Create Workflow</button>
    </div>

    <div v-else class="metadata-content">
      <!-- Basic Info -->
      <div class="section">
        <h4 class="section-title">Basic Information</h4>
        <div class="form-group">
          <label>Workflow Name</label>
          <input
            v-model="metadata.name"
            type="text"
            class="form-input"
            @input="emitChange"
          />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            v-model="metadata.description"
            rows="3"
            class="form-textarea"
            @input="emitChange"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Purpose</label>
            <select v-model="metadata.purpose" class="form-select" @change="emitChange">
              <option value="Onboarding">Onboarding</option>
              <option value="Engagement">Engagement</option>
              <option value="Conversion">Conversion</option>
              <option value="Retention">Retention</option>
              <option value="Winback">Winback</option>
              <option value="Monetization">Monetization</option>
              <option value="Referral">Referral</option>
            </select>
          </div>

          <div class="form-group">
            <label>Version</label>
            <input
              v-model="metadata.version"
              type="text"
              class="form-input"
              placeholder="1.0.0"
              @input="emitChange"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Owner</label>
            <input
              v-model="metadata.owner"
              type="text"
              class="form-input"
              placeholder="Owner name or email"
              @input="emitChange"
            />
          </div>

          <div class="form-group">
            <label>Business Impact</label>
            <select v-model="metadata.businessImpact" class="form-select" @change="emitChange">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div class="section">
        <div class="section-header">
          <h4 class="section-title">Success Metrics</h4>
          <button class="btn-small" @click="addMetric">+ Add Metric</button>
        </div>

        <div v-if="metadata.metrics.length > 0" class="metrics-list">
          <div
            v-for="(metric, index) in metadata.metrics"
            :key="index"
            class="metric-card"
          >
            <div class="metric-row">
              <input
                v-model="metric.displayName"
                type="text"
                placeholder="Metric name"
                class="form-input"
                @input="emitChange"
              />
              <select v-model="metric.name" class="form-select" @change="emitChange">
                <option value="conversion_rate">Conversion Rate</option>
                <option value="completion_rate">Completion Rate</option>
                <option value="engagement_rate">Engagement Rate</option>
                <option value="retention_rate">Retention Rate</option>
                <option value="revenue_generated">Revenue Generated</option>
                <option value="time_to_activation">Time to Activation</option>
              </select>
            </div>

            <div class="metric-row">
              <input
                v-model.number="metric.target"
                type="number"
                placeholder="Target value"
                class="form-input"
                step="0.01"
                @input="emitChange"
              />
              <select v-model="metric.unit" class="form-select" @change="emitChange">
                <option value="%">Percentage (%)</option>
                <option value="count">Count</option>
                <option value="$">Currency ($)</option>
                <option value="seconds">Seconds</option>
                <option value="days">Days</option>
              </select>
              <button class="btn-icon" @click="removeMetric(index)">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div class="section">
        <div class="section-header">
          <h4 class="section-title">Tags</h4>
        </div>

        <div class="tags-input">
          <div class="tags-list">
            <span
              v-for="(tag, index) in metadata.tags"
              :key="index"
              class="tag-chip"
            >
              {{ tag }}
              <button class="tag-remove" @click="removeTag(index)">×</button>
            </span>
          </div>
          <input
            v-model="newTag"
            type="text"
            placeholder="Add tag..."
            class="form-input"
            @keyup.enter="addTag"
          />
        </div>
      </div>

      <!-- Status & Publishing -->
      <div class="section">
        <h4 class="section-title">Status & Publishing</h4>

        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select v-model="metadata.status" class="form-select" @change="emitChange">
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div class="form-group">
            <label>Published</label>
            <div class="checkbox-group">
              <input
                v-model="metadata.published"
                type="checkbox"
                id="published"
                @change="emitChange"
              />
              <label for="published">Workflow is published</label>
            </div>
          </div>
        </div>

        <div v-if="metadata.publishedAt" class="info-text">
          Published: {{ formatDate(metadata.publishedAt) }}
        </div>
      </div>

      <!-- Actions -->
      <div class="panel-actions">
        <button class="btn-primary" @click="saveMetadata">Save Metadata</button>
        <button class="btn-secondary" @click="resetMetadata">Reset</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { WorkflowMetadata, WorkflowPurpose, WorkflowStatus, WorkflowMetric } from '@/types/metrics'
import { workflowMetadataService } from '@/services/workflowMetadataService'

// Props
interface Props {
  modelValue?: WorkflowMetadata | null
  workflowId?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  workflowId: ''
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: WorkflowMetadata | null]
  'change': [value: WorkflowMetadata | null]
  'save': [value: WorkflowMetadata]
}>()

// State
const metadata = ref<WorkflowMetadata | null>(props.modelValue)
const newTag = ref('')

// Methods
const createWorkflow = () => {
  const newWorkflow = workflowMetadataService.createWorkflow(
    'New Workflow',
    'Onboarding' as WorkflowPurpose,
    'system',
    {
      description: '',
      tags: [],
      status: 'draft' as WorkflowStatus
    }
  )
  metadata.value = newWorkflow
  emitChange()
}

const addMetric = () => {
  if (!metadata.value) return

  metadata.value.metrics.push({
    name: 'conversion_rate',
    displayName: 'Conversion Rate',
    target: 0,
    unit: '%',
    higherIsBetter: true
  })
  emitChange()
}

const removeMetric = (index: number) => {
  if (!metadata.value) return
  metadata.value.metrics.splice(index, 1)
  emitChange()
}

const addTag = () => {
  if (!metadata.value || !newTag.value.trim()) return

  const tag = newTag.value.trim()
  if (!metadata.value.tags.includes(tag)) {
    metadata.value.tags.push(tag)
    emitChange()
  }
  newTag.value = ''
}

const removeTag = (index: number) => {
  if (!metadata.value) return
  metadata.value.tags.splice(index, 1)
  emitChange()
}

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
}

const saveMetadata = () => {
  if (!metadata.value) return

  // Update timestamps
  metadata.value.updatedAt = new Date()

  emit('save', metadata.value)
  console.log('[WorkflowMetadataPanel] Metadata saved:', metadata.value)
}

const resetMetadata = () => {
  if (props.modelValue) {
    metadata.value = JSON.parse(JSON.stringify(props.modelValue))
  } else {
    metadata.value = null
  }
}

const emitChange = () => {
  emit('update:modelValue', metadata.value)
  emit('change', metadata.value)
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== metadata.value) {
    metadata.value = JSON.parse(JSON.stringify(newValue))
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  if (props.workflowId && !metadata.value) {
    // Try to load existing workflow metadata
    const existing = workflowMetadataService.getWorkflow(props.workflowId)
    if (existing) {
      metadata.value = existing
    }
  }
})

// Expose methods
defineExpose({
  createWorkflow,
  saveMetadata,
  resetMetadata
})
</script>

<style scoped>
.workflow-metadata-panel {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.panel-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-draft { background: #e0e0e0; color: #666; }
.status-review { background: #fff3e0; color: #E65100; }
.status-approved { background: #e8f5e9; color: #388E3C; }
.status-active { background: #e3f2fd; color: #1976D2; }
.status-paused { background: #f3e5f5; color: #7B1FA2; }
.status-archived { background: #fce4ec; color: #C2185B; }

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.btn-create {
  padding: 10px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
}

.btn-create:hover {
  background: #1976D2;
}

.metadata-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
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

.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #2196F3;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.checkbox-group label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

.btn-small {
  padding: 4px 12px;
  background: white;
  color: #2196F3;
  border: 1px solid #2196F3;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.btn-small:hover {
  background: #e3f2fd;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-card {
  padding: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.metric-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.metric-row:not(:last-child) {
  margin-bottom: 8px;
}

.btn-icon {
  background: none;
  border: none;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  width: 36px;
  height: 36px;
}

.btn-icon:hover {
  color: #f44336;
}

.tags-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #e3f2fd;
  border: 1px solid #2196F3;
  border-radius: 12px;
  font-size: 12px;
  color: #1976D2;
}

.tag-remove {
  background: none;
  border: none;
  color: #1976D2;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove:hover {
  color: #f44336;
}

.info-text {
  font-size: 12px;
  color: #666;
  font-style: italic;
  margin-top: 8px;
}

.panel-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.btn-primary {
  flex: 1;
  padding: 10px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary:hover {
  background: #1976D2;
}

.btn-secondary {
  padding: 10px 20px;
  background: white;
  color: #2196F3;
  border: 1px solid #2196F3;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #e3f2fd;
}
</style>
