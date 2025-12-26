/**
 * useConversationFlow.ts
 *
 * 管理营销 Agent 的 11 步对话流程状态
 *
 * 步骤：
 * 1. 创建方案 - 用户输入需求，MA 生成初步方案
 * 2. 用户确认方案 - 表单确认
 * 3. 选择目标人群 - 从预设人群列表选择
 * 4. 确认人群分析 - 查看并确认人群画像和价值分析
 * 5. 确认触达策略 - 查看触达流程图并确认
 * 6. 配置商品推荐 - 选择推荐商品、优惠券、权益
 * 7. 确认智能策略 - 查看 AI 策略规则并确认
 * 8. 选择推广渠道 - 多选渠道
 * 9. 编辑渠道文案 - 编辑各渠道个性化文案
 * 10. 确认 BPMN 流程 - 确认可执行流程图
 * 11. 查看活动复盘 - 活动结束后查看报告
 */

import { ref, computed, readonly } from 'vue'
import type { MarketingPlanFormData } from './useMarketingPlanForm'
import type { AudienceRecommendation } from './useAudienceSelection'
import type { ReachStrategyData } from '../components/ReachStrategyChart.vue'
import type { ProductConfigData } from '../components/ProductConfigForm.vue'
import type { SmartStrategyData } from '../components/SmartStrategyDisplay.vue'
import type { ChannelCopyData } from '../components/ChannelCopyEditor.vue'
import type { BpmnFlowData } from '../components/BpmnFlowChart.vue'
import type { CampaignReportData } from '../components/CampaignReport.vue'

// 步骤定义
export type ConversationStep =
  | 'create_plan'           // 步骤 1
  | 'confirm_plan'          // 步骤 2
  | 'select_audience'       // 步骤 3
  | 'confirm_audience'      // 步骤 4
  | 'confirm_reach_strategy'// 步骤 5
  | 'config_products'       // 步骤 6
  | 'confirm_smart_strategy'// 步骤 7
  | 'select_channels'       // 步骤 8
  | 'edit_channel_copy'     // 步骤 9
  | 'confirm_bpmn'          // 步骤 10
  | 'view_report'           // 步骤 11
  | 'completed'             // 流程完成

// 步骤元数据
export interface StepMeta {
  step: ConversationStep
  index: number
  label: string
  description: string
  icon: string
  isOptional: boolean
}

// 所有步骤的元数据
export const STEP_METADATA: StepMeta[] = [
  { step: 'create_plan', index: 1, label: '创建方案', description: '输入需求，生成营销方案', icon: '📝', isOptional: false },
  { step: 'confirm_plan', index: 2, label: '确认方案', description: '查看并确认营销方案', icon: '✅', isOptional: false },
  { step: 'select_audience', index: 3, label: '选择人群', description: '选择目标人群', icon: '👥', isOptional: false },
  { step: 'confirm_audience', index: 4, label: '确认人群分析', description: '确认人群画像和价值分析', icon: '📊', isOptional: false },
  { step: 'confirm_reach_strategy', index: 5, label: '确认触达策略', description: '确认触达流程图', icon: '📈', isOptional: false },
  { step: 'config_products', index: 6, label: '配置商品', description: '配置推荐商品和优惠', icon: '🛒', isOptional: true },
  { step: 'confirm_smart_strategy', index: 7, label: '确认智能策略', description: '确认 AI 生成的策略规则', icon: '🧠', isOptional: false },
  { step: 'select_channels', index: 8, label: '选择渠道', description: '选择推广渠道', icon: '📢', isOptional: false },
  { step: 'edit_channel_copy', index: 9, label: '编辑文案', description: '编辑各渠道文案', icon: '✍️', isOptional: false },
  { step: 'confirm_bpmn', index: 10, label: '确认流程', description: '确认 BPMN 执行流程', icon: '🔄', isOptional: false },
  { step: 'view_report', index: 11, label: '查看复盘', description: '查看活动复盘报告', icon: '📊', isOptional: true }
]

// 流程状态数据
export interface FlowStateData {
  // 步骤 1-2: 方案
  planFormData?: MarketingPlanFormData
  planConfirmed: boolean

  // 步骤 3-4: 人群
  selectedAudienceId?: string
  audienceRecommendation?: AudienceRecommendation
  audienceConfirmed: boolean

  // 步骤 5: 触达策略
  reachStrategyData?: ReachStrategyData
  reachStrategyConfirmed: boolean

  // 步骤 6: 商品配置
  productConfigData?: ProductConfigData
  productConfigConfirmed: boolean

  // 步骤 7: 智能策略
  smartStrategyData?: SmartStrategyData
  smartStrategyConfirmed: boolean

  // 步骤 8: 渠道选择
  selectedChannels: string[]
  channelsConfirmed: boolean

  // 步骤 9: 渠道文案
  channelCopyData?: ChannelCopyData
  channelCopyConfirmed: boolean

  // 步骤 10: BPMN
  bpmnFlowData?: BpmnFlowData
  bpmnConfirmed: boolean

  // 步骤 11: 复盘报告
  campaignReportData?: CampaignReportData
}

// 初始状态
const getInitialState = (): FlowStateData => ({
  planConfirmed: false,
  audienceConfirmed: false,
  reachStrategyConfirmed: false,
  productConfigConfirmed: false,
  smartStrategyConfirmed: false,
  selectedChannels: [],
  channelsConfirmed: false,
  channelCopyConfirmed: false,
  bpmnConfirmed: false
})

export function useConversationFlow() {
  // 当前步骤
  const currentStep = ref<ConversationStep>('create_plan')

  // 流程状态数据
  const stateData = ref<FlowStateData>(getInitialState())

  // 是否正在处理中
  const processing = ref(false)

  // 错误信息
  const error = ref<string | null>(null)

  // 计算属性：当前步骤索引 (1-based)
  const currentStepIndex = computed(() => {
    const meta = STEP_METADATA.find(m => m.step === currentStep.value)
    return meta?.index || 1
  })

  // 计算属性：当前步骤元数据
  const currentStepMeta = computed(() => {
    return STEP_METADATA.find(m => m.step === currentStep.value)
  })

  // 计算属性：进度百分比
  const progressPercent = computed(() => {
    if (currentStep.value === 'completed') return 100
    return Math.round(((currentStepIndex.value - 1) / STEP_METADATA.length) * 100)
  })

  // 计算属性：是否可以进入下一步
  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 'create_plan':
        return true // 可以随时输入
      case 'confirm_plan':
        return stateData.value.planConfirmed
      case 'select_audience':
        return !!stateData.value.selectedAudienceId
      case 'confirm_audience':
        return stateData.value.audienceConfirmed
      case 'confirm_reach_strategy':
        return stateData.value.reachStrategyConfirmed
      case 'config_products':
        return stateData.value.productConfigConfirmed
      case 'confirm_smart_strategy':
        return stateData.value.smartStrategyConfirmed
      case 'select_channels':
        return stateData.value.channelsConfirmed
      case 'edit_channel_copy':
        return stateData.value.channelCopyConfirmed
      case 'confirm_bpmn':
        return stateData.value.bpmnConfirmed
      case 'view_report':
        return true // 报告可以随时查看
      case 'completed':
        return false
      default:
        return false
    }
  })

  // 计算属性：已完成的步骤列表
  const completedSteps = computed(() => {
    const completed: ConversationStep[] = []
    if (stateData.value.planConfirmed) {
      completed.push('create_plan', 'confirm_plan')
    }
    if (stateData.value.audienceConfirmed) {
      completed.push('select_audience', 'confirm_audience')
    }
    if (stateData.value.reachStrategyConfirmed) {
      completed.push('confirm_reach_strategy')
    }
    if (stateData.value.productConfigConfirmed) {
      completed.push('config_products')
    }
    if (stateData.value.smartStrategyConfirmed) {
      completed.push('confirm_smart_strategy')
    }
    if (stateData.value.channelsConfirmed) {
      completed.push('select_channels')
    }
    if (stateData.value.channelCopyConfirmed) {
      completed.push('edit_channel_copy')
    }
    if (stateData.value.bpmnConfirmed) {
      completed.push('confirm_bpmn')
    }
    return completed
  })

  // 获取步骤元数据
  const getStepMeta = (step: ConversationStep): StepMeta | undefined => {
    return STEP_METADATA.find(m => m.step === step)
  }

  // 获取下一步
  const getNextStep = (current: ConversationStep): ConversationStep => {
    const stepOrder: ConversationStep[] = [
      'create_plan',
      'confirm_plan',
      'select_audience',
      'confirm_audience',
      'confirm_reach_strategy',
      'config_products',
      'confirm_smart_strategy',
      'select_channels',
      'edit_channel_copy',
      'confirm_bpmn',
      'view_report',
      'completed'
    ]
    const currentIndex = stepOrder.indexOf(current)
    if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
      return 'completed'
    }
    return stepOrder[currentIndex + 1] || 'completed'
  }

  // 前进到下一步
  const goToNextStep = () => {
    if (!canProceed.value) {
      console.warn('Cannot proceed: current step not completed')
      return false
    }
    currentStep.value = getNextStep(currentStep.value)
    return true
  }

  // 跳转到指定步骤（仅允许跳到已完成的步骤或当前步骤）
  const goToStep = (step: ConversationStep) => {
    const targetMeta = getStepMeta(step)
    if (!targetMeta) {
      console.warn('Invalid step:', step)
      return false
    }

    // 允许跳转到已完成的步骤或当前步骤
    if (completedSteps.value.includes(step) || step === currentStep.value) {
      currentStep.value = step
      return true
    }

    // 允许跳转到下一个待完成步骤
    if (targetMeta.index === currentStepIndex.value + 1 && canProceed.value) {
      currentStep.value = step
      return true
    }

    console.warn('Cannot jump to step:', step)
    return false
  }

  // ============ 步骤确认方法 ============

  // 步骤 2: 确认方案
  const confirmPlan = (formData: MarketingPlanFormData) => {
    stateData.value.planFormData = formData
    stateData.value.planConfirmed = true
    goToNextStep()
  }

  // 步骤 3: 选择人群
  const selectAudience = (audienceId: string) => {
    stateData.value.selectedAudienceId = audienceId
  }

  // 步骤 4: 确认人群分析
  const confirmAudience = (recommendation: AudienceRecommendation) => {
    stateData.value.audienceRecommendation = recommendation
    stateData.value.audienceConfirmed = true
    goToNextStep()
  }

  // 步骤 5: 确认触达策略
  const confirmReachStrategy = (data: ReachStrategyData) => {
    stateData.value.reachStrategyData = data
    stateData.value.reachStrategyConfirmed = true
    goToNextStep()
  }

  // 步骤 6: 确认商品配置
  const confirmProductConfig = (data: ProductConfigData) => {
    stateData.value.productConfigData = data
    stateData.value.productConfigConfirmed = true
    goToNextStep()
  }

  // 步骤 7: 确认智能策略
  const confirmSmartStrategy = (data: SmartStrategyData) => {
    stateData.value.smartStrategyData = data
    stateData.value.smartStrategyConfirmed = true
    goToNextStep()
  }

  // 步骤 8: 确认渠道选择
  const confirmChannels = (channels: string[]) => {
    stateData.value.selectedChannels = channels
    stateData.value.channelsConfirmed = true
    goToNextStep()
  }

  // 步骤 9: 确认渠道文案
  const confirmChannelCopy = (data: ChannelCopyData) => {
    stateData.value.channelCopyData = data
    stateData.value.channelCopyConfirmed = true
    goToNextStep()
  }

  // 步骤 10: 确认 BPMN
  const confirmBpmn = (data: BpmnFlowData) => {
    stateData.value.bpmnFlowData = data
    stateData.value.bpmnConfirmed = true
    goToNextStep()
  }

  // 步骤 11: 设置复盘报告
  const setReportData = (data: CampaignReportData) => {
    stateData.value.campaignReportData = data
  }

  // 重置流程
  const reset = () => {
    currentStep.value = 'create_plan'
    stateData.value = getInitialState()
    processing.value = false
    error.value = null
  }

  // 从保存的状态恢复
  const restoreFromState = (savedState: Partial<FlowStateData>, step?: ConversationStep) => {
    stateData.value = {
      ...getInitialState(),
      ...savedState
    }
    if (step) {
      currentStep.value = step
    }
  }

  // 导出当前状态（用于持久化）
  const exportState = () => {
    return {
      currentStep: currentStep.value,
      stateData: { ...stateData.value }
    }
  }

  return {
    // 状态
    currentStep: readonly(currentStep),
    stateData: readonly(stateData),
    processing,
    error,

    // 计算属性
    currentStepIndex,
    currentStepMeta,
    progressPercent,
    canProceed,
    completedSteps,

    // 常量
    STEP_METADATA,

    // 方法
    getStepMeta,
    getNextStep,
    goToNextStep,
    goToStep,

    // 步骤确认
    confirmPlan,
    selectAudience,
    confirmAudience,
    confirmReachStrategy,
    confirmProductConfig,
    confirmSmartStrategy,
    confirmChannels,
    confirmChannelCopy,
    confirmBpmn,
    setReportData,

    // 工具方法
    reset,
    restoreFromState,
    exportState
  }
}
