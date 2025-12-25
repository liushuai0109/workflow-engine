# Workflow Engine - 安装和使用指南

本项目包含两种服务端实现：**server-go** (Go + Gin) 和 **server-nodejs** (TypeScript + Koa)。

## 目录结构

```
workflow-engine/
├── server-go/          # Go 服务端实现
├── server-nodejs/      # Node.js 服务端实现
├── client/             # 前端应用
├── server.config       # 服务端选择配置
└── start-server.sh     # 统一启动脚本
```

## 快速开始

### 1. 选择服务端

编辑 `server.config` 文件：

```bash
# 选择使用的服务端: go 或 nodejs
SERVER_TYPE=nodejs
```

### 2. 配置环境变量

#### Go 服务端

```bash
cd server-go
cp .env.example .env
# 编辑 .env 文件，配置数据库等参数
```

#### Node.js 服务端

```bash
cd server-nodejs
cp .env.example .env
# 编辑 .env 文件，配置数据库等参数
```

### 3. 启动数据库

确保 PostgreSQL 已安装并运行：

```bash
# 创建数据库
createdb workflow_engine

# 或使用 SQL
psql -U postgres -c "CREATE DATABASE workflow_engine;"
```

### 4. 运行数据库迁移

#### Go 服务端

```bash
cd server-go
# 迁移脚本位于 migrations/ 目录
psql -U postgres -d workflow_engine -f migrations/001_create_tables.sql
```

#### Node.js 服务端

```bash
cd server-nodejs
# 使用相同的迁移脚本
psql -U postgres -d workflow_engine -f ../server-go/migrations/001_create_tables.sql
```

### 5. 启动服务端

#### 使用统一启动脚本（推荐）

```bash
# 在项目根目录
./console.sh start server
```

脚本会根据 `server.config` 自动启动对应的服务端。

#### 手动启动 Go 服务端

```bash
cd server-go
make build
./bin/server
```

或开发模式：

```bash
cd server-go
make run
```

#### 手动启动 Node.js 服务端

```bash
cd server-nodejs
npm install
npm run dev
```

或生产模式：

```bash
cd server-nodejs
npm install
npm run build
npm start
```

## 详细安装说明

### Go 服务端

#### 前置要求

- Go 1.24 或更高版本
- PostgreSQL 12 或更高版本
- Make（可选）

#### 安装依赖

```bash
cd server-go
go mod download
```

#### 构建

```bash
make build
```

#### 运行测试

```bash
make test
```

#### 查看覆盖率

```bash
make coverage
```

### Node.js 服务端

#### 前置要求

- Node.js 18 或更高版本
- npm 或 yarn
- PostgreSQL 12 或更高版本

#### 安装依赖

```bash
cd server-nodejs
npm install
# 或
yarn install
```

#### 开发模式

```bash
npm run dev
```

支持热重载，修改代码后自动重启。

#### 构建生产版本

```bash
npm run build
```

#### 运行生产版本

```bash
npm start
```

#### 运行测试

```bash
npm test
```

#### 代码检查

```bash
npm run lint
npm run lint:fix
npm run format
```

## 环境变量配置

### 通用配置

```env
PORT=3000
CORS_ORIGIN=http://localhost:8000
NODE_ENV=development  # 或 GO_ENV=development
```

### 数据库配置

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=workflow_engine
DB_DISABLED=false
```

### Claude API 配置

```env
CLAUDE_API_BASE_URL=https://api.jiekou.ai
CLAUDE_API_KEY=your-api-key
```

## 验证安装

### 检查服务器状态

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-12-24T..."
}
```

### 测试 API

创建工作流：

```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试工作流",
    "description": "这是一个测试工作流",
    "bpmnXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>..."
  }'
```

## 常见问题

### 数据库连接失败

1. 确保 PostgreSQL 正在运行
2. 检查 `.env` 中的数据库配置
3. 确认数据库已创建
4. 检查防火墙设置

### Go 服务端编译错误

1. 确保 Go 版本正确：`go version`
2. 清理并重新下载依赖：`go clean -modcache && go mod download`
3. 重新构建：`make clean && make build`

### Node.js 服务端启动失败

1. 清理并重新安装依赖：`rm -rf node_modules package-lock.json && npm install`
2. 检查 Node.js 版本：`node --version`
3. 查看错误日志

### 端口被占用

修改 `.env` 文件中的 `PORT` 配置，或者终止占用端口的进程：

```bash
# 查找占用 3000 端口的进程
lsof -i :3000

# 终止进程
kill -9 <PID>
```

## 开发工作流

### Go 服务端

```bash
# 1. 修改代码
# 2. 运行测试
make test

# 3. 查看覆盖率
make coverage

# 4. 构建并运行
make build
make run
```

### Node.js 服务端

```bash
# 1. 修改代码
# 2. 自动重启（在 dev 模式下）
npm run dev

# 3. 运行测试
npm test

# 4. 代码格式化
npm run format
npm run lint:fix
```

## 生产部署建议

### Go 服务端

- 使用编译后的二进制文件
- 设置 `GO_ENV=production`
- 配置反向代理（如 Nginx）
- 使用进程管理器（如 systemd）

### Node.js 服务端

- 使用 `npm run build` 构建
- 设置 `NODE_ENV=production`
- 使用进程管理器（如 PM2）
- 配置反向代理（如 Nginx）

## 下一步

- 查看 [SERVER_COMPARISON.md](./SERVER_COMPARISON.md) 了解两种实现的对比
- 查看 [server-go/README.md](./server-go/README.md) 了解 Go 服务端详情
- 查看 [server-nodejs/README.md](./server-nodejs/README.md) 了解 Node.js 服务端详情
- 查看 API 文档（待完善）

## 获取帮助

- 查看项目文档
- 提交 Issue
- 联系开发团队
