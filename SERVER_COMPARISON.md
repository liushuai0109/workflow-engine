# Workflow Engine - 服务端实现

本项目提供了两种服务端实现：

## 服务端选择

### server-go
Go + Gin 框架实现的高性能服务端

- **框架**: Gin
- **语言**: Go 1.24+
- **数据库**: PostgreSQL
- **特点**: 高性能、内存占用小、编译型语言

### server-nodejs
Node.js + Koa 框架实现的现代化服务端

- **框架**: Koa
- **语言**: TypeScript + Node.js 18+
- **数据库**: PostgreSQL
- **特点**: 开发体验好、生态丰富、类型安全

## 配置服务端

编辑根目录的 `server.config` 文件：

```bash
# 选择使用 go 或 nodejs
SERVER_TYPE=nodejs
```

## 启动服务端

使用统一的启动脚本：

```bash
./console.sh start server
```

脚本会根据 `server.config` 中的配置自动启动对应的服务端。

## 查看服务状态

```bash
./console.sh status
```

## 停止服务端

```bash
./console.sh stop server
```

## 手动启动

### Go 服务端

```bash
cd server-go
make build
./bin/server
```

### Node.js 服务端

```bash
cd server-nodejs
npm install
npm run dev
```

## API 端点

两个服务端实现提供相同的 API 端点：

### 健康检查
- `GET /health`

### 用户管理
- `POST /api/users`
- `GET /api/users/:userId`
- `PUT /api/users/:userId`

### 工作流管理
- `POST /api/workflows`
- `GET /api/workflows/:workflowId`
- `PUT /api/workflows/:workflowId`
- `GET /api/workflows`

### 工作流执行
- `POST /api/execute`
- `POST /api/execute/:workflowInstanceId`

### 调试会话
- `POST /api/workflows/:workflowId/debug/start`
- `GET /api/workflows/debug/sessions/:sessionId`
- `POST /api/workflows/debug/sessions/:sessionId/step`
- `POST /api/workflows/debug/sessions/:sessionId/continue`
- `POST /api/workflows/debug/sessions/:sessionId/stop`

### Claude API 代理
- `POST /api/claude/v1/messages`

### 聊天对话
- `POST /api/chat/conversations`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:id`
- `PUT /api/chat/conversations/:id`
- `DELETE /api/chat/conversations/:id`
- `POST /api/chat/conversations/:id/messages`

## 环境变量

两个服务端都使用 `.env` 文件进行配置：

```env
PORT=3000
CORS_ORIGIN=http://localhost:8000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=workflow_engine
CLAUDE_API_BASE_URL=https://api.jiekou.ai
CLAUDE_API_KEY=
```

## 性能对比

| 特性 | Go 服务端 | Node.js 服务端 |
|-----|---------|---------------|
| 启动时间 | 快 | 中等 |
| 内存占用 | 低 | 中等 |
| 并发性能 | 优秀 | 良好 |
| 开发体验 | 良好 | 优秀 |
| 类型安全 | 是 | 是 (TypeScript) |
| 生态系统 | 丰富 | 非常丰富 |

## 选择建议

- **生产环境高负载**: 推荐 server-go
- **快速开发迭代**: 推荐 server-nodejs
- **团队熟悉度**: 根据团队技术栈选择
