<template>
  <div class="mock-config-panel">
    <div class="panel-header">
      <h3>Mock 配置</h3>
      <a-button type="text" @click="$emit('close')">×</a-button>
    </div>

    <div class="panel-content">
      <!-- 配置列表 -->
      <div class="config-list-section">
        <div class="section-header">
          <span>已保存的配置</span>
          <a-button type="primary" size="small" @click="handleCreateNew">
            新建配置
          </a-button>
        </div>

        <div v-if="configs.length === 0" class="empty-state">
          暂无配置，点击"新建配置"创建
        </div>

        <div v-else class="config-list">
          <div
            v-for="config in configs"
            :key="config.id"
            class="config-item"
            :class="{ active: selectedConfigId === config.id }"
            @click="selectConfig(config)"
          >
            <div class="config-name">{{ config.name }}</div>
            <div class="config-actions">
              <a-button
                type="text"
                size="small"
                @click.stop="handleEdit(config)"
                title="编辑"
              >
                ✏️
              </a-button>
              <a-button
                size="small"
                type="danger"
                @click.stop="handleDelete(config.id!)"
                title="删除"
              >
                🗑️
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 配置编辑表单 -->
      <div v-if="editingConfig" class="config-form-section">
        <div class="section-header">
          <span>{{ editingConfig.id ? '编辑配置' : '新建配置' }}</span>
        </div>

        <div class="form-group">
          <label>配置名称 *</label>
          <input
            v-model="editingConfig.name"
            type="text"
            placeholder="输入配置名称"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea
            v-model="editingConfig.description"
            placeholder="输入配置描述"
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="form-actions">
          <a-button @click="cancelEdit">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mockService, type MockConfig } from '../services/mockService'

interface Props {
  workflowId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  configSelected: [config: MockConfig]
}>()

const configs = ref<MockConfig[]>([])
const selectedConfigId = ref<string | undefined>()
const editingConfig = ref<MockConfig | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')

const loadConfigs = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    configs.value = await mockService.getConfigs(props.workflowId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载配置失败'
  } finally {
    isLoading.value = false
  }
}

const selectConfig = (config: MockConfig) => {
  selectedConfigId.value = config.id
  emit('configSelected', config)
}

const handleCreateNew = () => {
  editingConfig.value = {
    workflowId: props.workflowId,
    name: '',
    description: '',
    nodeConfigs: {},
    gatewayConfigs: {},
  }
}

const handleEdit = (config: MockConfig) => {
  editingConfig.value = { ...config }
}

const cancelEdit = () => {
  editingConfig.value = null
}

const handleSave = async () => {
  if (!editingConfig.value) return

  if (!editingConfig.value.name.trim()) {
    errorMessage.value = '配置名称不能为空'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    if (editingConfig.value.id) {
      // 更新配置
      const updated = await mockService.updateConfig(
        editingConfig.value.id,
        editingConfig.value
      )
      const index = configs.value.findIndex((c) => c.id === updated.id)
      if (index >= 0) {
        configs.value[index] = updated
      }
    } else {
      // 创建配置
      const created = await mockService.createConfig(
        props.workflowId,
        editingConfig.value
      )
      configs.value.push(created)
      selectConfig(created)
    }

    editingConfig.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存配置失败'
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async (configId: string) => {
  if (!confirm('确定要删除这个配置吗？')) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    await mockService.deleteConfig(configId)
    configs.value = configs.value.filter((c) => c.id !== configId)
    if (selectedConfigId.value === configId) {
      selectedConfigId.value = undefined
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除配置失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.mock-config-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.config-list-section {
  margin-bottom: 24px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.config-item:hover {
  background: #f5f5f5;
}

.config-item.active {
  border-color: #1890ff;
  background: #e6f7ff;
}

.config-name {
  font-size: 14px;
  font-weight: 500;
}

.config-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

.config-form-section {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-small {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #d9d9d9;
}
</style>

