# Claude AI 集成文档

## 概述

本项目集成了 Claude Sonnet 4.5 大语言模型，通过 jiekou.ai 代理服务实现 AI 驱动的 BPMN 流程图智能编辑功能。

## 架构设计

```
Frontend (Vue 3)
    ↓ HTTP Request
Backend Proxy (Express)
    ↓ Forward with API Key
jiekou.ai (https://api.jiekou.ai)
    ↓ Route to
Anthropic Claude API
```

### 为什么需要后端代理？

1. **解决 CORS 问题**: 浏览器安全策略阻止直接调用第三方 API
2. **保护 API Key**: API 密钥存储在服务端，前端无法访问
3. **统一管理**: 便于监控、日志记录和错误处理

## 配置说明

### 1. 后端配置 (packages/server/.env)

```bash
# Claude API Configuration
CLAUDE_API_KEY=***REMOVED***
CLAUDE_BASE_URL=https://api.jiekou.ai
```

### 2. 前端配置 (packages/client/.env)

```bash
# API Base URL - 指向本地后端代理
VITE_CLAUDE_BASE_URL=http://dev.simonsliu.woa.com:3000/api/claude

# Claude Model - 使用最新的 Sonnet 4.5
VITE_CLAUDE_MODEL=claude-sonnet-4-5-20250929

# API Key留空（由后端管理）
VITE_CLAUDE_API_KEY=
```

## API 端点

### 后端代理端点

#### POST /api/claude/v1/messages

发送消息给 Claude AI

**请求示例:**
```bash
curl -X POST http://dev.simonsliu.woa.com:3000/api/claude/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 4096,
    "messages": [
      {
        "role": "user",
        "content": "创建一个请假流程"
      }
    ],
    "tools": [...]
  }'
```

**响应示例:**
```json
{
  "id": "msg_01CSGL5ScyzL9A5x4KcHSUSG",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-5-20250929",
  "content": [
    {
      "type": "text",
      "text": "好的，我来创建一个请假流程"
    },
    {
      "type": "tool_use",
      "id": "toolu_01...",
      "name": "createTask",
      "input": {
        "id": "StartEvent_1",
        "type": "bpmn:StartEvent",
        "name": "发起请假申请"
      }
    }
  ],
  "stop_reason": "end_turn"
}
```

#### GET /api/claude/v1/health

检查 Claude API 配置状态

**响应示例:**
```json
{
  "configured": true,
  "baseUrl": "https://api.jiekou.ai",
  "apiVersion": "2023-06-01",
  "message": "Claude API is configured and ready"
}
```

## 核心代码文件

### 1. 后端代理 (packages/server/src/routes/claudeRoutes.ts)

处理 Claude API 请求的代理层：

```typescript
router.post('/messages', async (req: Request, res: Response) => {
  const claudeResponse = await fetch(`${CLAUDE_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': CLAUDE_API_VERSION
    },
    body: JSON.stringify(req.body)
  })

  const responseData = await claudeResponse.json()
  res.status(claudeResponse.status).json(responseData)
})
```

### 2. LLM 配置管理 (packages/client/src/config/llmConfig.ts)

管理 Claude API 的配置信息：

```typescript
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'claude',
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
  baseUrl: import.meta.env.VITE_CLAUDE_BASE_URL || 'https://api.anthropic.com',
  model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
  temperature: 0.7,
  enableCache: true
}
```

### 3. Claude 服务 (packages/client/src/services/claudeLlmService.ts)

实现与 Claude API 的交互逻辑：

```typescript
export function createBpmnClaudeLLMService(
  editorBridge: ReturnType<typeof createClaudeEditorBridge>,
  systemPrompt: string
) {
  const tools = editorBridge.getTools()

  const sendMessage = async (userMessage: string): Promise<string> => {
    const response = await client.sendMessage({
      messages: conversationHistory.value,
      system: systemPrompt,
      tools
    })

    // 处理工具调用
    if (hasToolUse) {
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = editorBridge.executeToolCall(
            block.name,
            block.input
          )
          // 继续对话...
        }
      }
    }
  }
}
```

### 4. 编辑器桥接 (packages/client/src/services/claudeEditorBridge.ts)

定义 Claude 可调用的工具（BPMN 操作）：

```typescript
export function createClaudeEditorBridge() {
  const tools = [
    {
      name: 'createTask',
      description: '创建一个BPMN任务节点',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['bpmn:Task', 'bpmn:UserTask', ...] },
          name: { type: 'string' }
        }
      }
    },
    // ... 更多工具
  ]

  const executeToolCall = (toolName: string, input: any) => {
    switch (toolName) {
      case 'createTask':
        return editorOperationService.createTask(input)
      // ... 更多工具执行
    }
  }
}
```

### 5. UI 集成 (packages/client/src/App.vue)

AI 助手按钮和对话框：

```vue
<template>
  <!-- AI助手按钮 -->
  <div
    v-if="!showChatBox"
    class="chat-toggle-btn"
    @click="toggleChatBox"
  >
    <span class="avatar-icon">👤</span>
    <div class="pulse-ring"></div>
  </div>

  <!-- 聊天对话框 -->
  <ChatBox
    v-if="showChatBox"
    @sendMessage="handleChatMessage"
    @close="handleCloseChatBox"
  />
</template>

<script setup lang="ts">
const handleChatMessage = async (message: string) => {
  if (!claudeService) {
    const editorBridge = createClaudeEditorBridge()
    claudeService = createBpmnClaudeLLMService(
      editorBridge,
      CLAUDE_BPMN_SYSTEM_PROMPT
    )
  }

  const response = await claudeService.sendMessage(message)
  chatBoxRef.value?.addAssistantMessage(response)
}
</script>
```

## 使用 jiekou.ai 的优势

1. **兼容 Anthropic API**: 完全兼容 Claude 官方 API 格式
2. **国内访问友好**: 无需科学上网，访问速度更快
3. **按需付费**: 灵活的计费方式
4. **简单配置**: 只需更换 Base URL 和 API Key

### jiekou.ai 配置要点

- **Base URL**: `https://api.jiekou.ai`
- **API 端点**: `/anthropic/v1/messages` (注意与官方 API 路径不同)
- **API Key 格式**: `sk_*`
- **API Version**: `2023-06-01` (与 Anthropic 保持一致)
- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: {YOUR_API_KEY}`
  - `anthropic-version: 2023-06-01`

### jiekou.ai 特性支持

#### 1. Prompt Caching (支持)
可以通过 Anthropic 协议使用 Prompt Caching 来节省 Token 成本：

```typescript
// 在 system 中标记需要缓存的部分
{
  "model": "claude-sonnet-4-5-20250929",
  "system": [
    {
      "type": "text",
      "text": "这是一个很长的系统提示词...",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [...]
}
```

#### 2. Extended Thinking (支持)
对于复杂推理任务，可以启用扩展思考模式：

```bash
curl https://api.jiekou.ai/anthropic/v1/messages \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 16000,
    "thinking": {
      "type": "enabled",
      "budget_tokens": 10000
    },
    "messages": [{"role": "user", "content": "..."}]
  }'
```

#### 3. Tool Use (部分支持)
- ✅ 支持: Bash, Text editor
- ❌ 暂不支持: Computer use, Web fetch, Web search

#### 4. 大上下文支持 (1M tokens)
可以通过 `anthropic-beta` header 激活 1M token 上下文：

```bash
curl https://api.jiekou.ai/anthropic/v1/messages \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-beta: context-1m-2025-08-07" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Process this large document..."}]
  }'
```

## 支持的模型

| 模型 ID | 描述 | 推荐场景 |
|--------|------|---------|
| claude-sonnet-4-5-20250929 | Sonnet 4.5 最新版 | **当前使用** - 最佳性价比 |
| claude-3-5-sonnet-20241022 | Sonnet 3.5 | 兼容性需求 |
| claude-3-opus-20240229 | Opus 3.0 | 复杂推理任务 |
| claude-3-sonnet-20240229 | Sonnet 3.0 | 预算有限场景 |

## 测试验证

### 1. 健康检查

```bash
curl http://dev.simonsliu.woa.com:3000/api/claude/v1/health
```

预期响应:
```json
{
  "configured": true,
  "baseUrl": "https://api.jiekou.ai",
  "apiVersion": "2023-06-01",
  "message": "Claude API is configured and ready"
}
```

### 2. 发送测试消息

```bash
curl -X POST http://dev.simonsliu.woa.com:3000/api/claude/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

预期响应:
```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-5-20250929",
  "content": [{"type": "text", "text": "Hi"}],
  "stop_reason": "end_turn"
}
```

## 故障排查

### 问题 1: CORS 错误

**症状**: 浏览器控制台报错 `Access to fetch has been blocked by CORS policy`

**原因**: 前端直接调用了 Claude API

**解决**: 确保前端使用后端代理地址 `http://dev.simonsliu.woa.com:3000/api/claude`

### 问题 2: 404 Not Found

**症状**: `Claude API 调用失败: 404 Not Found`

**原因**: 路由路径不匹配

**检查**:
- 后端路由: `app.use('/api/claude/v1', claudeRoutes)`
- 前端配置: `VITE_CLAUDE_BASE_URL=http://dev.simonsliu.woa.com:3000/api/claude`
- 完整路径: `/api/claude` + `/v1` + `/messages`

### 问题 3: API Key 未配置

**症状**: `Claude API Key not configured`

**解决**: 在 `packages/server/.env` 中设置:
```bash
CLAUDE_API_KEY=sk_your_api_key_here
```

### 问题 4: 按钮不可见

**症状**: 看不到 AI 助手按钮

**检查**:
1. 确认 `App.vue` 中有 `.chat-toggle-btn` 元素
2. 检查 `showChatBox` 状态
3. 查看浏览器开发工具 Elements 面板

## 安全最佳实践

1. **API Key 安全**:
   - ✅ 仅存储在服务端 `.env` 文件
   - ✅ 不提交到 Git (`.env` 已在 `.gitignore`)
   - ✅ 不在前端代码中硬编码

2. **请求验证**:
   - 在后端添加请求频率限制
   - 验证请求来源（CORS 配置）
   - 记录异常请求日志

3. **错误处理**:
   - 不在前端暴露 API Key
   - 统一错误响应格式
   - 记录详细错误日志

## 性能优化

1. **缓存策略**:
   - 启用 Claude Prompt Caching (已配置 `enableCache: true`)
   - 缓存常用 System Prompt 以节省 Token

2. **请求优化**:
   - 合理设置 `max_tokens` 避免过长响应
   - 使用 `temperature: 0.7` 平衡创造性和稳定性

3. **工具调用**:
   - 精简工具定义，只包含必要字段
   - 优化工具描述，提高调用准确性

## 监控和日志

后端代理会记录以下信息：

```typescript
logger.info('Claude API request proxied', {
  status: claudeResponse.status,
  model: req.body.model
})

logger.error('Claude API proxy error', error)
```

查看日志:
```bash
cd packages/server
npm run dev  # 日志会输出到控制台
```

## 下一步计划

- [ ] 添加请求频率限制 (Rate Limiting)
- [ ] 实现会话持久化 (存储对话历史)
- [ ] 添加 Token 使用统计
- [ ] 优化错误处理和用户提示
- [ ] 支持流式响应 (Server-Sent Events)

## 参考资源

- jiekou.ai 文档: https://docs.jiekou.ai/docs/providers/anthropic
- Claude API 文档: https://docs.anthropic.com/en/api
- Tool Use 指南: https://docs.anthropic.com/en/docs/tool-use
- Prompt Caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

---

**最后更新**: 2025-12-19
**当前版本**: v1.0.0
**API 状态**: ✅ 正常运行
