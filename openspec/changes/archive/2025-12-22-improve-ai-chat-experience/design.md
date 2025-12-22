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

#### 问题诊断

当前存在**两个独立的 loading 机制**，导致重复显示：

1. **独立 loading 气泡**（ChatBox.vue 第 120-129 行）
   ```vue
   <div v-if="isLoading" class="message assistant">
     <div class="message-avatar">🤖</div>
     <div class="message-content">
       <div class="loading-container">
         <a-spin size="small" />
         <span class="loading-text">AI 正在思考...</span>
       </div>
     </div>
   </div>
   ```
   - 通过 `isLoading` 状态控制
   - 显示"AI 正在思考..."
   - 这是旧的设计，应该删除

2. **流式消息内 loading**（流式消息内部）
   ```vue
   <div v-if="message.isStreaming" class="streaming-content">
     <!-- 过程日志 -->
     <div class="progress-logs">...</div>
     <!-- Loading 指示器 -->
     <div class="streaming-loading">
       <a-spin size="small" />
       <span>AI 正在处理...</span>
     </div>
   </div>
   ```
   - 通过 `message.isStreaming` 状态控制
   - 显示"AI 正在处理..."
   - 这是新的设计，应该保留

#### 问题根因

1. **重复的 loading 显示**
   - `isLoading = true` → 显示独立 loading 气泡
   - `addStreamingMessage()` → 创建流式消息（`isStreaming = true`）
   - 结果：两个 loading 同时显示

2. **Loading 不消失**
   - `finalizeMessage()` 设置 `isStreaming = false`
   - 但如果调用失败或逻辑错误，loading 会一直显示

#### 解决方案

**方案：完全移除独立 loading，统一使用流式消息的 loading**

```diff
// ChatBox.vue
- <!-- 加载指示器 -->
- <div v-if="isLoading" class="message assistant">
-   <div class="message-avatar">🤖</div>
-   <div class="message-content">
-     <div class="loading-container">
-       <a-spin size="small" />
-       <span class="loading-text">AI 正在思考...</span>
-     </div>
-   </div>
- </div>
```

**状态管理**：
- 移除 `isLoading` 相关逻辑
- 移除 `setLoading()` 方法
- 只使用流式消息的 `isStreaming` 状态

**工作流程**：
```
1. 用户发送消息
   → addUserMessage()

2. AI 开始处理
   → addStreamingMessage()  // 创建 { isStreaming: true }
   → 显示：[过程日志] + [loading]

3. AI 执行操作
   → appendProgressLog("✅ ...")
   → 显示：[过程日志更新] + [loading]

4. AI 完成
   → finalizeMessage(content)  // 设置 isStreaming = false
   → 显示：[过程日志] + [Markdown 摘要]（loading 消失）
```

#### 需求
- 只在流式消息内部显示 loading
- 画布保留全屏 loading（`isAIProcessing`）

#### 解决方案
**单一 Loading 状态**

```typescript
// 画布 Loading（全屏）
const isAIProcessing = ref(false)

// 聊天框 Loading（通过流式消息的 isStreaming 控制）
// 不再需要独立的 isLoading
```

**UI 实现**：
```vue
<!-- 画布 -->
<a-spin :spinning="isAIProcessing" tip="AI 正在处理流程图...">
  <BpmnEditor />
</a-spin>

<!-- 聊天框：移除独立 loading，只使用流式消息 -->
<div v-if="message.isStreaming" class="streaming-content">
  <div class="streaming-loading">
    <a-spin size="small" />
    <span>AI 正在处理...</span>
  </div>
</div>
```

**好处**：
1. 避免重复 loading 显示
2. 状态管理更简单
3. Loading 和消息内容在同一个气泡中

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

在同一条 AI 消息中，显示过程日志、loading 状态和最终 Markdown 摘要。

**优化后的体验**：
1. **只有一个消息气泡**：避免出现空气泡或多个 loading 气泡
2. **过程日志持久化**：AI 完成后不删除操作日志，保留供用户回顾
3. **追加模式**：在过程日志下方追加 Markdown 摘要，形成完整的操作记录

**时序**：
```
1. AI 开始工具调用
   → addStreamingMessage()
   → 创建一条 { isStreaming: true, progressLogs: [], content: '' }

2. 工具执行中
   → appendProgressLog("✅ 创建连线: ...")
   → appendProgressLog("✅ 创建网关: ...")
   → 消息气泡显示：
      [过程日志区域]
      ✅ 创建连线: ...
      ✅ 创建网关: ...
      [loading 指示器]
      🔄 AI 正在处理...

3. AI 返回最终响应
   → finalizeMessage(markdownContent)
   → 设置 content = markdownContent
   → 设置 isStreaming = false
   → 保留 progressLogs（不清空）
   → 消息气泡显示：
      [过程日志区域]
      ✅ 创建连线: ...
      ✅ 创建网关: ...
      [Markdown 摘要区域]
      ## 操作总结
      已成功创建请假流程...
```

**UI 渲染**：
```vue
<template>
  <div class="message assistant">
    <!-- 流式状态：显示过程日志 + loading + 可选的最终内容 -->
    <div v-if="message.isStreaming" class="streaming-content">
      <!-- 过程日志 -->
      <div v-if="message.progressLogs?.length > 0" class="progress-logs">
        <div v-for="log in message.progressLogs" :key="log" class="log-line">
          {{ log }}
        </div>
      </div>

      <!-- Loading 指示器 -->
      <div class="streaming-loading">
        <a-spin size="small" />
        <span>AI 正在处理...</span>
      </div>

      <!-- 如果已有最终内容，也显示（追加模式） -->
      <div v-if="message.content" class="markdown-content final-content">
        <div v-html="renderMarkdown(message.content)"></div>
      </div>
    </div>

    <!-- 完成状态：显示过程日志 + Markdown 内容 -->
    <div v-else>
      <!-- 保留过程日志供用户回顾 -->
      <div v-if="message.progressLogs?.length > 0" class="progress-logs">
        <div v-for="log in message.progressLogs" :key="log" class="log-line">
          {{ log }}
        </div>
      </div>

      <!-- Markdown 摘要 -->
      <div v-if="message.content" class="markdown-content">
        <div v-html="renderMarkdown(message.content)"></div>
      </div>
    </div>
  </div>
</template>
```

**关键改进**：
1. **避免冗余 loading**：
   - ❌ 旧方案：单独的 loading 气泡 + 空消息气泡
   - ✅ 新方案：在流式消息内部显示 loading

2. **保留操作历史**：
   - ❌ 旧方案：`finalizeMessage` 清空 `progressLogs`
   - ✅ 新方案：保留 `progressLogs`，只追加 `content`

3. **更好的视觉层次**：
   ```
   ┌─────────────────────────────┐
   │ 🤖 AI 助手                   │
   ├─────────────────────────────┤
   │ [过程日志 - 灰色背景]         │
   │ ✅ 创建连线: A -> B          │
   │ ✅ 创建网关: Gateway_1       │
   ├─────────────────────────────┤
   │ [Markdown 摘要 - 白色背景]   │
   │ ## 流程创建完成              │
   │ - 共创建 3 个节点            │
   │ - 共创建 2 条连线            │
   └─────────────────────────────┘
   ```

**7.3 Markdown 渲染**

使用 `markdown-it` 解析 Markdown，支持代码高亮、链接等扩展。

**集成步骤**：
1. 安装依赖：
   ```bash
   npm install markdown-it
   npm install -D @types/markdown-it
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

### 8. 消息气泡视觉统一性

#### 问题诊断 (阶段 8 完成后发现)

在修复了问题 10-12（移除独立 loading 气泡、统一使用流式消息）后，用户反馈：
- ✅ 只有一个消息气泡了
- ✅ 过程信息会渐进式添加
- ❌ 但视觉上，过程信息和 loading 态看起来像在两个独立的气泡里

**根因分析**：

当前 CSS 样式设置导致视觉分离：

```css
/* 过程日志 - 有独立的边框和圆角 */
.progress-logs {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;           /* ❌ 独立边框 */
  border-radius: 8px 8px 8px 2px;      /* ❌ 独立圆角 */
  padding: 12px 16px;
  margin-bottom: 12px;
}

/* Loading 指示器 - 也有独立的边框和圆角 */
.streaming-loading {
  background: #ffffff;
  border: 1px solid #d9d9d9;           /* ❌ 独立边框 */
  border-radius: 8px 8px 8px 2px;      /* ❌ 独立圆角 */
  padding: 12px 16px;
  margin-bottom: 12px;
}
```

**视觉问题**：
```
❌ 当前效果：
┌─────────────────────────┐
│ [过程日志气泡]          │  ← 看起来像独立气泡
│ ✅ 创建连线...          │
└─────────────────────────┘
┌─────────────────────────┐
│ [Loading 气泡]          │  ← 看起来像独立气泡
│ 🔄 AI 正在处理...       │
└─────────────────────────┘
```

#### 解决方案

**统一气泡容器**：外层容器提供统一的视觉边界，内部区域通过背景色区分

```
✅ 预期效果：
┌─────────────────────────┐
│ 统一的消息气泡           │
│ ┌───────────────────┐   │
│ │ [过程日志区域]     │   │  ← 浅灰背景，无边框
│ │ ✅ 创建连线...     │   │
│ └───────────────────┘   │
│ ┌───────────────────┐   │
│ │ [Loading 区域]     │   │  ← 白色背景，无边框
│ │ 🔄 AI 正在处理...  │   │
│ └───────────────────┘   │
└─────────────────────────┘
```

**设计原则**：

1. **外层气泡** (`.message-text` 或新增 `.message-bubble`)：
   - 统一的 `background: #ffffff`
   - 统一的 `border: 1px solid #d9d9d9`
   - 统一的 `border-radius: 8px 8px 8px 2px`
   - 统一的 `padding: 12px 16px`

2. **内部区域** (`.progress-logs`, `.streaming-loading`, `.markdown-content`)：
   - **移除** `border` 和 `border-radius`
   - 使用背景色区分：
     - `.progress-logs`: `background: #f5f5f5` (浅灰)
     - `.streaming-loading`: `background: transparent` 或 `#fafafa` (极浅灰)
     - `.markdown-content`: `background: transparent`
   - 使用 `padding` 和 `margin` 控制内部间距
   - 可选：使用 `border-top: 1px solid #f0f0f0` 作为分隔线

**实现方案**：

```vue
<!-- 外层统一气泡 -->
<div class="message-text message-bubble">
  <!-- 流式状态 -->
  <div v-if="message.isStreaming">
    <!-- 过程日志 - 无独立边框 -->
    <div v-if="message.progressLogs?.length > 0" class="progress-logs-section">
      <div v-for="log in message.progressLogs" :key="log" class="log-line">
        {{ log }}
      </div>
    </div>

    <!-- Loading - 无独立边框 -->
    <div class="streaming-loading-section">
      <a-spin size="small" />
      <span>AI 正在处理...</span>
    </div>

    <!-- 最终内容（如果有） -->
    <div v-if="message.content" class="markdown-section">
      <div v-html="renderMarkdown(message.content)"></div>
    </div>
  </div>

  <!-- 完成状态 -->
  <div v-else>
    <!-- 过程日志 -->
    <div v-if="message.progressLogs?.length > 0" class="progress-logs-section">
      ...
    </div>

    <!-- Markdown 内容 -->
    <div v-if="message.content" class="markdown-section">
      ...
    </div>
  </div>
</div>
```

**CSS 样式**：

```css
/* 统一的消息气泡外层 */
.message.assistant .message-bubble {
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 8px 8px 8px 2px;
  padding: 0;  /* 外层不加 padding，由内部区域控制 */
  overflow: hidden;  /* 确保内部圆角不溢出 */
}

/* 过程日志区域 - 移除独立边框 */
.progress-logs-section {
  background: #f5f5f5;
  padding: 12px 16px;
  /* 移除 border 和 border-radius */
}

.log-line {
  color: rgba(0, 0, 0, 0.75);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 4px;
}

.log-line:last-child {
  margin-bottom: 0;
}

/* Loading 区域 - 移除独立边框 */
.streaming-loading-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;  /* 与上方区域的分隔线 */
  /* 移除 border 和 border-radius */
}

.streaming-loading-section .loading-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

/* Markdown 内容区域 - 移除独立边框 */
.markdown-section {
  padding: 12px 16px;
  background: transparent;
  border-top: 1px solid #f0f0f0;  /* 与上方区域的分隔线 */
}

/* 如果是第一个区域，移除顶部分隔线 */
.progress-logs-section:first-child,
.streaming-loading-section:first-child,
.markdown-section:first-child {
  border-top: none;
}
```

**视觉层次**：

```
┌─────────────────────────────────┐  ← .message-bubble
│ [#f5f5f5 背景]                   │     外层统一边框和圆角
│ ✅ 创建连线: A -> B              │
│ ✅ 创建网关: Gateway_1           │
├─────────────────────────────────┤  ← border-top 分隔线
│ [#fafafa 背景]                   │
│ 🔄 AI 正在处理...                │
├─────────────────────────────────┤  ← border-top 分隔线
│ [透明背景]                       │
│ ## 操作总结                      │
│ - 共创建 3 个节点                │
└─────────────────────────────────┘
```

#### 替代方案（已拒绝）

**方案 A**：保持当前独立边框，调整间距
- ❌ 仍然看起来像多个独立气泡
- ❌ 不符合 Ant Design 消息组件的视觉规范

**方案 B**：所有内容放在一个无分隔的区域
- ❌ 过程日志和 Markdown 内容混在一起，层次不清晰
- ❌ 用户难以区分操作过程和最终结果

### 9. 消息持久化一致性

#### 问题诊断 (阶段 9 完成后发现)

在完成视觉统一后，用户反馈：
- ✅ 运行时消息显示正确
- ✅ 视觉效果统一
- ❌ 但刷新页面后，从数据库加载的历史消息内容与运行时显示不一致

**问题场景**：

1. **运行时**（用户发送消息后）：
   ```typescript
   // BpmnEditorPage.vue - handleChatWithClaude
   const response = await claudeService.sendMessage(message)
   const displayMessage = response.trim() || '✅ 操作已完成'
   rightPanelRef.value.finalizeMessage(displayMessage)
   ```
   - 显示内容：如果 `response` 为空，显示 "✅ 操作已完成"
   - 用户看到：清晰的操作完成提示

2. **刷新后**（从数据库加载历史）：
   ```typescript
   // claudeLlmService.ts - sendMessage
   await this.saveMessage(conversationId, 'assistant', response)
   ```
   - 保存内容：原始的 `response`（可能为空字符串）
   - 用户看到：空白消息或不完整的内容

**根因分析**：

```typescript
// 当前流程
┌─────────────────────────────────────────────────────┐
│ 1. claudeService.sendMessage(message)               │
│    ├─ 调用 Claude API                               │
│    ├─ 保存消息: saveMessage(conversationId,        │
│    │              'assistant', response) ← 保存原始响应 │
│    └─ 返回 response                                  │
│                                                      │
│ 2. BpmnEditorPage 处理响应                          │
│    ├─ displayMessage = response.trim() ||           │
│    │   '✅ 操作已完成'                               │
│    └─ finalizeMessage(displayMessage) ← UI 显示处理后 │
└─────────────────────────────────────────────────────┘

问题：
- 数据库保存的是 response（原始）
- UI 显示的是 displayMessage（处理后）
- 两者不一致！
```

#### 解决方案

**方案：在 finalizeMessage 后保存处理后的内容**

调整保存时机，确保保存的是最终显示给用户的内容：

```typescript
// 新流程
┌─────────────────────────────────────────────────────┐
│ 1. claudeService.sendMessage(message)               │
│    ├─ 调用 Claude API                               │
│    ├─ 返回 response（不保存）                       │
│    └─ 返回 { response, conversationId }             │
│                                                      │
│ 2. BpmnEditorPage 处理响应                          │
│    ├─ displayMessage = response.trim() ||           │
│    │   '✅ 操作已完成'                               │
│    ├─ finalizeMessage(displayMessage)               │
│    └─ claudeService.saveAssistantMessage(           │
│         conversationId, displayMessage) ← 保存处理后 │
└─────────────────────────────────────────────────────┘
```

**实现细节**：

1. **修改 `claudeLlmService.ts`**：
   ```typescript
   // 移除 sendMessage 内部的 saveMessage 调用
   async sendMessage(userMessage: string): Promise<string> {
     // ... API 调用 ...

     // ❌ 移除：await this.saveMessage(conversationId, 'assistant', response)

     return response
   }

   // 添加新方法：保存助手消息
   async saveAssistantMessage(conversationId: string, content: string): Promise<void> {
     await this.saveMessage(conversationId, 'assistant', content)
   }
   ```

2. **修改 `BpmnEditorPage.vue`**：
   ```typescript
   const handleChatWithClaude = async (message: string): Promise<void> => {
     // ... 初始化和监听设置 ...

     try {
       const response = await claudeService.sendMessage(message)
       const displayMessage = response.trim() || '✅ 操作已完成'

       // 先更新 UI
       if (rightPanelRef.value && rightPanelRef.value.finalizeMessage) {
         rightPanelRef.value.finalizeMessage(displayMessage)
       }

       // 然后保存处理后的内容
       await claudeService.saveAssistantMessage(
         claudeService.getCurrentConversationId(),
         displayMessage
       )

       showStatus('操作完成', 'success')
     } catch (error) {
       // ... 错误处理 ...
       const errorMessage = error instanceof Error ? error.message : '处理请求时出现错误'
       const displayErrorMessage = `❌ 错误: ${errorMessage}`

       if (rightPanelRef.value && rightPanelRef.value.finalizeMessage) {
         rightPanelRef.value.finalizeMessage(displayErrorMessage)
       }

       // 保存错误消息
       await claudeService.saveAssistantMessage(
         claudeService.getCurrentConversationId(),
         displayErrorMessage
       )
     } finally {
       unsubscribe()
     }
   }
   ```

**设计原则**：

1. **UI 显示为准**：数据库保存的应该是用户实际看到的内容
2. **处理后保存**：所有格式化、默认值处理都应在保存前完成
3. **一致性保证**：运行时 = 历史加载 = 数据库内容

**好处**：

1. ✅ 运行时和历史消息内容完全一致
2. ✅ 空响应正确保存为 "✅ 操作已完成"
3. ✅ 错误消息也能正确持久化
4. ✅ 数据库记录真实反映用户看到的内容

#### 替代方案（已拒绝）

**方案 A**：在加载历史时处理空响应
```typescript
// 加载时处理
messages.value = response.data.messages.map(msg => ({
  ...msg,
  content: msg.content || '✅ 操作已完成'  // ← 运行时处理
}))
```
- ❌ 逻辑分散，多处需要相同处理
- ❌ 数据库不反映真实内容
- ❌ 违反"单一数据源"原则

**方案 B**：保存两份内容（原始 + 显示）
```typescript
interface Message {
  rawContent: string      // 原始响应
  displayContent: string  // 显示内容
}
```
- ❌ 增加数据库复杂度
- ❌ 需要修改 schema
- ❌ 原始内容对用户无意义

**方案 C**：在 `claudeService.sendMessage` 内部处理
```typescript
async sendMessage(message: string): Promise<string> {
  const response = await this.callAPI(...)
  const displayMessage = response.trim() || '✅ 操作已完成'
  await this.saveMessage(conversationId, 'assistant', displayMessage)
  return displayMessage
}
```
- ❌ 业务逻辑（默认消息）混入服务层
- ❌ 服务层不应决定显示内容
- ❌ 违反职责分离原则

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
