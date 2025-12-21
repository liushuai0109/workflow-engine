<template>
  <div class="variable-watch-panel">
    <div class="panel-header">
      <h3>变量监视</h3>
      <a-button type="text" @click="$emit('close')">×</a-button>
    </div>

    <div class="panel-content">
      <!-- 搜索框 -->
      <div class="search-section">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索变量..."
          class="search-input"
        />
      </div>

      <!-- 变量列表 -->
      <div v-if="filteredVariables.length === 0" class="empty-state">
        {{ searchQuery ? '未找到匹配的变量' : '暂无变量' }}
      </div>

      <div v-else class="variable-list">
        <div
          v-for="(value, key) in filteredVariables"
          :key="key"
          class="variable-item"
          :class="{ changed: isVariableChanged(key) }"
        >
          <div class="variable-header" @click="toggleExpand(key)">
            <span class="variable-name">{{ key }}</span>
            <span v-if="isVariableChanged(key)" class="change-indicator">●</span>
            <span class="expand-icon">{{ expandedKeys.has(key) ? '▼' : '▶' }}</span>
          </div>
          <div v-if="expandedKeys.has(key)" class="variable-value">
            <pre>{{ formatValue(value) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  variables: Record<string, any>
  previousVariables?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  previousVariables: () => ({}),
})

const emit = defineEmits<{
  close: []
}>()

const searchQuery = ref('')
const expandedKeys = ref<Set<string>>(new Set())
const changedKeys = ref<Set<string>>(new Set())

// 监听变量变化，标记变化的变量
watch(
  () => props.variables,
  (newVars, oldVars) => {
    if (!oldVars || Object.keys(oldVars).length === 0) {
      // 首次加载，不标记变化
      return
    }

    const changed = new Set<string>()

    // 检查新增或修改的变量
    for (const key in newVars) {
      if (!(key in oldVars) || JSON.stringify(newVars[key]) !== JSON.stringify(oldVars[key])) {
        changed.add(key)
      }
    }

    // 检查删除的变量
    for (const key in oldVars) {
      if (!(key in newVars)) {
        changed.add(key)
      }
    }

    changedKeys.value = changed

    // 3秒后清除高亮
    setTimeout(() => {
      changedKeys.value.clear()
    }, 3000)
  },
  { deep: true }
)

const filteredVariables = computed(() => {
  if (!searchQuery.value) {
    return props.variables
  }

  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, any> = {}

  for (const [key, value] of Object.entries(props.variables)) {
    if (key.toLowerCase().includes(query)) {
      filtered[key] = value
    }
  }

  return filtered
})

const isVariableChanged = (key: string): boolean => {
  return changedKeys.value.has(key)
}

const toggleExpand = (key: string) => {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return String(value)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}
</script>

<style scoped>
.variable-watch-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 400px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
}

.close-btn:hover {
  color: #000;
}

.panel-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.search-section {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.variable-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variable-item {
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.variable-item.changed {
  border-color: #ff9800;
  background: #fff7e6;
  animation: highlight 0.5s ease;
}

@keyframes highlight {
  0% {
    background: #fffbe6;
  }
  50% {
    background: #fff7e6;
  }
  100% {
    background: #fff7e6;
  }
}

.variable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}

.variable-header:hover {
  background: #e6f7ff;
}

.variable-name {
  font-size: 14px;
  font-weight: 500;
  font-family: monospace;
}

.change-indicator {
  color: #ff9800;
  font-size: 12px;
  margin-left: 4px;
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.expand-icon {
  font-size: 12px;
  color: #666;
}

.variable-value {
  padding: 12px;
  background: white;
  border-top: 1px solid #eee;
}

.variable-value pre {
  margin: 0;
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: #333;
}
</style>

