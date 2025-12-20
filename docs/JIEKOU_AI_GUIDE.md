# jiekou.ai 集成快速指南

## 📋 概述

本项目使用 **jiekou.ai** 作为 Claude API 的代理服务，提供国内友好的访问方式。

## 🎯 为什么选择 jiekou.ai

✅ **国内访问友好**: 无需科学上网，访问速度快
✅ **完全兼容**: 100% 兼容 Anthropic Claude API 协议
✅ **支持 Prompt Caching**: 可以节省大量 Token 成本
✅ **支持 Extended Thinking**: 适合复杂推理任务
✅ **按需付费**: 灵活的计费方式

## ⚙️ 配置步骤

### 1. 获取 API Key

访问 [jiekou.ai](https://jiekou.ai) 注册账号并获取 API Key。

### 2. 配置后端 (packages/server/.env)

```bash
# Claude API Configuration
CLAUDE_API_KEY=sk_your_jiekou_api_key_here
CLAUDE_BASE_URL=https://api.jiekou.ai
```

### 3. 配置前端 (packages/client/.env)

```bash
# API Base URL - 指向本地后端代理
VITE_CLAUDE_BASE_URL=http://api.workflow.com:3000/api/claude

# Claude Model - 使用最新的 Sonnet 4.5
VITE_CLAUDE_MODEL=claude-sonnet-4-5-20250929

# API Key留空（由后端管理）
VITE_CLAUDE_API_KEY=
```

## 🔧 技术细节

### API 端点差异

jiekou.ai 的 API 端点与 Anthropic 官方略有不同：

| 服务商 | 端点路径 |
|--------|---------|
| jiekou.ai | `/anthropic/v1/messages` |
| Anthropic 官方 | `/v1/messages` |

**好消息**: 我们的代码已经自动处理了这个差异！

```typescript
// packages/server/src/routes/claudeRoutes.ts
const endpoint = CLAUDE_BASE_URL.includes('jiekou.ai')
  ? `${CLAUDE_BASE_URL}/anthropic/v1/messages`
  : `${CLAUDE_BASE_URL}/v1/messages`
```

### 基本请求格式

```bash
curl https://api.jiekou.ai/anthropic/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

## 🚀 高级特性

### 1. Prompt Caching

通过标记 `cache_control` 来缓存常用的系统提示词，节省成本：

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "system": [
    {
      "type": "text",
      "text": "你是一个BPMN流程图编辑助手...(很长的系统提示词)",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [...]
}
```

**优势**:
- 首次请求: 正常收费
- 后续请求 (5分钟内): 缓存部分仅收费 10%
- 大幅降低成本，特别是长系统提示词

### 2. Extended Thinking

启用思考过程，提高复杂任务的推理质量：

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 16000,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  },
  "messages": [
    {
      "role": "user",
      "content": "设计一个复杂的审批流程，包含多级审批和条件分支"
    }
  ]
}
```

**适用场景**:
- 复杂流程设计
- 多步骤推理
- 需要深度分析的任务

### 3. 大上下文 (1M tokens)

激活 1M token 上下文窗口，处理超大文档：

```bash
curl https://api.jiekou.ai/anthropic/v1/messages \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-beta: context-1m-2025-08-07" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "分析这个包含1000个节点的BPMN流程图..."}
    ]
  }'
```

### 4. Tool Use 支持

jiekou.ai 支持的工具类型：

✅ **支持**:
- Bash (命令行工具)
- Text editor (文本编辑)
- **自定义工具** (如我们的 BPMN 编辑工具)

❌ **暂不支持**:
- Computer use (计算机使用)
- Web fetch (网页抓取)
- Web search (网页搜索)

**我们的实现**:

```typescript
// packages/client/src/services/claudeEditorBridge.ts
const tools = [
  {
    name: 'createTask',
    description: '创建一个BPMN任务节点',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '节点ID' },
        type: { type: 'string', enum: ['bpmn:Task', 'bpmn:UserTask', ...] },
        name: { type: 'string', description: '节点名称' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          }
        }
      },
      required: ['id', 'type', 'name']
    }
  },
  // ... 更多 BPMN 操作工具
]
```

## 📊 使用统计

jiekou.ai 响应中包含详细的使用统计：

```json
{
  "usage": {
    "input_tokens": 24,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 0,
    "cache_creation": {
      "ephemeral_5m_input_tokens": 0,
      "ephemeral_1h_input_tokens": 0
    },
    "output_tokens": 11,
    "service_tier": "standard"
  }
}
```

**字段说明**:
- `input_tokens`: 输入 token 数
- `cache_read_input_tokens`: 从缓存读取的 token 数
- `output_tokens`: 输出 token 数
- `cache_creation`: 缓存创建信息

## 🧪 测试验证

### 健康检查

```bash
curl http://localhost:3000/api/claude/v1/health
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

### 简单消息测试

```bash
curl -X POST http://localhost:3000/api/claude/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### BPMN 工具调用测试

在浏览器中打开 `http://api.workflow.com:8000`，点击右下角的 AI 助手按钮，输入：

```
创建一个简单的请假流程，包含：
1. 开始节点
2. 填写请假申请
3. 经理审批
4. 结束节点
```

Claude 应该会自动调用工具创建这些节点。

## 🔍 故障排查

### 问题 1: "All API channels unavailable"

**原因**: Base URL 配置错误或 API Key 无效

**解决**:
1. 检查 `packages/server/.env` 中的 `CLAUDE_BASE_URL`
2. 确认值为 `https://api.jiekou.ai` (不是 `https://api.aicodewith.com`)
3. 验证 API Key 有效性

### 问题 2: 404 Not Found

**原因**: 端点路径不匹配

**解决**:
1. 确认代码已更新到最新版本
2. 检查 `packages/server/src/routes/claudeRoutes.ts` 中的端点逻辑
3. 重启后端服务

### 问题 3: CORS 错误

**原因**: 前端直接调用 Claude API

**解决**:
1. 确认前端配置指向后端代理: `VITE_CLAUDE_BASE_URL=http://api.workflow.com:3000/api/claude`
2. 不要在前端配置中填写 API Key
3. 所有请求必须通过后端代理

### 问题 4: Tool Use 不生效

**原因**: jiekou.ai 不支持某些工具类型

**检查**:
- ✅ 自定义工具 (BPMN 操作) - **支持**
- ❌ Computer use, Web fetch, Web search - **不支持**

我们的 BPMN 工具是自定义工具，完全支持！

## 💰 成本优化建议

### 1. 启用 Prompt Caching

对于长系统提示词，务必启用缓存：

```typescript
// packages/client/src/services/claudeLlmService.ts
const systemMessage = {
  type: 'text',
  text: CLAUDE_BPMN_SYSTEM_PROMPT,
  cache_control: { type: 'ephemeral' }  // 启用缓存
}
```

**预期节省**: 70-90% (如果系统提示词占 1000+ tokens)

### 2. 优化 max_tokens

根据实际需求设置 `max_tokens`，避免浪费：

```typescript
// 简单对话: 1024
// BPMN 创建: 2048
// 复杂流程设计: 4096
```

### 3. 使用合适的模型

| 任务类型 | 推荐模型 | 理由 |
|---------|---------|------|
| 简单节点创建 | Sonnet 3.5 | 成本更低 |
| 复杂流程设计 | Sonnet 4.5 | 当前使用，最佳平衡 |
| 超复杂推理 | Opus 3.0 | 最强但最贵 |

### 4. 批量操作

尽量在一次对话中完成多个操作，而不是多次单独调用：

**不好**:
- 用户: "创建开始节点"
- 用户: "创建任务节点"
- 用户: "连接它们"

**更好**:
- 用户: "创建一个包含开始节点、任务节点的流程，并连接它们"

## 📚 参考文档

- **jiekou.ai 文档**: https://docs.jiekou.ai/docs/providers/anthropic
- **Anthropic API 文档**: https://docs.anthropic.com/en/api
- **Tool Use 指南**: https://docs.anthropic.com/en/docs/tool-use
- **Prompt Caching**: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

## 🎉 快速开始

1. 获取 jiekou.ai API Key
2. 配置 `packages/server/.env`
3. 重启后端: `cd packages/server && npm run dev`
4. 访问 `http://api.workflow.com:8000`
5. 点击 AI 助手按钮开始使用！

---

**最后更新**: 2025-12-19
**API 状态**: ✅ 正常运行
**测试结果**: ✅ jiekou.ai integration test successful
