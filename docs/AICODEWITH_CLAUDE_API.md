# AI Code With Claude Sonnet API 调用格式

## 概述

AI Code With 支持 Claude Sonnet API，使用与 Anthropic 官方 API 兼容的格式。本文档基于 Anthropic 官方 API 格式和项目现有实现整理。

## 端点配置

### Base URL 选项

根据 [AI Code With 文档](https://docs.aicodewith.com/docs/route-selection)，提供两条线路：

1. **国内直连线路（推荐）**
   ```
   https://api.jiuwanliguoxue.com
   ```

2. **CF 加速线路（备用）**
   ```
   https://api.aicodewith.com
   ```

### API 端点

Claude API 使用 Anthropic 标准端点：

```
POST /v1/messages
```

完整 URL 示例：
```
https://api.jiuwanliguoxue.com/v1/messages
或
https://api.aicodewith.com/v1/messages
```

## 请求格式

### 基本请求头

```http
Content-Type: application/json
x-api-key: YOUR_API_KEY
anthropic-version: 2023-06-01
```

**注意**：根据项目现有代码，可能使用 `Authorization: Bearer YOUR_API_KEY` 格式，需要实际测试确认。

### 基本文本生成请求

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "你是一个专业的流程图设计助手。",
  "messages": [
    {
      "role": "user",
      "content": "创建一个请假流程"
    }
  ]
}
```

### 流式响应请求

添加 `stream: true` 参数：

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "你是一个专业的流程图设计助手。",
  "messages": [
    {
      "role": "user",
      "content": "创建一个请假流程"
    }
  ],
  "stream": true
}
```

### Tool Use (Function Calling) 请求

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "你是一个专业的流程图设计助手。",
  "tools": [
    {
      "name": "createNode",
      "description": "创建 BPMN 节点",
      "input_schema": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "节点 ID"
          },
          "name": {
            "type": "string",
            "description": "节点名称"
          },
          "type": {
            "type": "string",
            "enum": ["startEvent", "endEvent", "userTask", "serviceTask"],
            "description": "节点类型"
          },
          "position": {
            "type": "object",
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" }
            },
            "required": ["x", "y"]
          }
        },
        "required": ["id", "name", "type", "position"]
      }
    }
  ],
  "tool_choice": {
    "type": "any"
  },
  "messages": [
    {
      "role": "user",
      "content": "创建一个开始节点"
    }
  ]
}
```

### Prompt Caching 请求

为 System Prompt 启用缓存：

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "你是一个专业的流程图设计助手。",
  "cache_control": {
    "type": "ephemeral"
  },
  "messages": [
    {
      "role": "user",
      "content": "创建一个请假流程"
    }
  ]
}
```

## 响应格式

### 非流式响应

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "我来帮你创建一个请假流程..."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 25,
    "output_tokens": 100
  }
}
```

### Tool Use 响应

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01A23B",
      "name": "createNode",
      "input": {
        "id": "StartEvent_1",
        "name": "开始",
        "type": "startEvent",
        "position": {
          "x": 200,
          "y": 100
        }
      }
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "tool_use",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 25,
    "output_tokens": 50
  }
}
```

### 流式响应 (SSE)

流式响应使用 Server-Sent Events (SSE) 格式：

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_01XFDUDYJgAACzvnptvVoYEL","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":25,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"我来"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"帮你"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":100}}

event: message_stop
data: {"type":"message_stop"}
```

## 模型名称

根据 Anthropic 官方文档，Claude Sonnet 模型名称格式：

- `claude-sonnet-4-20250514` - Claude Sonnet 4（最新版本）
- `claude-sonnet-3-5-20241022` - Claude Sonnet 3.5
- `claude-opus-4-20250514` - Claude Opus 4（如果需要更强能力）

**注意**：实际模型名称需要根据 aicodewith.com 提供的模型列表确认。

## 代码示例

### TypeScript/JavaScript 实现

```typescript
class ClaudeAPIClient {
  private apiKey: string
  private baseUrl: string = 'https://api.jiuwanliguoxue.com'
  private model: string = 'claude-sonnet-4-20250514'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * 基本文本生成
   */
  async generateContent(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt?: string
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages
      })
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    return data.content[0].text
  }

  /**
   * 流式生成
   */
  async *generateContentStream(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          if (jsonStr === '[DONE]') continue

          try {
            const event = JSON.parse(jsonStr)
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text
            }
          } catch (e) {
            console.error('解析 SSE 事件失败:', e)
          }
        }
      }
    }
  }

  /**
   * Tool Use 生成
   */
  async generateWithTools(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    tools: Array<{
      name: string
      description: string
      input_schema: any
    }>,
    systemPrompt?: string
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools,
        tool_choice: { type: 'any' },
        messages: messages
      })
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    return data
  }
}
```

## 与 Gemini API 的差异

| 特性 | Gemini API | Claude API |
|------|-----------|-----------|
| **端点** | `/v1beta/models/{model}:generateContent` | `/v1/messages` |
| **认证头** | `x-goog-api-key` | `x-api-key` 或 `Authorization: Bearer` |
| **消息格式** | `contents` 数组 | `messages` 数组 |
| **系统提示** | `systemInstruction.parts` | `system` 字符串 |
| **工具定义** | `tools[].functionDeclarations` | `tools[]` 数组 |
| **工具调用** | `functionCall` | `tool_use` content block |
| **流式格式** | `data: {...}` | SSE events |

## 注意事项

1. **API Key 格式**：需要确认 aicodewith.com 使用的认证格式（可能是 `x-api-key` 或 `Authorization: Bearer`）

2. **模型名称**：需要确认 aicodewith.com 实际支持的模型名称列表

3. **版本头**：Anthropic API 需要 `anthropic-version` 头，需要确认 aicodewith.com 是否要求

4. **错误格式**：需要测试错误响应的格式，可能与官方 API 略有不同

5. **速率限制**：需要了解 aicodewith.com 的速率限制策略

## 测试建议

1. **基础连接测试**：先测试简单的文本生成请求
2. **认证测试**：确认 API Key 格式和认证方式
3. **流式测试**：测试 SSE 流式响应解析
4. **Tool Use 测试**：测试工具调用和响应解析
5. **错误处理测试**：测试各种错误场景

## 参考文档

- [Anthropic Claude API 文档](https://docs.anthropic.com/claude/reference)
- [AI Code With 文档](https://docs.aicodewith.com/docs)
- [Anthropic Messages API](https://docs.anthropic.com/claude/reference/messages-post)
- [Anthropic Streaming API](https://docs.anthropic.com/claude/reference/messages-streaming)

---

**最后更新**: 2025-12-11  
**状态**: 待实际测试验证
