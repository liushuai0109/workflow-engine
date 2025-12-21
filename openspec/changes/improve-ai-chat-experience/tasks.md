# 任务列表

## 阶段 1：UI 组件优化（已完成）

### T1.1 ChatBox 输入框样式优化
- [x] 将输入框和按钮样式改为 Ant Design 标准
- [x] 输入框：6px 圆角，标准边框色，hover 和 focus 状态
- [x] 发送按钮：32px 圆形，主色背景，hover 效果
- [x] 验证：输入框和按钮视觉效果符合 Ant Design 规范

### T1.2 RightPanelContainer Tab 图标间距调整
- [x] 为每个 Tab 标签添加 `.tab-label` class
- [x] 使用 `display: inline-flex` 和 `gap: 5px` 控制间距
- [x] 应用到所有 Tab（属性、AI 助手、Mock、Debug、拦截器）
- [x] 验证：图标和文字间距为 5px

### T1.3 BPMN 编辑器布局修复
- [x] 添加 `.editor-container :deep(.ant-spin-nested-loading)` 高度 100%
- [x] 添加 `.editor-container :deep(.ant-spin-nested-loading .ant-spin-container)` 高度 100%
- [x] 添加 `.editor-container :deep(.bpmn-editor)` 高度 100%
- [x] 验证：编辑器正确填充容器高度

## 阶段 2：交互功能修复（已完成）

### T2.1 Enter 键发送消息修复
- [x] 将 `@keydown.enter` 改为 `@pressEnter`（Ant Design 标准）
- [x] 将 `v-model` 改为 `v-model:value`
- [x] 实现 `handlePressEnter` 函数，支持 Shift+Enter 换行
- [x] 验证：Enter 发送，Shift+Enter 换行

### T2.2 发送按钮 disabled 状态修复
- [x] 添加 `canSend` computed 属性
- [x] 实时计算输入内容和加载状态
- [x] 按钮绑定 `:disabled="!canSend"`
- [x] 验证：输入内容后按钮自动启用

## 阶段 3：Loading 状态改进（已完成）

### T3.1 聊天框 Loading 指示器
- [x] 使用 Ant Design `<a-spin>` 组件替换打点动画
- [x] 显示 "AI 正在思考..." 文字提示
- [x] 采用白色背景 + 边框样式
- [x] 验证：加载时显示 Spin 组件

### T3.2 画布 Loading 指示器
- [x] 在 BPMN 编辑器外层包裹 `<a-spin>`
- [x] 使用 `isAIProcessing` 状态控制
- [x] 显示 "AI 正在处理流程图..." 提示
- [x] 验证：AI 处理时画布显示遮罩和加载动画

### T3.3 组件通信优化
- [x] RightPanelContainer 添加 `chatBoxRef` 引用
- [x] RightPanelContainer 暴露 `setChatLoading`、`addUserMessage`、`addChatMessage`、`scrollToBottom` 方法
- [x] BpmnEditorPage 通过 `rightPanelRef` 调用方法
- [x] 删除所有 `document.querySelector` DOM 查询代码
- [x] 验证：Loading 状态正确同步

## 阶段 4：消息流转修复（已完成）

### T4.1 ChatBox 消息管理重构
- [x] 移除 `sendMessage` 中添加用户消息的逻辑
- [x] 添加 `addUserMessage` 方法供外部调用
- [x] 保留 `addAssistantMessage` 方法
- [x] 暴露 `addUserMessage` 给父组件
- [x] 验证：消息由父组件统一管理

### T4.2 BpmnEditorPage 消息流程优化
- [x] 在 `handleChatMessage` 开始时调用 `addUserMessage`
- [x] Claude API 返回后调用 `addChatMessage` 显示响应
- [x] 添加错误消息显示
- [x] 验证：消息流转正确，无重复

### T4.3 Claude 服务消息保存逻辑修复
- [x] 删除工具执行结果的 `saveMessage` 调用（第301-310行）
- [x] 添加注释说明只保存用户消息和最终响应
- [x] 保留内存中的完整上下文（包含工具调用）
- [x] 验证：数据库只保存用户可见的对话

## 阶段 5：滚动功能优化（已完成）

### T5.1 新消息自动滚动
- [x] `addUserMessage` 调用后自动 `scrollToBottom`
- [x] `addAssistantMessage` 调用后自动 `scrollToBottom`
- [x] `setLoading(false)` 后自动 `scrollToBottom`
- [x] 验证：新消息出现时自动滚动

### T5.2 Tab 切换自动滚动
- [x] 在 `handleRightPanelTabChange` 中检测聊天 Tab
- [x] 切换到聊天时延迟 100ms 调用 `scrollToBottom`
- [x] 确保组件已完全渲染
- [x] 验证：切换到聊天 Tab 自动滚动到底部

## 阶段 6：AI 响应优化（已完成）

### T6.1 系统提示词更新
- [x] 修改 `claudeBpmnSystemPrompt.ts` 末尾部分
- [x] 添加"响应格式要求"章节
- [x] 明确只需简短回复（"已完成"、"流程图已创建"）
- [x] 列出避免的冗长响应类型
- [x] 验证：新提示词文件正确

### T6.2 响应消息处理
- [x] 在 `handleChatWithClaude` 中处理空响应
- [x] 空响应时显示 "操作已完成"
- [x] 非空响应显示原文
- [x] 验证：AI 回复简短清晰

## 阶段 7：消息增量显示和 Markdown 渲染（待实现）

### T7.1 安装 Markdown 依赖
- [ ] 执行 `pnpm add markdown-it`
- [ ] 执行 `pnpm add -D @types/markdown-it`
- [ ] 验证：依赖安装成功，无版本冲突

### T7.2 创建 Markdown 渲染工具
- [ ] 创建 `client/src/utils/markdown.ts`
- [ ] 配置 `markdown-it` 实例（禁用 HTML，启用 linkify）
- [ ] 导出 `renderMarkdown(content: string): string` 函数
- [ ] 添加单元测试（测试标题、列表、代码块渲染）
- [ ] 验证：Markdown 正确渲染，无 XSS 漏洞

### T7.3 扩展 ChatMessage 数据结构
- [ ] 在消息类型中添加 `progressLogs?: string[]`
- [ ] 在消息类型中添加 `isStreaming?: boolean`
- [ ] 更新 ChatBox 组件的消息接口定义
- [ ] 验证：TypeScript 类型检查通过

### T7.4 实现 editorOperationService 事件发射
- [ ] 在 `editorOperationService.ts` 中添加 EventEmitter 或自定义事件
- [ ] 在关键操作处（创建节点、连线等）发出事件
- [ ] 事件携带操作描述（如"创建连线: A -> B"）
- [ ] 验证：控制台可以监听到操作事件

### T7.5 ChatBox 监听操作事件并增量显示
- [ ] 在 ChatBox 中添加 `appendProgressLog(log: string)` 方法
- [ ] 监听 `editorOperationService` 的操作事件
- [ ] 收到事件时，将日志追加到当前 AI 消息的 `progressLogs`
- [ ] 验证：操作时聊天框实时显示过程日志

### T7.6 实现消息最终化（替换为 Markdown）
- [ ] 在 ChatBox 中添加 `finalizeMessage(content: string)` 方法
- [ ] AI 返回最终响应时调用，清空 `progressLogs`
- [ ] 设置 `isStreaming = false`，将 `content` 设置为 Markdown
- [ ] 验证：操作完成后，消息切换为 Markdown 渲染

### T7.7 ChatBox UI 渲染逻辑更新
- [ ] 添加条件渲染：`isStreaming` 显示过程日志，否则显示 Markdown
- [ ] 过程日志使用 `.progress-logs` 样式（浅灰背景，Monaco 字体）
- [ ] Markdown 内容使用 `v-html` + `renderMarkdown()` 渲染
- [ ] 验证：UI 正确切换，样式符合设计

### T7.8 Markdown 样式优化
- [ ] 添加 `.markdown-content` 样式类
- [ ] 定义标题、列表、代码块样式（参考 GitHub）
- [ ] 添加外部链接安全属性（`target="_blank" rel="noopener"`）
- [ ] 验证：Markdown 渲染美观，链接安全

### T7.9 集成测试
- [ ] 测试完整流程：发送消息 → 看到过程日志 → 看到 Markdown 摘要
- [ ] 测试边界情况：无过程日志、超长 Markdown、特殊字符
- [ ] 测试性能：大量消息时的渲染速度
- [ ] 验证：功能稳定，无崩溃或卡顿

## 验证测试

### 功能测试
- [x] 输入消息并发送（Enter 键和按钮）
- [x] 验证消息显示和滚动
- [x] 验证 Loading 状态（聊天框和画布）
- [x] 切换 Tab 验证滚动
- [x] 检查聊天历史是否正确

### 样式测试
- [x] 输入框和按钮符合 Ant Design 风格
- [x] Tab 图标间距 5px
- [x] BPMN 编辑器高度正确
- [x] Loading 动画显示正确

### 数据测试
- [x] 检查数据库聊天记录
- [x] 确认无工具调用中间消息
- [x] 确认用户消息和 AI 响应正确保存

## 文档更新

### 代码文档
- [x] 添加关键逻辑的注释
- [x] 说明消息流转机制
- [x] 说明为什么不保存工具调用

### OpenSpec 文档

- [x] 更新 ai-integration 规范
- [x] 更新 workflow-editor 规范
- [x] 创建 design.md
- [x] 创建 proposal.md
- [x] 验证 OpenSpec 规范通过严格模式检查

## 总结

- **总任务数**：73
- **已完成**：37
- **待完成**：36（阶段 7 的消息增量显示和 Markdown 渲染功能）
- **阻塞任务**：0

核心 UI 和交互功能已实现并验证通过，待实现消息增量显示和 Markdown 渲染功能。
