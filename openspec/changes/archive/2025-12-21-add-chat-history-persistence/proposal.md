# 变更：AI 助手对话框保存 7 天内的聊天记录到数据库

## 为什么

当前 AI 助手对话框的聊天记录仅存储在浏览器的 LocalStorage 中，存在以下问题：
1. 数据易丢失：清除浏览器数据或更换设备时，聊天记录会丢失
2. 无法跨设备访问：用户在不同设备上无法查看历史对话
3. 数据管理困难：无法统一管理和查询聊天记录
4. 缺乏数据持久化：LocalStorage 容量有限，不适合长期存储

为了提供更好的用户体验和数据管理能力，需要将聊天记录持久化到数据库，并实现自动清理机制（保留 7 天）。

## 变更内容

- **新增数据库表**：创建 `chat_conversations` 和 `chat_messages` 表用于存储聊天会话和消息
- **新增后端 API**：
  - `POST /api/chat/conversations` - 创建新会话
  - `GET /api/chat/conversations` - 获取会话列表（支持分页和过滤）
  - `GET /api/chat/conversations/:id` - 获取会话详情（包含消息列表）
  - `POST /api/chat/conversations/:id/messages` - 添加消息到会话
  - `DELETE /api/chat/conversations/:id` - 删除会话
  - `POST /api/chat/conversations/:id/messages/batch` - 批量添加消息
- **修改前端服务**：更新 `ClaudeLLMService` 和相关组件，支持从数据库加载和保存聊天记录
- **自动清理机制**：实现定时任务，自动删除 7 天前的聊天记录
- **数据迁移**：提供从 LocalStorage 迁移到数据库的机制（可选）

## 影响

- **受影响的规范**：
  - `backend-server` - 新增聊天记录管理 API 和数据库表
  - `ai-integration` - 修改对话历史管理，从 LocalStorage 改为数据库持久化
- **受影响的代码**：
  - `server/internal/models/` - 新增聊天记录模型
  - `server/internal/handlers/` - 新增聊天记录处理函数
  - `server/internal/services/` - 新增聊天记录服务
  - `server/migrations/` - 新增数据库迁移脚本
  - `client/src/services/claudeLlmService.ts` - 修改对话历史持久化逻辑
  - `client/src/components/ChatBox.vue` - 可能需要支持会话切换功能
- **数据库变更**：新增 2 个表（`chat_conversations`、`chat_messages`），新增索引和清理任务

