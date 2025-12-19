# 设计文档：接入 Claude Sonnet LLM

## 背景

### 当前架构
项目当前使用 Gemini API 作为 LLM 服务提供商，实现了以下功能：
- **AI 工作流生成**：通过 Function Calling 直接操作 BPMN 编辑器
- **文本生成**：支持标准的提示词-响应模式
- **流式响应**：通过 SSE 实现实时反馈

代码位置：
- `packages/client/src/services/llmService.ts` - LLM 服务核心
- `packages/client/src/services/llmTools.ts` - Function Calling 工具定义
- `packages/client/src/prompts/` - 系统提示词

### 问题
1. **API 格式差异**：Gemini 和 Claude 的 API 格式不同
2. **Function Calling 机制**：Claude 使用 Tool Use，Gemini 使用 Function Declarations
3. **流式响应格式**：SSE 事件格式不同
4. **成本优化**：需要利用 Claude 的 Prompt Caching

## 目标和非目标

### 目标
1. ✅ **无缝替换**：用户无感知地将 Gemini 替换为 Claude
2. ✅ **功能增强**：利用 Claude 更强的能力提升 AI 质量
3. ✅ **成本优化**：使用 Prompt Caching 降低 API 成本
4. ✅ **扩展性**：为未来添加更多 AI 功能奠定基础

### 非目标
- ❌ 不支持多模型切换（用户不能选择模型）
- ❌ 不保留 Gemini 代码（完全移除）
- ❌ 不实现本地模型（仅云端 API）

## 架构设计

### 核心组件

```typescript
// 1. LLM 抽象层
interface ILLMService {
  generateContent(messages: Message[], options?: GenerateOptions): Promise<string>
  generateContentStream(messages: Message[], options?: GenerateOptions): AsyncGenerator<string>
  generateWithTools(messages: Message[], tools: Tool[], options?: GenerateOptions): Promise<ToolResponse>
}

// 2. Claude API 适配器
class ClaudeAPIAdapter implements ILLMService {
  private apiKey: string
  private baseUrl: string  // aicodewith.com 或其他代理
  private model: string = 'claude-sonnet-4.5'

  async generateContent(): Promise<string> { /* ... */ }
  async generateContentStream(): AsyncGenerator<string> { /* ... */ }
  async generateWithTools(): Promise<ToolResponse> { /* ... */ }
}

// 3. 统一的 LLM 服务
class LLMService {
  private adapter: ILLMService

  constructor() {
    this.adapter = new ClaudeAPIAdapter()
  }

  // 公共 API
  async sendMessage(prompt: string, options?: any): Promise<string>
  async sendMessageStream(prompt: string, options?: any): AsyncGenerator<string>
  async executeTools(prompt: string, tools: Tool[]): Promise<any>
}
```

### 数据流

```
用户输入
  ↓
LLMService (统一接口)
  ↓
ClaudeAPIAdapter (协议转换)
  ↓
HTTP Client (API 调用)
  ↓
aicodewith.com 代理
  ↓
Anthropic Claude API
  ↓
响应处理 (Function Calling / 流式)
  ↓
用户界面更新
```

### API 格式映射

#### 消息格式

**Gemini Format:**
```json
{
  "contents": [{
    "role": "user",
    "parts": [{ "text": "..." }]
  }],
  "systemInstruction": {
    "parts": [{ "text": "..." }]
  }
}
```

**Claude Format:**
```json
{
  "model": "claude-sonnet-4.5",
  "max_tokens": 4096,
  "system": "...",
  "messages": [{
    "role": "user",
    "content": "..."
  }]
}
```

#### Function Calling / Tool Use

**Gemini Function Declarations:**
```json
{
  "tools": [{
    "functionDeclarations": [{
      "name": "createNode",
      "description": "...",
      "parameters": { "type": "object", "properties": {...} }
    }]
  }]
}
```

**Claude Tool Use:**
```json
{
  "tools": [{
    "name": "createNode",
    "description": "...",
    "input_schema": {
      "type": "object",
      "properties": {...}
    }
  }]
}
```

#### 流式响应

**Gemini SSE:**
```
data: {"candidates": [{"content": {"parts": [{"text": "..."}]}}]}
```

**Claude SSE:**
```
event: content_block_delta
data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "..."}}
```

## 关键决策

### 决策 1：使用代理 vs 官方 API

**选项 A**：直接使用 Anthropic 官方 API
- ✅ 最直接、最稳定
- ❌ 可能有地域限制
- ❌ 支付方式受限

**选项 B**：使用 aicodewith.com 代理（选择）
- ✅ 国内可访问
- ✅ 支付灵活
- ❌ 增加一层依赖
- ❌ 可能有额外延迟

**决策**：优先使用 aicodewith.com，但保留切换到官方 API 的能力（通过配置）

### 决策 2：完全替换 vs 多模型支持

**选项 A**：完全替换 Gemini（选择）
- ✅ 代码简单，维护成本低
- ✅ 用户体验统一
- ❌ 失去灵活性

**选项 B**：支持多模型切换
- ✅ 灵活性高
- ❌ 架构复杂
- ❌ 用户选择困难

**决策**：完全替换，简单直接

### 决策 3：Function Calling 适配策略

**选项 A**：直接转换现有工具定义（选择）
- ✅ 快速迁移
- ✅ 保持现有功能
- ❌ 可能不充分利用 Claude 特性

**选项 B**：重新设计工具接口
- ✅ 可以优化 Claude 体验
- ❌ 开发成本高
- ❌ 需要重新测试

**决策**：先转换，后优化

### 决策 4：Prompt Caching 策略

**实现方式**：
- 为长系统提示词启用缓存（使用 `cache_control` 标记）
- 缓存策略：
  - System prompt: 总是缓存（变化少）
  - Tool definitions: 总是缓存（固定不变）
  - User messages: 不缓存（每次不同）

**预期效果**：
- 首次请求：正常计费
- 后续请求：System + Tools 部分缓存，成本降低 90%
- 缓存有效期：5 分钟

## 数据模型

### LLM 配置

```typescript
interface LLMConfig {
  provider: 'claude' | 'gemini'  // 保留可扩展性
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
  enableCache: boolean
}
```

### 消息格式

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, any>
}
```

### 工具定义

```typescript
interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required?: string[]
  }
}

interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  enum?: any[]
}
```

## 错误处理

### 错误类型
1. **网络错误**：连接超时、DNS 失败
2. **API 错误**：认证失败、配额超限、参数错误
3. **模型错误**：拒绝生成、安全过滤
4. **工具错误**：Tool Use 格式错误、执行失败

### 处理策略
```typescript
try {
  const response = await claudeAdapter.generateContent(messages)
  return response
} catch (error) {
  if (error.status === 429) {
    // 速率限制：指数退避重试
    await exponentialBackoff(retry)
  } else if (error.status === 401) {
    // 认证失败：提示用户更新 API Key
    throw new AuthError('API Key 无效或过期')
  } else if (error.status === 500) {
    // 服务器错误：降级到简单响应或缓存
    return await fallbackResponse()
  } else {
    // 其他错误：记录并展示给用户
    logError(error)
    throw new LLMError('AI 服务暂时不可用')
  }
}
```

## 性能优化

### 1. Prompt Caching
- System prompt 使用 `cache_control: { type: "ephemeral" }`
- 缓存命中率目标：> 60%
- 成本节省：约 70-90%

### 2. 请求合并
- 短时间内的多个请求合并为一个
- 使用防抖（debounce）减少频繁调用

### 3. 流式响应优化
- 使用 ReadableStream 而非全量等待
- 首个 token 延迟目标：< 500ms
- 渐进式 UI 更新

### 4. 错误重试
- 指数退避：1s, 2s, 4s, 8s
- 最大重试次数：3 次
- 重试条件：429 (Rate Limit), 500 (Server Error)

## 安全考虑

### 1. API Key 管理
- 使用环境变量存储（不提交到代码）
- 前端不暴露完整 Key（考虑后端代理）
- 支持 Key 轮换

### 2. 输入验证
- 限制提示词长度（< 100,000 tokens）
- 过滤敏感信息
- 防止注入攻击

### 3. 输出过滤
- 检测不当内容
- 限制输出长度
- 验证 Tool Use 参数

### 4. 审计日志
- 记录所有 API 调用
- 记录异常和错误
- 定期审查使用模式

## 迁移计划

### Phase 1：基础设施（3 天）
1. 创建 `ClaudeAPIAdapter` 类
2. 实现基本的文本生成功能
3. 实现流式响应
4. 单元测试

### Phase 2：Tool Use 适配（2 天）
1. 转换现有 Function Declarations 为 Tool Use
2. 适配工具执行逻辑
3. 测试所有 BPMN 编辑器工具
4. 调优提示词

### Phase 3：对话管理（2 天）
1. 实现对话历史存储
2. 实现多轮对话上下文管理
3. 添加 Prompt Caching
4. 性能测试

### Phase 4：用户运营集成（3 天）
1. 创建 AI Agent 聊天 UI
2. 集成生命周期运营数据
3. 实现智能推荐逻辑
4. E2E 测试

### Phase 5：优化和发布（2 天）
1. 性能优化
2. 错误处理完善
3. 文档更新
4. 生产环境部署

## 验收标准

### 功能验收
- ✅ 所有现有 AI 功能正常工作（工作流生成、节点创建等）
- ✅ 流式响应延迟 < 500ms
- ✅ Function Calling 准确率 > 95%
- ✅ 对话历史正确管理（至少 10 轮）
- ✅ AI Agent 聊天界面用户体验良好

### 性能验收
- ✅ API 响应时间 P95 < 3s
- ✅ Prompt Caching 命中率 > 60%
- ✅ 错误率 < 1%
- ✅ 并发支持 > 100 用户

### 成本验收
- ✅ 单次工作流生成成本 < $0.05
- ✅ 对话轮均成本 < $0.01
- ✅ 相比 Gemini 成本变化 < +20%

## 风险和缓解

### 技术风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Claude API 格式变更 | 高 | 低 | 使用官方 SDK，定期更新 |
| 代理服务不稳定 | 高 | 中 | 实现降级策略，准备备用代理 |
| Tool Use 性能差 | 中 | 低 | 优化提示词，使用缓存 |
| 成本超预算 | 高 | 中 | 实现用量监控，设置阈值告警 |

### 业务风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 用户体验下降 | 高 | 低 | 充分测试，灰度发布 |
| AI 质量不达预期 | 中 | 中 | A/B 测试，持续优化提示词 |
| 依赖第三方服务 | 中 | 中 | 准备多个代理选项 |

## 未来工作

### 短期（1-2 个月）
- 添加对话数据分析和用户行为追踪
- 优化提示词模板库
- 实现 A/B 测试框架

### 中期（3-6 个月）
- 支持图像和文件上传（Claude 3.5 Sonnet 支持）
- 实现 RAG（检索增强生成）与业务数据集成
- 添加自定义 AI Agent 配置界面

### 长期（6-12 个月）
- 支持多模型切换（Claude、GPT、Gemini）
- 实现本地模型部署选项
- 构建 AI 能力市场
