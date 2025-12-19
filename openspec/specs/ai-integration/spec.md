# ai-integration Specification

## Purpose
TBD - created by archiving change integrate-claude-sonnet-llm. Update Purpose after archive.
## Requirements
### Requirement: Claude API 客户端

系统 SHALL 实现 Claude API 客户端，用于与 Anthropic Claude LLM 进行通信。

#### Scenario: 基本配置

- **WHEN** 初始化 Claude API 客户端
- **THEN** 客户端应当读取配置：API Key、Base URL、Model 名称
- **AND** 配置应当支持环境变量和运行时设置
- **AND** API Key 应当安全存储，不暴露在客户端代码中

#### Scenario: 文本生成

- **WHEN** 调用 `generateContent()` 方法
- **THEN** 系统应当发送 HTTP POST 请求到 Claude API
- **AND** 请求格式应当符合 Claude Messages API 规范
- **AND** 响应应当解析为纯文本字符串
- **AND** 错误应当被捕获并转换为友好的错误消息

#### Scenario: 流式响应

- **WHEN** 调用 `generateContentStream()` 方法
- **THEN** 系统应当使用 Server-Sent Events (SSE) 接收响应
- **AND** 每个文本块应当通过 AsyncGenerator yield 返回
- **AND** 首个 token 延迟应当小于 500ms
- **AND** 流式响应应当支持取消操作

### Requirement: Tool Use（Function Calling）

系统 SHALL 支持 Claude 的 Tool Use 功能，使 AI 能够调用预定义的工具函数。

#### Scenario: 工具定义

- **WHEN** 定义工具供 Claude 调用
- **THEN** 工具定义应当包含：name、description、input_schema
- **AND** input_schema 应当符合 JSON Schema 规范
- **AND** 所有必填参数应当在 `required` 数组中声明
- **AND** 参数应当包含清晰的描述帮助 AI 理解

#### Scenario: 工具调用请求

- **WHEN** 调用 `generateWithTools()` 方法
- **THEN** 请求应当在 `tools` 字段中包含工具定义
- **AND** Claude 应当根据用户意图选择合适的工具
- **AND** 响应应当包含 `tool_use` 内容块
- **AND** `tool_use` 应当包含工具名称和参数

#### Scenario: 工具执行循环

- **WHEN** Claude 返回 `tool_use` 内容块
- **THEN** 系统应当解析工具名称和参数
- **AND** 系统应当调用对应的工具函数
- **AND** 工具执行结果应当通过 `tool_result` 消息返回给 Claude
- **AND** 系统应当支持连续多轮工具调用（最多 10 轮）
- **AND** 如果 Claude 不再调用工具，对话应当结束

#### Scenario: 工具执行错误处理

- **WHEN** 工具函数执行失败
- **THEN** 错误信息应当封装在 `tool_result` 的 `is_error` 字段
- **AND** Claude 应当能够理解错误并尝试修正
- **AND** 系统应当记录工具执行错误用于调试

### Requirement: 对话历史管理

系统 SHALL 管理多轮对话历史，保持上下文连贯性。

#### Scenario: 对话存储

- **WHEN** 用户发送消息
- **THEN** 系统应当将用户消息添加到对话历史
- **AND** 系统应当将 AI 响应添加到对话历史
- **AND** 对话历史应当包含完整的 Tool Use 和 Tool Result 消息
- **AND** 对话历史应当持久化到 LocalStorage

#### Scenario: 对话上下文裁剪

- **WHEN** 对话历史超过最大 tokens 限制（100,000 tokens）
- **THEN** 系统应当智能裁剪旧消息
- **AND** System Prompt 和最近 5 轮对话应当保留
- **AND** 裁剪应当不破坏 Tool Use/Result 的配对关系
- **AND** 裁剪后的对话应当仍然连贯

#### Scenario: 多会话管理

- **WHEN** 用户创建新的对话会话
- **THEN** 每个会话应当有唯一的 ID
- **AND** 不同会话的对话历史应当隔离
- **AND** 用户应当能够切换和删除会话
- **AND** 所有会话应当列表显示，按时间排序

### Requirement: Prompt Caching

系统 SHALL 利用 Claude 的 Prompt Caching 功能降低 API 成本。

#### Scenario: System Prompt 缓存

- **WHEN** 发送包含 System Prompt 的请求
- **THEN** System Prompt 应当标记为可缓存（`cache_control: { type: "ephemeral" }`）
- **AND** 后续请求应当复用缓存的 System Prompt
- **AND** 缓存有效期应当为 5 分钟

#### Scenario: Tools 定义缓存

- **WHEN** 发送包含 Tools 定义的请求
- **THEN** Tools 数组应当标记为可缓存
- **AND** Tools 定义不变时应当命中缓存
- **AND** 缓存命中应当在响应头中反映（`usage.cache_read_input_tokens`）

#### Scenario: 缓存监控

- **WHEN** API 调用完成
- **THEN** 系统应当记录缓存命中/未命中次数
- **AND** 系统应当计算成本节省金额
- **AND** 缓存统计应当在开发者控制台显示
- **AND** 缓存命中率应当 > 60%

### Requirement: 错误处理和重试

系统 SHALL 优雅处理 API 错误并实现智能重试策略。

#### Scenario: 错误分类

- **WHEN** API 调用失败
- **THEN** 系统应当区分错误类型：网络错误、认证错误、速率限制、模型错误
- **AND** 每种错误类型应当有对应的用户提示
- **AND** 错误应当记录到日志系统

#### Scenario: 速率限制重试

- **WHEN** 收到 429 (Rate Limit) 错误
- **THEN** 系统应当自动重试
- **AND** 重试应当使用指数退避策略（1s, 2s, 4s, 8s）
- **AND** 最多重试 3 次
- **AND** 如果仍失败，应当提示用户稍后再试

#### Scenario: 服务器错误重试

- **WHEN** 收到 500 (Server Error) 错误
- **THEN** 系统应当自动重试 2 次
- **AND** 重试间隔为 2 秒
- **AND** 如果仍失败，应当提示用户服务暂时不可用

#### Scenario: 认证错误处理

- **WHEN** 收到 401 (Unauthorized) 错误
- **THEN** 系统应当提示用户 API Key 无效
- **AND** 系统应当提供更新 API Key 的入口
- **AND** 不应当自动重试（避免浪费配额）

### Requirement: 性能优化

系统 SHALL 优化 API 调用性能，减少延迟和成本。

#### Scenario: 请求防抖

- **WHEN** 用户快速连续输入多个字符
- **THEN** 系统应当使用 debounce 延迟 API 调用
- **AND** 延迟时间应当为 500ms
- **AND** 只有最后一次输入触发 API 调用

#### Scenario: 并发限制

- **WHEN** 有多个 API 请求需要发送
- **THEN** 系统应当限制并发请求数为 3
- **AND** 超出限制的请求应当排队等待
- **AND** 队列应当按 FIFO 顺序处理

#### Scenario: 响应缓存

- **WHEN** 用户发送相同的问题
- **THEN** 系统应当检查本地缓存
- **AND** 如果 5 分钟内有相同请求，应当返回缓存结果
- **AND** 缓存应当标记，用户可选择刷新

### Requirement: 安全和隐私

系统 SHALL 保护用户数据和 API 密钥安全。

#### Scenario: API Key 保护

- **WHEN** 用户配置 API Key
- **THEN** Key 应当加密存储在 LocalStorage
- **AND** Key 不应当在日志中显示
- **AND** Key 不应当在网络请求 URL 中暴露
- **AND** Key 应当通过 HTTP Header 传递

#### Scenario: 数据隐私

- **WHEN** 用户数据发送到 Claude API
- **THEN** 应当遵守数据最小化原则（只发送必要信息）
- **AND** 敏感字段（如邮箱、电话）应当脱敏或哈希
- **AND** 用户应当能够选择退出 AI 功能
- **AND** 对话历史应当支持本地删除

#### Scenario: 审计日志

- **WHEN** API 调用发生
- **THEN** 系统应当记录：时间戳、用户 ID、请求类型、tokens 数量
- **AND** 日志应当不包含实际对话内容（隐私保护）
- **AND** 日志应当定期归档和清理

