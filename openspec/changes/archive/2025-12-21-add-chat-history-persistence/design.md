# 设计：AI 助手对话框聊天记录持久化

## 上下文

当前系统使用 LocalStorage 存储聊天记录，需要迁移到数据库持久化。系统已有：
- Go 后端服务（Gin 框架）
- PostgreSQL 数据库
- 数据库迁移机制
- Claude LLM Service 前端服务

## 目标 / 非目标

### 目标
- 将聊天记录持久化到数据库
- 支持跨设备访问聊天记录
- 自动清理 7 天前的记录
- 保持现有前端 API 兼容性（尽可能）

### 非目标
- 实时同步（不需要 WebSocket）
- 多用户聊天（当前为单用户场景）
- 聊天记录的全文搜索（未来可扩展）
- 聊天记录的导出功能（未来可扩展）

## 决策

### 数据库设计

**表结构：**

1. **chat_conversations** - 聊天会话表
   - `id` (UUID, PRIMARY KEY)
   - `title` (VARCHAR(255)) - 会话标题（自动生成或用户设置）
   - `created_at` (TIMESTAMP WITH TIME ZONE)
   - `updated_at` (TIMESTAMP WITH TIME ZONE)
   - `last_message_at` (TIMESTAMP WITH TIME ZONE) - 最后一条消息时间，用于排序和清理

2. **chat_messages** - 聊天消息表
   - `id` (UUID, PRIMARY KEY)
   - `conversation_id` (UUID, FOREIGN KEY -> chat_conversations.id)
   - `role` (VARCHAR(20)) - 'user' 或 'assistant'
   - `content` (TEXT) - 消息内容
   - `metadata` (JSONB) - 扩展信息（如 tool_use、tool_result 等）
   - `created_at` (TIMESTAMP WITH TIME ZONE)
   - `sequence` (INTEGER) - 消息在会话中的顺序

**索引：**
- `chat_conversations`: `idx_conversations_updated_at` (updated_at DESC)
- `chat_messages`: `idx_messages_conversation` (conversation_id, sequence)
- `chat_messages`: `idx_messages_created_at` (created_at) - 用于清理任务

**清理策略：**
- 使用 PostgreSQL 的定时任务（pg_cron）或应用层定时任务
- 删除 `last_message_at < NOW() - INTERVAL '7 days'` 的会话
- 级联删除关联的消息（使用 ON DELETE CASCADE）

### API 设计

**RESTful API：**

```
POST   /api/chat/conversations              - 创建会话
GET    /api/chat/conversations               - 获取会话列表（分页）
GET    /api/chat/conversations/:id           - 获取会话详情
PUT    /api/chat/conversations/:id           - 更新会话（如标题）
DELETE /api/chat/conversations/:id           - 删除会话
POST   /api/chat/conversations/:id/messages  - 添加消息
POST   /api/chat/conversations/:id/messages/batch - 批量添加消息
```

**请求/响应格式：**

创建会话：
```json
POST /api/chat/conversations
{
  "title": "新对话"  // 可选，默认使用第一条消息的前 50 字符
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "新对话",
    "createdAt": "2024-12-20T10:00:00Z",
    "updatedAt": "2024-12-20T10:00:00Z"
  }
}
```

获取会话列表：
```json
GET /api/chat/conversations?page=1&pageSize=20&orderBy=updatedAt&order=desc

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "对话标题",
      "lastMessageAt": "2024-12-20T10:00:00Z",
      "messageCount": 10
    }
  ],
  "metadata": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  }
}
```

添加消息：
```json
POST /api/chat/conversations/:id/messages
{
  "role": "user",
  "content": "消息内容",
  "metadata": {}  // 可选，用于存储 tool_use 等信息
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "role": "user",
    "content": "消息内容",
    "sequence": 1,
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

### 前端集成

**修改 ClaudeLLMService：**

1. 添加会话管理方法：
   - `createConversation(title?: string): Promise<string>` - 创建会话，返回会话 ID
   - `loadConversation(conversationId: string): Promise<ConversationContext>` - 从数据库加载会话
   - `saveMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void>` - 保存消息

2. 修改现有方法：
   - `sendMessage()` - 自动创建或使用当前会话，保存消息到数据库
   - `getHistory()` - 从数据库加载历史记录

3. 保持向后兼容：
   - 如果数据库不可用，回退到 LocalStorage
   - 提供迁移工具，将 LocalStorage 数据导入数据库

### 自动清理机制

**方案 1：应用层定时任务（推荐）**
- 在 Go 后端启动时启动 goroutine
- 每 24 小时执行一次清理任务
- 删除 `last_message_at < NOW() - INTERVAL '7 days'` 的会话

**方案 2：数据库层定时任务**
- 使用 pg_cron 扩展（如果可用）
- 创建定时任务，每天执行清理 SQL

**选择方案 1**，因为：
- 不依赖数据库扩展
- 更容易控制和监控
- 可以记录清理日志

## 风险 / 权衡

### 风险
1. **数据迁移风险**：从 LocalStorage 迁移到数据库时可能丢失数据
   - **缓解**：提供迁移工具，支持批量导入
2. **性能风险**：频繁的数据库写入可能影响性能
   - **缓解**：使用批量插入，异步保存非关键消息
3. **清理任务失败**：自动清理任务可能失败，导致数据积累
   - **缓解**：添加监控和告警，记录清理日志

### 权衡
- **实时性 vs 性能**：选择批量保存消息，而非每条消息立即保存
- **数据完整性 vs 用户体验**：如果数据库不可用，回退到 LocalStorage，保证功能可用

## 迁移计划

### 阶段 1：数据库和 API 实现
1. 创建数据库迁移脚本
2. 实现 Go 模型和服务
3. 实现 API 端点
4. 编写单元测试

### 阶段 2：前端集成
1. 修改 ClaudeLLMService，添加数据库持久化
2. 保持 LocalStorage 作为后备方案
3. 更新 ChatBox 组件（如需要）

### 阶段 3：清理机制
1. 实现定时清理任务
2. 添加清理日志和监控

### 阶段 4：数据迁移（可选）
1. 提供 LocalStorage 到数据库的迁移工具
2. 支持批量导入历史数据

## 未决问题

- [ ] 是否需要支持会话标题的编辑功能？
- [ ] 是否需要支持消息的编辑和删除？
- [ ] 清理任务的执行频率（每天一次 vs 每小时一次）？
- [ ] 是否需要支持消息的搜索功能（未来扩展）？

