<template>
  <div class="trigger-condition-editor">
    <div class="editor-header">
      <h3 class="editor-title">Workflow Triggers</h3>
      <button v-if="!showEditor" class="btn-add" @click="showEditor = true">
        + Add Trigger
      </button>
    </div>

    <!-- Triggers List -->
    <div v-if="triggers.length > 0" class="triggers-list">
      <div
        v-for="(trigger, index) in triggers"
        :key="trigger.id"
        class="trigger-card"
      >
        <div class="trigger-header">
          <span class="trigger-icon">⚡</span>
          <span class="trigger-name">{{ trigger.name }}</span>
          <span class="trigger-type" :class="`type-${trigger.type}`">
            {{ trigger.type }}
          </span>
        </div>
        <div v-if="trigger.description" class="trigger-description">
          {{ trigger.description }}
        </div>
        <div class="trigger-details">
          <span v-if="trigger.type === 'scheduled' && trigger.schedule" class="detail-item">
            📅 {{ formatSchedule(trigger.schedule) }}
          </span>
          <span v-if="trigger.type === 'event' && trigger.event" class="detail-item">
            🎯 {{ trigger.event }}
          </span>
          <span v-if="trigger.type === 'threshold' && trigger.thresholds" class="detail-item">
            📊 {{ trigger.thresholds.length }} condition(s)
          </span>
        </div>
        <button class="btn-remove" @click="removeTrigger(index)">Remove</button>
      </div>
    </div>

    <!-- Trigger Editor -->
    <div v-if="showEditor" class="editor-panel">
      <div class="editor-tabs">
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
      <div v-if="activeTab === 'templates'" class="templates-section">
        <div class="type-filter">
          <button
            v-for="type in triggerTypes"
            :key="type"
            :class="['filter-btn', { active: selectedType === type }]"
            @click="selectedType = type"
          >
            {{ type }}
          </button>
        </div>

        <div class="templates-grid">
          <button
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-card"
            @click="selectTemplate(template)"
          >
            <div class="template-icon">{{ template.icon }}</div>
            <div class="template-name">{{ template.name }}</div>
            <div class="template-description">{{ template.description }}</div>
          </button>
        </div>
      </div>

      <!-- Custom Tab -->
      <div v-if="activeTab === 'custom'" class="custom-editor">
        <div class="form-group">
          <label>Trigger Name</label>
          <input
            v-model="customTrigger.name"
            type="text"
            placeholder="Enter trigger name"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>Trigger Type</label>
          <select v-model="customTrigger.type" class="form-select" @change="onTypeChange">
            <option value="scheduled">Scheduled</option>
            <option value="event">Event</option>
            <option value="threshold">Threshold</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <!-- Scheduled Configuration -->
        <div v-if="customTrigger.type === 'scheduled'" class="config-section">
          <div class="form-group">
            <label>Schedule Type</label>
            <select v-model="scheduleType" class="form-select">
              <option value="cron">Cron Expression</option>
              <option value="preset">Preset Schedule</option>
            </select>
          </div>

          <div v-if="scheduleType === 'cron'" class="form-group">
            <label>Cron Expression</label>
            <input
              v-model="cronExpression"
              type="text"
              placeholder="e.g., 0 9 * * * (Every day at 9 AM)"
              class="form-input"
            />
          </div>

          <div v-if="scheduleType === 'preset'" class="form-group">
            <label>Preset Schedule</label>
            <select v-model="cronPreset" class="form-select">
              <option v-for="(expr, name) in cronPresets" :key="name" :value="name">
                {{ formatPresetName(name) }}
              </option>
            </select>
          </div>
        </div>

        <!-- Event Configuration -->
        <div v-if="customTrigger.type === 'event'" class="config-section">
          <div class="form-group">
            <label>Event Type</label>
            <select v-model="customTrigger.event" class="form-select">
              <option v-for="eventType in eventTypes" :key="eventType" :value="eventType">
                {{ eventType }}
              </option>
            </select>
          </div>
        </div>

        <!-- Threshold Configuration -->
        <div v-if="customTrigger.type === 'threshold'" class="config-section">
          <div class="form-group">
            <label>Conditions</label>
            <div
              v-for="(condition, index) in customTrigger.thresholds"
              :key="index"
              class="condition-row"
            >
              <input
                v-model="condition.field"
                type="text"
                placeholder="Field name"
                class="form-input"
              />
              <select v-model="condition.operator" class="form-select">
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="gte">≥</option>
                <option value="lte">≤</option>
              </select>
              <input
                v-model="condition.value"
                type="text"
                placeholder="Value"
                class="form-input"
              />
              <button class="btn-icon" @click="removeThreshold(index)">×</button>
            </div>
            <button class="btn-secondary" @click="addThreshold">+ Add Condition</button>
          </div>
        </div>

        <div class="editor-actions">
          <button class="btn-primary" @click="saveCustomTrigger">Save Trigger</button>
          <button class="btn-secondary" @click="cancelEditor">Cancel</button>
        </div>
      </div>

      <button class="btn-close" @click="showEditor = false">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Trigger, TriggerTemplate, TriggerCondition, TriggerType, Schedule, EventType } from '@/types/triggers'
import { triggerService } from '@/services/triggerService'

// Props
interface Props {
  modelValue?: Trigger[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: Trigger[]]
  'change': [value: Trigger[]]
}>()

// State
const showEditor = ref(false)
const activeTab = ref<'templates' | 'custom'>('templates')
const selectedType = ref<TriggerType | 'all'>('all')
const templates = ref<TriggerTemplate[]>([])
const triggers = ref<Trigger[]>([...props.modelValue])

const customTrigger = ref({
  name: '',
  type: 'scheduled' as TriggerType,
  event: '' as EventType | string,
  thresholds: [] as TriggerCondition[]
})

const scheduleType = ref<'cron' | 'preset'>('preset')
const cronExpression = ref('')
const cronPreset = ref('every_day_9am')
const cronPresets = ref<Record<string, string>>({})
const eventTypes = ref<string[]>([])

const triggerTypes: TriggerType[] = ['scheduled', 'event', 'threshold', 'manual']

// Computed
const filteredTemplates = computed(() => {
  if (selectedType.value === 'all') {
    return templates.value
  }
  return templates.value.filter(t => t.type === selectedType.value)
})

// Methods
const loadTemplates = () => {
  try {
    templates.value = triggerService.getAllTemplates()
    cronPresets.value = triggerService.getAllCronPresets()
    eventTypes.value = triggerService.getEventTypes()
  } catch (error) {
    console.error('[TriggerConditionEditor] Failed to load templates:', error)
  }
}

const selectTemplate = (template: TriggerTemplate) => {
  const trigger = triggerService.createFromTemplate(template.id)
  if (trigger) {
    triggers.value.push(trigger)
    emitChange()
    showEditor.value = false
  }
}

const removeTrigger = (index: number) => {
  triggers.value.splice(index, 1)
  emitChange()
}

const onTypeChange = () => {
  // Reset type-specific fields when type changes
  customTrigger.value.event = ''
  customTrigger.value.thresholds = []
  if (customTrigger.value.type === 'threshold') {
    addThreshold()
  }
}

const addThreshold = () => {
  customTrigger.value.thresholds.push({
    field: '',
    operator: 'gte' as any,
    value: ''
  })
}

const removeThreshold = (index: number) => {
  customTrigger.value.thresholds.splice(index, 1)
}

const saveCustomTrigger = () => {
  if (!customTrigger.value.name) {
    alert('Please provide a trigger name')
    return
  }

  let trigger: Trigger | null = null

  if (customTrigger.value.type === 'scheduled') {
    const expression = scheduleType.value === 'cron'
      ? cronExpression.value
      : cronPresets.value[cronPreset.value]

    if (!expression) {
      alert('Please provide a schedule')
      return
    }

    trigger = triggerService.createScheduledTrigger(
      customTrigger.value.name,
      scheduleType.value === 'preset' ? cronPreset.value : 'custom',
      {
        description: 'Custom scheduled trigger'
      }
    )

    // If custom cron, update the schedule
    if (scheduleType.value === 'cron' && trigger) {
      trigger.schedule = {
        type: 'cron',
        expression: cronExpression.value,
        timezone: 'UTC'
      }
    }
  } else if (customTrigger.value.type === 'event') {
    if (!customTrigger.value.event) {
      alert('Please select an event type')
      return
    }
    trigger = triggerService.createEventTrigger(
      customTrigger.value.name,
      customTrigger.value.event,
      []
    )
  } else if (customTrigger.value.type === 'threshold') {
    if (customTrigger.value.thresholds.length === 0) {
      alert('Please add at least one threshold condition')
      return
    }
    trigger = triggerService.createThresholdTrigger(
      customTrigger.value.name,
      customTrigger.value.thresholds,
      3600000 // Check every hour
    )
  } else {
    // Manual trigger
    trigger = triggerService.createTrigger(customTrigger.value.name, 'manual')
  }

  if (trigger) {
    triggers.value.push(trigger)
    emitChange()
    resetCustomTrigger()
    showEditor.value = false
  }
}

const resetCustomTrigger = () => {
  customTrigger.value = {
    name: '',
    type: 'scheduled',
    event: '',
    thresholds: []
  }
  scheduleType.value = 'preset'
  cronExpression.value = ''
  cronPreset.value = 'every_day_9am'
}

const cancelEditor = () => {
  resetCustomTrigger()
  showEditor.value = false
}

const formatSchedule = (schedule: Schedule): string => {
  return triggerService.formatSchedule(schedule)
}

const formatPresetName = (name: string): string => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const emitChange = () => {
  emit('update:modelValue', triggers.value)
  emit('change', triggers.value)
}

// Lifecycle
onMounted(() => {
  loadTemplates()
})

// Expose methods
defineExpose({
  clearTriggers: () => {
    triggers.value = []
    emitChange()
  }
})
</script>

<style scoped>
.trigger-condition-editor {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
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

.triggers-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.trigger-card {
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.trigger-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.trigger-icon {
  font-size: 20px;
}

.trigger-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.trigger-type {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  text-transform: capitalize;
  font-weight: 500;
}

.type-scheduled {
  background: #e3f2fd;
  color: #1976D2;
}

.type-event {
  background: #f3e5f5;
  color: #7B1FA2;
}

.type-threshold {
  background: #fff3e0;
  color: #E65100;
}

.type-manual {
  background: #e8f5e9;
  color: #388E3C;
}

.trigger-description {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.trigger-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-item {
  font-size: 12px;
  color: #555;
}

.btn-remove {
  padding: 4px 12px;
  background: #fff;
  color: #f44336;
  border: 1px solid #f44336;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-remove:hover {
  background: #f44336;
  color: white;
}

.editor-panel {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.editor-tabs {
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

.type-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-transform: capitalize;
}

.filter-btn.active {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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
  text-align: center;
}

.template-card:hover {
  border-color: #2196F3;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
}

.template-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.template-description {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

.custom-editor {
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

.config-section {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 16px;
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

.editor-actions {
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
