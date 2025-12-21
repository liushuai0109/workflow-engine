## MODIFIED Requirements

### Requirement: 对话历史管理

系统 SHALL 管理多轮对话历史，保持上下文连贯性，并将对话历史持久化到数据库。

#### Scenario: 对话存储

- **WHEN** 用户发送消息
- **THEN** 系统应当将用户消息添加到对话历史
- **AND** 系统应当将 AI 响应添加到对话历史
- **AND** 对话历史应当包含完整的 Tool Use 和 Tool Result 消息
- **AND** 对话历史应当持久化到数据库（优先）
- **AND** 如果数据库不可用，应当回退到 LocalStorage
- **AND** 每条消息应当保存到 `chat_messages` 表，包含 `role`、`content` 和 `metadata`（用于存储 tool_use 等信息）

#### Scenario: 对话上下文裁剪

- **WHEN** 对话历史超过最大 tokens 限制（100,000 tokens）
- **THEN** 系统应当智能裁剪旧消息
- **AND** System Prompt 和最近 5 轮对话应当保留
- **AND** 裁剪应当不破坏 Tool Use/Result 的配对关系
- **AND** 裁剪后的对话应当仍然连贯
- **AND** 裁剪操作不应影响数据库中的完整记录

#### Scenario: 多会话管理

- **WHEN** 用户创建新的对话会话
- **THEN** 每个会话应当有唯一的 ID（数据库生成的 UUID）
- **AND** 不同会话的对话历史应当隔离
- **AND** 用户应当能够切换和删除会话
- **AND** 所有会话应当列表显示，按时间排序（`last_message_at DESC`）
- **AND** 会话应当从数据库加载，而非 LocalStorage
- **AND** 会话标题应当自动生成（使用第一条消息的前 50 字符）或由用户设置

#### Scenario: 会话加载

- **WHEN** 用户选择已存在的会话
- **THEN** 系统应当从数据库加载该会话的所有消息
- **AND** 消息应当按 `sequence` 排序
- **AND** 加载的消息应当转换为 `ConversationContext` 格式
- **AND** 如果会话不存在，应当返回错误

#### Scenario: 消息保存

- **WHEN** 用户发送消息或收到 AI 响应
- **THEN** 系统应当将消息保存到数据库
- **AND** 如果消息包含 Tool Use 或 Tool Result，应当存储在 `metadata` 字段中
- **AND** 保存操作应当异步执行，不阻塞用户交互
- **AND** 如果保存失败，应当记录错误但不影响对话继续

#### Scenario: 数据迁移（可选）

- **WHEN** 系统首次检测到 LocalStorage 中有历史对话数据
- **THEN** 系统应当提示用户是否迁移到数据库
- **AND** 如果用户同意，应当将 LocalStorage 中的对话导入数据库
- **AND** 迁移后应当清除 LocalStorage 中的旧数据（可选）
- **AND** 迁移过程应当显示进度和结果

