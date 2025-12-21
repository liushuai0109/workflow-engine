# 设计文档：AI 聊天体验改进

## 架构概览

本次改进涉及三个主要层次：
1. **UI 层**：Vue 组件（ChatBox、RightPanelContainer）
2. **应用层**：页面逻辑（BpmnEditorPage）
3. **服务层**：LLM 服务（ClaudeLLMService）

## 核心设计决策

### 1. 消息流转架构

#### 问题
原有设计中，ChatBox 和 ClaudeLLMService 都在管理消息，导致：
- 消息重复添加
- 工具调用中间结果被保存为用户消息
- 消息顺序混乱

#### 解决方案
**单一数据源原则**：由 BpmnEditorPage 作为消息流转的协调者

```
┌─────────────────────────────────────────────────────┐
│              BpmnEditorPage (协调者)                 │
│  ┌─────────────────────────────────────────────┐   │
│  │  handleChatMessage(message)                  │   │
│  │  1. addUserMessage(message)      → ChatBox  │   │
│  │  2. claudeService.sendMessage()  → LLM      │   │
│  │  3. addChatMessage(response)     → ChatBox  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         ↓                           ↓
    ┌────────┐                 ┌──────────────┐
    │ChatBox │                 │ClaudeLLMService│
    │(UI only)│                 │(Logic + DB)   │
    └────────┘                 └──────────────┘
```

**职责分离**：
- **ChatBox**：纯 UI 展示，接收外部调用添加消息
- **ClaudeLLMService**：LLM 交互，保存用户可见消息到数据库
- **BpmnEditorPage**：协调消息流转，连接 UI 和服务层

#### 替代方案（已拒绝）
**方案 A**：ChatBox 自己调用 LLM 服务
- ❌ 组件职责过重
- ❌ 难以控制 Loading 状态（画布也需要显示）

**方案 B**：使用事件总线
- ❌ 调试困难
- ❌ 消息流追踪复杂

### 2. 工具调用消息过滤

#### 问题
Claude Tool Use 工作流程：
```
User: "画一个请假流程"
  → Assistant: [tool_use: createNode]
  → User: [tool_result: success]
  → Assistant: [tool_use: createFlow]
  → User: [tool_result: success]
  → Assistant: "已完成"
```

原设计将所有消息都保存到数据库，导致用户看到大量技术细节。

#### 解决方案
**内存 vs 数据库分离**

| 上下文类型 | 包含内容 | 用途 |
|-----------|---------|------|
| 内存上下文 | 用户消息 + 所有工具调用 + 工具结果 + AI 响应 | Claude API 需要完整上下文 |
| 数据库记录 | 用户消息 + AI 最终响应 | 用户聊天历史展示 |

**实现**：
```typescript
// 内存：添加工具结果到上下文
this.context.messages.push({
  role: 'user',
  content: toolResults
})

// 数据库：不保存工具结果
// await this.saveMessage(...) ← 删除此调用
```

**好处**：
1. 用户只看到干净的对话
2. LLM 仍能获得完整上下文
3. 数据库存储节省

#### 替代方案（已拒绝）
**方案 A**：保存所有消息，UI 过滤
- ❌ 数据库膨胀
- ❌ 加载时需要复杂过滤逻辑
- ❌ 前端性能影响

**方案 B**：添加 `hidden` 标记
- ❌ 数据库 schema 复杂化
- ❌ 查询需要加 WHERE 条件

### 3. 组件通信机制

#### 问题
原设计使用 `document.querySelector` 查询 DOM：
```typescript
// ❌ 劣质代码
const chatBoxEl = document.querySelector('.chat-box-container')
const rightPanel = document.querySelector('.right-panel-container')
```

**问题**：
- 违反 Vue 响应式原则
- 时序问题（DOM 可能未渲染）
- 难以追踪和调试

#### 解决方案
**Vue 标准的 ref + defineExpose 机制**

```typescript
// RightPanelContainer.vue
const chatBoxRef = ref<any>(null)

defineExpose({
  setChatLoading: (loading: boolean) => {
    chatBoxRef.value?.setLoading(loading)
  },
  addUserMessage: (content: string) => {
    chatBoxRef.value?.addUserMessage(content)
  },
  // ...
})

// BpmnEditorPage.vue
const rightPanelRef = ref<any>()

rightPanelRef.value?.setChatLoading(true)
```

**优势**：
1. 类型安全（可以添加 TypeScript 类型）
2. 响应式跟踪
3. 清晰的调用链
4. 易于测试和模拟

### 4. Loading 状态设计

#### 需求
两个地方需要显示 Loading：
1. 聊天框内（局部）
2. BPMN 画布（全屏遮罩）

#### 解决方案
**双层 Loading 状态**

```typescript
// 画布 Loading（全屏）
const isAIProcessing = ref(false)

// 聊天框 Loading（局部）
// 通过 setChatLoading() 控制 ChatBox 内部的 isLoading
```

**UI 实现**：
```vue
<!-- 画布 -->
<a-spin :spinning="isAIProcessing" tip="AI 正在处理流程图...">
  <BpmnEditor />
</a-spin>

<!-- 聊天框 -->
<div v-if="isLoading" class="message assistant">
  <a-spin size="small" />
  <span>AI 正在思考...</span>
</div>
```

**好处**：
1. 用户清楚知道 AI 在工作
2. 防止重复点击
3. 视觉反馈一致（都用 Ant Design Spin）

### 5. 自动滚动策略

#### 场景
1. 用户发送消息后
2. AI 回复消息后
3. 切换到聊天 Tab 时
4. Loading 结束后

#### 实现
```typescript
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 所有添加消息的地方都调用
nextTick(() => scrollToBottom())
```

**时序控制**：
- 使用 `nextTick` 确保 DOM 更新后再滚动
- Tab 切换时延迟 100ms 确保组件完全渲染

### 6. 样式系统

#### 原则
**完全采用 Ant Design 设计系统**

| 元素 | 颜色 | 说明 |
|-----|------|------|
| 主色 | #1890ff | 按钮、链接 |
| 成功色 | #52c41a | 成功消息 |
| 文本色 | rgba(0,0,0,0.85) | 主要文本 |
| 次要文本 | rgba(0,0,0,0.45) | 提示文本 |
| 边框色 | #d9d9d9 | 输入框、分割线 |
| 背景色 | #fafafa | 消息容器 |

**间距规范**：
- Tab 图标文字间距：5px（用户反馈）
- 消息间距：16px（Ant Design 标准）
- 输入框内边距：12px 16px（Ant Design 标准）

### 7. 消息增量显示和 Markdown 渲染

#### 问题
当前 AI 执行流程图操作时，用户只能看到 Loading 状态，无法了解具体进度。操作完成后，AI 回复纯文本，缺少格式化支持。

#### 解决方案

**7.1 操作日志捕获**

捕获 `editorOperationService.ts` 中的操作日志，转换为用户可读的过程消息。

**实现思路**：
1. `editorOperationService` 发出操作事件（EventEmitter 或 Vue provide/inject）
2. `ChatBox` 监听事件，增量添加过程消息到当前 AI 消息气泡
3. 消息示例：
   - ✅ 创建连线: StartEvent_1 -> UserTask_FillBasicInfo
   - ✅ 创建网关: Gateway_AutoCheckResult
   - ✅ 设置连线标签: "检查通过"

**数据结构**：
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string          // 最终内容（Markdown 格式）
  progressLogs?: string[]  // 过程日志（增量显示时使用）
  isStreaming?: boolean    // 是否正在增量更新
  timestamp: Date
}
```

**7.2 消息增量更新**

在同一条 AI 消息中，先显示过程日志，完成后替换为 Markdown 格式摘要。

**时序**：
```
1. AI 开始工具调用
   → addAssistantMessage({ isStreaming: true, progressLogs: [] })

2. 工具执行中
   → appendProgressLog("✅ 创建连线: ...")
   → appendProgressLog("✅ 创建网关: ...")

3. AI 返回最终响应
   → finalizeMessage(markdownContent)
   → 设置 isStreaming = false
   → progressLogs 清空，content 设置为 Markdown
```

**UI 渲染**：
```vue
<template>
  <div class="message assistant">
    <!-- 进行中：显示过程日志 -->
    <div v-if="message.isStreaming" class="progress-logs">
      <div v-for="log in message.progressLogs" class="log-line">
        {{ log }}
      </div>
      <a-spin size="small" /> <!-- 显示 Loading -->
    </div>

    <!-- 完成：显示 Markdown 内容 -->
    <div v-else v-html="renderMarkdown(message.content)"></div>
  </div>
</template>
```

**7.3 Markdown 渲染**

使用 `markdown-it` 解析 Markdown，支持代码高亮、链接等扩展。

**集成步骤**：
1. 安装依赖：
   ```bash
   pnpm add markdown-it
   pnpm add -D @types/markdown-it
   ```

2. 创建 Markdown 渲染器：
   ```typescript
   import MarkdownIt from 'markdown-it'

   const md = new MarkdownIt({
     html: false,        // 禁用 HTML 标签（安全考虑）
     linkify: true,      // 自动识别链接
     typographer: true   // 智能标点
   })

   const renderMarkdown = (content: string) => {
     return md.render(content)
   }
   ```

3. 安全处理：
   - 禁用 HTML 标签防止 XSS 攻击
   - 对链接使用 `target="_blank"` 和 `rel="noopener noreferrer"`

**7.4 样式设计**

| 元素 | 样式 | 说明 |
|-----|------|------|
| 过程日志 | 浅灰背景，Monaco 字体，12px | 类似终端输出 |
| Markdown 内容 | 标准 Ant Design 排版样式 | 标题、列表、代码块 |
| 代码块 | `#f6f6f6` 背景，`#d73a49` 关键字 | GitHub 风格 |

**7.5 替代方案（已拒绝）**

**方案 A**：让 Claude API 返回过程消息
- ❌ 需要修改系统提示词，增加 token 消耗
- ❌ Claude 无法知道具体的 DOM 操作细节

**方案 B**：不显示过程，只显示最终 Markdown
- ❌ 用户体验差，无法感知进度
- ❌ 复杂流程图操作时间长，用户焦虑

**方案 C**：使用 `vue-markdown-render` 组件
- ❌ 额外的库依赖，bundle 体积增加
- ❌ `markdown-it` 更灵活，可自定义扩展

## 性能考虑

### 1. 消息渲染
- 使用 `v-for` 的 `key` 优化
- 消息时间戳懒加载
- 滚动容器虚拟化（未来优化）

### 2. 数据库查询
- 减少不必要的消息保存（工具调用）
- 加载聊天历史时按需分页（已有实现）

### 3. 组件通信
- 使用 ref 直接调用，避免事件冒泡
- 减少不必要的响应式依赖

### 4. Markdown 渲染优化
- 缓存渲染结果（已渲染的消息不重复解析）
- 使用 `v-once` 指令标记静态内容
- 懒加载代码高亮（仅在需要时加载）

## 安全考虑

### 1. XSS 防护
- Vue 自动转义用户输入
- 消息内容使用 `{{ }}` 而非 `v-html`

### 2. 输入验证
- 限制消息长度（前端 + 后端）
- 防止空消息发送

### 3. Markdown 内容安全
- 禁用 `html: true` 选项，防止 XSS 攻击
- 对外部链接添加 `rel="noopener noreferrer"`
- 限制 Markdown 内容长度（防止 DoS）

## 可测试性

### 单元测试
```typescript
// ChatBox 组件测试
describe('ChatBox', () => {
  it('should add user message when called externally', () => {
    const wrapper = mount(ChatBox)
    wrapper.vm.addUserMessage('test')
    expect(wrapper.vm.messages).toHaveLength(1)
    expect(wrapper.vm.messages[0].role).toBe('user')
  })
})
```

### 集成测试
- 测试完整的消息流转
- 模拟 LLM 响应
- 验证数据库保存

## 未来扩展

### 1. 消息编辑
- 允许用户编辑已发送的消息
- 重新生成 AI 响应

### 2. 多模态支持
- 支持图片上传
- 支持文件附件

### 3. 上下文管理
- 手动清除上下文
- 上下文压缩优化

### 4. 实时协作
- 多用户同时查看聊天
- WebSocket 实时更新

## 总结

本次设计遵循以下原则：
1. **单一职责**：每个组件只负责自己的事情
2. **数据单向流动**：清晰的消息流转路径
3. **用户体验优先**：只显示用户需要的信息
4. **标准化**：采用 Ant Design 设计规范
5. **可维护性**：清晰的代码结构和注释
