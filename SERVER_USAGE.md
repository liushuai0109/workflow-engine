# Workflow Engine - 服务端使用指南

本项目支持两种服务端实现，可通过配置文件灵活切换。

## 配置服务端类型

编辑根目录的 `server.config` 文件：

```bash
# 选择使用的服务端: go 或 nodejs
SERVER_TYPE=nodejs
```

可选值：
- `go` - 使用 Go + Gin 实现
- `nodejs` - 使用 Node.js + TypeScript + Koa 实现

## 使用 console.sh 管理服务端

### 启动服务端

```bash
# 启动服务端（会根据 server.config 自动选择）
./console.sh start server

# 同时启动所有服务（数据库、服务端、前端）
./console.sh start

# 只启动特定服务
./console.sh start database
./console.sh start client
```

### 查看服务状态

```bash
./console.sh status
```

输出示例：
```
╔════════════════════════════════════════════╗
║  服务状态
╚════════════════════════════════════════════╝
[SUCCESS] PostgreSQL:  运行中 (端口: 5432)
[SUCCESS] Server:      运行中 (PID: 12345, 端口: 3000)
           类型:       Node.js (TypeScript + Koa)
[SUCCESS] Client:      运行中 (PID: 12346, 端口: 8000)
```

### 停止服务端

```bash
# 停止服务端
./console.sh stop server

# 停止所有服务
./console.sh stop

# 停止特定服务
./console.sh stop database
./console.sh stop client
```

### 重启服务端

```bash
# 重启服务端
./console.sh restart server

# 重启所有服务
./console.sh restart
```

## 切换服务端类型

1. 停止当前运行的服务端：
```bash
./console.sh stop server
```

2. 编辑 `server.config`，修改 `SERVER_TYPE`：
```bash
# 从 nodejs 切换到 go
SERVER_TYPE=go
```

3. 启动新的服务端：
```bash
./console.sh start server
```

## 服务端日志

日志文件位于 `.pids/server.log`：

```bash
# 实时查看日志
tail -f .pids/server.log

# 查看最近的日志
tail -n 100 .pids/server.log
```

## 环境配置

### Go 服务端

环境配置文件：`server-go/.env`

```env
PORT=3000
GO_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=workflow_engine
CORS_ORIGIN=http://localhost:8000
CLAUDE_API_BASE_URL=https://api.jiekou.ai
CLAUDE_API_KEY=
```

### Node.js 服务端

环境配置文件：`server-nodejs/.env`

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=workflow_engine
CORS_ORIGIN=http://localhost:8000
CLAUDE_API_BASE_URL=https://api.jiekou.ai
CLAUDE_API_KEY=
```

## 手动启动（不使用 console.sh）

### Go 服务端

```bash
cd server-go
make build
./bin/server

# 或开发模式
make run
```

### Node.js 服务端

```bash
cd server-nodejs
npm install
npm start

# 开发模式（支持热重载）
npm run dev
```

## 常见问题

### 1. 端口冲突

如果 3000 端口被占用：

```bash
# 查看占用进程
lsof -i :3000

# console.sh 会自动处理端口冲突
./console.sh start server
```

### 2. 服务启动失败

查看日志：
```bash
cat .pids/server.log
```

常见原因：
- 数据库未启动：`./console.sh start database`
- 依赖未安装：运行 `./install.sh`
- 环境变量配置错误：检查 `.env` 文件

### 3. 切换服务端后 API 不工作

两种服务端提供完全相同的 API 接口，如果切换后出现问题：

1. 确认服务端已完全停止：`./console.sh stop server`
2. 检查新服务端是否正常启动：`./console.sh status`
3. 查看日志排查问题：`tail -f .pids/server.log`

### 4. 数据库连接失败

确保：
1. PostgreSQL 已启动：`./console.sh start database`
2. 数据库已创建：`createdb workflow_engine`
3. `.env` 文件配置正确
4. 数据库迁移已执行

## API 端点

两种服务端提供相同的 API：

- `GET /health` - 健康检查
- `POST /api/users` - 创建用户
- `GET /api/users/:userId` - 获取用户
- `POST /api/workflows` - 创建工作流
- `GET /api/workflows/:workflowId` - 获取工作流
- `POST /api/execute` - 执行工作流
- 更多端点请参考 API 文档

## 性能监控

### Go 服务端

```bash
# 查看内存使用
ps aux | grep server

# 使用 pprof 分析性能
go tool pprof http://localhost:3000/debug/pprof/heap
```

### Node.js 服务端

```bash
# 查看内存使用
ps aux | grep node

# 使用 clinic.js 分析性能
npm install -g clinic
clinic doctor -- node dist/index.js
```

## 开发建议

- **开发阶段**：推荐使用 Node.js 服务端，支持热重载，开发体验更好
- **生产环境**：根据负载选择，Go 服务端性能更高，Node.js 服务端生态更丰富
- **团队协作**：统一使用一种服务端，避免维护成本

## 下一步

- 查看 [server-go/README.md](./server-go/README.md) 了解 Go 服务端详情
- 查看 [server-nodejs/README.md](./server-nodejs/README.md) 了解 Node.js 服务端详情
- 查看 [INSTALLATION.md](./INSTALLATION.md) 了解完整安装流程
