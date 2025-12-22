<template>
  <div class="workflow-list-page">
    <div class="page-header">
      <h1>工作流列表</h1>
      <a-button type="primary" @click="createNewWorkflow">
        <template #icon><FileAddOutlined /></template>
        创建新工作流
      </a-button>
    </div>

    <div class="page-content">
      <a-spin :spinning="loading" tip="加载中...">
        <!-- 错误状态 -->
        <a-alert
          v-if="error"
          type="error"
          :message="error"
          show-icon
          closable
          @close="error = null"
          style="margin-bottom: 16px"
        >
          <template #action>
            <a-button size="small" @click="loadWorkflows">重试</a-button>
          </template>
        </a-alert>

        <!-- 空状态 -->
        <a-empty v-if="!loading && workflows.length === 0 && !error" description="暂无工作流">
          <a-button type="primary" @click="createNewWorkflow">创建新工作流</a-button>
        </a-empty>

        <!-- 工作流表格 -->
        <a-table
          v-if="workflows.length > 0"
          :columns="columns"
          :data-source="workflows"
          :pagination="pagination"
          :loading="loading"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a @click="openWorkflow(record.id)">{{ record.name }}</a>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ getStatusText(record.status) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatDate(record.createdAt) }}
            </template>
            <template v-else-if="column.key === 'updatedAt'">
              {{ formatDate(record.updatedAt) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="primary" size="small" @click="openWorkflow(record.id)">
                  <template #icon><FolderOpenOutlined /></template>
                  打开
                </a-button>
                <a-button size="small" @click="downloadWorkflow(record)">
                  <template #icon><DownloadOutlined /></template>
                  下载
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  FileAddOutlined,
  FolderOpenOutlined,
  DownloadOutlined
} from '@ant-design/icons-vue'
import workflowService, { type Workflow } from '../services/workflowService'
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue'

const router = useRouter()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const workflows = ref<Workflow[]>([])
const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 个工作流`
})

// Table columns
const columns: TableColumnsType = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: '25%'
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    width: '30%',
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: '10%'
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: '15%'
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: '15%'
  },
  {
    title: '操作',
    key: 'action',
    width: '15%'
  }
]

// Load workflows
const loadWorkflows = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await workflowService.listWorkflows(
      pagination.value.current || 1,
      pagination.value.pageSize || 20
    )

    // Handle response structure safely
    if (response && response.data) {
      workflows.value = Array.isArray(response.data) ? response.data : []

      if (response.metadata) {
        pagination.value = {
          ...pagination.value,
          total: response.metadata.total || 0,
          current: response.metadata.page || 1,
          pageSize: response.metadata.pageSize || 20
        }
      }
    } else {
      workflows.value = []
      error.value = 'API 返回数据格式错误'
      console.error('Invalid API response structure:', response)
    }
  } catch (err) {
    workflows.value = [] // Ensure workflows is always an array
    error.value = err instanceof Error ? err.message : '加载工作流列表失败'
    console.error('Failed to load workflows:', err)
  } finally {
    loading.value = false
  }
}

// Handle table pagination change
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value = pag
  loadWorkflows()
}

// Navigate to editor with workflow ID
const openWorkflow = (workflowId: string) => {
  router.push(`/editor/${workflowId}`)
}

// Create new workflow
const createNewWorkflow = () => {
  router.push('/editor')
}

// Download workflow as BPMN file
const downloadWorkflow = (workflow: Workflow) => {
  try {
    const filename = workflow.name || `workflow-${workflow.id}`
    workflowService.downloadWorkflow(workflow.bpmnXml, filename)
    message.success('工作流已下载')
  } catch (err) {
    message.error('下载工作流失败')
    console.error('Failed to download workflow:', err)
  }
}

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status color
const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: 'default',
    active: 'success',
    inactive: 'warning',
    archived: 'error'
  }
  return colorMap[status] || 'default'
}

// Get status text
const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    active: '活跃',
    inactive: '未激活',
    archived: '已归档'
  }
  return textMap[status] || status
}

// Load workflows on mount
onMounted(() => {
  loadWorkflows()
})
</script>

<style scoped>
.workflow-list-page {
  padding: 24px;
  min-height: 100vh;
  background: #f0f2f5;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.page-content {
  background: #fff;
  padding: 24px;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
</style>
