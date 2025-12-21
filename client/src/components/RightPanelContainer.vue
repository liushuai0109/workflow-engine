<template>
  <div class="right-panel-container">
    <!-- Ant Design Tab 导航 -->
    <a-tabs
      v-model:activeKey="localActiveTab"
      @change="handleTabChange"
      class="panel-tabs"
    >
      <a-tab-pane key="properties">
        <template #tab>
          <span class="tab-label">
            <SettingOutlined />
            <span>属性</span>
          </span>
        </template>
        <!-- Properties Panel 专用挂载点 -->
        <div id="properties-panel" class="properties-panel-mount"></div>
      </a-tab-pane>

      <a-tab-pane key="chat" :forceRender="true">
        <template #tab>
          <span class="tab-label">
            <RobotOutlined />
            <span>AI 助手</span>
          </span>
        </template>
        <ChatBox
          ref="chatBoxRef"
          @close="handlePanelClose"
          @sendMessage="handleChatMessage"
        />
      </a-tab-pane>

      <a-tab-pane key="mock" :forceRender="true">
        <template #tab>
          <span class="tab-label">
            <ThunderboltOutlined />
            <span>Mock</span>
          </span>
        </template>
        <MockControlPanel
          v-bind="currentPanelProps"
          @close="handlePanelClose"
          @execution-update="handleMockExecutionUpdate"
        />
      </a-tab-pane>

      <a-tab-pane key="debug" :forceRender="true">
        <template #tab>
          <span class="tab-label">
            <BugOutlined />
            <span>Debug</span>
          </span>
        </template>
        <DebugControlPanel
          v-bind="currentPanelProps"
          @close="handlePanelClose"
          @session-update="handleSessionUpdate"
        />
      </a-tab-pane>

      <a-tab-pane key="interceptor" :forceRender="true">
        <template #tab>
          <span class="tab-label">
            <FilterOutlined />
            <span>拦截器</span>
          </span>
        </template>
        <InterceptorControlPanel
          v-bind="currentPanelProps"
          @close="handlePanelClose"
          @session-update="handleSessionUpdate"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  SettingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BugOutlined,
  FilterOutlined
} from '@ant-design/icons-vue'
import ChatBox from './ChatBox.vue'
import MockControlPanel from './MockControlPanel.vue'
import DebugControlPanel from './DebugControlPanel.vue'
import InterceptorControlPanel from './InterceptorControlPanel.vue'
import type { MockExecution } from '../services/mockService'
import type { DebugSession } from '../services/debugService'
import type { InterceptSession } from '../services/interceptorService'

interface Props {
  activeTab?: 'properties' | 'chat' | 'mock' | 'debug' | 'interceptor' | null
  workflowId?: string
  bpmnXml?: string
  configId?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'properties'
})

const emit = defineEmits<{
  'tab-change': [tab: string]
  'mock-execution-update': [execution: MockExecution]
  'debug-session-update': [session: DebugSession]
  'interceptor-session-update': [session: InterceptSession]
  'chat-message': [message: string]
}>()

// 本地 Tab 状态
const localActiveTab = ref<string>(props.activeTab || 'properties')

// ChatBox 引用
const chatBoxRef = ref<any>(null)

// 监听 props 变化并同步到本地状态
watch(() => props.activeTab, (newTab) => {
  if (newTab && newTab !== localActiveTab.value) {
    localActiveTab.value = newTab
  }
}, { immediate: true })

// 处理 Tab 变更
const handleTabChange = (value: string | number) => {
  localActiveTab.value = value as string
  emit('tab-change', value as string)
}

// 当前面板的 Props
const currentPanelProps = computed(() => {
  const baseProps = {
    workflowId: props.workflowId || ''
  }

  switch (localActiveTab.value) {
    case 'mock':
      return {
        ...baseProps,
        bpmnXml: props.bpmnXml,
        configId: props.configId
      }
    case 'debug':
      return baseProps
    case 'interceptor':
      return {
        ...baseProps,
        bpmnXml: props.bpmnXml
      }
    default:
      return baseProps
  }
})

// 处理面板关闭（从子组件）
const handlePanelClose = () => {
  // 关闭面板时切换回 Properties
  localActiveTab.value = 'properties'
  emit('tab-change', 'properties')
}

// 转发事件
const handleMockExecutionUpdate = (execution: MockExecution) => {
  emit('mock-execution-update', execution)
}

const handleSessionUpdate = (session: DebugSession | InterceptSession) => {
  if (localActiveTab.value === 'debug') {
    emit('debug-session-update', session as DebugSession)
  } else if (localActiveTab.value === 'interceptor') {
    emit('interceptor-session-update', session as InterceptSession)
  }
}

// 处理聊天消息
const handleChatMessage = (message: string) => {
  emit('chat-message', message)
}

// 暴露方法给父组件
defineExpose({
  chatBoxRef,
  setChatLoading: (loading: boolean) => {
    if (chatBoxRef.value && chatBoxRef.value.setLoading) {
      chatBoxRef.value.setLoading(loading)
    }
  },
  addUserMessage: (content: string) => {
    if (chatBoxRef.value && chatBoxRef.value.addUserMessage) {
      chatBoxRef.value.addUserMessage(content)
    }
  },
  addChatMessage: (content: string) => {
    if (chatBoxRef.value && chatBoxRef.value.addAssistantMessage) {
      chatBoxRef.value.addAssistantMessage(content)
    }
  },
  scrollToBottom: () => {
    if (chatBoxRef.value && chatBoxRef.value.scrollToBottom) {
      chatBoxRef.value.scrollToBottom()
    }
  }
})
</script>

<style scoped>
.right-panel-container {
  width: 400px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.ant-tabs .ant-tabs-tab+.ant-tabs-tab) {
  margin: 0 0 0 16px;
}
:deep(.ant-tabs-tab .anticon) {
  margin-right: 0;
}

/* Ant Design Tabs 自定义样式 */
.panel-tabs {
  flex: 1;
  min-height: 0; /* 关键：允许 flex 子元素正确收缩 */
}

/* Tab 标签图标文字间距 */
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* 确保 tab 内容区域可以滚动 */
.panel-tabs :deep(.ant-tabs-content) {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.panel-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow-y: auto;
}

/* 自定义 Tab 头部样式以匹配原设计 */
.panel-tabs :deep(.ant-tabs-nav) {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  margin: 0;
  padding: 0 12px;
}

.panel-tabs :deep(.ant-tabs-tab) {
  color: #6b7280;
  font-weight: 500;
}

.panel-tabs :deep(.ant-tabs-tab:hover) {
  background: #f3f4f6;
  color: #374151;
}

.panel-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #667eea;
  font-weight: 600;
}

.panel-tabs :deep(.ant-tabs-ink-bar) {
  background-color: #667eea;
}

/* Properties Panel 挂载点 */
.properties-panel-mount {
  height: 100%;
  overflow-y: auto;
}

/* 调整面板样式以适应 Tab 容器 */
:deep(.mock-control-panel),
:deep(.debug-control-panel),
:deep(.interceptor-control-panel),
:deep(.chat-box-container) {
  position: static;
  width: 100%;
  height: 100%;
  box-shadow: none;
  border-radius: 0;
}
</style>
