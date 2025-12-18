<template>
  <div class="user-segment-builder">
    <div class="builder-header">
      <h3 class="builder-title">Target User Segments</h3>
      <button v-if="!showBuilder" class="btn-add" @click="showBuilder = true">
        + Add Segment
      </button>
    </div>

    <!-- Segment List -->
    <div v-if="selectedSegments.length > 0" class="segments-list">
      <div
        v-for="(segment, index) in selectedSegments"
        :key="segment.id"
        class="segment-chip"
      >
        <span class="segment-icon">👥</span>
        <span class="segment-name">{{ segment.name }}</span>
        <button class="btn-remove" @click="removeSegment(index)">×</button>
      </div>
    </div>

    <!-- Segment Builder -->
    <div v-if="showBuilder" class="builder-panel">
      <div class="builder-tabs">
        <button
          :class="['tab', { active: activeTab === 'templates' }]"
          @click="activeTab = 'templates'"
        >
          Templates
        </button>
        <button
          :class="['tab', { active: activeTab === 'custom' }]"
          @click="activeTab = 'custom'"
        >
          Custom
        </button>
      </div>

      <!-- Templates Tab -->
      <div v-if="activeTab === 'templates'" class="templates-grid">
        <button
          v-for="template in templates"
          :key="template.id"
          class="template-card"
          @click="selectTemplate(template)"
        >
          <div class="template-header">
            <span class="template-icon">{{ template.icon }}</span>
            <span class="template-name">{{ template.name }}</span>
          </div>
          <div class="template-description">{{ template.description }}</div>
          <div class="template-footer">
            <span class="template-type">{{ template.type }}</span>
          </div>
        </button>
      </div>

      <!-- Custom Tab -->
      <div v-if="activeTab === 'custom'" class="custom-builder">
        <div class="form-group">
          <label>Segment Name</label>
          <input
            v-model="customSegment.name"
            type="text"
            placeholder="Enter segment name"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>Segment Type</label>
          <select v-model="customSegment.type" class="form-select">
            <option value="demographic">Demographic</option>
            <option value="behavioral">Behavioral</option>
            <option value="lifecycle">Lifecycle</option>
            <option value="value">Value</option>
          </select>
        </div>

        <div class="form-group">
          <label>Conditions</label>
          <div
            v-for="(condition, index) in customSegment.conditions"
            :key="index"
            class="condition-row"
          >
            <select v-model="condition.field" class="form-select">
              <option v-for="field in availableFields" :key="field.name" :value="field.name">
                {{ field.label }}
              </option>
            </select>

            <select v-model="condition.operator" class="form-select">
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="gte">Greater or Equal</option>
              <option value="lte">Less or Equal</option>
              <option value="contains">Contains</option>
              <option value="in">In</option>
            </select>

            <input
              v-model="condition.value"
              type="text"
              placeholder="Value"
              class="form-input"
            />

            <button class="btn-icon" @click="removeCondition(index)">×</button>
          </div>

          <button class="btn-secondary" @click="addCondition">+ Add Condition</button>
        </div>

        <div class="form-group">
          <label>Logical Operator</label>
          <select v-model="customSegment.operator" class="form-select">
            <option value="AND">AND (All conditions must match)</option>
            <option value="OR">OR (Any condition can match)</option>
          </select>
        </div>

        <div class="builder-actions">
          <button class="btn-primary" @click="saveCustomSegment">Save Segment</button>
          <button class="btn-secondary" @click="cancelBuilder">Cancel</button>
        </div>
      </div>

      <button class="btn-close" @click="showBuilder = false">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { UserSegment, SegmentTemplate, SegmentCondition, SegmentField, SegmentType, LogicalOperator, ConditionOperator } from '@/types/segments'
import { userSegmentService } from '@/services/userSegmentService'

// Props
interface Props {
  modelValue?: UserSegment[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: UserSegment[]]
  'change': [value: UserSegment[]]
}>()

// State
const showBuilder = ref(false)
const activeTab = ref<'templates' | 'custom'>('templates')
const templates = ref<SegmentTemplate[]>([])
const availableFields = ref<SegmentField[]>([])
const selectedSegments = ref<UserSegment[]>([...props.modelValue])

const customSegment = ref({
  name: '',
  type: 'behavioral' as SegmentType,
  conditions: [] as SegmentCondition[],
  operator: 'AND' as LogicalOperator
})

// Methods
const loadTemplates = () => {
  try {
    templates.value = userSegmentService.getAllTemplates()
    availableFields.value = userSegmentService.getAllFields()
  } catch (error) {
    console.error('[UserSegmentBuilder] Failed to load templates:', error)
  }
}

const selectTemplate = (template: SegmentTemplate) => {
  const segment = userSegmentService.createFromTemplate(template.id)
  if (segment) {
    selectedSegments.value.push(segment)
    emitChange()
    showBuilder.value = false
  }
}

const removeSegment = (index: number) => {
  selectedSegments.value.splice(index, 1)
  emitChange()
}

const addCondition = () => {
  customSegment.value.conditions.push({
    field: '',
    operator: 'equals' as ConditionOperator,
    value: ''
  })
}

const removeCondition = (index: number) => {
  customSegment.value.conditions.splice(index, 1)
}

const saveCustomSegment = () => {
  if (!customSegment.value.name || customSegment.value.conditions.length === 0) {
    alert('Please provide a name and at least one condition')
    return
  }

  const segment = userSegmentService.createSegment(
    customSegment.value.name,
    customSegment.value.type,
    customSegment.value.conditions,
    customSegment.value.operator
  )

  selectedSegments.value.push(segment)
  emitChange()
  resetCustomSegment()
  showBuilder.value = false
}

const resetCustomSegment = () => {
  customSegment.value = {
    name: '',
    type: 'behavioral',
    conditions: [],
    operator: 'AND'
  }
}

const cancelBuilder = () => {
  resetCustomSegment()
  showBuilder.value = false
}

const emitChange = () => {
  emit('update:modelValue', selectedSegments.value)
  emit('change', selectedSegments.value)
}

// Lifecycle
onMounted(() => {
  loadTemplates()
  addCondition() // Add initial condition for custom builder
})

// Expose methods
defineExpose({
  clearSegments: () => {
    selectedSegments.value = []
    emitChange()
  }
})
</script>

<style scoped>
.user-segment-builder {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.builder-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.segments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.segment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e3f2fd;
  border: 1px solid #2196F3;
  border-radius: 16px;
  font-size: 14px;
  color: #1976D2;
}

.segment-icon {
  font-size: 16px;
}

.segment-name {
  font-weight: 500;
}

.btn-remove {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  color: #f44336;
}

.btn-add {
  padding: 8px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-add:hover {
  background: #1976D2;
}

.builder-panel {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.builder-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab.active {
  color: #2196F3;
  border-bottom-color: #2196F3;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.template-card {
  padding: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.template-card:hover {
  border-color: #2196F3;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.template-icon {
  font-size: 20px;
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.template-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-type {
  font-size: 11px;
  padding: 2px 8px;
  background: #e0e0e0;
  border-radius: 10px;
  color: #555;
  text-transform: capitalize;
}

.custom-builder {
  background: white;
  padding: 16px;
  border-radius: 6px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #2196F3;
}

.condition-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 2fr auto;
  gap: 8px;
  margin-bottom: 8px;
}

.btn-icon {
  background: none;
  border: none;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
}

.btn-icon:hover {
  color: #f44336;
}

.btn-primary {
  padding: 8px 16px;
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
  padding: 8px 16px;
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

.builder-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-close {
  margin-top: 12px;
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  width: 100%;
}

.btn-close:hover {
  background: #e0e0e0;
}
</style>
