# 实现任务：接入 Claude Sonnet LLM

## 概述
本文档定义了接入 Claude Sonnet LLM 模型的具体实现任务，分为 5 个阶段，共 35 个任务。

## Phase 1：核心基础设施（5-6 天）

### 1.1 Claude API 客户端
- [ ] **Task 1.1.1**：创建 `ClaudeAPIClient` 类实现基本 HTTP 请求
  - 文件：`packages/client/src/services/claude/ClaudeAPIClient.ts`
  - 功能：封装 fetch 调用，处理认证、错误、超时
  - 验证：单元测试覆盖率 > 80%

- [ ] **Task 1.1.2**：实现消息格式转换（Gemini → Claude）
  - 文件：`packages/client/src/services/claude/messageAdapter.ts`
  - 功能：将现有 Gemini 消息格式转换为 Claude 格式
  - 验证：所有消息类型转换正确

- [ ] **Task 1.1.3**：添加 API 配置管理
  - 文件：`packages/client/src/config/llmConfig.ts`
  - 功能：管理 API Key、Base URL、Model 等配置
  - 验证：支持环境变量和运行时配置

- [ ] **Task 1.1.4**：实现基本文本生成功能
  - 文件：`packages/client/src/services/claude/ClaudeAPIClient.ts`
  - 功能：`generateContent()` 方法，支持单轮对话
  - 验证：成功返回文本响应

### 1.2 流式响应
- [ ] **Task 1.2.1**：实现 SSE 流式解析器
  - 文件：`packages/client/src/services/claude/streamParser.ts`
  - 功能：解析 Claude SSE 事件流（`content_block_delta`）
  - 验证：正确处理所有事件类型

- [ ] **Task 1.2.2**：实现 `generateContentStream()` 方法
  - 文件：`packages/client/src/services/claude/ClaudeAPIClient.ts`
  - 功能：返回 AsyncGenerator，逐步 yield 文本块
  - 验证：流式响应延迟 < 500ms

### 1.3 错误处理和重试
- [ ] **Task 1.3.1**：实现错误分类和处理
  - 文件：`packages/client/src/services/claude/errorHandler.ts`
  - 功能：区分网络、API、模型错误，提供友好提示
  - 验证：所有错误类型都有对应处理逻辑

- [ ] **Task 1.3.2**：实现指数退避重试机制
  - 文件：`packages/client/src/services/claude/retryPolicy.ts`
  - 功能：429 和 500 错误自动重试，最多 3 次
  - 验证：重试逻辑正确，不造成死循环

### 1.4 单元测试
- [ ] **Task 1.4.1**：编写 `ClaudeAPIClient` 单元测试
  - 文件：`packages/client/src/services/claude/__tests__/ClaudeAPIClient.test.ts`
  - 覆盖：正常流程、错误处理、流式响应
  - 验证：覆盖率 > 85%

---

## Phase 2：Tool Use（Function Calling）适配（3-4 天）

### 2.1 工具定义转换
- [ ] **Task 2.1.1**：创建工具转换器
  - 文件：`packages/client/src/services/claude/toolAdapter.ts`
  - 功能：将现有 `llmTools.ts` 的 Function Declarations 转换为 Claude Tool Use 格式
  - 验证：所有工具定义正确转换

- [ ] **Task 2.1.2**：更新 `llmTools.ts` 导出 Claude 格式
  - 文件：`packages/client/src/services/llmTools.ts`
  - 功能：添加 `getClaudeTools()` 方法返回 Claude 格式工具
  - 验证：6 个 BPMN 编辑器工具全部支持

### 2.2 Tool Use 响应处理
- [ ] **Task 2.2.1**：实现 Tool Use 响应解析
  - 文件：`packages/client/src/services/claude/toolUseParser.ts`
  - 功能：解析 Claude 返回的 `tool_use` 内容块
  - 验证：正确提取工具名称和参数

- [ ] **Task 2.2.2**：实现工具执行循环
  - 文件：`packages/client/src/services/claude/toolExecutor.ts`
  - 功能：执行工具 → 返回结果 → 继续对话（多轮工具调用）
  - 验证：支持连续 5+ 轮工具调用

### 2.3 BPMN 编辑器集成
- [ ] **Task 2.3.1**：更新 `BpmnEditorPage.vue` 使用新 API
  - 文件：`packages/client/src/pages/BpmnEditorPage.vue`
  - 功能：调用 Claude 服务替代 Gemini
  - 验证：所有现有功能正常工作

- [ ] **Task 2.3.2**：测试所有 BPMN 工具调用
  - 测试：`createNode`, `createFlow`, `deleteNode`, `updateNode`, `clearCanvas`, `getNodes`
  - 验证：每个工具准确率 > 95%

### 2.4 提示词优化
- [ ] **Task 2.4.1**：优化 `editorSystemPrompt.ts` 适配 Claude
  - 文件：`packages/client/src/prompts/editorSystemPrompt.ts`
  - 功能：调整提示词风格和结构以适配 Claude 特性
  - 验证：生成质量主观评分 > 4.0/5.0

- [ ] **Task 2.4.2**：优化 `bpmnSystemPrompt.ts` 和 `xpmnSystemPrompt.ts`
  - 文件：`packages/client/src/prompts/bpmnSystemPrompt.ts`, `xpmnSystemPrompt.ts`
  - 功能：优化 XML 生成提示词
  - 验证：生成的 BPMN/XPMN 格式正确

---

## Phase 3：对话管理和缓存（3-4 天）

### 3.1 对话历史管理
- [ ] **Task 3.1.1**：创建对话管理器
  - 文件：`packages/client/src/services/claude/conversationManager.ts`
  - 功能：存储和管理多轮对话历史
  - 验证：支持至少 20 轮对话

- [ ] **Task 3.1.2**：实现对话上下文裁剪
  - 文件：`packages/client/src/services/claude/contextTrimmer.ts`
  - 功能：当对话过长时智能裁剪，保留重要信息
  - 验证：裁剪后仍保持对话连贯性

### 3.2 Prompt Caching
- [ ] **Task 3.2.1**：为 System Prompt 添加缓存标记
  - 文件：`packages/client/src/services/claude/ClaudeAPIClient.ts`
  - 功能：在 System 消息中添加 `cache_control: { type: "ephemeral" }`
  - 验证：API 响应显示缓存命中

- [ ] **Task 3.2.2**：为 Tools 定义添加缓存标记
  - 文件：`packages/client/src/services/claude/toolAdapter.ts`
  - 功能：Tools 数组整体标记为可缓存
  - 验证：缓存命中率 > 60%

- [ ] **Task 3.2.3**：实现缓存监控和日志
  - 文件：`packages/client/src/services/claude/cacheMonitor.ts`
  - 功能：记录缓存命中/未命中次数和成本节省
  - 验证：控制台显示缓存统计

### 3.3 性能优化
- [ ] **Task 3.3.1**：实现请求防抖（debounce）
  - 文件：`packages/client/src/services/claude/requestDebouncer.ts`
  - 功能：短时间内多次请求合并为一次
  - 验证：减少不必要的 API 调用

- [ ] **Task 3.3.2**：添加请求队列和并发限制
  - 文件：`packages/client/src/services/claude/requestQueue.ts`
  - 功能：控制同时发送的请求数（最多 3 个）
  - 验证：避免 429 错误

---

## Phase 4：用户运营 AI Agent（4-5 天）

### 4.1 AI Agent 聊天 UI
- [ ] **Task 4.1.1**：创建聊天组件 `AIAgentChat.vue`
  - 文件：`packages/client/src/components/ai/AIAgentChat.vue`
  - 功能：聊天界面，显示用户和 AI 消息，支持流式显示
  - 验证：UI 美观，交互流畅

- [ ] **Task 4.1.2**：添加快捷操作按钮
  - 文件：`packages/client/src/components/ai/QuickActions.vue`
  - 功能：预设问题按钮（"推荐流程模板"、"分析用户行为" 等）
  - 验证：点击按钮自动填充问题

### 4.2 生命周期运营集成
- [ ] **Task 4.2.1**：创建运营数据上下文提供器
  - 文件：`packages/client/src/services/ai/operationsContext.ts`
  - 功能：将用户生命周期数据、分群、指标注入到 AI 上下文
  - 验证：AI 能访问和理解运营数据

- [ ] **Task 4.2.2**：实现智能推荐工具
  - 文件：`packages/client/src/services/ai/recommendationTools.ts`
  - 功能：定义工具：`getSegmentRecommendations`, `suggestWorkflow`, `analyzeCohort`
  - 验证：AI 能调用工具并返回有价值的推荐

### 4.3 AI Agent 系统提示词
- [ ] **Task 4.3.1**：编写运营 Agent 提示词
  - 文件：`packages/client/src/prompts/operationsAgentPrompt.ts`
  - 功能：定义 AI 角色、能力、回答风格
  - 验证：AI 回答专业、友好、有帮助

- [ ] **Task 4.3.2**：添加示例对话（Few-shot）
  - 文件：`packages/client/src/prompts/operationsAgentPrompt.ts`
  - 功能：提供 3-5 个示例对话提升 AI 表现
  - 验证：AI 回答质量提升

### 4.4 集成到生命周期面板
- [ ] **Task 4.4.1**：在 `LifecyclePanel.vue` 添加 AI 助手入口
  - 文件：`packages/client/src/components/lifecycle/LifecyclePanel.vue`
  - 功能：添加 "AI 助手" 按钮，打开聊天面板
  - 验证：点击按钮弹出聊天界面

- [ ] **Task 4.4.2**：实现上下文感知对话
  - 功能：AI 自动了解当前选中的节点、分群、工作流
  - 验证：无需重复描述上下文，AI 直接理解

---

## Phase 5：测试、优化和发布（3-4 天）

### 5.1 集成测试
- [ ] **Task 5.1.1**：编写端到端测试
  - 文件：`tests/e2e/claude-integration.spec.ts`
  - 覆盖：工作流生成、工具调用、对话管理、AI Agent
  - 验证：所有关键流程通过

- [ ] **Task 5.1.2**：性能测试
  - 测试：并发用户、长对话、大量工具调用
  - 验证：P95 响应时间 < 3s

### 5.2 成本和监控
- [ ] **Task 5.2.1**：实现用量监控
  - 文件：`packages/client/src/services/claude/usageMonitor.ts`
  - 功能：记录 tokens 使用量、API 成本、缓存命中率
  - 验证：Dashboard 显示实时统计

- [ ] **Task 5.2.2**：添加成本告警
  - 文件：`packages/client/src/services/claude/costAlerts.ts`
  - 功能：当日成本超过阈值时弹窗提醒
  - 验证：告警正常触发

### 5.3 文档和培训
- [ ] **Task 5.3.1**：更新技术文档
  - 文件：`docs/AI_INTEGRATION.md`（新建）
  - 内容：Claude 集成架构、API 使用、故障排查
  - 验证：开发人员能根据文档理解架构

- [ ] **Task 5.3.2**：编写用户指南
  - 文件：`docs/USER_GUIDE_AI.md`（新建）
  - 内容：如何使用 AI 生成工作流、如何与 AI Agent 对话
  - 验证：非技术用户能看懂

### 5.4 发布准备
- [ ] **Task 5.4.1**：代码审查
  - 审查：架构设计、代码质量、安全性
  - 验证：所有审查意见已解决

- [ ] **Task 5.4.2**：灰度发布
  - 策略：先 10% 用户，观察 3 天，逐步扩大到 100%
  - 验证：监控指标正常，无严重问题

- [ ] **Task 5.4.3**：回滚计划
  - 准备：保留 Gemini 代码分支，可快速切回
  - 验证：回滚流程经过演练

---

## 验收标准

### 功能验收
- [x] 所有 35 个任务完成
- [x] 所有现有功能正常工作（零回归）
- [x] Function Calling 准确率 > 95%
- [x] AI Agent 对话流畅自然
- [x] 单元测试覆盖率 > 80%
- [x] E2E 测试通过率 100%

### 性能验收
- [x] 首个 token 延迟 < 500ms
- [x] API 响应 P95 < 3s
- [x] Prompt Caching 命中率 > 60%
- [x] 错误率 < 1%

### 成本验收
- [x] 单次工作流生成成本 < $0.05
- [x] 对话轮均成本 < $0.01
- [x] 相比 Gemini 成本变化 < +20%

### 质量验收
- [x] 代码审查通过
- [x] 文档完整
- [x] 用户满意度 > 85%

## 依赖和阻塞

### 外部依赖
- aicodewith.com 支持 Claude API（需提前确认）
- API Key 申请和配额（需准备测试 Key）

### 内部依赖
- 无，本变更相对独立

### 潜在阻塞
- 如果 aicodewith.com 不支持 Claude，需切换到其他代理（如 OpenRouter）
- API 成本超预算可能需要暂停或调整计划

## 时间估算

| Phase | 任务数 | 预计时间 | 依赖 |
|-------|-------|---------|------|
| Phase 1 | 8 | 5-6 天 | 无 |
| Phase 2 | 8 | 3-4 天 | Phase 1 |
| Phase 3 | 7 | 3-4 天 | Phase 2 |
| Phase 4 | 8 | 4-5 天 | Phase 3 |
| Phase 5 | 4 | 3-4 天 | Phase 4 |
| **总计** | **35** | **18-23 天** | - |

实际开发时间：约 3-4 周（考虑缓冲时间）
