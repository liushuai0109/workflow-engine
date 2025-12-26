# Design: 营销智能体聊天页面架构设计

## 1. 整体架构

### 1.1 页面结构

```
MarketingAgentPage.vue (主容器)
├── MarketingConversationList.vue (左侧面板)
│   ├── 搜索栏
│   ├── 新建会话按钮
│   └── 会话列表项
├── MarketingChatArea.vue (中间主区域)
│   ├── 消息头部（当前会话信息）
│   ├── 消息列表容器
│   │   └── MessageBubble (复用/扩展)
│   └── 输入区域
│       ├── 工具栏（模板选择、附件等）
│       └── 文本输入框
└── MarketingPlanPreview.vue (右侧面板)
    ├── 面板头部（标题、操作）
    ├── 方案内容区域
    │   ├── 基本信息
    │   ├── 目标受众
    │   ├── 营销策略
    │   └── 预算/时间线
    └── 操作按钮区域
```

### 1.2 响应式布局策略

| 屏幕宽度 | 左侧面板 | 中间区域 | 右侧面板 |
|---------|---------|---------|---------|
| >= 1400px | 240px 固定 | flex 自适应 | 360px 固定 |
| 1200-1400px | 200px 固定 | flex 自适应 | 300px 可折叠 |
| 992-1200px | 可折叠抽屉 | 全宽 | 可折叠抽屉 |
| < 992px | 底部 Tab 切换 | 全屏 | 底部 Tab 切换 |

## 2. 组件设计

### 2.1 MarketingAgentPage.vue

**职责**：
- 三栏布局容器
- 状态管理（当前会话、面板显示状态）
- 子组件间通信协调

**状态**：
```typescript
interface PageState {
  // 面板状态
  leftPanelVisible: boolean
  rightPanelVisible: boolean
  rightPanelWidth: number

  // 会话状态
  currentConversationId: string | null
  conversations: ChatConversation[]

  // 营销方案状态
  currentPlan: MarketingPlan | null
  planDirty: boolean
}
```

### 2.2 MarketingConversationList.vue

**职责**：
- 显示会话列表
- 新建/删除/切换会话
- 会话搜索和筛选

**Props**：
```typescript
interface ConversationListProps {
  conversations: ChatConversation[]
  currentId: string | null
  loading: boolean
}
```

**Events**：
```typescript
interface ConversationListEmits {
  select: [id: string]
  create: []
  delete: [id: string]
  search: [keyword: string]
}
```

### 2.3 MarketingChatArea.vue

**职责**：
- 消息列表展示（含嵌入式交互组件）
- 用户输入处理
- 调用 Claude API（当前使用模拟响应）
- 解析营销方案输出
- **管理多步骤对话流程的自动触发**

**核心功能**：
1. **消息管理**：加载、显示、保存聊天消息
2. **表单嵌入**：在 AI 回复中嵌入 `MarketingPlanForm` 组件
3. **人群选择嵌入**：在 AI 回复中嵌入 `AudienceSelector` 组件
4. **人群推荐嵌入**：在 AI 回复中嵌入 `AudienceRecommendation` 组件
5. **步骤自动触发**：
   - 表单提交后 → 自动触发人群选择（`triggerAudienceSelection`）
   - 人群选择后 → 自动触发人群推荐（`triggerAudienceRecommendation`）
   - 人群确认后 → 显示完成提示（可继续扩展流程图生成）

**消息数据结构**：
```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  progressLogs?: string[]
  isStreaming?: boolean

  // 表单相关
  formData?: MarketingPlanFormData
  hasForm?: boolean
  formSubmitted?: boolean

  // 人群选择相关
  hasAudienceSelector?: boolean
  audienceData?: AudienceData
  audienceSelected?: boolean

  // 人群推荐相关
  hasAudienceRecommendation?: boolean
  recommendationData?: RecommendationData

  messageId?: string
}
```

**自动触发流程逻辑**：
```typescript
// 步骤 1 → 步骤 2: 用户发送消息后，AI 返回嵌入式表单
simulateAIResponse() {
  // 总是返回带有表单的响应（用于测试）
  message.hasForm = true
  message.formData = generateFormFromAIResponse(response)
}

// 步骤 2 → 步骤 3: 表单提交后自动触发人群选择
handleFormSubmit(formData) {
  message.formSubmitted = true
  emit('planSubmitted', formData)
  await triggerAudienceSelection()  // 自动添加人群选择消息
}

// 步骤 3 → 步骤 4: 人群选择后自动触发人群推荐
handleAudienceSelect(audienceId) {
  message.audienceSelected = true
  await triggerAudienceRecommendation(selectedAudience)  // 自动添加推荐消息
}

// 步骤 4 → 步骤 5: 人群确认后（可扩展流程图生成）
handleRecommendationConfirm(data) {
  message.recommendationData = data
  antMessage.success('营销方案流程已完成！')
  // 可在此处添加: await triggerFlowChartGeneration()
}
```

**Props**：
```typescript
interface ChatAreaProps {
  conversationId: string | null
  conversationTitle?: string
}
```

**Events**：
```typescript
interface ChatAreaEmits {
  messageSent: [message: string]
  messagesLoaded: [count: number]
  planSubmitted: [planData: MarketingPlanFormData]  // 表单提交事件
}
```

### 2.4 MarketingPlanPreview.vue

**职责**：
- 作为右侧面板的容器组件
- **只读展示**完整的营销方案内容
- 表单提交后同步显示最新方案

**Props**：
```typescript
interface PlanPreviewProps {
  plan: MarketingPlan | null
  loading: boolean
}
```

**Events**：
```typescript
interface PlanPreviewEmits {
  export: [format: 'json' | 'markdown']  // 可选功能
}
```

### 2.5 MarketingPlanForm.vue（嵌入聊天窗口）

**职责**：
- **作为 AI 回复的一部分嵌入聊天窗口**
- 以可交互表单形式展示 AI 生成的初步营销方案
- 用户可在回复消息中直接编辑修改各字段
- 提供确定按钮提交表单

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ 用户消息        │    |
|  └────────────────┘    |
|  ┌────────────────┐    |
|  │ AI 回复文本     │    |
|  │                │    |
|  │ ┌────────────┐ │    |  ← 可交互表单嵌入 AI 回复中
|  │ │ 活动主题    │ │    |
|  │ │ [输入框]    │ │    |
|  │ │ 活动时间    │ │    |
|  │ │ [日期选择]  │ │    |
|  │ │ ...        │ │    |
|  │ │ [确定按钮]  │ │    |
|  │ └────────────┘ │    |
|  └────────────────┘    |
+------------------------+
```

**表单字段**：
| 字段 | 类型 | 组件 | 说明 |
|-----|------|-----|------|
| 活动主题 | string | Input | 文本输入框 |
| 活动起始时间 | [Date, Date] | RangePicker | 日期范围选择器 |
| 活动目标 | string | TextArea | 多行文本输入 |
| 触达渠道 | string[] | Select (multiple) | 多选下拉框 |
| 活动人群 | string | TextArea | 多行文本输入 |
| 活动策略 | string | TextArea | 多行文本输入 |

**Props**：
```typescript
interface PlanFormProps {
  messageId: string                        // 所属消息 ID
  initialData: Partial<MarketingPlan> | null  // AI 生成的初始数据
  disabled: boolean                        // 是否禁用（已提交后）
  submitting: boolean
}
```

**Events**：
```typescript
interface PlanFormEmits {
  submit: [plan: MarketingPlanFormData]  // 表单提交
}
```

**表单数据结构**：
```typescript
interface MarketingPlanFormData {
  title: string                    // 活动主题
  dateRange: [string, string]      // 活动起始时间 [开始日期, 结束日期]
  objectives: string               // 活动目标
  channels: string[]               // 触达渠道（多选）
  targetAudience: string           // 活动人群
  strategies: string               // 活动策略
}
```

**表单状态**：
- **可编辑状态**：用户可修改所有字段，显示"确定"按钮
- **已提交状态**：表单变为只读，显示"已提交"标识

### 2.6 useMarketingPlanForm.ts（表单封装方法）

**职责**：
- 封装表单生成逻辑
- 从 AI 响应中解析并生成表单初始值
- 表单验证规则
- 表单数据转换（FormData ↔ MarketingPlan）

```typescript
// composables/useMarketingPlanForm.ts
export function useMarketingPlanForm() {
  // 表单状态
  const formData = ref<MarketingPlanFormData>({
    title: '',
    dateRange: ['', ''],
    objectives: '',
    channels: [],
    targetAudience: '',
    strategies: ''
  })

  // 表单验证规则
  const formRules = {
    title: [{ required: true, message: '请输入活动主题' }],
    dateRange: [{ required: true, message: '请选择活动时间' }],
    objectives: [{ required: true, message: '请输入活动目标' }],
    channels: [{ required: true, message: '请选择触达渠道', type: 'array', min: 1 }],
    targetAudience: [{ required: true, message: '请输入活动人群' }],
    strategies: [{ required: true, message: '请输入活动策略' }]
  }

  // 渠道选项
  const channelOptions = [
    { label: '微信公众号', value: 'wechat_official' },
    { label: '微信小程序', value: 'wechat_mini' },
    { label: '抖音', value: 'douyin' },
    { label: '小红书', value: 'xiaohongshu' },
    { label: '微博', value: 'weibo' },
    { label: '短信', value: 'sms' },
    { label: '邮件', value: 'email' },
    { label: 'APP Push', value: 'app_push' },
    { label: '线下活动', value: 'offline' }
  ]

  // 从 AI 响应生成表单初始值
  const generateFormFromAIResponse = (aiResponse: string): MarketingPlanFormData => { ... }

  // 从 MarketingPlan 转换为表单数据
  const planToFormData = (plan: MarketingPlan): MarketingPlanFormData => { ... }

  // 从表单数据转换为 MarketingPlan
  const formDataToPlan = (formData: MarketingPlanFormData): Partial<MarketingPlan> => { ... }

  // 重置表单
  const resetForm = () => { ... }

  // 验证表单
  const validateForm = async (): Promise<boolean> => { ... }

  return {
    formData,
    formRules,
    channelOptions,
    generateFormFromAIResponse,
    planToFormData,
    formDataToPlan,
    resetForm,
    validateForm
  }
}
```

### 2.7 AudienceSelector.vue（人群选择组件，嵌入聊天窗口）

**职责**：
- 展示已划分好的人群列表及筛选条件
- 提供"新建人群"选项
- 用户选择人群后点击"确定选择"触发下一步
- **已实现自动触发人群推荐详情**

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ AI: 请选择目标人群 │    |
|  │                │    |
|  │ ○ 高价值会员     │    |  ← 已划分人群列表
|  │   规模: 50,000人 │    |
|  │ ○ 新用户         │    |
|  │   规模: 120,000人│    |
|  │ ○ 流失预警用户   │    |
|  │   规模: 35,000人 │    |
|  │                │    |
|  │ [+ 新建人群]    │    |  ← 新建人群入口
|  │                │    |
|  │ [确定选择]      │    |  ← 点击后进入下一步
|  └────────────────┘    |
+------------------------+
```

**实现细节**：
- 单选 UI（单选按钮样式）
- 人群卡片展示：名称、描述、人群规模
- 选中后高亮显示（蓝色边框 + 淡蓝背景）
- 提交后组件禁用，显示"已选择"绿色徽章
- 使用 mock 数据（3 个预设人群）
- "新建人群"功能显示占位提示

**Props**：
```typescript
interface AudienceSelectorProps {
  messageId: string
  audiences: Audience[]           // 已划分的人群列表
  initialSelected?: string | null // 初始选中的人群 ID
  disabled?: boolean              // 已选择后禁用
}

interface Audience {
  id: string
  name: string
  description: string
  size: number                    // 人群规模（人数）
}
```

**Events**：
```typescript
interface AudienceSelectorEmits {
  select: [audienceId: string]    // 选择已有人群（点击"确定选择"按钮）
  createNew: []                   // 新建人群
}
```

**Mock 数据**（当前使用）：
```typescript
audiences: [
  { id: 'aud-1', name: '高价值会员', description: '近3个月消费>5000元，活跃度高', size: 50000 },
  { id: 'aud-2', name: '新用户', description: '注册时间<30天，未完成首购', size: 120000 },
  { id: 'aud-3', name: '流失预警用户', description: '60天未活跃，曾是高价值用户', size: 35000 }
]
```

### 2.8 AudienceRecommendation.vue（人群推荐详情组件，嵌入聊天窗口）

**职责**：
- 展示选中人群的详细推荐信息
- 支持编辑人群价值分层标签（蓝色标签）
- 支持编辑画像指标标签（绿色标签）
- 展示核心指标：人群规模、大盘占比、转化概率
- 用户确认后点击"确认人群"进入下一步

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ AI: 人群推荐详情  │    |
|  │                │    |
|  │ 人群: 高价值会员  │    |
|  │ 规模: 50,000人   │    |
|  │ 大盘占比: 15%    │    |
|  │ 转化概率: 32%    │    |
|  │                │    |
|  │ 价值分层标签:    │    |  ← 可编辑（蓝色）
|  │ [高净值] [活跃]  │    |
|  │ [编辑]         │    |
|  │                │    |
|  │ 画像指标标签:    │    |  ← 可编辑（绿色）
|  │ [25-35岁] [一线] │    |
|  │ [编辑]         │    |
|  │                │    |
|  │ [确认人群]      │    |  ← 点击后进入下一步
|  └────────────────┘    |
+------------------------+
```

**实现细节**：
- 三栏指标展示（Grid 布局）：人群规模、大盘占比、转化概率
- 价值分层标签：蓝色 Tag，点击"编辑"按钮进入编辑模式
- 画像指标标签：绿色 Tag，点击"编辑"按钮进入编辑模式
- 标签编辑：内联输入框，支持逗号分隔，保存/取消操作
- 确认后组件禁用，显示"已确认"绿色徽章
- 显示确认提示："人群已确认，流程图生成中..."

**Props**：
```typescript
interface AudienceRecommendationProps {
  messageId: string
  recommendation: RecommendationData
  disabled?: boolean              // 已确认后禁用
}

interface RecommendationData {
  audienceId: string
  audienceName: string
  size: number                    // 人群规模
  marketShare: number             // 大盘占比（百分比）
  conversionRate: number          // 转化概率（百分比）
  valueTags: string[]             // 价值分层标签（可编辑）
  profileTags: string[]           // 画像指标标签（可编辑）
  confirmed: boolean              // 是否已确认
}
```

**Events**：
```typescript
interface AudienceRecommendationEmits {
  confirm: [data: RecommendationData]         // 确认人群
  updateValueTags: [tags: string[]]           // 更新价值分层标签
  updateProfileTags: [tags: string[]]         // 更新画像指标标签
}
```

**Mock 数据**（当前使用）：
```typescript
recommendation: {
  audienceId: 'aud-1',
  audienceName: '高价值会员',
  size: 50000,
  marketShare: 15,              // 15%
  conversionRate: 32,           // 32%
  valueTags: ['高净值', '活跃用户'],
  profileTags: ['25-35岁', '一线城市', '白领'],
  confirmed: false
}
```

### 2.9 ReachStrategyChart.vue（触达策略流程图组件，步骤5）

**职责**：
- 展示 MA 生成的触达策略流程图（Mermaid 格式）
- 显示用户旅程各阶段的触达渠道和关键动作
- 用户确认后进入商品推荐配置

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: 触达策略流程图 │    |
|  │                │    |
|  │ ┌─────────────┐│    |
|  │ │  认知阶段    ││    |  ← Mermaid 渲染
|  │ │     ↓       ││    |
|  │ │  兴趣阶段    ││    |
|  │ │     ↓       ││    |
|  │ │  转化阶段    ││    |
|  │ │     ↓       ││    |
|  │ │  留存阶段    ││    |
|  │ └─────────────┘│    |
|  │                │    |
|  │ [确定]         │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface ReachStrategyChartProps {
  messageId: string
  data: ReachStrategyData
  disabled?: boolean
}
```

**Events**：
```typescript
interface ReachStrategyChartEmits {
  confirm: [data: ReachStrategyData]
}
```

### 2.10 ProductConfigForm.vue（商品推荐配置表单，步骤6）

**职责**：
- 展示商品推荐配置表单
- 支持选择推荐商品、优惠券、权益配置
- 用户确认后触发智能策略生成

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: 商品推荐配置  │    |
|  │                │    |
|  │ 推荐商品:       │    |
|  │ ☑ 商品A ¥99    │    |
|  │ ☐ 商品B ¥199   │    |
|  │                │    |
|  │ 优惠券:        │    |
|  │ ☑ 满100减20   │    |
|  │ ☐ 满200减50   │    |
|  │                │    |
|  │ 权益配置:      │    |
|  │ ☑ 会员积分翻倍  │    |
|  │                │    |
|  │ [确定]         │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface ProductConfigFormProps {
  messageId: string
  data: ProductConfigData
  disabled?: boolean
}
```

**Events**：
```typescript
interface ProductConfigFormEmits {
  confirm: [data: ProductConfigData]
}
```

### 2.11 SmartStrategyDisplay.vue（智能策略展示，步骤7）

**职责**：
- 展示 MA 生成的智能策略详情
- 显示策略规则、触发条件、执行动作
- 用户确认后进入推广渠道选择

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: 智能策略详情  │    |
|  │                │    |
|  │ 策略名称: 个性化推荐│    |
|  │ 预期转化率: 32%  │    |
|  │                │    |
|  │ 策略规则:       │    |
|  │ 1. 高价值用户→推A │    |
|  │ 2. 新用户→推B    │    |
|  │ 3. 流失预警→推C  │    |
|  │                │    |
|  │ [确定]         │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface SmartStrategyDisplayProps {
  messageId: string
  data: SmartStrategyData
  disabled?: boolean
}
```

**Events**：
```typescript
interface SmartStrategyDisplayEmits {
  confirm: [data: SmartStrategyData]
}
```

### 2.12 ChannelSelector.vue（推广渠道选择，步骤8）

**职责**：
- 展示推广渠道选择界面
- 支持多选渠道（微信、抖音、短信、邮件等）
- 用户确认后进入个性化渠道文案

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: 请选择推广渠道 │    |
|  │                │    |
|  │ ☑ 微信公众号    │    |
|  │ ☑ 微信小程序    │    |
|  │ ☑ 抖音         │    |
|  │ ☐ 小红书       │    |
|  │ ☑ 短信         │    |
|  │ ☐ 邮件         │    |
|  │ ☑ APP Push    │    |
|  │                │    |
|  │ [确定]         │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface ChannelSelectorProps {
  messageId: string
  channels: string[]
  selectedChannels?: string[]
  disabled?: boolean
}
```

**Events**：
```typescript
interface ChannelSelectorEmits {
  confirm: [channels: string[]]
}
```

### 2.13 ChannelCopyEditor.vue（个性化渠道文案，步骤9）

**职责**：
- 展示 MA 生成的各渠道个性化文案
- 支持编辑文案标题和内容
- 用户确认后触发 BPMN 生成

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: 个性化渠道文案 │    |
|  │                │    |
|  │ 📱 微信公众号:   │    |
|  │ 标题: 双11狂欢... │    |
|  │ 内容: [编辑...]  │    |
|  │                │    |
|  │ 📱 抖音:        │    |
|  │ 标题: 限时抢购... │    |
|  │ 内容: [编辑...]  │    |
|  │                │    |
|  │ [确定]         │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface ChannelCopyEditorProps {
  messageId: string
  data: ChannelCopyData
  disabled?: boolean
}
```

**Events**：
```typescript
interface ChannelCopyEditorEmits {
  confirm: [data: ChannelCopyData]
}
```

### 2.14 BpmnFlowChart.vue（BPMN 可执行流程图，步骤10）

**职责**：
- 展示 WA 生成的 BPMN 可执行流程图
- 支持流程图查看、缩放
- 用户确认后启动活动执行

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: BPMN 可执行流程│    |
|  │                │    |
|  │ ┌─────────────┐│    |
|  │ │ [开始]      ││    |
|  │ │    ↓        ││    |
|  │ │ [发送短信]   ││    |  ← BPMN 渲染
|  │ │    ↓        ││    |
|  │ │ [推送APP]   ││    |
|  │ │    ↓        ││    |
|  │ │ [结束]      ││    |
|  │ └─────────────┘│    |
|  │                │    |
|  │ [查看大图] [启动活动]│    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface BpmnFlowChartProps {
  messageId: string
  data: BpmnFlowData
  disabled?: boolean
}
```

**Events**：
```typescript
interface BpmnFlowChartEmits {
  confirm: []                      // 启动活动
  viewFullScreen: []               // 查看大图
}
```

### 2.15 CampaignReport.vue（活动复盘报告，步骤11）

**职责**：
- 展示 MA 生成的活动复盘和分析报告
- 显示执行效果、转化数据、指标达成率
- 提供优化建议

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ MA: 活动复盘报告  │    |
|  │                │    |
|  │ 📊 执行摘要:    │    |
|  │ 活动已完成...   │    |
|  │                │    |
|  │ 📈 核心指标:    │    |
|  │ • 曝光量: 120%  │    |
|  │ • 转化率: 95%   │    |
|  │ • ROI: 110%    │    |
|  │                │    |
|  │ 💡 优化建议:    │    |
|  │ 1. 增加...     │    |
|  │ 2. 优化...     │    |
|  │                │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface CampaignReportProps {
  messageId: string
  data: CampaignReportData
}
```

### 2.16 MarketingFlowChart.vue（营销流程图组件，遗留）

**职责**：
- 展示 AI 生成的营销规划流程图（用户旅程图）
- 复用现有的 AI 画图能力
- 支持流程图的查看和缩放

**使用场景**：
```
+------------------------+
|  聊天窗口               |
|  ┌────────────────┐    |
|  │ AI: 营销流程图    │    |
|  │                │    |
|  │ ┌─────────────┐│    |
|  │ │  触达阶段    ││    |
|  │ │     ↓       ││    |
|  │ │  转化阶段    ││    |  ← 用户旅程图
|  │ │     ↓       ││    |
|  │ │  留存阶段    ││    |
|  │ └─────────────┘│    |
|  │                │    |
|  │ [查看大图]      │    |
|  └────────────────┘    |
+------------------------+
```

**Props**：
```typescript
interface MarketingFlowChartProps {
  messageId: string
  flowChartData: FlowChartData    // 流程图数据
  loading: boolean
}
```

**Events**：
```typescript
interface MarketingFlowChartEmits {
  viewFullScreen: []              // 查看大图
}
```

### 2.10 useAudienceSelection.ts（人群选择封装方法）

**职责**：
- 封装人群列表获取逻辑
- 封装人群推荐详情获取逻辑
- 管理人群选择状态

```typescript
// composables/useAudienceSelection.ts
export function useAudienceSelection() {
  // 人群列表
  const audiences = ref<Audience[]>([])
  const selectedAudienceId = ref<string | null>(null)

  // 人群推荐详情
  const recommendation = ref<AudienceRecommendation | null>(null)

  // 加载状态
  const loading = ref(false)

  // 获取已划分的人群列表
  const fetchAudiences = async (): Promise<void> => { ... }

  // 获取人群推荐详情
  const fetchRecommendation = async (audienceId: string): Promise<void> => { ... }

  // 选择人群
  const selectAudience = (audienceId: string) => { ... }

  // 更新价值分层标签
  const updateValueTags = (tags: string[]) => { ... }

  // 更新画像指标标签
  const updateProfileTags = (tags: string[]) => { ... }

  // 确认人群选择
  const confirmSelection = async (): Promise<void> => { ... }

  return {
    audiences,
    selectedAudienceId,
    recommendation,
    loading,
    fetchAudiences,
    fetchRecommendation,
    selectAudience,
    updateValueTags,
    updateProfileTags,
    confirmSelection
  }
}
```

## 3. 数据模型

### 3.1 营销方案模型

营销方案数据模型围绕六个核心字段设计：活动主题、活动时间、活动目标、触达渠道、活动人群、活动策略。

```typescript
interface MarketingPlan {
  id: string
  conversationId: string
  version: number
  createdAt: string
  updatedAt: string

  // ========== 核心字段 ==========

  // 1. 活动主题
  title: string                    // 活动名称
  description: string              // 活动描述
  status: 'draft' | 'review' | 'approved' | 'active' | 'completed'

  // 2. 活动时间
  timeline: {
    startDate: string              // 活动开始日期
    endDate: string                // 活动结束日期
    milestones: Array<{            // 关键里程碑
      date: string
      name: string
      deliverables: string[]
    }>
  }

  // 3. 活动目标
  objectives: {
    primary: string                // 主要目标
    secondary: string[]            // 次要目标
    kpis: Array<{                  // 关键绩效指标
      metric: string               // 指标名称
      target: string               // 目标值
      timeframe: string            // 时间范围
    }>
  }

  // 4. 触达渠道
  channels: Array<{
    name: string                   // 渠道名称（如：微信、抖音、邮件、短信等）
    type: 'online' | 'offline'     // 渠道类型
    priority: 'high' | 'medium' | 'low'  // 优先级
    budget?: number                // 该渠道预算
    description?: string           // 渠道说明
  }>

  // 5. 活动人群
  targetAudience: {
    demographics: string[]         // 人口统计特征（年龄、性别、地区等）
    interests: string[]            // 兴趣偏好
    behaviors: string[]            // 行为特征
    segments: string[]             // 人群分层/标签
    estimatedSize?: number         // 预估覆盖人数
  }

  // 6. 活动策略
  strategies: Array<{
    name: string                   // 策略名称
    channel: string                // 关联渠道
    approach: string               // 策略方法
    tactics: string[]              // 具体战术
    budget: number                 // 预算
    expectedOutcome: string        // 预期效果
  }>

  // ========== 辅助字段 ==========

  // 预算汇总
  budget: {
    total: number
    currency: string
    breakdown: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }

  // AI 生成的原始内容
  rawContent: string
}
```

### 3.2 人群数据模型

```typescript
// 人群基础信息
interface Audience {
  id: string
  name: string                     // 人群名称
  description: string              // 人群描述
  filterConditions: FilterCondition[]  // 筛选条件
  size: number                     // 人群规模
  createdAt: string
  updatedAt: string
}

// 筛选条件
interface FilterCondition {
  field: string                    // 字段名
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains'
  value: string | number | string[]
  label: string                    // 可读描述
}

// 人群推荐详情
interface AudienceRecommendation {
  audienceId: string
  audienceName: string

  // 核心指标
  size: number                     // 人群规模
  marketShare: number              // 大盘占比 (0-1)
  conversionRate: number           // 转化概率 (0-1)

  // 可编辑标签
  valueTags: string[]              // 人群价值分层标签（可编辑）
  profileTags: string[]            // 画像指标标签（可编辑）

  // 详细画像
  demographics: {
    ageDistribution: Array<{ range: string; percentage: number }>
    genderDistribution: Array<{ gender: string; percentage: number }>
    regionDistribution: Array<{ region: string; percentage: number }>
  }

  // 行为特征
  behaviors: string[]

  // 推荐理由
  recommendationReason: string
}
```

### 3.3 营销流程图数据模型

```typescript
// 流程图数据（用于 AI 画图）
interface FlowChartData {
  id: string
  type: 'user_journey'             // 用户旅程图
  title: string

  // 流程节点
  nodes: Array<{
    id: string
    type: 'stage' | 'action' | 'decision' | 'touchpoint'
    label: string
    description?: string
    channel?: string               // 触达渠道
  }>

  // 连接关系
  edges: Array<{
    source: string
    target: string
    label?: string
  }>

  // AI 生成的 BPMN/流程图 XML 或 JSON
  diagramData: string

  // 生成时间
  generatedAt: string
}
```

### 3.4 营销会话扩展

复用现有 `ChatConversation`，添加营销特定字段：

```typescript
interface MarketingConversation extends ChatConversation {
  type: 'marketing'
  planId?: string                  // 关联的营销方案
  selectedAudienceId?: string      // 已选择的人群
  flowChartId?: string             // 生成的流程图
  metadata: {
    projectName?: string
    clientName?: string
    industry?: string
  }
}
```

## 4. API 集成

### 4.1 Claude API 调用扩展

在 `claudeLlmService.ts` 中添加营销专用方法：

```typescript
interface MarketingLlmService {
  // 生成营销方案
  generateMarketingPlan(
    context: ConversationContext,
    requirements: string
  ): Promise<MarketingPlan>

  // 优化现有方案
  refinePlan(
    plan: MarketingPlan,
    feedback: string
  ): Promise<MarketingPlan>

  // 流式生成
  streamMarketingResponse(
    context: ConversationContext,
    message: string,
    onPlanUpdate: (partial: Partial<MarketingPlan>) => void
  ): AsyncGenerator<string>
}
```

### 4.2 后端 API：营销方案专用 API

新建独立的营销方案 API 端点 `/api/marketing-plans`，提供完整的 CRUD 操作。

```
# 营销方案 CRUD API
POST   /api/marketing-plans              - 创建营销方案
GET    /api/marketing-plans              - 获取方案列表（支持分页和筛选）
GET    /api/marketing-plans/:id          - 获取方案详情
PUT    /api/marketing-plans/:id          - 更新方案
DELETE /api/marketing-plans/:id          - 删除方案

# 会话关联
GET    /api/conversations/:id/plan       - 获取会话关联的营销方案
POST   /api/conversations/:id/plan       - 为会话创建/更新营销方案
```

#### API 请求/响应示例

**POST /api/marketing-plans - 创建营销方案**
```json
// Request
{
  "conversationId": "conv-123",
  "title": "双十一促销活动",
  "description": "2024年双十一电商促销活动方案",
  "timeline": {
    "startDate": "2024-11-01",
    "endDate": "2024-11-11",
    "milestones": []
  },
  "objectives": {
    "primary": "提升销售额30%",
    "secondary": ["增加新客户", "提高复购率"],
    "kpis": [
      { "metric": "销售额", "target": "100万", "timeframe": "活动期间" }
    ]
  },
  "channels": [
    { "name": "微信", "type": "online", "priority": "high" },
    { "name": "抖音", "type": "online", "priority": "medium" }
  ],
  "targetAudience": {
    "demographics": ["25-35岁", "一二线城市"],
    "interests": ["购物", "时尚"],
    "behaviors": ["高频购买用户"],
    "segments": ["VIP会员", "新注册用户"]
  },
  "strategies": [
    {
      "name": "预热阶段",
      "channel": "微信",
      "approach": "公众号推文+社群运营",
      "tactics": ["发布预告", "优惠券预发放"],
      "budget": 10000,
      "expectedOutcome": "预热期间曝光10万+"
    }
  ]
}

// Response
{
  "id": "plan-456",
  "conversationId": "conv-123",
  "version": 1,
  "createdAt": "2024-10-01T10:00:00Z",
  "updatedAt": "2024-10-01T10:00:00Z",
  "status": "draft",
  // ... 其他字段
}
```

**GET /api/marketing-plans - 获取方案列表**
```
GET /api/marketing-plans?page=1&pageSize=10&status=draft&conversationId=conv-123
```

```json
// Response
{
  "data": [...],
  "total": 50,
  "page": 1,
  "pageSize": 10
}
```

#### 后端实现要点

1. **数据库表结构**：新增 `marketing_plans` 表
2. **关联关系**：方案通过 `conversationId` 与会话关联
3. **版本控制**：每次更新递增 `version` 字段
4. **权限控制**：方案归属于创建会话的用户

## 5. 状态管理

### 5.1 Composable 设计

```typescript
// useMarketingAgent.ts
export function useMarketingAgent() {
  // 会话管理
  const conversations = ref<MarketingConversation[]>([])
  const currentConversation = ref<MarketingConversation | null>(null)

  // 方案管理
  const currentPlan = ref<MarketingPlan | null>(null)
  const planHistory = ref<MarketingPlan[]>([])

  // 消息管理
  const messages = ref<Message[]>([])
  const isStreaming = ref(false)

  // 方法
  const loadConversations = async () => { ... }
  const selectConversation = async (id: string) => { ... }
  const sendMessage = async (content: string) => { ... }
  const updatePlan = (plan: MarketingPlan) => { ... }

  return {
    conversations,
    currentConversation,
    currentPlan,
    messages,
    isStreaming,
    loadConversations,
    selectConversation,
    sendMessage,
    updatePlan
  }
}
```

## 6. 与现有系统集成

### 6.1 复用策略

| 现有组件/服务 | 复用方式 |
|-------------|---------|
| `chatApiService.ts` | 直接复用，可能需要扩展类型 |
| `claudeLlmService.ts` | 扩展添加营销专用方法，处理用户消息 |
| `ChatBox.vue` 样式 | 提取共享样式变量 |
| `utils/markdown.ts` | 直接复用 |
| `BpmnEditor` | 复用 AI 画流程图能力，生成 BPMN 执行流程 |
| `bpmnAiService.ts` | 复用 BPMN AI 生成服务 |

### 6.2 新增依赖库

| 依赖库 | 用途 |
|-------|------|
| `mermaid` | 解析和渲染 MA 回复的 Mermaid 格式流程图 |

### 6.3 共享组件提取

将以下逻辑提取为可复用的 composable：
- `useConversation` - 会话 CRUD 操作
- `useClaudeChat` - Claude API 调用封装
- `useStreamingMessage` - 流式消息处理

### 6.4 useMermaidParser.ts（Mermaid 解析封装）

**职责**：
- 解析 MA 回复中的 Mermaid 格式流程图代码
- 渲染 Mermaid 图表到指定容器
- 处理解析和渲染错误

```typescript
// composables/useMermaidParser.ts
import mermaid from 'mermaid'

export function useMermaidParser() {
  // 初始化 Mermaid
  const initMermaid = () => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    })
  }

  // 从文本中提取 Mermaid 代码
  const extractMermaidCode = (text: string): string | null => {
    // 匹配 ```mermaid ... ``` 格式
    const mermaidRegex = /```mermaid\s*([\s\S]*?)```/
    const match = text.match(mermaidRegex)
    if (match) {
      return match[1].trim()
    }

    // 匹配裸 Mermaid 代码（以 graph、flowchart、sequenceDiagram 等开头）
    const bareCodeRegex = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph)\s/m
    if (bareCodeRegex.test(text)) {
      return text.trim()
    }

    return null
  }

  // 渲染 Mermaid 图表
  const renderMermaid = async (
    code: string,
    containerId: string
  ): Promise<{ success: boolean; svg?: string; error?: string }> => {
    try {
      const { svg } = await mermaid.render(containerId, code)
      return { success: true, svg }
    } catch (error: any) {
      console.error('Mermaid render error:', error)
      return { success: false, error: error.message || 'Mermaid 渲染失败' }
    }
  }

  // 验证 Mermaid 代码语法
  const validateMermaidCode = async (code: string): Promise<boolean> => {
    try {
      await mermaid.parse(code)
      return true
    } catch {
      return false
    }
  }

  return {
    initMermaid,
    extractMermaidCode,
    renderMermaid,
    validateMermaidCode
  }
}
```

## 7. LLM 处理流程

### 7.1 处理流程概述

所有用户输入的消息都必须经过 LLM 处理后再生成对应的交互组件：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  用户输入    │ →   │ LLM 分析    │ →   │ 结构化响应   │ →   │ 组件渲染    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 7.2 LLM 响应格式

```typescript
interface LLMResponse {
  responseType: LLMResponseType
  data: any                      // 根据 responseType 不同而不同
  message: string                // AI 回复的文本消息
}

type LLMResponseType =
  | 'plan_form'                  // 营销方案表单
  | 'audience_selector'          // 人群选择界面
  | 'audience_recommendation'    // 人群推荐详情
  | 'reach_strategy'             // 触达策略流程图（Mermaid 格式）
  | 'product_config'             // 商品推荐配置
  | 'smart_strategy'             // 智能策略详情
  | 'channel_selector'           // 推广渠道选择
  | 'channel_copy'               // 个性化渠道文案
  | 'bpmn_flow'                  // BPMN 可执行流程图
  | 'campaign_report'            // 活动复盘报告
  | 'text'                       // 纯文本回复
```

### 7.3 LLM 响应示例

```json
{
  "responseType": "plan_form",
  "data": {
    "title": "双十一大促销活动",
    "timeline": { "startDate": "2024-11-01", "endDate": "2024-11-11" },
    "objectives": "提升品牌知名度，增加销售额30%",
    "channels": ["wechat_official", "douyin"],
    "targetAudience": "18-35岁年轻用户",
    "strategies": "前期预热 + 限时优惠 + 会员专属"
  },
  "message": "好的，我已根据您的需求生成了初步方案，请确认或修改："
}
```

### 7.4 前端处理逻辑

```typescript
// 在 MarketingChatArea.vue 中处理 LLM 响应
const processLLMResponse = async (response: LLMResponse) => {
  const aiMessage: Message = {
    role: 'assistant',
    content: response.message,
    timestamp: new Date()
  }

  switch (response.responseType) {
    case 'plan_form':
      aiMessage.hasForm = true
      aiMessage.formData = response.data
      break
    case 'audience_selector':
      aiMessage.hasAudienceSelector = true
      aiMessage.audienceData = response.data
      break
    case 'reach_strategy':
      aiMessage.hasReachStrategy = true
      aiMessage.reachStrategyData = response.data
      // 解析 Mermaid 代码
      if (response.data.mermaidCode) {
        const { extractMermaidCode, renderMermaid } = useMermaidParser()
        // 渲染流程图...
      }
      break
    // ... 其他类型处理
  }

  messages.value.push(aiMessage)
}

## 8. 渐进式实现策略

### Phase 1: 基础框架
- 三栏布局页面结构
- 路由配置
- 基本的会话切换

### Phase 2: 聊天功能
- 复用/适配现有聊天逻辑
- 营销专用 System Prompt

### Phase 3: 方案预览 + 后端 API
- **后端：营销方案 API（/api/marketing-plans）**
  - 创建方案 POST
  - 获取方案列表 GET
  - 获取方案详情 GET /:id
  - 更新方案 PUT /:id
  - 删除方案 DELETE /:id
- **前端：方案解析逻辑**
- **前端：右侧面板只读展示**（使用新的数据模型）

### Phase 4: 方案编辑（后续迭代，不在本次范围内）
- 表单编辑功能
- 版本历史
- 导出功能（PDF、Markdown）

---

## 9. 多步骤对话流程状态管理

### 9.1 系统参与者

```
┌──────────┐     ┌─────────────┐     ┌────────────────┐     ┌──────────────┐
│ 运营人员  │ ←→  │ MarketAgent │ ←→  │ WorkflowEngine │ ←→  │ 低代码平台   │
│          │     │    (MA)      │     │      (WE)       │     │    (LCP)     │
└──────────┘     └─────────────┘     └────────────────┘     └──────────────┘
                                              ↓
                        ┌─────────────────────┼─────────────────────┐
                        ↓                     ↓                     ↓
                 ┌──────────┐          ┌──────────┐          ┌──────────┐
                 │ 短信服务  │          │ 企业微信  │          │   App    │
                 └──────────┘          └──────────┘          └──────────┘
                        ↓                     ↓                     ↓
                        └─────────────────────┴─────────────────────┘
                                              ↓
                                       ┌──────────┐
                                       │ 终端用户  │
                                       └──────────┘
```

| 参与者 | 说明 |
|-------|------|
| 运营人员 | 使用营销智能体的运营用户，负责策划和启动营销活动 |
| MarketAgent (MA) | 营销智能体，负责对话交互、调用 LLM 处理用户消息、方案生成、流程编排 |
| WorkflowEngine (WE) | 工作流引擎，负责生成和执行 BPMN 流程 |
| 低代码平台 (LCP) | 低代码平台，负责生成和托管营销页 |
| 短信服务 | 短信推送服务，负责发送营销短信 |
| 企业微信 | 企微消息服务，负责发送企微通知 |
| App | 移动应用端，负责 Push 通知和展示营销页 |
| 终端用户 | 营销活动的目标受众，接收营销信息的用户 |

### 9.2 对话流程步骤（11 步完整流程）

根据交互流程设计，整个营销方案创建过程分为以下步骤：

```
┌─────────────────────────────────────────────────────────────────┐
│                    营销活动策划阶段                               │
├─────────────────────────────────────────────────────────────────┤
│ 步骤1:  活动描述输入     → 用户输入活动描述，MA 回复方案确认表单     │
│ 步骤2:  方案确认         → 用户确认方案，MA 回复人群选择界面        │
│ 步骤3:  人群选择         → 用户选择人群，MA 回复人群推荐详情        │
│ 步骤4:  人群推荐确认     → 用户确认推荐，MA 回复触达策略流程图      │
│ 步骤5:  触达策略确认     → 用户确认策略，MA 回复商品推荐配置表单    │
│ 步骤6:  商品配置确认     → 用户确认配置，MA 生成智能策略           │
│ 步骤7:  智能策略确认     → 用户确认策略，MA 回复推广渠道选择        │
│ 步骤8:  推广渠道确认     → 用户选择渠道，MA 回复个性化渠道文案      │
│ 步骤9:  渠道文案确认     → 用户确认文案，MA 调用 WA 生成 BPMN      │
├─────────────────────────────────────────────────────────────────┤
│                    活动执行阶段                                   │
├─────────────────────────────────────────────────────────────────┤
│ 步骤10: 活动启动         → 用户确认 BPMN，WA 执行流程              │
├─────────────────────────────────────────────────────────────────┤
│                    活动复盘阶段                                   │
├─────────────────────────────────────────────────────────────────┤
│ 步骤11: 活动复盘         → 活动结束后，MA 生成复盘和分析报告        │
└─────────────────────────────────────────────────────────────────┘

注：每一步 MA 都会在右侧面板更新营销方案预览
```

### 9.3 对话流程状态

```typescript
// 对话流程步骤枚举（11 步）
enum ConversationStep {
  INITIAL = 'initial',                          // 步骤1: 活动描述输入
  PLAN_FORM = 'plan_form',                      // 步骤2: 方案确认表单
  AUDIENCE_SELECT = 'audience_select',           // 步骤3: 人群选择
  AUDIENCE_RECOMMEND = 'audience_recommend',     // 步骤4: 人群推荐详情
  REACH_STRATEGY = 'reach_strategy',             // 步骤5: 触达策略流程图
  PRODUCT_CONFIG = 'product_config',             // 步骤6: 商品推荐配置
  SMART_STRATEGY = 'smart_strategy',             // 步骤7: 智能策略
  CHANNEL_SELECT = 'channel_select',             // 步骤8: 推广渠道选择
  CHANNEL_COPY = 'channel_copy',                 // 步骤9: 个性化渠道文案
  BPMN_GENERATION = 'bpmn_generation',           // 步骤10: BPMN 流程图
  CAMPAIGN_RUNNING = 'campaign_running',         // 活动执行中
  CAMPAIGN_REPORT = 'campaign_report',           // 步骤11: 活动复盘报告
  COMPLETED = 'completed'                        // 流程完成
}

// 对话流程状态
interface ConversationFlowState {
  currentStep: ConversationStep

  // 步骤2: 方案确认表单数据
  planFormData: MarketingPlanFormData | null
  planFormSubmitted: boolean

  // 步骤3: 人群选择数据
  selectedAudienceId: string | null
  audienceSelectSubmitted: boolean

  // 步骤4: 人群推荐详情数据
  audienceRecommendation: AudienceRecommendation | null
  audienceRecommendSubmitted: boolean

  // 步骤5: 触达策略流程图数据（Mermaid 格式）
  reachStrategyData: ReachStrategyData | null
  reachStrategySubmitted: boolean

  // 步骤6: 商品推荐配置数据
  productConfigData: ProductConfigData | null
  productConfigSubmitted: boolean

  // 步骤7: 智能策略数据
  smartStrategyData: SmartStrategyData | null
  smartStrategySubmitted: boolean

  // 步骤8: 推广渠道选择数据
  selectedChannels: string[] | null
  channelSelectSubmitted: boolean

  // 步骤9: 个性化渠道文案数据
  channelCopyData: ChannelCopyData | null
  channelCopySubmitted: boolean

  // 步骤10: BPMN 可执行流程图数据
  bpmnData: BpmnFlowData | null
  bpmnSubmitted: boolean

  // 步骤11: 活动复盘报告数据
  campaignReportData: CampaignReportData | null

  // 最终方案
  finalPlan: MarketingPlan | null
}
```

### 9.4 新增数据模型

```typescript
// 步骤5: 触达策略流程图数据
interface ReachStrategyData {
  mermaidCode: string              // Mermaid 格式流程图代码
  stages: Array<{
    name: string                   // 阶段名称
    channels: string[]             // 触达渠道
    actions: string[]              // 关键动作
  }>
  confirmed: boolean
}

// 步骤6: 商品推荐配置数据
interface ProductConfigData {
  products: Array<{
    id: string
    name: string
    category: string
    price: number
    selected: boolean
  }>
  coupons: Array<{
    id: string
    name: string
    discount: string
    conditions: string
    selected: boolean
  }>
  benefits: Array<{
    id: string
    name: string
    description: string
    selected: boolean
  }>
  confirmed: boolean
}

// 步骤7: 智能策略数据
interface SmartStrategyData {
  strategyName: string
  description: string
  rules: Array<{
    condition: string              // 触发条件
    action: string                 // 执行动作
    priority: number
  }>
  expectedConversion: number       // 预期转化率
  confirmed: boolean
}

// 步骤9: 渠道文案数据
interface ChannelCopyData {
  copies: Array<{
    channel: string                // 渠道名称
    title: string                  // 文案标题
    content: string                // 文案内容
    imageUrl?: string              // 配图（可选）
  }>
  confirmed: boolean
}

// 步骤10: BPMN 流程数据
interface BpmnFlowData {
  bpmnXml: string                  // BPMN XML 格式
  processId: string                // 流程 ID
  processName: string              // 流程名称
  nodes: Array<{
    id: string
    type: string
    name: string
  }>
  confirmed: boolean
}

// 步骤11: 活动复盘报告数据
interface CampaignReportData {
  summary: string                  // 执行摘要
  metrics: Array<{
    name: string                   // 指标名称
    target: string                 // 目标值
    actual: string                 // 实际值
    achievement: number            // 达成率
  }>
  insights: string[]               // 洞察分析
  recommendations: string[]        // 优化建议
  generatedAt: string
}
```

### 9.5 步骤转换逻辑

```typescript
// useConversationFlow.ts
export function useConversationFlow() {
  const flowState = ref<ConversationFlowState>({
    currentStep: ConversationStep.INITIAL,
    planFormData: null,
    planFormSubmitted: false,
    selectedAudienceId: null,
    audienceSelectSubmitted: false,
    audienceRecommendation: null,
    audienceRecommendSubmitted: false,
    reachStrategyData: null,
    reachStrategySubmitted: false,
    productConfigData: null,
    productConfigSubmitted: false,
    smartStrategyData: null,
    smartStrategySubmitted: false,
    selectedChannels: null,
    channelSelectSubmitted: false,
    channelCopyData: null,
    channelCopySubmitted: false,
    bpmnData: null,
    bpmnSubmitted: false,
    campaignReportData: null,
    finalPlan: null
  })

  // 步骤1→2: 提交活动描述 → MA 回复方案确认表单
  const submitActivityDescription = async (description: string) => {
    flowState.value.currentStep = ConversationStep.PLAN_FORM
    // 触发 MA 回复方案确认表单，更新右侧预览
  }

  // 步骤2→3: 提交方案表单 → MA 回复人群选择界面
  const submitPlanForm = async (formData: MarketingPlanFormData) => {
    flowState.value.planFormData = formData
    flowState.value.planFormSubmitted = true
    flowState.value.currentStep = ConversationStep.AUDIENCE_SELECT
    // 触发 MA 回复人群选择界面，更新右侧预览
  }

  // 步骤3→4: 提交人群选择 → MA 回复人群推荐详情
  const submitAudienceSelect = async (audienceId: string) => {
    flowState.value.selectedAudienceId = audienceId
    flowState.value.audienceSelectSubmitted = true
    flowState.value.currentStep = ConversationStep.AUDIENCE_RECOMMEND
    // 触发 MA 回复人群推荐详情，更新右侧预览
  }

  // 步骤4→5: 提交人群推荐 → MA 回复触达策略流程图
  const submitAudienceRecommend = async (recommendation: AudienceRecommendation) => {
    flowState.value.audienceRecommendation = recommendation
    flowState.value.audienceRecommendSubmitted = true
    flowState.value.currentStep = ConversationStep.REACH_STRATEGY
    // 触发 MA 回复触达策略流程图（Mermaid 格式），更新右侧预览
  }

  // 步骤5→6: 提交触达策略 → MA 回复商品推荐配置表单
  const submitReachStrategy = async (data: ReachStrategyData) => {
    flowState.value.reachStrategyData = data
    flowState.value.reachStrategySubmitted = true
    flowState.value.currentStep = ConversationStep.PRODUCT_CONFIG
    // 触发 MA 回复商品推荐配置表单，更新右侧预览
  }

  // 步骤6→7: 提交商品配置 → MA 生成智能策略
  const submitProductConfig = async (data: ProductConfigData) => {
    flowState.value.productConfigData = data
    flowState.value.productConfigSubmitted = true
    flowState.value.currentStep = ConversationStep.SMART_STRATEGY
    // 触发 MA 生成智能策略，更新右侧预览
  }

  // 步骤7→8: 提交智能策略 → MA 回复推广渠道选择
  const submitSmartStrategy = async (data: SmartStrategyData) => {
    flowState.value.smartStrategyData = data
    flowState.value.smartStrategySubmitted = true
    flowState.value.currentStep = ConversationStep.CHANNEL_SELECT
    // 触发 MA 回复推广渠道选择，更新右侧预览
  }

  // 步骤8→9: 提交推广渠道 → MA 回复个性化渠道文案
  const submitChannelSelect = async (channels: string[]) => {
    flowState.value.selectedChannels = channels
    flowState.value.channelSelectSubmitted = true
    flowState.value.currentStep = ConversationStep.CHANNEL_COPY
    // 触发 MA 回复个性化渠道文案，更新右侧预览
  }

  // 步骤9→10: 提交渠道文案 → MA 调用 WA 生成 BPMN
  const submitChannelCopy = async (data: ChannelCopyData) => {
    flowState.value.channelCopyData = data
    flowState.value.channelCopySubmitted = true
    flowState.value.currentStep = ConversationStep.BPMN_GENERATION
    // 触发 MA 调用 WA 生成 BPMN 可执行流程图，更新右侧预览（完整方案）
  }

  // 步骤10: 确认 BPMN → WA 执行流程
  const submitBpmn = async () => {
    flowState.value.bpmnSubmitted = true
    flowState.value.currentStep = ConversationStep.CAMPAIGN_RUNNING
    // 触发 WA 执行 BPMN 流程
  }

  // 步骤11: 活动结束 → MA 生成复盘报告
  const generateCampaignReport = async () => {
    flowState.value.currentStep = ConversationStep.CAMPAIGN_REPORT
    // 触发 MA 生成活动复盘和分析报告，更新右侧预览（含复盘报告）
  }

  // 重置流程
  const resetFlow = () => {
    flowState.value = {
      currentStep: ConversationStep.INITIAL,
      planFormData: null,
      planFormSubmitted: false,
      selectedAudienceId: null,
      audienceSelectSubmitted: false,
      audienceRecommendation: null,
      audienceRecommendSubmitted: false,
      reachStrategyData: null,
      reachStrategySubmitted: false,
      productConfigData: null,
      productConfigSubmitted: false,
      smartStrategyData: null,
      smartStrategySubmitted: false,
      selectedChannels: null,
      channelSelectSubmitted: false,
      channelCopyData: null,
      channelCopySubmitted: false,
      bpmnData: null,
      bpmnSubmitted: false,
      campaignReportData: null,
      finalPlan: null
    }
  }

  return {
    flowState,
    submitActivityDescription,
    submitPlanForm,
    submitAudienceSelect,
    submitAudienceRecommend,
    submitReachStrategy,
    submitProductConfig,
    submitSmartStrategy,
    submitChannelSelect,
    submitChannelCopy,
    submitBpmn,
    generateCampaignReport,
    resetFlow
  }
}
```

---

## 10. 当前实现状态

### 10.1 已完成功能（Phase 1-10）

**✅ Phase 1: 基础框架**
- 三栏布局页面 (`MarketingAgentPage.vue`)
- 路由配置 (`/marketing-agent`)
- 首页入口 (`HomePage.vue`)
- 自动创建/选择会话

**✅ Phase 2: 会话列表**
- 会话列表组件 (`MarketingConversationList.vue`)
- 新建、切换、删除会话
- 会话数据加载

**✅ Phase 3: 聊天功能**
- 聊天区域组件 (`MarketingChatArea.vue`)
- 消息列表展示（用户/AI 区分）
- Markdown 内容渲染
- 消息自动滚动
- 多行文本输入（Enter 发送 / Shift+Enter 换行）
- 模拟 AI 响应（待真实 Claude API 集成）
- 消息持久化

**✅ Phase 4: 后端 API**
- 营销方案数据模型（`MarketingPlan`）
- 营销方案 CRUD API (`/api/marketing-plans`)
- 数据库表 (`marketing_plans`)
- Service 层实现

**✅ Phase 5: 表单嵌入聊天窗口**
- 营销方案表单组件 (`MarketingPlanForm.vue`)
- 六个核心字段：活动主题、活动时间、活动目标、触达渠道、活动人群、活动策略
- 表单封装方法 (`useMarketingPlanForm.ts`)
- AI 响应解析生成表单数据
- 表单提交后状态更新（变为只读 + "已提交"标识）
- **已实现自动触发下一步流程**

**✅ Phase 6: 人群选择和推荐**
- 人群选择组件 (`AudienceSelector.vue`)
  - 展示人群列表（名称、描述、规模）
  - 单选 UI + "新建人群"选项
  - 提交后自动触发人群推荐详情
- 人群推荐详情组件 (`AudienceRecommendation.vue`)
  - 核心指标展示（规模、大盘占比、转化概率）
  - 可编辑价值分层标签（蓝色）
  - 可编辑画像指标标签（绿色）
  - 标签内联编辑功能
  - 确认后显示完成提示

**✅ Phase 7: 营销流程图（T23-T24）**
- 营销流程图组件 (`MarketingFlowChart.vue`)
- 用户旅程图展示（固定数据结构，预留 AI 接口）
- 查看大图功能（模态框）
- "确定"按钮确认流程图

**✅ Phase 8: 新增交互步骤组件（步骤5-9，T25-T29）**
- `ReachStrategyChart.vue` - 触达策略流程图（卡片式可视化）
- `ProductConfigForm.vue` - 商品推荐配置
- `SmartStrategyDisplay.vue` - 智能策略展示
- `ChannelSelector.vue` - 推广渠道选择
- `ChannelCopyEditor.vue` - 个性化渠道文案

**✅ Phase 9: BPMN + 活动复盘（步骤10-11，T30-T31）**
- `BpmnFlowChart.vue` - BPMN 可执行流程图（节点卡片式展示）
- `CampaignReport.vue` - 活动复盘报告（含指标、渠道表现、洞察、建议）

**✅ Phase 10: 对话流程状态管理（T32-T33）**
- `useConversationFlow.ts` composable
- 完整 11 步流程状态管理
- 步骤转换逻辑
- 各步骤确认方法
- 进度计算和步骤跳转

**当前使用 Mock 数据：**
- 人群数据（3 个预设人群）
- 人群推荐详情
- AI 响应（总是返回表单）
- 触达策略、商品配置、智能策略等各步骤数据

### 10.2 待实现功能

**⏳ Phase 11: 优化和重构（T34-T36）**
- 提取 composable（`useMarketingAgent.ts`）
- 错误处理完善
- 样式优化和动画
- 移动端适配

**⏳ Phase 12: LLM 集成和 Mermaid 渲染**
- 真实 Claude API 集成
- LLM 响应格式解析
- `useMermaidParser.ts` composable 实现
- Mermaid 流程图渲染（替代当前卡片式展示）
- 右侧预览面板嵌入 BPMN 画布

### 10.3 技术债务

1. **真实 Claude API 集成**：当前使用模拟响应，需要集成真实 Claude API
2. **后端人群 API**：当前使用前端 mock 数据，需要实现后端 `/api/audiences` API
3. **消息元数据持久化**：表单、人群选择、推荐数据需要完整持久化到 `messages` 表的 `metadata` 字段
4. **错误处理**：网络错误、API 失败、解析失败等场景需要友好提示
5. **加载状态**：人群加载、推荐生成等需要更好的加载状态展示

### 10.4 不包含在第一版（后续迭代）

- ❌ 方案版本历史
- ❌ PDF 导出
- ❌ 高级筛选和搜索
- ❌ 表单字段自定义配置
- ❌ 流程图编辑功能
- ❌ 多人协作
