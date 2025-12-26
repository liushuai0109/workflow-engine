<template>
  <div class="marketing-chat-area">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="header-content">
        <span class="chat-icon">💼</span>
        <span class="chat-title">{{ conversationTitle || '营销智能体' }}</span>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" ref="messagesContainer">
      <!-- Welcome Message -->
      <div v-if="messages.length === 0 && !loading && conversationId" class="welcome-message">
        <div class="welcome-icon">👋</div>
        <div class="welcome-text">欢迎使用营销智能体</div>
        <div class="welcome-subtitle">
          我可以帮你规划营销活动、选择目标人群、制定营销策略
        </div>
        <div class="welcome-examples">
          <div class="example-item" @click="sendExampleMessage('我想策划一个双十一促销活动')">
            💡 策划双十一促销活动
          </div>
          <div class="example-item" @click="sendExampleMessage('帮我分析目标用户群体')">
            👥 分析目标用户群体
          </div>
          <div class="example-item" @click="sendExampleMessage('制定社交媒体营销策略')">
            📱 社交媒体营销策略
          </div>
        </div>
      </div>

      <!-- No Conversation Selected -->
      <div v-if="!conversationId && !loading" class="no-conversation-message">
        <div class="no-conversation-icon">💬</div>
        <div class="no-conversation-text">请先创建或选择一个会话</div>
        <div class="no-conversation-subtitle">
          点击左侧的"新建会话"按钮开始对话
        </div>
      </div>

      <!-- Messages -->
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message"
        :class="message.role"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content">
          <!-- Streaming Message -->
          <div v-if="message.isStreaming" class="streaming-content">
            <!-- Progress Logs -->
            <div v-if="message.progressLogs && message.progressLogs.length > 0" class="progress-logs">
              <div v-for="(log, logIndex) in message.progressLogs" :key="logIndex" class="log-item">
                {{ log }}
              </div>
            </div>
            <!-- Loading Indicator -->
            <div class="streaming-indicator">
              <a-spin size="small" />
              <span class="loading-text">AI 正在生成...</span>
            </div>
            <!-- Partial Content -->
            <div v-if="message.content" class="markdown-content">
              <div v-html="renderMarkdown(message.content)"></div>
            </div>
          </div>

          <!-- Complete Message -->
          <div v-else>
            <!-- Progress Logs -->
            <div v-if="message.progressLogs && message.progressLogs.length > 0" class="progress-logs">
              <div v-for="(log, logIndex) in message.progressLogs" :key="logIndex" class="log-item">
                {{ log }}
              </div>
            </div>
            <!-- Message Content -->
            <div v-if="message.role === 'assistant' && !message.hasForm" class="markdown-content">
              <div v-html="renderMarkdown(message.content)"></div>
            </div>
            <div v-else class="text-content">
              {{ message.content }}
            </div>

            <!-- Embedded Form (if present) -->
            <div v-if="message.hasForm && message.formData" class="embedded-form">
              <MarketingPlanForm
                :message-id="message.messageId || `msg-${index}`"
                :initial-data="message.formData"
                :disabled="message.formSubmitted"
                @submit="handleFormSubmit(index, $event)"
              />
            </div>

            <!-- Embedded Audience Selector (if present) -->
            <div v-if="message.hasAudienceSelector && message.audienceData" class="embedded-selector">
              <AudienceSelector
                :message-id="message.messageId || `msg-${index}`"
                :audiences="message.audienceData.audiences"
                :initial-selected="message.audienceData.selected"
                :disabled="message.audienceSelected"
                @select="handleAudienceSelect(index, $event)"
                @create-new="handleCreateNewAudience"
              />
            </div>

            <!-- Embedded Audience Recommendation (if present) -->
            <div v-if="message.hasAudienceRecommendation && message.recommendationData" class="embedded-recommendation">
              <AudienceRecommendation
                :message-id="message.messageId || `msg-${index}`"
                :recommendation="message.recommendationData"
                :disabled="message.recommendationData.confirmed"
                @confirm="handleRecommendationConfirm(index, $event)"
                @update-value-tags="handleUpdateValueTags(index, $event)"
                @update-profile-tags="handleUpdateProfileTags(index, $event)"
              />
            </div>

            <!-- Embedded Flow Chart (if present) -->
            <div v-if="message.hasFlowChart && message.flowChartData" class="embedded-flowchart">
              <MarketingFlowChart
                :message-id="message.messageId || `msg-${index}`"
                :flow-data="message.flowChartData"
                :disabled="message.flowChartConfirmed"
                @confirm="handleFlowChartConfirm(index)"
              />
            </div>

            <!-- Embedded Reach Strategy Chart (Step 5) -->
            <div v-if="message.hasReachStrategy && message.reachStrategyData" class="embedded-reach-strategy">
              <ReachStrategyChart
                :message-id="message.messageId || `msg-${index}`"
                :data="message.reachStrategyData"
                :disabled="message.reachStrategyData.confirmed"
                @confirm="handleReachStrategyConfirm(index, $event)"
              />
            </div>

            <!-- Embedded Product Config Form (Step 6) -->
            <div v-if="message.hasProductConfig && message.productConfigData" class="embedded-product-config">
              <ProductConfigForm
                :message-id="message.messageId || `msg-${index}`"
                :data="message.productConfigData"
                :disabled="message.productConfigData.confirmed"
                @confirm="handleProductConfigConfirm(index, $event)"
              />
            </div>

            <!-- Embedded Smart Strategy Display (Step 7) -->
            <div v-if="message.hasSmartStrategy && message.smartStrategyData" class="embedded-smart-strategy">
              <SmartStrategyDisplay
                :message-id="message.messageId || `msg-${index}`"
                :data="message.smartStrategyData"
                :disabled="message.smartStrategyData.confirmed"
                @confirm="handleSmartStrategyConfirm(index, $event)"
              />
            </div>

            <!-- Embedded Channel Selector (Step 8) -->
            <div v-if="message.hasChannelSelector && message.channelSelectorData" class="embedded-channel-selector">
              <ChannelSelector
                :message-id="message.messageId || `msg-${index}`"
                :channels="message.channelSelectorData.channels"
                :selected-channels="message.channelSelectorData.selectedChannels"
                :disabled="message.channelSelectorData.confirmed"
                :confirmed="message.channelSelectorData.confirmed"
                @confirm="handleChannelSelectorConfirm(index, $event)"
              />
            </div>

            <!-- Embedded Channel Copy Editor (Step 9) -->
            <div v-if="message.hasChannelCopy && message.channelCopyData" class="embedded-channel-copy">
              <ChannelCopyEditor
                :message-id="message.messageId || `msg-${index}`"
                :data="message.channelCopyData"
                :disabled="message.channelCopyData.confirmed"
                @confirm="handleChannelCopyConfirm(index, $event)"
              />
            </div>

            <!-- Embedded BPMN Flow Chart (Step 10) -->
            <div v-if="message.hasBpmnFlow && message.bpmnFlowData" class="embedded-bpmn-flow">
              <BpmnFlowChart
                :message-id="message.messageId || `msg-${index}`"
                :data="message.bpmnFlowData"
                :disabled="message.bpmnFlowData.confirmed"
                @confirm="handleBpmnFlowConfirm(index, $event)"
                @preview="handleBpmnPreview"
              />
            </div>

            <!-- Embedded Campaign Report (Step 11) -->
            <div v-if="message.hasCampaignReport && message.campaignReportData" class="embedded-campaign-report">
              <CampaignReport
                :message-id="message.messageId || `msg-${index}`"
                :data="message.campaignReportData"
                @export="handleCampaignReportExport"
                @share="handleCampaignReportShare"
              />
            </div>
          </div>

          <!-- Timestamp -->
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- Loading indicator at bottom -->
      <div v-if="loading && messages.length === 0" class="loading-placeholder">
        <a-spin />
        <span>加载消息...</span>
      </div>
    </div>

    <!-- Input Area -->
    <div class="chat-input-area">
      <div class="input-wrapper">
        <a-textarea
          v-model:value="inputMessage"
          @pressEnter="handlePressEnter"
          :placeholder="conversationId ? '输入您的营销需求...' : '请先创建或选择一个会话'"
          :auto-size="{ minRows: 1, maxRows: 6 }"
          :disabled="isSending || !conversationId"
          ref="textareaRef"
        />
        <a-button
          @click="sendMessage"
          type="primary"
          shape="circle"
          size="large"
          :disabled="!canSend || !conversationId"
          :loading="isSending"
          title="发送 (Enter)"
        >
          <template #icon>
            <SendOutlined />
          </template>
        </a-button>
      </div>
      <div class="input-hint" v-if="conversationId">
        按 Enter 发送，Shift + Enter 换行
      </div>
      <div class="input-hint no-conversation-hint" v-else>
        请先在左侧创建或选择一个会话
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { SendOutlined } from '@ant-design/icons-vue'
import { renderMarkdown } from '../utils/markdown'
import { chatApiService, type ChatMessage } from '../services/chatApiService'
import { createMarketingAgentService, type MarketingAgentService } from '../services/marketingAgentService'
import { parseLLMResponse, extractMessageText, getDefaultMessageForType } from '../utils/llmResponseParser'
import type {
  LLMResponse,
  LLMResponseType,
  AudienceSelectorData,
  AudienceRecommendationData,
  LLMReachStrategyData,
  LLMProductConfigData,
  LLMSmartStrategyData,
  LLMChannelSelectorData,
  LLMChannelCopyData,
  LLMBpmnFlowData,
  LLMCampaignReportData
} from '../types/llmResponse'
import { marketingPlanApiService, type CreateMarketingPlanRequest } from '../services/marketingPlanApiService'
import MarketingPlanForm from './MarketingPlanForm.vue'
import AudienceSelector from './AudienceSelector.vue'
import AudienceRecommendation from './AudienceRecommendation.vue'
import MarketingFlowChart from './MarketingFlowChart.vue'
import ReachStrategyChart from './ReachStrategyChart.vue'
import ProductConfigForm from './ProductConfigForm.vue'
import SmartStrategyDisplay from './SmartStrategyDisplay.vue'
import ChannelSelector from './ChannelSelector.vue'
import ChannelCopyEditor from './ChannelCopyEditor.vue'
import BpmnFlowChart from './BpmnFlowChart.vue'
import CampaignReport from './CampaignReport.vue'
import { useMarketingPlanForm, type MarketingPlanFormData, channelOptions } from '../composables/useMarketingPlanForm'
import { useConversationFlow, type ConversationStep } from '../composables/useConversationFlow'
import type { ReachStrategyData } from './ReachStrategyChart.vue'
import type { ProductConfigData } from './ProductConfigForm.vue'
import type { SmartStrategyData } from './SmartStrategyDisplay.vue'
import type { ChannelCopyData } from './ChannelCopyEditor.vue'
import type { BpmnFlowData } from './BpmnFlowChart.vue'
import type { CampaignReportData } from './CampaignReport.vue'

interface Audience {
  id: string
  name: string
  description: string
  size: number
}

interface AudienceData {
  audiences: Audience[]
  selected: string | null
}

interface RecommendationData {
  audienceId: string
  audienceName: string
  size: number
  marketShare: number
  conversionRate: number
  valueTags: string[]
  profileTags: string[]
  confirmed: boolean
}

interface FlowChartData {
  title: string
  awarenessChannels: string[]
  interestActions: string[]
  conversionActions: string[]
  retentionActions: string[]
  metrics?: {
    expectedReach: number
    expectedConversion: number
    duration: string
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  progressLogs?: string[]
  isStreaming?: boolean
  formData?: MarketingPlanFormData
  hasForm?: boolean
  formSubmitted?: boolean
  hasAudienceSelector?: boolean
  audienceData?: AudienceData
  audienceSelected?: boolean
  hasAudienceRecommendation?: boolean
  recommendationData?: RecommendationData
  hasFlowChart?: boolean
  flowChartData?: FlowChartData
  flowChartConfirmed?: boolean
  messageId?: string
  // Step 5: Reach Strategy
  hasReachStrategy?: boolean
  reachStrategyData?: ReachStrategyData
  // Step 6: Product Config
  hasProductConfig?: boolean
  productConfigData?: ProductConfigData
  // Step 7: Smart Strategy
  hasSmartStrategy?: boolean
  smartStrategyData?: SmartStrategyData
  // Step 8: Channel Selector
  hasChannelSelector?: boolean
  channelSelectorData?: { channels: string[]; selectedChannels: string[]; confirmed: boolean }
  // Step 9: Channel Copy
  hasChannelCopy?: boolean
  channelCopyData?: ChannelCopyData
  // Step 10: BPMN Flow
  hasBpmnFlow?: boolean
  bpmnFlowData?: BpmnFlowData
  // Step 11: Campaign Report
  hasCampaignReport?: boolean
  campaignReportData?: CampaignReportData
}

interface Props {
  conversationId: string | null
  conversationTitle?: string
}

interface Emits {
  (e: 'messageSent', message: string): void
  (e: 'messagesLoaded', count: number): void
  (e: 'planSubmitted', planData: MarketingPlanFormData): void
  (e: 'previewUpdate', data: PreviewUpdateData): void
}

// Preview update data for right panel
interface PreviewUpdateData {
  type: 'plan' | 'audience' | 'reachStrategy' | 'bpmnFlow' | 'report'
  planData?: MarketingPlanFormData
  audienceData?: RecommendationData
  reachStrategyMermaid?: string
  bpmnXml?: string
  reportData?: CampaignReportData
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Use the form composable for parsing
const { parseAIResponse, getEmptyFormData } = useMarketingPlanForm()

// Use conversation flow composable for step management
const conversationFlow = useConversationFlow()

// Marketing Agent LLM Service
let marketingAgent: MarketingAgentService | null = null

// Initialize marketing agent when conversation changes
const initMarketingAgent = () => {
  marketingAgent = createMarketingAgentService({
    conversationId: props.conversationId || undefined,
    onProgress: (log: string) => {
      // Update progress logs in the current streaming message
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage?.isStreaming) {
        if (!lastMessage.progressLogs) {
          lastMessage.progressLogs = []
        }
        lastMessage.progressLogs.push(log)
      }
    }
  })
}

// State
const inputMessage = ref('')
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement>()
const textareaRef = ref<any>()
const loading = ref(false)
const isSending = ref(false)

// Computed
const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && !isSending.value
})

// Load messages when conversation changes
watch(() => props.conversationId, async (newId) => {
  if (newId) {
    await loadMessages(newId)
  } else {
    messages.value = []
  }
}, { immediate: true })

// Load messages from backend
const loadMessages = async (conversationId: string) => {
  loading.value = true
  try {
    const response = await chatApiService.getConversation(conversationId)
    const chatMessages = response.data.messages || []

    messages.value = chatMessages.map((msg: ChatMessage) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.createdAt),
      progressLogs: msg.metadata?.progressLogs,
      isStreaming: false,
      hasForm: msg.metadata?.hasForm || false,
      formData: msg.metadata?.formData,
      formSubmitted: msg.metadata?.formSubmitted || false,
      hasAudienceSelector: msg.metadata?.hasAudienceSelector || false,
      audienceData: msg.metadata?.audienceData,
      audienceSelected: msg.metadata?.audienceSelected || false,
      hasAudienceRecommendation: msg.metadata?.hasAudienceRecommendation || false,
      recommendationData: msg.metadata?.recommendationData,
      hasFlowChart: msg.metadata?.hasFlowChart || false,
      flowChartData: msg.metadata?.flowChartData,
      flowChartConfirmed: msg.metadata?.flowChartConfirmed || false,
      messageId: msg.metadata?.messageId || msg.id
    }))

    emit('messagesLoaded', messages.value.length)
    await scrollToBottom()
  } catch (error: any) {
    console.error('Failed to load messages:', error)
    antMessage.error('加载消息失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// Send message
const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || !props.conversationId) return

  // Clear input
  inputMessage.value = ''
  isSending.value = true

  try {
    // Add user message to UI
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
      isStreaming: false
    }
    messages.value.push(userMessage)
    await scrollToBottom()

    // Save user message to backend
    await chatApiService.addMessage(props.conversationId, {
      role: 'user',
      content: text
    })

    // Add streaming AI message placeholder
    const aiMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      progressLogs: [],
      isStreaming: true
    }
    messages.value.push(aiMessage)
    await scrollToBottom()

    // Call Marketing Agent LLM to analyze user message
    await callMarketingAgentLLM(aiMessage, text)

    emit('messageSent', text)
  } catch (error: any) {
    console.error('Failed to send message:', error)
    antMessage.error('发送消息失败: ' + error.message)
    // Remove the AI message if it failed
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage?.isStreaming) {
      messages.value.pop()
    }
  } finally {
    isSending.value = false
  }
}

// Call Marketing Agent LLM to analyze user message and generate response
const callMarketingAgentLLM = async (aiMessage: Message, userMessage: string) => {
  if (!props.conversationId) return

  // Initialize marketing agent if not exists
  if (!marketingAgent) {
    initMarketingAgent()
  }

  // Set initial progress
  aiMessage.progressLogs = []
  await scrollToBottom()

  try {
    // Call the real LLM service
    const response = await marketingAgent!.sendMessage(userMessage)

    if (response.success) {
      // Use the LLM response processor
      await processLLMResponse(aiMessage, response.content)
    } else {
      // LLM call failed, show error message
      aiMessage.content = `抱歉，处理您的请求时出现了问题：${response.error || '未知错误'}\n\n请稍后重试。`
      aiMessage.isStreaming = false
      aiMessage.progressLogs = []
      await scrollToBottom()
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    console.error('Marketing Agent LLM error:', error)

    // Show error to user
    aiMessage.content = `抱歉，处理您的请求时出现了问题：${errorMessage}\n\n请稍后重试。`
    aiMessage.isStreaming = false
    aiMessage.progressLogs = []
    await scrollToBottom()
  }
}

/**
 * Process LLM response and update message with appropriate component data
 * This method parses the LLM response and renders the corresponding UI component
 */
const processLLMResponse = async (aiMessage: Message, rawResponse: string) => {
  if (!props.conversationId) return

  // Parse the LLM response
  const parseResult = parseLLMResponse(rawResponse)

  aiMessage.messageId = `msg-${Date.now()}`

  if (!parseResult.success || !parseResult.response) {
    // Parsing failed - show raw content as text
    aiMessage.content = rawResponse
    aiMessage.isStreaming = false
    console.warn('LLM response parsing failed:', parseResult.error)
    await scrollToBottom()
    await saveLLMMessage(aiMessage, { parseError: parseResult.error })
    return
  }

  const llmResponse = parseResult.response
  const displayMessage = llmResponse.message || getDefaultMessageForType(llmResponse.responseType)

  // Extract clean text (without JSON blocks) for display
  const cleanContent = extractMessageText(rawResponse)
  aiMessage.content = cleanContent || displayMessage

  // Process based on response type
  switch (llmResponse.responseType) {
    case 'plan_form':
      await handlePlanFormResponse(aiMessage, llmResponse)
      break

    case 'audience_selector':
      await handleAudienceSelectorResponse(aiMessage, llmResponse)
      break

    case 'audience_recommendation':
      await handleAudienceRecommendationResponse(aiMessage, llmResponse)
      break

    case 'reach_strategy':
      await handleReachStrategyResponse(aiMessage, llmResponse)
      break

    case 'product_config':
      await handleProductConfigResponse(aiMessage, llmResponse)
      break

    case 'smart_strategy':
      await handleSmartStrategyResponse(aiMessage, llmResponse)
      break

    case 'channel_selector':
      await handleChannelSelectorResponse(aiMessage, llmResponse)
      break

    case 'channel_copy':
      await handleChannelCopyResponse(aiMessage, llmResponse)
      break

    case 'bpmn_flow':
      await handleBpmnFlowResponse(aiMessage, llmResponse)
      break

    case 'campaign_report':
      await handleCampaignReportResponse(aiMessage, llmResponse)
      break

    case 'text':
    default:
      // Pure text response - content is already set
      break
  }

  // Clear progress logs after processing is complete
  aiMessage.progressLogs = []
  aiMessage.isStreaming = false
  await scrollToBottom()

  // Save to backend with metadata
  await saveLLMMessage(aiMessage, { responseType: llmResponse.responseType })
}

// Helper function to save LLM message to backend
const saveLLMMessage = async (aiMessage: Message, extraMetadata: Record<string, unknown> = {}) => {
  if (!props.conversationId) return

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: aiMessage.content,
      metadata: {
        progressLogs: aiMessage.progressLogs,
        messageId: aiMessage.messageId,
        hasForm: aiMessage.hasForm,
        formData: aiMessage.formData,
        formSubmitted: aiMessage.formSubmitted,
        hasAudienceSelector: aiMessage.hasAudienceSelector,
        audienceData: aiMessage.audienceData,
        audienceSelected: aiMessage.audienceSelected,
        hasAudienceRecommendation: aiMessage.hasAudienceRecommendation,
        recommendationData: aiMessage.recommendationData,
        hasReachStrategy: aiMessage.hasReachStrategy,
        reachStrategyData: aiMessage.reachStrategyData,
        hasProductConfig: aiMessage.hasProductConfig,
        productConfigData: aiMessage.productConfigData,
        hasSmartStrategy: aiMessage.hasSmartStrategy,
        smartStrategyData: aiMessage.smartStrategyData,
        hasChannelSelector: aiMessage.hasChannelSelector,
        channelSelectorData: aiMessage.channelSelectorData,
        hasChannelCopy: aiMessage.hasChannelCopy,
        channelCopyData: aiMessage.channelCopyData,
        hasBpmnFlow: aiMessage.hasBpmnFlow,
        bpmnFlowData: aiMessage.bpmnFlowData,
        hasCampaignReport: aiMessage.hasCampaignReport,
        campaignReportData: aiMessage.campaignReportData,
        ...extraMetadata
      }
    })
  } catch (error) {
    console.error('Failed to save LLM message:', error)
  }
}

// Handler for plan_form response type
const handlePlanFormResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const formData = llmResponse.data as MarketingPlanFormData

  // Also try to parse using existing parser for backwards compatibility
  const legacyParseResult = parseAIResponse(aiMessage.content)

  if (formData || legacyParseResult.success) {
    aiMessage.hasForm = true
    aiMessage.formData = formData || legacyParseResult.data
    aiMessage.formSubmitted = false
    console.log('Plan form data processed:', aiMessage.formData)
  } else {
    aiMessage.hasForm = false
    console.warn('Failed to parse plan form data')
  }
}

// Handler for audience_selector response type
const handleAudienceSelectorResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as AudienceSelectorData

  aiMessage.hasAudienceSelector = true
  aiMessage.audienceData = {
    audiences: data.audiences || [],
    selected: data.selected || null
  }
  aiMessage.audienceSelected = false
  console.log('Audience selector data processed:', aiMessage.audienceData)
}

// Handler for audience_recommendation response type
const handleAudienceRecommendationResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as AudienceRecommendationData

  aiMessage.hasAudienceRecommendation = true
  aiMessage.recommendationData = {
    audienceId: data.audienceId,
    audienceName: data.audienceName,
    size: data.size,
    marketShare: data.marketShare,
    conversionRate: data.conversionRate,
    valueTags: data.valueTags || [],
    profileTags: data.profileTags || [],
    confirmed: false
  }
  console.log('Audience recommendation data processed:', aiMessage.recommendationData)
}

// Handler for reach_strategy response type
const handleReachStrategyResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMReachStrategyData

  aiMessage.hasReachStrategy = true
  aiMessage.reachStrategyData = {
    mermaidCode: data.mermaidCode || '',
    stages: data.stages || [],
    confirmed: false
  }
  console.log('Reach strategy data processed:', aiMessage.reachStrategyData)
}

// Handler for product_config response type
const handleProductConfigResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMProductConfigData

  aiMessage.hasProductConfig = true
  aiMessage.productConfigData = {
    products: data.products || [],
    coupons: data.coupons || [],
    benefits: data.benefits || [],
    confirmed: false
  }
  console.log('Product config data processed:', aiMessage.productConfigData)
}

// Handler for smart_strategy response type
const handleSmartStrategyResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMSmartStrategyData

  aiMessage.hasSmartStrategy = true
  aiMessage.smartStrategyData = {
    strategyName: data.strategyName,
    description: data.description,
    rules: data.rules || [],
    expectedConversion: data.expectedConversion,
    confirmed: false
  }
  console.log('Smart strategy data processed:', aiMessage.smartStrategyData)
}

// Handler for channel_selector response type
const handleChannelSelectorResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMChannelSelectorData

  aiMessage.hasChannelSelector = true
  aiMessage.channelSelectorData = {
    channels: data.channels || [],
    selectedChannels: data.selectedChannels || [],
    confirmed: false
  }
  console.log('Channel selector data processed:', aiMessage.channelSelectorData)
}

// Handler for channel_copy response type
const handleChannelCopyResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMChannelCopyData

  aiMessage.hasChannelCopy = true
  aiMessage.channelCopyData = {
    copies: data.copies || [],
    confirmed: false
  }
  console.log('Channel copy data processed:', aiMessage.channelCopyData)
}

// Handler for bpmn_flow response type
const handleBpmnFlowResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMBpmnFlowData

  aiMessage.hasBpmnFlow = true
  aiMessage.bpmnFlowData = {
    nodes: data.nodes || [],
    connections: data.connections || [],
    summary: data.summary || { estimatedReach: 0, duration: '', automatedNodes: 0, manualNodes: 0 },
    bpmnXml: data.bpmnXml || '',
    confirmed: false
  }
  console.log('BPMN flow data processed:', aiMessage.bpmnFlowData)
}

// Handler for campaign_report response type
const handleCampaignReportResponse = async (aiMessage: Message, llmResponse: LLMResponse) => {
  const data = llmResponse.data as LLMCampaignReportData

  aiMessage.hasCampaignReport = true
  aiMessage.campaignReportData = {
    campaignId: data.campaignId,
    campaignName: data.campaignName,
    status: data.status,
    timeline: data.timeline,
    metrics: data.metrics || [],
    channelPerformance: data.channelPerformance || [],
    insights: data.insights || [],
    recommendations: data.recommendations || []
  }
  console.log('Campaign report data processed:', aiMessage.campaignReportData)
}

// Handle form submission
const handleFormSubmit = async (messageIndex: number, formData: MarketingPlanFormData) => {
  console.log('handleFormSubmit: Called with index', messageIndex)

  const message = messages.value[messageIndex]
  if (!message) {
    console.error('handleFormSubmit: Message not found at index', messageIndex)
    return
  }
  if (!props.conversationId) {
    console.error('handleFormSubmit: No conversationId')
    return
  }

  console.log('handleFormSubmit: Marking form as submitted')

  // Mark form as submitted
  message.formSubmitted = true
  message.formData = formData

  // Convert form data to plan format and save to backend
  try {
    console.log('handleFormSubmit: Saving plan to backend...')

    // Convert channels from values to proper format
    const channels = formData.channels.map(channelValue => {
      const option = channelOptions.find(o => o.value === channelValue)
      return {
        name: option?.label || channelValue,
        type: (channelValue.includes('offline') ? 'offline' : 'online') as 'online' | 'offline',
        priority: 'medium' as 'high' | 'medium' | 'low'
      }
    })

    // Convert strategies from newline-separated to array
    const strategies = formData.strategies.split('\n').filter(Boolean).map((strategyText, index) => ({
      name: strategyText.trim(),
      channel: channels[index % channels.length]?.name || 'unknown',
      approach: strategyText.trim()
    }))

    // Convert target audience from comma-separated to segments array
    const segments = formData.targetAudience.split(/[,，]/).map(s => s.trim()).filter(Boolean)

    const planData: CreateMarketingPlanRequest = {
      conversationId: props.conversationId,
      title: formData.title,
      timeline: {
        startDate: formData.dateRange[0],
        endDate: formData.dateRange[1]
      },
      objectives: {
        primary: formData.objectives
      },
      channels,
      targetAudience: {
        segments
      },
      strategies
    }

    await marketingPlanApiService.createPlan(planData)
    console.log('handleFormSubmit: Plan saved successfully')
  } catch (error: any) {
    console.error('handleFormSubmit: Failed to save plan:', error)
    // Show warning but don't block the flow
    antMessage.warning('方案保存到后端失败，但流程继续: ' + error.message)
  }

  // Emit event to parent (for updating preview panel)
  emit('planSubmitted', formData)
  emit('previewUpdate', { type: 'plan', planData: formData })

  antMessage.success('方案已提交')

  console.log('handleFormSubmit: Calling triggerAudienceSelection')

  // Trigger next step: audience selection
  await triggerAudienceSelection()

  console.log('handleFormSubmit: Done')
}

// Trigger audience selection after form submission
const triggerAudienceSelection = async () => {
  if (!props.conversationId) {
    console.error('triggerAudienceSelection: No conversationId')
    return
  }

  console.log('triggerAudienceSelection: Starting...')

  try {
    // Add AI message with progress
    const aiMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      progressLogs: ['加载人群数据...'],
      isStreaming: true
    }
    messages.value.push(aiMessage)
    const messageIndex = messages.value.length - 1
    await scrollToBottom()

    console.log('triggerAudienceSelection: Message added, waiting 1s...')

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('triggerAudienceSelection: Setting up audience selector...')

    // Generate audience selection response
    const response = `好的，方案已收到。接下来请选择目标人群：`

    // Update the message through the reactive array ref
    const msg = messages.value[messageIndex]
    if (!msg) return
    msg.content = response
    msg.hasAudienceSelector = true
    msg.audienceData = {
      audiences: [
        { id: 'aud-1', name: '高价值会员', description: '近3个月消费>5000元，活跃度高', size: 50000 },
        { id: 'aud-2', name: '新用户', description: '注册时间<30天，未完成首购', size: 120000 },
        { id: 'aud-3', name: '流失预警用户', description: '60天未活跃，曾是高价值用户', size: 35000 }
      ],
      selected: null
    }
    msg.isStreaming = false
    msg.progressLogs = []  // Clear progress logs
    await scrollToBottom()

    console.log('triggerAudienceSelection: Audience selector set up')

    // Save to backend
    try {
      await chatApiService.addMessage(props.conversationId, {
        role: 'assistant',
        content: response,
        metadata: {
          hasAudienceSelector: true,
          audienceData: aiMessage.audienceData
        }
      })
      console.log('triggerAudienceSelection: Saved to backend')
    } catch (error) {
      console.error('triggerAudienceSelection: Failed to save to backend:', error)
    }
  } catch (error) {
    console.error('triggerAudienceSelection: Error:', error)
  }
}

// Handle audience selection
const handleAudienceSelect = async (messageIndex: number, audienceId: string) => {
  const message = messages.value[messageIndex]
  if (!message || !message.audienceData || !props.conversationId) return

  // Mark audience as selected
  message.audienceSelected = true
  message.audienceData.selected = audienceId

  const selectedAudience = message.audienceData.audiences.find(a => a.id === audienceId)
  if (!selectedAudience) return

  // Trigger next step: audience recommendation
  await triggerAudienceRecommendation(selectedAudience)
}

// Handle create new audience
const handleCreateNewAudience = () => {
  antMessage.info('新建人群功能开发中')
}

// Trigger audience recommendation after audience selection
const triggerAudienceRecommendation = async (audience: Audience) => {
  if (!props.conversationId) return

  // Add AI message with progress
  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成人群推荐...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  // Simulate loading
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Generate audience recommendation response
  const response = `已选择人群「${audience.name}」，以下是详细的人群推荐信息：`

  // Update the message through the reactive array ref
  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = response
  msg.hasAudienceRecommendation = true
  msg.recommendationData = {
    audienceId: audience.id,
    audienceName: audience.name,
    size: audience.size,
    marketShare: 15,
    conversionRate: 32,
    valueTags: ['高净值', '活跃用户'],
    profileTags: ['25-35岁', '一线城市', '白领'],
    confirmed: false
  }
  msg.isStreaming = false
  msg.progressLogs = []  // Clear progress logs
  await scrollToBottom()

  // Save to backend
  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: response,
      metadata: {
        hasAudienceRecommendation: true,
        recommendationData: msg.recommendationData
      }
    })
  } catch (error) {
    console.error('Failed to save audience recommendation message:', error)
  }
}

// Handle recommendation confirm
const handleRecommendationConfirm = async (messageIndex: number, data: RecommendationData) => {
  const message = messages.value[messageIndex]
  if (!message || !message.recommendationData || !props.conversationId) return

  // Update recommendation data
  message.recommendationData = data

  // Emit preview update for audience data
  emit('previewUpdate', { type: 'audience', audienceData: data })

  antMessage.success('人群推荐已确认')

  // Trigger next step: reach strategy (Step 5)
  await triggerReachStrategy()
}

// Trigger flowchart generation after audience recommendation
const triggerFlowChartGeneration = async () => {
  if (!props.conversationId) return

  // Add AI message with progress
  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成营销流程图...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  // Simulate loading
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Generate flowchart response
  const response = `已为您生成营销流程图（用户旅程）：`

  // Update the message through the reactive array ref
  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = response
  msg.hasFlowChart = true
  msg.flowChartData = {
    title: '营销用户旅程图',
    awarenessChannels: ['微信公众号', '抖音', '小红书', 'SEO/SEM'],
    interestActions: ['优惠券领取', '限时活动预告', '产品体验视频', 'KOL推荐'],
    conversionActions: ['新人专享优惠', '限时折扣', '满减活动', '会员专属权益'],
    retentionActions: ['会员积分系统', '专属客服', '复购优惠', '生日福利'],
    metrics: {
      expectedReach: 500000,
      expectedConversion: 25,
      duration: '11天（11月1日-11月11日）'
    }
  }
  msg.flowChartConfirmed = false
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []  // Clear progress logs
  await scrollToBottom()

  // Save to backend
  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: response,
      metadata: {
        hasFlowChart: true,
        flowChartData: msg.flowChartData,
        flowChartConfirmed: msg.flowChartConfirmed,
        messageId: msg.messageId
      }
    })
  } catch (error) {
    console.error('Failed to save flowchart message:', error)
  }
}

// Handle flowchart confirm
const handleFlowChartConfirm = async (messageIndex: number) => {
  const message = messages.value[messageIndex]
  if (!message || !message.flowChartData || !props.conversationId) return

  // Mark flowchart as confirmed
  message.flowChartConfirmed = true

  antMessage.success('营销流程图已确认')

  // Trigger next step: reach strategy (Step 5)
  await triggerReachStrategy()
}

// Trigger reach strategy (Step 5)
const triggerReachStrategy = async () => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成触达策略...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1000))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '已为您生成触达策略流程图，请查看并确认：'
  msg.hasReachStrategy = true
  msg.reachStrategyData = {
    mermaidCode: `graph TD
    A[认知阶段] --> B[兴趣阶段]
    B --> C[转化阶段]
    C --> D[留存阶段]`,
    stages: [
      {
        name: '认知阶段',
        channels: ['微信公众号', '抖音', '小红书'],
        actions: ['品牌曝光', '话题造势', 'KOL种草']
      },
      {
        name: '兴趣阶段',
        channels: ['信息流广告', '短视频'],
        actions: ['产品介绍', '优惠预告', '互动引导']
      },
      {
        name: '转化阶段',
        channels: ['短信', 'APP Push', '私域社群'],
        actions: ['限时优惠', '专属折扣', '购买引导']
      },
      {
        name: '留存阶段',
        channels: ['会员系统', '客服'],
        actions: ['复购激励', '会员权益', '满意度回访']
      }
    ],
    confirmed: false
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasReachStrategy: true, reachStrategyData: msg.reachStrategyData }
    })
  } catch (error) {
    console.error('Failed to save reach strategy message:', error)
  }
}

// Handle update value tags
const handleUpdateValueTags = (messageIndex: number, tags: string[]) => {
  const message = messages.value[messageIndex]
  if (!message || !message.recommendationData) return
  message.recommendationData.valueTags = tags
}

// Handle update profile tags
const handleUpdateProfileTags = (messageIndex: number, tags: string[]) => {
  const message = messages.value[messageIndex]
  if (!message || !message.recommendationData) return
  message.recommendationData.profileTags = tags
}

// ============ Step 5-11 Event Handlers ============

// Handle reach strategy confirm (Step 5)
const handleReachStrategyConfirm = async (messageIndex: number, data: ReachStrategyData) => {
  const message = messages.value[messageIndex]
  if (!message || !props.conversationId) return

  message.reachStrategyData = data
  conversationFlow.confirmReachStrategy(data)

  // Emit preview update with mermaid flowchart
  emit('previewUpdate', { type: 'reachStrategy', reachStrategyMermaid: data.mermaidCode })

  antMessage.success('触达策略已确认')

  // Trigger next step: product config
  await triggerProductConfig()
}

// Trigger product config (Step 6)
const triggerProductConfig = async () => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成商品配置...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 800))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '请配置活动推荐的商品、优惠券和权益：'
  msg.hasProductConfig = true
  msg.productConfigData = {
    products: [
      { id: 'p1', name: '爆款单品A', category: '美妆', price: 299, selected: true },
      { id: 'p2', name: '热销商品B', category: '服饰', price: 599, selected: false },
      { id: 'p3', name: '新品C', category: '家居', price: 199, selected: false }
    ],
    coupons: [
      { id: 'c1', name: '满200减30', discount: '减30元', conditions: '满200元可用', selected: true },
      { id: 'c2', name: '新人专享券', discount: '减50元', conditions: '新用户首单', selected: false },
      { id: 'c3', name: '会员折扣券', discount: '8折', conditions: '会员专享', selected: false }
    ],
    benefits: [
      { id: 'b1', name: '包邮服务', description: '全场满99包邮', selected: true },
      { id: 'b2', name: '极速发货', description: '24小时内发货', selected: false },
      { id: 'b3', name: '售后保障', description: '7天无理由退换', selected: false }
    ],
    confirmed: false
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasProductConfig: true, productConfigData: msg.productConfigData }
    })
  } catch (error) {
    console.error('Failed to save product config message:', error)
  }
}

// Handle product config confirm (Step 6)
const handleProductConfigConfirm = async (messageIndex: number, data: ProductConfigData) => {
  const message = messages.value[messageIndex]
  if (!message || !props.conversationId) return

  message.productConfigData = data
  conversationFlow.confirmProductConfig(data)
  antMessage.success('商品配置已确认')

  // Trigger next step: smart strategy
  await triggerSmartStrategy()
}

// Trigger smart strategy (Step 7)
const triggerSmartStrategy = async () => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['AI 生成智能策略...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1000))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '已为您生成智能营销策略，请查看并确认：'
  msg.hasSmartStrategy = true
  msg.smartStrategyData = {
    strategyName: '双十一精准触达策略',
    description: '基于用户行为数据和历史购买记录，针对不同用户群体制定个性化的触达策略，最大化转化率。',
    rules: [
      { condition: '高价值用户 + 近7天活跃', action: '推送VIP专属优惠券', priority: 1 },
      { condition: '新注册用户 + 未首购', action: '发送新人礼包', priority: 2 },
      { condition: '流失预警用户 + 30天未登录', action: '发送召回短信', priority: 3 }
    ],
    expectedConversion: 28.5,
    confirmed: false
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasSmartStrategy: true, smartStrategyData: msg.smartStrategyData }
    })
  } catch (error) {
    console.error('Failed to save smart strategy message:', error)
  }
}

// Handle smart strategy confirm (Step 7)
const handleSmartStrategyConfirm = async (messageIndex: number, data: SmartStrategyData) => {
  const message = messages.value[messageIndex]
  if (!message || !props.conversationId) return

  message.smartStrategyData = data
  conversationFlow.confirmSmartStrategy(data)
  antMessage.success('智能策略已确认')

  // Trigger next step: channel selector
  await triggerChannelSelector()
}

// Trigger channel selector (Step 8)
const triggerChannelSelector = async () => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['加载推广渠道...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 600))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '请选择本次活动的推广渠道：'
  msg.hasChannelSelector = true
  msg.channelSelectorData = {
    channels: ['wechat_official', 'wechat_mini', 'douyin', 'xiaohongshu', 'weibo', 'sms', 'email', 'app_push'],
    selectedChannels: ['wechat_official', 'douyin', 'sms'],
    confirmed: false
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasChannelSelector: true, channelSelectorData: msg.channelSelectorData }
    })
  } catch (error) {
    console.error('Failed to save channel selector message:', error)
  }
}

// Handle channel selector confirm (Step 8)
const handleChannelSelectorConfirm = async (messageIndex: number, channels: string[]) => {
  const message = messages.value[messageIndex]
  if (!message || !props.conversationId) return

  if (message.channelSelectorData) {
    message.channelSelectorData.selectedChannels = channels
    message.channelSelectorData.confirmed = true
  }
  conversationFlow.confirmChannels(channels)
  antMessage.success('推广渠道已确认')

  // Trigger next step: channel copy editor
  await triggerChannelCopyEditor(channels)
}

// Trigger channel copy editor (Step 9)
const triggerChannelCopyEditor = async (selectedChannels: string[]) => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成渠道文案...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1000))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '已为各渠道生成个性化文案，请查看并编辑：'
  msg.hasChannelCopy = true
  msg.channelCopyData = {
    copies: selectedChannels.map(channel => ({
      channel,
      title: `【双十一狂欢】限时特惠来袭！`,
      content: `亲爱的用户，双十一大促火热进行中！全场商品低至5折，更有满减优惠券等你来领。${channel === 'sms' ? '回复TD退订' : '点击链接立即抢购 >>'}`,
      imageUrl: channel !== 'sms' ? 'https://placeholder.pics/svg/300x200' : undefined
    })),
    confirmed: false
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasChannelCopy: true, channelCopyData: msg.channelCopyData }
    })
  } catch (error) {
    console.error('Failed to save channel copy message:', error)
  }
}

// Handle channel copy confirm (Step 9)
const handleChannelCopyConfirm = async (messageIndex: number, data: ChannelCopyData) => {
  const message = messages.value[messageIndex]
  if (!message || !props.conversationId) return

  message.channelCopyData = data
  conversationFlow.confirmChannelCopy(data)
  antMessage.success('渠道文案已确认')

  // Trigger next step: BPMN flow
  await triggerBpmnFlow()
}

// Trigger BPMN flow (Step 10)
const triggerBpmnFlow = async () => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成 BPMN 执行流程...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1200))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '已生成自动化执行流程，请确认后系统将自动执行：'
  msg.hasBpmnFlow = true
  msg.bpmnFlowData = {
    nodes: [
      { id: 'start', type: 'start', name: '活动开始', description: '双十一活动正式启动' },
      { id: 'timer1', type: 'timer', name: '预热期触发', description: '11月1日 00:00', config: { '触发时间': '2024-11-01 00:00' } },
      { id: 'task1', type: 'service', name: '发送预热消息', description: '向目标人群推送活动预告', config: { '渠道': '微信公众号' } },
      { id: 'gateway1', type: 'gateway', name: '用户响应判断', description: '根据用户行为分流' },
      { id: 'task2', type: 'service', name: '发送正式活动', description: '推送主活动信息', config: { '渠道': '全渠道' } },
      { id: 'task3', type: 'user', name: '人工审批', description: '活动效果确认' },
      { id: 'end', type: 'end', name: '活动结束', description: '生成复盘报告' }
    ],
    connections: [
      { from: 'start', to: 'timer1' },
      { from: 'timer1', to: 'task1' },
      { from: 'task1', to: 'gateway1' },
      { from: 'gateway1', to: 'task2', label: '已响应' },
      { from: 'task2', to: 'task3' },
      { from: 'task3', to: 'end' }
    ],
    summary: {
      estimatedReach: 500000,
      duration: '11天',
      automatedNodes: 5,
      manualNodes: 1
    },
    bpmnXml: '<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions>...</bpmn:definitions>',
    confirmed: false
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasBpmnFlow: true, bpmnFlowData: msg.bpmnFlowData }
    })
  } catch (error) {
    console.error('Failed to save BPMN flow message:', error)
  }
}

// Handle BPMN flow confirm (Step 10)
const handleBpmnFlowConfirm = async (messageIndex: number, data: BpmnFlowData) => {
  const message = messages.value[messageIndex]
  if (!message || !props.conversationId) return

  message.bpmnFlowData = data
  conversationFlow.confirmBpmn(data)

  // Emit preview update with BPMN XML
  emit('previewUpdate', { type: 'bpmnFlow', bpmnXml: data.bpmnXml })

  antMessage.success('执行流程已确认，系统开始执行！')

  // Trigger final step: show campaign report placeholder (in real scenario, this would be shown after campaign ends)
  await triggerCampaignReport()
}

// Handle BPMN preview
const handleBpmnPreview = () => {
  antMessage.info('流程预览功能开发中...')
}

// Trigger campaign report (Step 11) - Demo mode
const triggerCampaignReport = async () => {
  if (!props.conversationId) return

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    progressLogs: ['生成活动复盘报告...'],
    isStreaming: true
  }
  messages.value.push(aiMessage)
  const messageIndex = messages.value.length - 1
  await scrollToBottom()

  await new Promise(resolve => setTimeout(resolve, 1500))

  const msg = messages.value[messageIndex]
  if (!msg) return
  msg.content = '活动已执行完成！以下是活动复盘报告：'
  msg.hasCampaignReport = true
  msg.campaignReportData = {
    campaignId: 'camp-001',
    campaignName: '双十一大促销活动',
    status: 'completed',
    timeline: {
      startDate: '2024-11-01',
      endDate: '2024-11-11'
    },
    metrics: [
      { name: '总触达人数', value: 520000, target: 500000, trend: 'up', trendValue: 4 },
      { name: '点击率', value: 8.5, unit: '%', target: 5, trend: 'up', trendValue: 70 },
      { name: '转化率', value: 3.2, unit: '%', target: 2.5, trend: 'up', trendValue: 28 },
      { name: 'ROI', value: 4.8, target: 3, trend: 'up', trendValue: 60 }
    ],
    channelPerformance: [
      { channel: 'wechat_official', channelName: '微信公众号', reach: 180000, clicks: 16200, conversions: 5800, conversionRate: 3.22 },
      { channel: 'douyin', channelName: '抖音', reach: 220000, clicks: 19800, conversions: 6600, conversionRate: 3.0 },
      { channel: 'sms', channelName: '短信', reach: 120000, clicks: 9600, conversions: 4200, conversionRate: 3.5 }
    ],
    insights: [
      { type: 'success', title: '渠道表现优异', description: '抖音渠道触达量超出预期20%，建议后续活动增加该渠道投放比例。' },
      { type: 'improvement', title: '转化链路优化空间', description: '点击到加购环节流失率较高，建议优化商品详情页体验。' },
      { type: 'warning', title: '短信渠道成本较高', description: '短信渠道ROI相对较低，建议控制发送频次。' }
    ],
    recommendations: [
      { title: '增加抖音投放', description: '基于本次活动数据，建议将抖音渠道预算提升30%', priority: 'high' },
      { title: '优化落地页', description: '针对高跳出率页面进行A/B测试', priority: 'medium' },
      { title: '完善用户画像', description: '收集更多用户行为数据，优化人群圈选精准度', priority: 'low' }
    ]
  }
  msg.messageId = `msg-${Date.now()}`
  msg.isStreaming = false
  msg.progressLogs = []
  await scrollToBottom()

  try {
    await chatApiService.addMessage(props.conversationId, {
      role: 'assistant',
      content: msg.content,
      metadata: { hasCampaignReport: true, campaignReportData: msg.campaignReportData }
    })
  } catch (error) {
    console.error('Failed to save campaign report message:', error)
  }

  antMessage.success('营销活动流程全部完成！')
}

// Handle campaign report export
const handleCampaignReportExport = () => {
  antMessage.info('导出报告功能开发中...')
}

// Handle campaign report share
const handleCampaignReportShare = () => {
  antMessage.info('分享报告功能开发中...')
}

// Handle Enter key press
const handlePressEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    // Shift + Enter: new line (default behavior)
    return
  }
  // Enter: send message
  e.preventDefault()
  sendMessage()
}

// Send example message
const sendExampleMessage = (text: string) => {
  inputMessage.value = text
  sendMessage()
}

// Scroll to bottom
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Format time
const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 24) {
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } else if (hours > 0) {
    return `${hours} 小时前`
  } else if (minutes > 0) {
    return `${minutes} 分钟前`
  } else {
    return '刚刚'
  }
}

// Focus input on mount
onMounted(() => {
  if (textareaRef.value) {
    textareaRef.value.focus?.()
  }
})
</script>

<style scoped>
.marketing-chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fafafa;
}

/* Header */
.chat-header {
  height: 56px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  padding: 0 24px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-icon {
  font-size: 24px;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Welcome Message */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: #595959;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.welcome-text {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 32px;
  max-width: 400px;
}

/* No Conversation Message */
.no-conversation-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: #8c8c8c;
}

.no-conversation-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-conversation-text {
  font-size: 18px;
  font-weight: 500;
  color: #595959;
  margin-bottom: 8px;
}

.no-conversation-subtitle {
  font-size: 14px;
  color: #8c8c8c;
}

.welcome-examples {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 500px;
}

.example-item {
  padding: 16px 24px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 14px;
  color: #262626;
}

.example-item:hover {
  border-color: #1890ff;
  background: #e6f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Message */
.message {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background-color: #f0f0f0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message.user .message-content {
  background-color: #1890ff;
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px 12px 0 12px;
}

.message.assistant .message-content {
  background-color: #fff;
  padding: 12px 16px;
  border-radius: 12px 12px 12px 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Progress Logs */
.progress-logs {
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  font-size: 12px;
  color: #595959;
}

.log-item {
  padding: 2px 0;
}

.log-item::before {
  content: '▸ ';
  color: #1890ff;
}

/* Streaming Indicator */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 13px;
  color: #8c8c8c;
}

/* Content */
.text-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.markdown-content {
  line-height: 1.7;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #262626;
}

.markdown-content :deep(h1) { font-size: 20px; }
.markdown-content :deep(h2) { font-size: 18px; }
.markdown-content :deep(h3) { font-size: 16px; }

.markdown-content :deep(p) {
  margin: 8px 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-content :deep(code) {
  padding: 2px 6px;
  background-color: #f5f5f5;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.markdown-content :deep(pre) {
  margin: 12px 0;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  overflow-x: auto;
}

/* Timestamp */
.message-time {
  font-size: 11px;
  color: #bfbfbf;
  margin-top: 4px;
}

.message.user .message-time {
  text-align: right;
  color: rgba(255, 255, 255, 0.65);
}

/* Loading Placeholder */
.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #8c8c8c;
}

/* Input Area */
.chat-input-area {
  flex-shrink: 0;
  background-color: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 16px 24px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper :deep(.ant-input) {
  border-radius: 8px;
  font-size: 14px;
}

.input-wrapper :deep(.ant-btn-circle) {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.input-hint {
  font-size: 12px;
  color: #bfbfbf;
  margin-top: 8px;
  text-align: center;
}

.no-conversation-hint {
  color: #ff7875;
  font-weight: 500;
}

/* Embedded Components */
.embedded-form,
.embedded-selector,
.embedded-recommendation,
.embedded-flowchart,
.embedded-reach-strategy,
.embedded-product-config,
.embedded-smart-strategy,
.embedded-channel-selector,
.embedded-channel-copy,
.embedded-bpmn-flow,
.embedded-campaign-report {
  margin-top: 12px;
}

.message.assistant .embedded-form,
.message.assistant .embedded-selector,
.message.assistant .embedded-recommendation,
.message.assistant .embedded-flowchart,
.message.assistant .embedded-reach-strategy,
.message.assistant .embedded-product-config,
.message.assistant .embedded-smart-strategy,
.message.assistant .embedded-channel-selector,
.message.assistant .embedded-channel-copy,
.message.assistant .embedded-bpmn-flow,
.message.assistant .embedded-campaign-report {
  max-width: 700px;
}

/* Scrollbar */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
