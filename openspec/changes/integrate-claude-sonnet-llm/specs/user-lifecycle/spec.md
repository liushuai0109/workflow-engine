# 用户生命周期规范（变更）

## ADDED Requirements

### Requirement: AI Agent 对话功能

系统 SHALL 提供 AI Agent 聊天功能，帮助运营人员分析用户行为和优化策略。

#### Scenario: 运营对话界面

- **WHEN** 用户点击 "AI 助手" 按钮
- **THEN** 系统应当打开聊天面板（`AIAgentChat.vue`）
- **AND** 面板应当显示欢迎消息和快捷问题
- **AND** 用户可输入自然语言问题
- **AND** AI 响应应当流式显示，逐字出现

#### Scenario: 上下文感知对话

- **WHEN** 用户在生命周期面板中选中某个节点
- **THEN** AI 应当自动了解节点上下文（lifecycle stage、segments、triggers）
- **AND** 用户无需重复描述上下文
- **AND** AI 回答应当针对当前上下文提供建议
- **AND** 用户切换节点时，AI 应当更新上下文

#### Scenario: 多轮对话

- **WHEN** 用户连续提问
- **THEN** AI 应当记住之前的对话历史（至少 10 轮）
- **AND** AI 应当理解代词指代（如 "它"、"这个用户"）
- **AND** 用户可以点击 "新对话" 清空历史重新开始

### Requirement: 智能推荐功能

AI Agent SHALL 基于生命周期数据提供智能推荐。

#### Scenario: 用户分群推荐

- **WHEN** 用户询问 "如何提高激活率"
- **THEN** AI 应当调用 `getSegmentRecommendations` 工具
- **AND** 工具应当分析当前用户分群数据
- **AND** AI 应当推荐高潜力分群（如 "注册但未完成首次操作的用户"）
- **AND** 推荐应当包含：分群定义、预期转化率、触达渠道

#### Scenario: 工作流模板推荐

- **WHEN** 用户询问 "推荐一个留存工作流"
- **THEN** AI 应当调用 `suggestWorkflow` 工具
- **AND** 工具应当根据用户所在的 lifecycle stage 推荐合适的模板
- **AND** AI 应当解释为什么推荐这个工作流
- **AND** 用户可以点击 "应用模板" 自动创建工作流

#### Scenario: 队列分析

- **WHEN** 用户询问 "分析上周注册的用户队列"
- **THEN** AI 应当调用 `analyzeCohort` 工具
- **AND** 工具应当查询队列数据（留存率、转化率、流失原因）
- **AND** AI 应当生成可视化图表（如留存曲线）
- **AND** AI 应当指出关键发现和行动建议

### Requirement: 运营决策支持

AI Agent SHALL 帮助运营人员做出数据驱动的决策。

#### Scenario: A/B 测试建议

- **WHEN** 用户询问 "如何测试这个工作流"
- **THEN** AI 应当建议 A/B 测试方案
- **AND** 建议应当包含：测试变量、对照组设置、样本大小、观察指标
- **AND** AI 应当生成测试计划文档（可导出）

#### Scenario: 异常检测

- **WHEN** 某个 lifecycle stage 的转化率突然下降
- **THEN** 系统应当主动通知 AI Agent
- **AND** AI 应当分析可能原因（如流量来源变化、产品改动）
- **AND** AI 应当推荐排查步骤和修复方案

#### Scenario: 效果预测

- **WHEN** 用户询问 "如果发送这个优惠券，预计有多少用户会转化"
- **THEN** AI 应当基于历史数据预测效果
- **AND** 预测应当包含：转化率区间、ROI 估算、风险因素
- **AND** 用户可以调整参数（如优惠力度）重新预测

### Requirement: AI 提示词库

系统 SHALL 为运营场景提供专门优化的提示词。

#### Scenario: 运营 Agent 提示词

- **WHEN** 初始化 AI Agent
- **THEN** 系统应当加载 `packages/client/src/prompts/operationsAgentPrompt.ts`
- **AND** 提示词应当定义 AI 角色为 "专业的用户运营顾问"
- **AND** 提示词应当包含业务背景（AARRR 模型、产品特点）
- **AND** 提示词应当包含 3-5 个示例对话（Few-shot）

#### Scenario: 工具调用指导

- **WHEN** 提示词中定义可用工具
- **THEN** 应当清晰说明每个工具的使用场景
- **AND** 应当提供工具调用示例
- **AND** 应当指导何时应当查询数据、何时应当直接回答

### Requirement: 用量和成本控制

系统 SHALL 监控 AI Agent 的使用情况，防止成本失控。

#### Scenario: 用量监控

- **WHEN** AI Agent 被使用
- **THEN** 系统应当记录：对话轮数、tokens 使用量、工具调用次数
- **AND** 统计数据应当在管理后台展示
- **AND** 可按用户、时间、场景维度查询

#### Scenario: 成本告警

- **WHEN** 单日 AI 成本超过预算（如 $50）
- **THEN** 系统应当向管理员发送告警通知
- **AND** 可选择自动限制使用（如降低并发数）
- **AND** 高成本用户应当被标记，分析原因

#### Scenario: 配额管理

- **WHEN** 企业版用户订阅服务
- **THEN** 应当分配 AI 对话配额（如每月 1000 轮）
- **AND** 配额用尽后应当提示升级或等待下月
- **AND** 配额使用情况应当在界面显示

## MODIFIED Requirements

### Requirement: 生命周期面板

系统 SHALL 在生命周期面板中提供 AI 助手入口。

#### Scenario: AI 助手入口

- **WHEN** 用户打开生命周期面板（`LifecyclePanel.vue`）
- **THEN** 面板右上角应当显示 "AI 助手" 按钮
- **AND** 按钮应当有明显的 AI 图标
- **AND** 点击按钮应当打开聊天面板
- **AND** 如果有未读 AI 建议，按钮应当显示红点提示

## REMOVED Requirements

无
