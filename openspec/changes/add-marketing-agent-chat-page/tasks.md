# Tasks: 营销智能体聊天页面实现任务

## 阶段一：基础框架搭建

### T1. 路由配置
- [x] T1.1 在 `router/index.ts` 添加 `/marketing-agent` 路由
- [x] T1.2 配置路由元信息（标题、权限等）

**验证**：访问 `/marketing-agent` 路径能正确加载页面组件

### T2. 页面容器组件
- [x] T2.1 创建 `MarketingAgentPage.vue` 主容器
- [x] T2.2 实现三栏 Flexbox 布局
- [x] T2.3 添加面板折叠/展开控制
- [x] T2.4 实现响应式断点处理

**验证**：页面显示三栏布局，面板可折叠，不同屏幕宽度下布局正确调整

**依赖**：T1

### T3. 首页入口
- [x] T3.1 在 `HomePage.vue` 添加营销智能体卡片入口
- [x] T3.2 添加图标和描述

**验证**：首页显示营销智能体入口，点击可跳转

**依赖**：T1

---

## 阶段二：左侧会话列表

### T4. 会话列表组件
- [x] T4.1 创建 `MarketingConversationList.vue` 组件
- [x] T4.2 实现会话列表渲染（复用 ChatBox 样式）
- [x] T4.3 实现会话选中状态
- [x] T4.4 实现新建会话按钮
- [x] T4.5 实现删除会话功能（带确认弹窗）

**验证**：会话列表正确显示，支持选中、新建、删除操作

**依赖**：T2

### T5. 会话数据加载
- [x] T5.1 复用 `chatApiService` 加载会话列表
- [x] T5.2 实现会话列表分页/懒加载（可选）
- [x] T5.3 实现加载状态展示

**验证**：从后端正确加载会话列表，显示加载状态

**依赖**：T4

---

## 阶段三：中间聊天区域

### T6. 聊天区域组件
- [x] T6.1 创建 `MarketingChatArea.vue` 组件
- [x] T6.2 实现消息列表容器（复用 ChatBox 样式）
- [x] T6.3 实现消息气泡组件（用户/AI 区分）
- [x] T6.4 实现 Markdown 内容渲染（复用 renderMarkdown）
- [x] T6.5 实现消息区域自动滚动

**验证**：消息正确显示，Markdown 渲染正常，新消息自动滚动到底部

**依赖**：T4

**状态**: ✅ 完成

### T7. 消息输入区域
- [x] T7.1 实现多行文本输入框
- [x] T7.2 实现 Enter 发送 / Shift+Enter 换行
- [x] T7.3 实现发送按钮和禁用状态
- [x] T7.4 添加输入提示文本

**验证**：输入框功能正常，快捷键工作正确

**依赖**：T6

**状态**: ✅ 完成

### T8. Claude API 集成
- [x] T8.1 复用 `claudeLlmService` 发送消息（模拟响应已实现）
- [x] T8.2 实现流式响应处理（UI 已支持）
- [x] T8.3 实现进度日志显示
- [ ] T8.4 添加营销专用 System Prompt（待实际集成）

**验证**：发送消息后收到 AI 响应，流式输出正常，进度日志显示

**依赖**：T7

**状态**: ⚠️ 部分完成（UI完成，待真实API集成）

**注意**: 当前使用模拟响应，真实Claude API集成需要在实际使用时添加。

### T9. 消息持久化
- [x] T9.1 发送消息时保存到后端
- [x] T9.2 切换会话时加载历史消息
- [x] T9.3 处理保存失败情况

**验证**：消息正确保存到数据库，切换会话后消息正确加载

**依赖**：T8

**状态**: ✅ 完成

---

## 阶段四：营销方案数据模型和后端 API

### T10. 后端：营销方案数据模型
- [x] T10.1 创建 `marketing_plans` 数据库表（迁移文件）
- [x] T10.2 定义 MarketingPlan TypeScript 模型（包含六个核心字段）
- [x] T10.3 实现 MarketingPlanService 层

**验证**：数据库表创建成功，Service 方法正常工作

### T11. 后端：营销方案 CRUD API
- [x] T11.1 实现 POST /api/marketing-plans（创建方案）
- [x] T11.2 实现 GET /api/marketing-plans（获取列表，支持分页和筛选）
- [x] T11.3 实现 GET /api/marketing-plans/:id（获取详情）
- [x] T11.4 实现 PUT /api/marketing-plans/:id（更新方案）
- [x] T11.5 实现 DELETE /api/marketing-plans/:id（删除方案）
- [x] T11.6 实现 GET /api/conversations/:id/plan（获取会话关联方案）

**验证**：所有 API 端点正常工作，返回正确的响应格式

**依赖**：T10

### T12. 前端：方案数据类型
- [x] T12.1 定义 `MarketingPlan` TypeScript 接口（六个核心字段）
- [x] T12.2 创建类型定义文件
- [x] T12.3 创建 `marketingPlanApiService.ts` 封装 API 调用

**验证**：类型定义完整，编译无错误，API 调用正常

**可并行**：与 T10, T11 并行

---

**注意**：需要运行数据库迁移来创建表：
```bash
psql -U lothar -d workflow_engine -f server-go/migrations/000004_add_marketing_plan_tables.up.sql
```

---

## 阶段五：可交互表单（嵌入聊天窗口）+ 右侧预览

### T13. 右侧方案预览组件（只读）
- [x] T13.1 创建 `MarketingPlanPreview.vue` 组件
- [x] T13.2 实现面板头部（标题、折叠按钮）
- [x] T13.3 实现空状态展示（引导用户对话）
- [x] T13.4 实现加载状态展示
- [x] T13.5 实现方案只读预览展示

**验证**：右侧面板正确显示，空状态和加载状态正常，方案只读展示

**依赖**：T2

**状态**: ✅ 完成

### T14. 表单封装方法（useMarketingPlanForm）
- [x] T14.1 创建 `composables/useMarketingPlanForm.ts`
- [x] T14.2 定义 `MarketingPlanFormData` 类型
- [x] T14.3 实现表单状态管理（formData ref）
- [x] T14.4 实现表单验证规则（formRules）
- [x] T14.5 实现渠道选项配置（channelOptions）
- [x] T14.6 实现 `generateFormFromAIResponse` 方法（从 AI 响应解析）
- [x] T14.7 实现 `planToFormData` 方法（Plan → FormData）
- [x] T14.8 实现 `formDataToPlan` 方法（FormData → Plan）
- [x] T14.9 实现 `resetForm` 方法
- [x] T14.10 实现 `validateForm` 方法

**验证**：所有封装方法正常工作，数据转换正确

**可并行**：与 T13 并行

**状态**: ✅ 完成

### T15. 可交互表单组件（嵌入聊天窗口）
- [x] T15.1 创建 `MarketingPlanForm.vue` 组件
- [x] T15.2 实现活动主题字段（Input）
- [x] T15.3 实现活动起始时间字段（RangePicker）
- [x] T15.4 实现活动目标字段（TextArea）
- [x] T15.5 实现触达渠道字段（Select multiple）
- [x] T15.6 实现活动人群字段（TextArea）
- [x] T15.7 实现活动策略字段（TextArea）
- [x] T15.8 实现"确定"提交按钮
- [x] T15.9 实现表单验证和错误提示
- [x] T15.10 实现编辑字段的视觉标识
- [x] T15.11 实现已提交状态（只读 + "已提交"标识）

**验证**：表单各字段可编辑，验证正常工作，提交后变为只读

**依赖**：T12, T14

**状态**: ✅ 完成

### T16. 表单嵌入聊天消息
- [x] T16.1 扩展消息类型，支持包含表单的 AI 回复
- [x] T16.2 在 `MarketingChatArea.vue` 中渲染嵌入式表单
- [x] T16.3 实现表单与消息的关联（messageId）
- [x] T16.4 处理表单提交后的消息状态更新
- [x] T16.5 实现表单提交后触发人群选择流程

**验证**：表单正确嵌入 AI 回复消息中，提交后自动进入人群选择步骤

**依赖**：T6, T15

**状态**: ✅ 完成

### T17. 方案解析逻辑
- [x] T17.1 定义 AI 输出格式规范（JSON Schema）
  - 创建 `AIMarketingPlanOutput` 接口，支持中英文字段名
  - 创建 `ParseResult` 接口，包含 success/error/rawContent 字段
- [x] T17.2 实现从 AI 响应中提取方案数据的解析器
  - `extractJSONFromText`: 支持 ```json```, ``` ```, 纯 JSON, 嵌入式 JSON
  - `extractFieldsFromText`: 从 Markdown/纯文本提取字段
  - `parseAIResponse`: 综合解析方法，返回详细结果
  - `parseAIDataToFormData`: 增强的字段解析，支持多种数据结构
- [x] T17.3 处理解析失败情况（仅显示原始内容，不显示表单）
  - 解析失败时 `parseResult.success = false`
  - `MarketingChatArea.vue` 根据解析结果决定是否显示表单
  - 失败时显示原始 Markdown 内容

**验证**：从 AI 响应中正确解析出营销方案，解析失败时优雅降级

**依赖**：T8, T14

**状态**: ✅ 完成

### T18. 表单提交与右侧面板联动
- [x] T18.1 表单提交后保存到后端
  - `handleFormSubmit` 调用 `marketingPlanApiService.createPlan`
  - 转换 FormData 为 CreateMarketingPlanRequest 格式
- [x] T18.2 表单提交后更新右侧面板预览
  - 通过 `emit('planSubmitted')` 通知父组件
  - 父组件 `handlePlanSubmitted` 重新加载方案
- [ ] T18.3 支持多轮对话逐步完善方案（后续迭代）
- [ ] T18.4 新方案生成时更新聊天窗口中的表单（后续迭代）

**验证**：对话过程中表单实时更新，提交后右侧面板同步显示

**依赖**：T13, T16, T17

**状态**: ⚠️ 部分完成（核心功能完成，T18.3 和 T18.4 后续迭代）

---

## 阶段六：人群选择功能

### T19. 人群数据 API（后端）
- [ ] T19.1 创建 `audiences` 数据库表
- [ ] T19.2 实现 GET /api/audiences（获取人群列表）
- [ ] T19.3 实现 GET /api/audiences/:id/recommendation（获取人群推荐详情）
- [ ] T19.4 实现 POST /api/audiences（创建新人群）

**验证**：人群 API 正常工作，返回正确的数据格式

### T20. 人群选择组件（AudienceSelector.vue）
- [x] T20.1 创建 `AudienceSelector.vue` 组件
- [x] T20.2 实现人群列表展示（名称、描述、人群规模）
- [x] T20.3 实现人群单选功能（单选按钮UI）
- [x] T20.4 实现"新建人群"按钮
- [x] T20.5 实现"确定选择"按钮
- [x] T20.6 实现已选择后的只读状态（绿色徽章）
- [x] T20.7 嵌入到 `MarketingChatArea.vue` 聊天消息中
- [x] T20.8 实现选择后自动触发人群推荐详情

**验证**：人群选择组件正确嵌入聊天窗口，选择功能正常，提交后自动进入下一步

**依赖**：T16

**状态**: ✅ 完成（使用模拟数据，暂不依赖后端 API）

### T21. 人群推荐详情组件（AudienceRecommendation.vue）
- [x] T21.1 创建 `AudienceRecommendation.vue` 组件
- [x] T21.2 实现核心指标展示（人群规模、大盘占比、转化概率）
- [x] T21.3 实现价值分层标签展示和编辑（蓝色标签）
- [x] T21.4 实现画像指标标签展示和编辑（绿色标签）
- [x] T21.5 实现"确认人群"按钮
- [x] T21.6 实现确认后的只读状态（绿色徽章）
- [x] T21.7 嵌入到 `MarketingChatArea.vue` 聊天消息中
- [x] T21.8 实现标签内联编辑功能（输入框 + 保存/取消）

**验证**：人群推荐详情正确展示，标签可编辑，确认功能正常

**依赖**：T20

**状态**: ✅ 完成

### T22. 人群选择封装方法（useAudienceSelection.ts）
- [x] T22.1 创建 `composables/useAudienceSelection.ts`
- [x] T22.2 实现 `fetchAudiences` 方法（使用 Mock 数据）
- [x] T22.3 实现 `fetchRecommendation` 方法（使用 Mock 数据）
- [x] T22.4 实现 `selectAudience` 方法
- [x] T22.5 实现 `updateValueTags` 方法
- [x] T22.6 实现 `updateProfileTags` 方法
- [x] T22.7 实现 `confirmSelection` 方法

**验证**：所有封装方法正常工作

**可并行**：与 T20, T21 并行

**状态**: ✅ 完成（使用 Mock 数据，预留真实 API 接口）

---

## 阶段七：营销流程图生成

### T23. 营销流程图组件（MarketingFlowChart.vue）
- [x] T23.1 创建 `MarketingFlowChart.vue` 组件
- [x] T23.2 复用现有 AI 画图能力生成用户旅程图（暂用固定结构，预留 AI 接口）
- [x] T23.3 实现流程图缩略图展示
- [x] T23.4 实现"查看大图"按钮
- [x] T23.5 实现全屏模态框展示
- [x] T23.6 实现缩放和平移功能（暂时跳过，使用固定视图）
- [x] T23.7 实现"确定"按钮（用户确认流程图后进入下一步）
- [x] T23.8 实现确认后的只读状态

**验证**：流程图正确生成并展示，查看大图功能正常，点击"确定"后进入方案保存步骤

**依赖**：T21

**状态**: ✅ 完成（使用固定数据结构，后续可接入 AI 能力）

### T24. 流程图生成逻辑
- [x] T24.1 定义用户旅程图的数据结构（FlowChartData 接口）
- [x] T24.2 实现从营销方案和人群信息生成流程图数据（triggerFlowChartGeneration）
- [x] T24.3 调用 AI 画图能力生成 BPMN/流程图（暂用固定数据，预留 AI 接口）
- [x] T24.4 处理生成失败情况（错误提示、重试）

**验证**：流程图数据正确生成，AI 画图调用成功

**依赖**：T23

**状态**: ✅ 完成（使用固定示例数据，后续可接入真实 AI 生成）

---

## 阶段八：新增交互步骤组件（步骤5-9）

### T25. 触达策略流程图组件（ReachStrategyChart.vue，步骤5）
- [x] T25.1 创建 `ReachStrategyChart.vue` 组件
- [x] T25.2 实现可视化流程图渲染（卡片式）
- [x] T25.3 展示用户旅程各阶段（认知→兴趣→转化→留存）
- [x] T25.4 展示各阶段的触达渠道和关键动作
- [x] T25.5 实现"确定"按钮
- [x] T25.6 实现确认后的只读状态
- [x] T25.7 嵌入到 MarketingChatArea.vue 聊天消息中

**验证**：流程图正确渲染，确认后进入商品推荐配置步骤

**依赖**：T21

**状态**: ✅ 完成

### T26. 商品推荐配置表单（ProductConfigForm.vue，步骤6）
- [x] T26.1 创建 `ProductConfigForm.vue` 组件
- [x] T26.2 实现推荐商品列表展示和选择（复选框）
- [x] T26.3 实现优惠券列表展示和选择（复选框）
- [x] T26.4 实现权益配置展示和选择（复选框）
- [x] T26.5 实现"确定"按钮
- [x] T26.6 实现确认后的只读状态
- [x] T26.7 嵌入到 MarketingChatArea.vue 聊天消息中

**验证**：商品、优惠券、权益可选择，确认后触发智能策略生成

**依赖**：T25

**状态**: ✅ 完成

### T27. 智能策略展示组件（SmartStrategyDisplay.vue，步骤7）
- [x] T27.1 创建 `SmartStrategyDisplay.vue` 组件
- [x] T27.2 展示策略名称和描述
- [x] T27.3 展示策略规则列表（条件→动作）
- [x] T27.4 展示预期转化率
- [x] T27.5 实现"确定"按钮
- [x] T27.6 实现确认后的只读状态
- [x] T27.7 嵌入到 MarketingChatArea.vue 聊天消息中

**验证**：智能策略详情正确展示，确认后进入推广渠道选择

**依赖**：T26

**状态**: ✅ 完成

### T28. 推广渠道选择组件（ChannelSelector.vue，步骤8）
- [x] T28.1 创建 `ChannelSelector.vue` 组件（注意：与步骤3人群选择的 AudienceSelector 不同）
- [x] T28.2 实现渠道多选功能（复选框 UI）
- [x] T28.3 渠道列表：微信公众号、微信小程序、抖音、小红书、短信、邮件、APP Push
- [x] T28.4 实现"确定"按钮
- [x] T28.5 实现确认后的只读状态
- [x] T28.6 嵌入到 MarketingChatArea.vue 聊天消息中

**验证**：渠道可多选，确认后进入个性化渠道文案步骤

**依赖**：T27

**状态**: ✅ 完成

### T29. 个性化渠道文案组件（ChannelCopyEditor.vue，步骤9）
- [x] T29.1 创建 `ChannelCopyEditor.vue` 组件
- [x] T29.2 按渠道分组展示文案
- [x] T29.3 实现文案标题编辑功能
- [x] T29.4 实现文案内容编辑功能
- [x] T29.5 实现"确定"按钮
- [x] T29.6 实现确认后的只读状态
- [x] T29.7 嵌入到 MarketingChatArea.vue 聊天消息中

**验证**：各渠道文案可编辑，确认后触发 BPMN 生成

**依赖**：T28

**状态**: ✅ 完成

---

## 阶段九：BPMN 流程和活动复盘（步骤10-11）

### T30. BPMN 可执行流程图组件（BpmnFlowChart.vue，步骤10）
- [x] T30.1 创建 `BpmnFlowChart.vue` 组件
- [x] T30.2 实现可视化流程图渲染（节点卡片式）
- [x] T30.3 实现"预览流程"按钮
- [x] T30.4 实现"确认并执行"按钮
- [x] T30.5 实现确认后的只读状态
- [x] T30.6 嵌入到 MarketingChatArea.vue 聊天消息中
- [x] T30.7 展示执行概览（预计触达人数、执行时长、自动化节点数、人工节点数）

**验证**：BPMN 流程图正确渲染，确认后触发活动执行

**依赖**：T29

**状态**: ✅ 完成

### T31. 活动复盘报告组件（CampaignReport.vue，步骤11）
- [x] T31.1 创建 `CampaignReport.vue` 组件
- [x] T31.2 展示活动概览（名称、时间、状态）
- [x] T31.3 展示核心指标（目标值、实际值、达成率、趋势）
- [x] T31.4 展示渠道表现对比表格
- [x] T31.5 展示 AI 洞察分析列表
- [x] T31.6 展示优化建议列表（带优先级）
- [x] T31.7 嵌入到 MarketingChatArea.vue 聊天消息中
- [x] T31.8 实现"导出报告"和"分享报告"按钮

**验证**：活动复盘报告正确展示，包含所有核心指标和分析

**依赖**：T30

**状态**: ✅ 完成

---

## 阶段十：对话流程状态管理（11 步完整流程）

### T32. 对话流程状态管理（useConversationFlow.ts）
- [x] T32.1 创建 `composables/useConversationFlow.ts`
- [x] T32.2 定义 `ConversationStep` 类型（11 步 + completed）
- [x] T32.3 定义 `FlowStateData` 接口（各步骤数据和提交状态）
- [x] T32.4 定义步骤元数据 `STEP_METADATA`（包含标签、描述、图标等）
- [x] T32.5 实现 `confirmPlan` 方法（步骤2→步骤3）
- [x] T32.6 实现 `selectAudience` 和 `confirmAudience` 方法（步骤3→步骤4）
- [x] T32.7 实现 `confirmReachStrategy` 方法（步骤5→步骤6）
- [x] T32.8 实现 `confirmProductConfig` 方法（步骤6→步骤7）
- [x] T32.9 实现 `confirmSmartStrategy` 方法（步骤7→步骤8）
- [x] T32.10 实现 `confirmChannels` 方法（步骤8→步骤9）
- [x] T32.11 实现 `confirmChannelCopy` 方法（步骤9→步骤10）
- [x] T32.12 实现 `confirmBpmn` 方法（步骤10→活动执行）
- [x] T32.13 实现 `setReportData` 方法（设置复盘报告）
- [x] T32.14 实现 `reset`、`restoreFromState`、`exportState` 方法
- [x] T32.15 实现进度计算和步骤跳转逻辑

**验证**：完整 11 步对话流程顺畅，各步骤点击"确定"后正确触发下一步

**依赖**：T31

**状态**: ✅ 完成

### T33. 多步骤对话流程集成
- [x] T33.1 在 MarketingChatArea.vue 中导入并集成 useConversationFlow
- [x] T33.2 扩展 Message 接口支持所有步骤数据类型
- [x] T33.3 添加所有新组件到 template（ReachStrategyChart、ProductConfigForm 等）
- [x] T33.4 实现各组件"确定"按钮的事件处理器
- [x] T33.5 实现步骤转换时的触发函数（triggerProductConfig、triggerSmartStrategy 等）
- [x] T33.6 实现完整的 11 步演示流程（使用模拟数据）
- [x] T33.7 添加样式支持所有嵌入组件

**验证**：所有"确定"按钮正确触发步骤转换，MA/WA 正确响应生成下一步界面

**依赖**：T32

**状态**: ✅ 完成（使用模拟数据演示完整流程，后续可接入真实 AI 生成）

---

## 阶段十一：状态管理和优化

### T34. Composable 提取
- [ ] T34.1 创建 `useMarketingAgent.ts` composable
- [ ] T34.2 封装会话管理逻辑
- [ ] T34.3 封装方案管理逻辑
- [ ] T34.4 封装消息发送逻辑

**验证**：逻辑正确封装，组件代码简洁

**依赖**：完成阶段八至十后

### T35. 错误处理
- [ ] T35.1 网络错误提示
- [ ] T35.2 API 调用失败重试
- [ ] T35.3 会话加载失败处理

**验证**：各类错误场景下有友好提示

**依赖**：T34

### T36. 样式优化
- [ ] T36.1 统一使用 Ant Design 设计变量
- [ ] T36.2 添加加载和过渡动画
- [ ] T36.3 优化移动端体验

**验证**：视觉效果一致，动画流畅

**依赖**：完成所有功能后

---

## 阶段十二：LLM 集成和 Mermaid 渲染

### T37. 安装 Mermaid 依赖
- [ ] T37.1 安装 mermaid 库：`npm install mermaid`
- [ ] T37.2 配置 TypeScript 类型

**验证**：项目成功编译，无类型错误

### T38. useMermaidParser Composable
- [ ] T38.1 创建 `composables/useMermaidParser.ts`
- [ ] T38.2 实现 `initMermaid` 初始化方法
- [ ] T38.3 实现 `extractMermaidCode` 从文本提取 Mermaid 代码
- [ ] T38.4 实现 `renderMermaid` 渲染方法
- [ ] T38.5 实现 `validateMermaidCode` 验证方法
- [ ] T38.6 添加错误处理和降级显示

**验证**：能正确解析和渲染 Mermaid 格式流程图

**依赖**：T37

### T39. LLM 处理流程集成
- [ ] T39.1 定义 `LLMResponse` 接口和 `LLMResponseType` 类型
- [ ] T39.2 实现 `processLLMResponse` 方法替换当前模拟响应
- [ ] T39.3 集成真实 Claude API 调用
- [ ] T39.4 实现 LLM 响应格式解析和校验
- [ ] T39.5 根据 responseType 渲染对应组件
- [ ] T39.6 添加 LLM 调用失败的错误处理

**验证**：用户消息能正确发送到 LLM，响应能正确解析并渲染组件

**依赖**：T38

### T40. ReachStrategyChart Mermaid 渲染
- [ ] T40.1 在 `ReachStrategyChart.vue` 中集成 useMermaidParser
- [ ] T40.2 替换当前卡片式展示为 Mermaid 渲染
- [ ] T40.3 添加 Mermaid 渲染失败时的降级展示（显示原始代码或卡片式）
- [ ] T40.4 优化 Mermaid 图表样式适配聊天窗口

**验证**：触达策略流程图能以 Mermaid 格式正确渲染

**依赖**：T38

### T41. 右侧预览面板 BPMN 画布嵌入
- [ ] T41.1 在 `MarketingPlanPreview.vue` 中添加 BPMN 画布容器
- [ ] T41.2 复用现有 `BpmnEditor` 组件
- [ ] T41.3 复用 `bpmnAiService.ts` 生成 BPMN
- [ ] T41.4 实现 BPMN 画布只读展示模式
- [ ] T41.5 添加缩放和平移控制

**验证**：右侧预览面板能正确嵌入和展示 BPMN 流程图

**依赖**：T30

---

## 验收测试

### AT1. 端到端流程测试（完整 11 步对话流程）
- [ ] 用户可以创建新会话
- [ ] 用户可以发送消息并收到 MA 回复
- [ ] **步骤1：活动描述输入**
  - [ ] 用户在聊天区域输入活动描述
  - [ ] MA 正确响应并生成方案确认表单
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤2：方案确认**
  - [ ] MA 生成的营销方案以可交互表单形式嵌入聊天窗口
  - [ ] 表单包含六个字段（活动主题、活动时间、活动目标、触达渠道、活动人群、活动策略）
  - [ ] 用户可以编辑表单各字段
  - [ ] 点击"确定"按钮可提交表单
  - [ ] 提交后表单变为只读状态，显示"已提交"标识
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤3：人群选择**
  - [ ] 表单提交后，MA 回复人群选择界面
  - [ ] 展示已划分好的人群列表
  - [ ] 显示每个人群的筛选条件
  - [ ] 提供"新建人群"选项
  - [ ] 用户可选择人群
  - [ ] 点击"确定选择"按钮提交进入下一步
  - [ ] 提交后人群选择变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤4：人群推荐详情**
  - [ ] 选择人群后，MA 展示人群推荐详情
  - [ ] 显示人群规模、大盘占比、转化概率
  - [ ] 价值分层标签可编辑
  - [ ] 画像指标标签可编辑
  - [ ] 点击"确认人群"按钮提交进入下一步
  - [ ] 提交后人群推荐详情变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤5：触达策略流程图**
  - [ ] 确认人群后，MA 生成触达策略流程图（Mermaid 格式）
  - [ ] 流程图正确展示在聊天窗口
  - [ ] 点击"确定"按钮提交进入下一步
  - [ ] 提交后流程图区域变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤6：商品推荐配置**
  - [ ] MA 回复商品推荐配置表单
  - [ ] 展示商品、优惠券、权益列表
  - [ ] 用户可多选配置
  - [ ] 点击"确定"按钮提交进入下一步
  - [ ] 提交后配置变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤7：智能策略**
  - [ ] MA 生成智能策略详情
  - [ ] 展示策略规则和预期转化率
  - [ ] 点击"确定"按钮提交进入下一步
  - [ ] 提交后策略变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤8：推广渠道选择**
  - [ ] MA 回复推广渠道选择界面
  - [ ] 展示各渠道选项（微信、抖音、短信等）
  - [ ] 用户可多选渠道
  - [ ] 点击"确定"按钮提交进入下一步
  - [ ] 提交后渠道选择变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤9：个性化渠道文案**
  - [ ] MA 生成各渠道个性化文案
  - [ ] 用户可编辑文案标题和内容
  - [ ] 点击"确定"按钮提交进入下一步
  - [ ] 提交后文案变为只读状态
  - [ ] 右侧面板更新营销方案预览
- [ ] **步骤10：BPMN 可执行流程图**
  - [ ] MA 调用 WA 生成 BPMN 可执行流程图
  - [ ] BPMN 流程图正确展示在聊天窗口
  - [ ] "查看大图"功能正常
  - [ ] 点击"启动活动"按钮
  - [ ] 右侧面板更新完整营销方案预览
- [ ] **步骤11：活动复盘**
  - [ ] 活动执行结束后，MA 自动生成复盘报告
  - [ ] 展示执行效果、转化数据、指标达成率
  - [ ] 展示优化建议
  - [ ] 右侧面板更新含复盘报告的完整方案
- [ ] 切换会话时数据正确加载
- [ ] 刷新页面后数据不丢失

### AT2. 后端 API 测试
- [ ] **营销方案 API**
  - [ ] POST /api/marketing-plans 创建方案成功
  - [ ] GET /api/marketing-plans 返回分页列表
  - [ ] GET /api/marketing-plans/:id 返回方案详情
  - [ ] PUT /api/marketing-plans/:id 更新方案成功
  - [ ] DELETE /api/marketing-plans/:id 删除方案成功
- [ ] **人群数据 API**
  - [ ] GET /api/audiences 返回人群列表
  - [ ] GET /api/audiences/:id/recommendation 返回人群推荐详情
  - [ ] POST /api/audiences 创建新人群成功

### AT3. 响应式测试
- [ ] 桌面端三栏布局正常
- [ ] 平板端面板可折叠
- [ ] 移动端布局适配

### AT4. Agent 协作测试
- [ ] MA 正确调用 WA 生成 BPMN
- [ ] WA 执行 BPMN 流程正常
- [ ] 活动执行完成后 MA 自动生成复盘报告

---

## 任务依赖关系图

```
Phase 1-10 (已完成):
T1 ─── T2 ─── T4 ─── T5 ─── T6 ─── ... ─── T33 ✅

Phase 11 (优化):
T34 ─── T35 ─── T36

Phase 12 (LLM集成+Mermaid):
T37 ─── T38 ─── T39
          │
          └─── T40 (ReachStrategyChart Mermaid渲染)

T30 ─── T41 (右侧预览面板BPMN画布嵌入)
```

## 可并行任务

以下任务可以并行执行以加快进度：
- T34-T36（优化）可与 T37-T41（LLM集成）并行
- T38 完成后，T39 和 T40 可并行
- T41 可独立进行（依赖 T30 已完成）

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: 基础框架 | 3 | 1-2 天 | ✅ 完成 | 无 |
| Phase 2: 会话列表 | 2 | 1-2 天 | ✅ 完成 | Phase 1 |
| Phase 3: 聊天区域 | 4 | 2-3 天 | ✅ 完成 | Phase 2 |
| Phase 4: 后端 API | 3 | 2-3 天 | ✅ 完成 | 无 |
| Phase 5: 方案预览+表单 | 6 | 3-4 天 | ✅ 部分完成 | Phase 3, 4 |
| Phase 6: 人群选择 | 4 | 2-3 天 | ✅ 部分完成 | Phase 5 |
| Phase 7: 营销流程图 | 2 | 1-2 天 | ✅ 完成 | Phase 6 |
| Phase 8: 新增交互步骤(步骤5-9) | 5 | 3-4 天 | ✅ 完成 | Phase 7 |
| Phase 9: BPMN+活动复盘(步骤10-11) | 2 | 2-3 天 | ✅ 完成 | Phase 8 |
| Phase 10: 对话流程状态管理 | 2 | 2-3 天 | ✅ 完成 | Phase 9 |
| Phase 11: 优化 | 3 | 1-2 天 | 待完成 | Phase 10 |
| Phase 12: LLM集成+Mermaid | 5 | 3-4 天 | 待完成 | Phase 11 |

**新增组件说明（步骤5-11）**：
- T25: ReachStrategyChart.vue（触达策略流程图，卡片式可视化）
- T26: ProductConfigForm.vue（商品推荐配置）
- T27: SmartStrategyDisplay.vue（智能策略展示）
- T28: ChannelSelector.vue（推广渠道选择）
- T29: ChannelCopyEditor.vue（个性化渠道文案）
- T30: BpmnFlowChart.vue（BPMN 可执行流程图）
- T31: CampaignReport.vue（活动复盘报告）
- T32-T33: useConversationFlow.ts（11 步完整流程状态管理）

**Phase 12 新增任务说明**：
- T37: 安装 mermaid 依赖库
- T38: useMermaidParser.ts（Mermaid 解析 composable）
- T39: LLM 处理流程集成
- T40: ReachStrategyChart Mermaid 渲染
- T41: 右侧预览面板 BPMN 画布嵌入
