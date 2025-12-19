<template>
  <div class="lifecycle-stage-selector">
    <div class="selector-header">
      <h3 class="selector-title">Lifecycle Stage</h3>
      <span v-if="selectedStage" class="selected-badge" :style="{ backgroundColor: selectedStageColor }">
        {{ selectedStageIcon }} {{ selectedStage }}
      </span>
    </div>

    <div class="stage-grid">
      <button
        v-for="stage in stages"
        :key="stage.stage"
        class="stage-card"
        :class="{ selected: selectedStage === stage.stage }"
        :style="{ borderColor: stage.color }"
        @click="selectStage(stage.stage)"
      >
        <div class="stage-icon" :style="{ backgroundColor: stage.color }">
          {{ stage.icon }}
        </div>
        <div class="stage-info">
          <div class="stage-name">{{ stage.label }}</div>
          <div class="stage-description">{{ stage.description }}</div>
          <div v-if="stage.metrics && stage.metrics.length > 0" class="stage-metrics">
            <span class="metrics-label">Metrics:</span>
            <span class="metrics-list">{{ stage.metrics.slice(0, 3).join(', ') }}</span>
          </div>
        </div>
      </button>
    </div>

    <div v-if="selectedStage && selectedStageConfig" class="stage-details">
      <h4>Stage Details</h4>
      <div class="detail-section">
        <label>Key Metrics:</label>
        <ul class="metrics-list">
          <li v-for="metric in selectedStageConfig.metrics" :key="metric">{{ metric }}</li>
        </ul>
      </div>
      <div v-if="selectedStageConfig.examples" class="detail-section">
        <label>Example Use Cases:</label>
        <ul class="examples-list">
          <li v-for="example in selectedStageConfig.examples" :key="example">{{ example }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { LifecycleStage, LifecycleStageConfig } from '@/types/lifecycle'
import { lifecycleService } from '@/services/lifecycleService'

// Props
interface Props {
  modelValue?: LifecycleStage | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: LifecycleStage | null]
  'change': [value: LifecycleStage | null, config: LifecycleStageConfig | undefined]
}>()

// State
const stages = ref<LifecycleStageConfig[]>([])
const selectedStage = ref<LifecycleStage | null>(props.modelValue)

// Computed
const selectedStageConfig = computed(() => {
  if (!selectedStage.value) return null
  return stages.value.find(s => s.stage === selectedStage.value)
})

const selectedStageColor = computed(() => {
  return selectedStageConfig.value?.color || '#757575'
})

const selectedStageIcon = computed(() => {
  return selectedStageConfig.value?.icon || '📊'
})

// Methods
const loadStages = () => {
  try {
    stages.value = lifecycleService.getAllStages()
  } catch (error) {
    console.error('[LifecycleStageSelector] Failed to load stages:', error)
    stages.value = []
  }
}

const selectStage = (stage: LifecycleStage) => {
  if (props.disabled) return

  selectedStage.value = stage
  const config = stages.value.find(s => s.stage === stage)

  emit('update:modelValue', stage)
  emit('change', stage, config)
}

const clearSelection = () => {
  selectedStage.value = null
  emit('update:modelValue', null)
  emit('change', null, undefined)
}

// Lifecycle
onMounted(() => {
  loadStages()
  if (props.modelValue) {
    selectedStage.value = props.modelValue
  }
})

// Expose methods for parent components
defineExpose({
  clearSelection,
  selectStage
})
</script>

<style scoped>
.lifecycle-stage-selector {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.selector-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.selected-badge {
  padding: 4px 12px;
  border-radius: 16px;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stage-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.stage-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stage-card.selected {
  border-width: 3px;
  background: #f8f9fa;
}

.stage-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 24px;
  flex-shrink: 0;
}

.stage-info {
  flex: 1;
  min-width: 0;
}

.stage-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stage-description {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.stage-metrics {
  font-size: 12px;
  color: #888;
}

.metrics-label {
  font-weight: 600;
  margin-right: 4px;
}

.metrics-list {
  font-style: italic;
}

.stage-details {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid var(--stage-color, #2196F3);
}

.stage-details h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.detail-section ul {
  margin: 0;
  padding-left: 20px;
}

.detail-section li {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}
</style>
