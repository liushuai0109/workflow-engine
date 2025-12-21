# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: 数据库和模型 | 5 | 1-2 天 | | 无 |
| Phase 2: 后端 API 实现 | 6 | 2-3 天 | | Phase 1 |
| Phase 3: 前端集成 | 5 | 2-3 天 | | Phase 2 |
| Phase 4: 清理机制 | 3 | 1 天 | | Phase 2 |
| Phase 5: 测试和文档 | 4 | 1-2 天 | | Phase 3, Phase 4 |
| **总计** | **23** | **7-11 天** | | |

## Phase 1: 数据库和模型 ✅ 已完成

- [x] 1.1 创建数据库迁移脚本
  - [x] 创建 `000003_add_chat_tables.up.sql`，包含 `chat_conversations` 和 `chat_messages` 表
  - [x] 创建 `000003_add_chat_tables.down.sql`，包含回滚逻辑
  - [x] 添加必要的索引（`idx_conversations_updated_at`、`idx_messages_conversation`、`idx_messages_created_at`）
  - [x] 验证迁移脚本语法正确

- [x] 1.2 创建 Go 模型
  - [x] 创建 `server/internal/models/chat_conversation.go`
  - [x] 创建 `server/internal/models/chat_message.go`
  - [x] 定义结构体字段和 JSON/DB tags
  - [x] 添加验证方法（如需要）

- [x] 1.3 创建数据库存储接口
  - [x] 创建 `server/internal/services/chat_conversation_store.go`
  - [x] 实现 CRUD 操作方法
  - [x] 实现分页查询方法
  - [x] 添加错误处理

- [x] 1.4 创建消息存储接口
  - [x] 创建 `server/internal/services/chat_message_store.go`
  - [x] 实现消息创建和批量创建方法
  - [x] 实现按会话ID查询消息方法
  - [x] 添加错误处理

- [x] 1.5 运行数据库迁移测试
  - [x] 创建 `server/migrations/migration_test.go` 集成测试文件
  - [x] 执行 up 迁移，验证表结构正确
  - [x] 执行 down 迁移，验证回滚正确
  - [x] 验证索引创建成功
  - [x] 验证外键约束

## Phase 2: 后端 API 实现 ✅ 已完成

- [x] 2.1 实现会话服务层
  - [x] 创建 `server/internal/services/chat_conversation.go`
  - [x] 实现创建会话逻辑
  - [x] 实现获取会话列表逻辑（支持分页和排序）
  - [x] 实现获取会话详情逻辑（包含消息列表）
  - [x] 实现更新会话逻辑
  - [x] 实现删除会话逻辑

- [x] 2.2 实现消息服务层
  - [x] 创建 `server/internal/services/chat_message.go`
  - [x] 实现添加消息逻辑（自动更新会话的 `last_message_at`）
  - [x] 实现批量添加消息逻辑（使用事务）
  - [x] 实现获取消息列表逻辑

- [x] 2.3 实现会话处理函数
  - [x] 创建 `server/internal/handlers/chat_conversation.go`
  - [x] 实现 `CreateConversation` 处理函数
  - [x] 实现 `GetConversations` 处理函数（支持分页）
  - [x] 实现 `GetConversation` 处理函数
  - [x] 实现 `UpdateConversation` 处理函数
  - [x] 实现 `DeleteConversation` 处理函数
  - [x] 添加错误处理和统一响应格式

- [x] 2.4 实现消息处理函数
  - [x] 在 `server/internal/handlers/chat_conversation.go` 中添加消息相关处理函数
  - [x] 实现 `AddMessage` 处理函数
  - [x] 实现 `BatchAddMessages` 处理函数
  - [x] 添加错误处理和统一响应格式

- [x] 2.5 注册 API 路由
  - [x] 在 `server/internal/routes/routes.go` 中注册聊天相关路由
  - [x] 添加路由组 `/api/chat`
  - [x] 配置路由中间件（CORS、日志等）

- [x] 2.6 编写单元测试
  - [x] 为会话服务编写测试（`chat_conversation_test.go`）- 已创建，包含创建、获取、列表、更新、删除等测试
  - [x] 为消息服务编写测试（`chat_message_test.go`）- 已创建，包含添加消息、批量添加、获取消息等测试
  - [x] 为处理函数编写测试（`chat_conversation_handler_test.go`）- 已创建，包含所有处理函数的测试（需要调整 mock 设置）
  - [ ] 确保测试覆盖率 > 80% - 需要运行测试覆盖率检查

## Phase 3: 前端集成 ✅ 已完成

- [x] 3.1 创建聊天记录 API 客户端
  - [x] 创建 `client/src/services/chatApiService.ts`
  - [x] 实现会话 CRUD 方法
  - [x] 实现消息创建和批量创建方法
  - [x] 添加错误处理和重试逻辑

- [x] 3.2 修改 ClaudeLLMService
  - [x] 在 `client/src/services/claudeLlmService.ts` 中添加会话管理方法
  - [x] 添加 `createConversation(title?: string): Promise<string>` 方法
  - [x] 添加 `loadConversation(conversationId: string): Promise<ConversationContext>` 方法
  - [x] 添加 `saveMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void>` 方法
  - [x] 修改 `sendMessage()` 方法，自动保存消息到数据库
  - [x] 修改 `getHistory()` 方法，从数据库加载历史记录
  - [x] 添加 LocalStorage 后备机制（数据库不可用时）

- [x] 3.3 更新 ChatBox 组件（可选）✅ 已完成
  - [x] 如果需要会话切换功能，更新 `client/src/components/ChatBox.vue`
  - [x] 添加会话列表显示
  - [x] 添加会话切换逻辑
  - [x] 添加会话删除功能

- [ ] 3.4 实现数据迁移工具（可选）
  - [ ] 创建 `client/src/services/chatMigrationService.ts`
  - [ ] 实现从 LocalStorage 读取历史数据
  - [ ] 实现批量导入到数据库
  - [ ] 添加迁移进度显示
  - [ ] 添加迁移确认对话框

- [x] 3.5 前端测试 ✅ 已完成
  - [x] 测试会话创建和加载
  - [x] 测试消息保存和加载
  - [x] 测试数据库不可用时的回退机制
  - [ ] 测试数据迁移功能（如实现）- 未实现此可选功能

## Phase 4: 清理机制 ✅ 核心功能已完成

- [x] 4.1 实现清理服务
  - [x] 创建 `server/internal/services/chat_cleanup.go`
  - [x] 实现清理过期会话的方法
  - [x] 实现清理日志记录
  - [x] 添加错误处理

- [x] 4.2 实现定时任务
  - [x] 在 `server/cmd/server/main.go` 中启动清理任务的 goroutine
  - [x] 实现每 24 小时执行一次的定时逻辑
  - [x] 添加任务启动和停止逻辑
  - [x] 添加优雅关闭处理

- [ ] 4.3 测试清理机制（可选，建议在集成测试中完成）
  - [ ] 创建测试数据（超过 7 天的会话）
  - [ ] 手动触发清理任务，验证删除正确
  - [ ] 验证清理日志记录正确
  - [ ] 验证定时任务正常运行

## Phase 5: 测试和文档

- [ ] 5.1 集成测试
  - [ ] 测试完整的 API 流程（创建会话、添加消息、获取会话）
  - [ ] 测试批量操作
  - [ ] 测试错误场景（会话不存在、数据库错误等）
  - [ ] 测试清理机制

- [ ] 5.2 性能测试
  - [ ] 测试批量插入消息的性能
  - [ ] 测试大量会话的查询性能
  - [ ] 优化慢查询（如需要）

- [ ] 5.3 更新文档
  - [ ] 更新 `server/README.md`，添加聊天记录 API 文档
  - [ ] 更新 API 文档（如使用 Swagger）
  - [ ] 更新前端使用文档

- [ ] 5.4 代码审查
  - [ ] 检查代码风格和规范
  - [ ] 检查错误处理是否完善
  - [ ] 检查日志记录是否充分
  - [ ] 检查安全性（SQL 注入、XSS 等）

