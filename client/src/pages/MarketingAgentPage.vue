<template>
  <div class="marketing-agent-page">
    <div class="page-container" :class="{ 'left-collapsed': !leftPanelVisible, 'right-collapsed': !rightPanelVisible }">
      <!-- Left Panel: Conversation List -->
      <div v-show="leftPanelVisible" class="left-panel">
        <MarketingConversationList
          :conversations="conversations"
          :current-id="currentConversationId"
          :loading="conversationsLoading"
          @select="handleSelectConversation"
          @create="handleCreateConversation"
          @delete="handleDeleteConversation"
          @rename="handleRenameConversation"
          @search="handleSearchConversations"
        />
      </div>

      <!-- Center Panel: Chat Area -->
      <div class="center-panel">
        <MarketingChatArea
          :conversation-id="currentConversationId"
          :conversation-title="currentConversationTitle"
          @message-sent="handleMessageSent"
          @messages-loaded="handleMessagesLoaded"
          @plan-submitted="handlePlanSubmitted"
          @preview-update="handlePreviewUpdate"
        />
      </div>

      <!-- Right Panel: Plan Preview -->
      <div v-show="rightPanelVisible" class="right-panel">
        <MarketingPlanPreview
          :plan="currentPlan"
          :loading="planLoading"
          :mermaid-code="previewMermaidCode"
          :bpmn-xml="previewBpmnXml"
        />
      </div>

      <!-- Panel Toggle Buttons -->
      <button class="panel-toggle left-toggle" @click="toggleLeftPanel" :title="leftPanelVisible ? '隐藏会话列表' : '显示会话列表'">
        <LeftOutlined v-if="leftPanelVisible" />
        <RightOutlined v-else />
      </button>
      <button class="panel-toggle right-toggle" @click="toggleRightPanel" :title="rightPanelVisible ? '隐藏方案预览' : '显示方案预览'">
        <RightOutlined v-if="rightPanelVisible" />
        <LeftOutlined v-else />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import MarketingConversationList from '../components/MarketingConversationList.vue'
import MarketingChatArea from '../components/MarketingChatArea.vue'
import MarketingPlanPreview from '../components/MarketingPlanPreview.vue'
import { chatApiService, type ChatConversation } from '../services/chatApiService'
import { marketingPlanApiService, type MarketingPlan } from '../services/marketingPlanApiService'

// Panel visibility state
const leftPanelVisible = ref(true)
const rightPanelVisible = ref(true)

const toggleLeftPanel = () => {
  leftPanelVisible.value = !leftPanelVisible.value
}

const toggleRightPanel = () => {
  rightPanelVisible.value = !rightPanelVisible.value
}

// Conversation state
const conversations = ref<ChatConversation[]>([])
const currentConversationId = ref<string | null>(null)
const conversationsLoading = ref(false)
const searchKeyword = ref('')

// Marketing plan state
const currentPlan = ref<MarketingPlan | null>(null)
const planLoading = ref(false)

// Preview data state
const previewMermaidCode = ref<string>('')
const previewBpmnXml = ref<string>('')

// Preview update data interface
interface PreviewUpdateData {
  type: 'plan' | 'audience' | 'reachStrategy' | 'bpmnFlow' | 'report'
  planData?: any
  audienceData?: any
  reachStrategyMermaid?: string
  bpmnXml?: string
  reportData?: any
}

// Load conversations
const loadConversations = async () => {
  conversationsLoading.value = true
  try {
    const response = await chatApiService.listConversations(1, 50)
    conversations.value = response.data

    // Auto-select the first conversation if exists, or create one
    if (conversations.value.length > 0 && conversations.value[0]) {
      currentConversationId.value = conversations.value[0].id
    } else {
      // No conversations exist, create a new one
      await handleCreateConversation()
    }
  } catch (error: any) {
    console.error('Failed to load conversations:', error)
    message.error('加载会话列表失败: ' + error.message)
  } finally {
    conversationsLoading.value = false
  }
}

// Load marketing plan for current conversation
const loadMarketingPlan = async (conversationId: string) => {
  planLoading.value = true
  try {
    // getPlanByConversation 返回 null 表示方案不存在（正常情况）
    const plan = await marketingPlanApiService.getPlanByConversation(conversationId)
    currentPlan.value = plan
  } catch (error: any) {
    // 只有真正的错误才记录日志和显示消息
    console.error('Failed to load marketing plan:', error)
    message.error('加载营销方案失败: ' + error.message)
    currentPlan.value = null
  } finally {
    planLoading.value = false
  }
}

// Watch for conversation changes and load plan
watch(currentConversationId, async (newId) => {
  if (newId) {
    await loadMarketingPlan(newId)
  } else {
    currentPlan.value = null
  }
})

// Handle conversation selection
const handleSelectConversation = async (id: string) => {
  currentConversationId.value = id
}

// Handle conversation creation
const handleCreateConversation = async () => {
  try {
    const newConversation = await chatApiService.createConversation('新营销项目')
    conversations.value.unshift(newConversation)
    currentConversationId.value = newConversation.id
    message.success('创建会话成功')
  } catch (error: any) {
    console.error('Failed to create conversation:', error)
    message.error('创建会话失败: ' + error.message)
  }
}

// Handle conversation deletion
const handleDeleteConversation = async (id: string) => {
  try {
    await chatApiService.deleteConversation(id)
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (currentConversationId.value === id) {
      currentConversationId.value = conversations.value[0]?.id || null
    }
    message.success('删除会话成功')
  } catch (error: any) {
    console.error('Failed to delete conversation:', error)
    message.error('删除会话失败: ' + error.message)
  }
}

// Handle conversation rename
const handleRenameConversation = async (id: string, title: string) => {
  try {
    await chatApiService.updateConversation(id, title)
    const conversation = conversations.value.find(c => c.id === id)
    if (conversation) {
      conversation.title = title
    }
    message.success('重命名成功')
  } catch (error: any) {
    console.error('Failed to rename conversation:', error)
    message.error('重命名失败: ' + error.message)
  }
}

// Handle conversation search
const handleSearchConversations = (keyword: string) => {
  searchKeyword.value = keyword
  // TODO: Implement search filtering
}

// Get current conversation title
const currentConversationTitle = computed(() => {
  const conversation = conversations.value.find(c => c.id === currentConversationId.value)
  return conversation?.title || '新营销项目'
})

// Handle message sent
const handleMessageSent = (messageText: string) => {
  console.log('Message sent:', messageText)
  // Could update conversation list, plan preview, etc.
}

// Handle messages loaded
const handleMessagesLoaded = (count: number) => {
  console.log(`Loaded ${count} messages`)
}

// Handle plan submitted - reload the plan from backend
const handlePlanSubmitted = async () => {
  console.log('Plan submitted, reloading from backend...')
  if (currentConversationId.value) {
    await loadMarketingPlan(currentConversationId.value)
  }
}

// Handle preview update events from chat area
const handlePreviewUpdate = (data: PreviewUpdateData) => {
  console.log('Preview update:', data.type, data)

  switch (data.type) {
    case 'plan':
      // Plan data is handled via handlePlanSubmitted and loadMarketingPlan
      break
    case 'audience':
      // Could update audience info in preview if needed
      break
    case 'reachStrategy':
      // Update mermaid flowchart for reach strategy
      if (data.reachStrategyMermaid) {
        previewMermaidCode.value = data.reachStrategyMermaid
      }
      break
    case 'bpmnFlow':
      // Update BPMN XML for execution flow
      if (data.bpmnXml) {
        previewBpmnXml.value = data.bpmnXml
      }
      break
    case 'report':
      // Could show report data in preview
      break
  }
}

// Initialize
onMounted(() => {
  loadConversations()
})
</script>

<style scoped>
.marketing-agent-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
}

.page-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

/* Left Panel */
.left-panel {
  width: 240px;
  min-width: 240px;
  background-color: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* Center Panel */
.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
  overflow: hidden;
}

/* Right Panel */
.right-panel {
  width: 600px;
  min-width: 360px;
  background-color: #fff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* Panel Toggle Buttons */
.panel-toggle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
}

.panel-toggle:hover {
  background-color: #f5f5f5;
  border-color: #40a9ff;
  color: #40a9ff;
}

.left-toggle {
  left: 240px;
  border-left: none;
  transition: left 0.3s ease;
}

.right-toggle {
  right: 600px;
  border-right: none;
  border-radius: 4px 0 0 4px;
  transition: right 0.3s ease;
}

/* Collapsed States */
.page-container.left-collapsed .left-toggle {
  left: 0;
}

.page-container.right-collapsed .right-toggle {
  right: 0;
}

/* Placeholder Styling */
.panel-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  padding: 24px;
  text-align: center;
}

.panel-placeholder h2 {
  color: #666;
  margin-bottom: 8px;
}

/* Responsive Design */
@media (max-width: 1400px) {
  .left-panel {
    width: 200px;
    min-width: 200px;
  }

  .left-toggle {
    left: 200px;
  }

  .page-container.left-collapsed .left-toggle {
    left: 0;
  }

  .right-panel {
    width: 300px;
    min-width: 300px;
  }

  .right-toggle {
    right: 300px;
  }

  .page-container.right-collapsed .right-toggle {
    right: 0;
  }
}

@media (max-width: 1200px) {
  .right-panel {
    position: absolute;
    right: 0;
    height: 100%;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    z-index: 5;
  }
}

@media (max-width: 992px) {
  .left-panel {
    position: absolute;
    left: 0;
    height: 100%;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    z-index: 5;
  }

  .center-panel {
    width: 100%;
  }

  .panel-toggle {
    display: none;
  }
}
</style>
