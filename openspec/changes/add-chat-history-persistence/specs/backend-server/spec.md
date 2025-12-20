## ADDED Requirements

### Requirement: 聊天会话管理 API

系统 SHALL 提供聊天会话的 CRUD 操作，并持久化到数据库。

#### Scenario: 创建聊天会话

- **WHEN** 客户端发送 `POST /api/chat/conversations` 请求时
- **THEN** 系统应：
  - 生成UUID作为会话ID
  - 如果提供了 `title`，使用提供的标题；否则使用默认标题（如"新对话"）
  - 执行数据库INSERT操作到 `chat_conversations` 表
  - 设置 `created_at`、`updated_at` 和 `last_message_at` 为当前时间
- **AND** 成功响应应返回201状态码和会话数据

#### Scenario: 获取聊天会话列表

- **WHEN** 客户端发送 `GET /api/chat/conversations` 请求时
- **THEN** 系统应：
  - 支持查询参数：`page`（默认1）、`pageSize`（默认20）、`orderBy`（默认"updatedAt"）、`order`（默认"desc"）
  - 执行数据库SELECT查询，使用LIMIT和OFFSET实现分页
  - 执行COUNT查询获取总数
  - 按 `last_message_at DESC` 排序（默认）
- **AND** 响应应包含 `metadata` 字段和会话列表
- **AND** 每个会话应包含：`id`、`title`、`lastMessageAt`、`messageCount`（消息数量）

#### Scenario: 获取聊天会话详情

- **WHEN** 客户端发送 `GET /api/chat/conversations/:id` 请求时
- **THEN** 系统应：
  - 执行数据库SELECT查询获取会话信息
  - 关联查询该会话的所有消息，按 `sequence` 排序
  - 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回200状态码和会话数据（包含消息列表）

#### Scenario: 更新聊天会话

- **WHEN** 客户端发送 `PUT /api/chat/conversations/:id` 请求时
- **THEN** 系统应：
  - 更新会话的 `title` 字段（如果提供）
  - 更新 `updated_at` 时间戳
  - 执行数据库UPDATE操作
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回200状态码和更新后的会话数据

#### Scenario: 删除聊天会话

- **WHEN** 客户端发送 `DELETE /api/chat/conversations/:id` 请求时
- **THEN** 系统应：
  - 执行数据库DELETE操作
  - 级联删除关联的所有消息（使用 ON DELETE CASCADE）
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回200状态码

### Requirement: 聊天消息管理 API

系统 SHALL 提供聊天消息的创建和批量创建操作，并持久化到数据库。

#### Scenario: 添加聊天消息

- **WHEN** 客户端发送 `POST /api/chat/conversations/:id/messages` 请求时
- **THEN** 系统应：
  - 生成UUID作为消息ID
  - 验证会话存在
  - 获取会话中当前最大 `sequence` 值，新消息的 `sequence` 为该值加1
  - 将 `metadata` 序列化为JSONB格式（如果提供）
  - 执行数据库INSERT操作到 `chat_messages` 表
  - 更新会话的 `last_message_at` 和 `updated_at` 为当前时间
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 成功响应应返回201状态码和消息数据

#### Scenario: 批量添加聊天消息

- **WHEN** 客户端发送 `POST /api/chat/conversations/:id/messages/batch` 请求时
- **THEN** 系统应：
  - 验证会话存在
  - 获取会话中当前最大 `sequence` 值
  - 为每条消息分配递增的 `sequence` 值
  - 使用事务批量插入所有消息
  - 更新会话的 `last_message_at` 和 `updated_at` 为当前时间
- **AND** 如果会话不存在，返回404状态码和错误码 `CONVERSATION_NOT_FOUND`
- **AND** 如果批量插入失败，回滚事务
- **AND** 成功响应应返回201状态码和消息列表

### Requirement: 聊天记录自动清理

系统 SHALL 自动清理 7 天前的聊天记录。

#### Scenario: 自动清理过期会话

- **WHEN** 系统执行自动清理任务时
- **THEN** 系统应：
  - 删除 `last_message_at < NOW() - INTERVAL '7 days'` 的所有会话
  - 级联删除关联的所有消息（使用 ON DELETE CASCADE）
  - 记录清理的会话数量和消息数量
  - 记录清理任务的执行时间和结果
- **AND** 清理任务应每 24 小时执行一次
- **AND** 清理任务应在后端服务启动时启动
- **AND** 如果清理任务执行失败，应记录错误日志但不影响服务运行

#### Scenario: 清理任务日志

- **WHEN** 清理任务执行完成时
- **THEN** 系统应记录：
  - 执行时间
  - 删除的会话数量
  - 删除的消息数量
  - 执行结果（成功/失败）
- **AND** 日志级别应为 INFO（成功）或 ERROR（失败）

