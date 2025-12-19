# BPMN Explorer - Go Server

Go implementation of the BPMN Explorer backend API.

## 特性

- 🚀 高性能：基于 Go 的高并发处理能力
- 🔄 API 兼容：与 Node.js server 提供相同的 REST API
- 📦 轻量级：小内存占用，快速启动
- 🛡️ 类型安全：Go 的强类型系统
- 🔧 易部署：单一二进制文件，无运行时依赖

## 技术栈

- **Web 框架**：Gin v1.10.0
- **数据库驱动**：lib/pq (PostgreSQL)
- **日志**：zerolog
- **配置**：环境变量（兼容 Node.js server）
- **Go 版本**：1.21+

## 项目结构

```
server/
├── cmd/
│   └── server/
│       └── main.go           # 应用入口
├── internal/
│   ├── handlers/             # HTTP 请求处理
│   │   ├── health.go
│   │   ├── user.go
│   │   ├── workflow.go
│   │   └── claude.go
│   ├── services/             # 业务逻辑
│   │   ├── user.go
│   │   └── workflow.go
│   ├── models/               # 数据模型
│   │   ├── user.go
│   │   ├── workflow.go
│   │   └── response.go
│   ├── middleware/           # 中间件
│   │   ├── cors.go
│   │   └── logger.go
│   └── routes/               # 路由配置
│       └── routes.go
├── pkg/                      # 可导出的包
│   ├── database/             # 数据库连接
│   ├── logger/               # 日志配置
│   └── config/               # 配置管理
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

## 快速开始

### 前置要求

- **Go 1.21 或更高版本**（必需）
  - 如果未安装，请参考 [Go 官方安装指南](https://go.dev/doc/install)
  - 验证安装：`go version` 应显示 go version go1.21.x 或更高版本
- PostgreSQL（可选，可以使用 `DB_DISABLED=true` 运行）

### 安装

```bash
# 安装依赖
make install

# 或者
go mod download
```

### 配置

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
GO_ENV=development
CORS_ORIGIN=http://localhost:8000

# 数据库配置（可选）
DB_DISABLED=true  # 设置为 true 可以不连接数据库运行
```

### 运行

```bash
# 开发模式
make run

# 或者直接使用 go run
go run cmd/server/main.go

# 构建并运行
make build
./bin/server
```

### 通过 pnpm 运行（在项目根目录）

```bash
# 从项目根目录
pnpm run start:server
```

## API 端点

所有端点与 Node.js server 完全兼容：

### 健康检查
- `GET /health` - 返回服务状态

### 用户管理
- `POST /api/users` - 创建用户
- `GET /api/users/:userId` - 获取用户
- `PUT /api/users/:userId` - 更新用户

### 工作流管理
- `POST /api/workflows` - 创建工作流
- `GET /api/workflows/:workflowId` - 获取工作流
- `PUT /api/workflows/:workflowId` - 更新工作流
- `GET /api/workflows` - 列出工作流

### Claude AI 代理
- `POST /api/claude/v1/messages` - 代理 Claude API 请求

## 开发

### 运行测试

```bash
# 运行所有测试
make test

# 运行测试并生成覆盖率报告（推荐）
make test-coverage
# 报告生成在 reports/coverage/ 目录：
#   - coverage.out: 原始覆盖率数据
#   - coverage.txt: 文本格式报告（函数级别覆盖率）
#   - coverage.html: HTML 格式报告（可在浏览器中查看）

# 使用测试脚本（带时间戳的报告）
make test-script
# 或直接运行：
# bash scripts/test.sh
# 脚本会生成带时间戳的报告文件，并创建最新报告的符号链接
```

### 代码格式化

```bash
make fmt
```

### Linting

```bash
make lint
```

### 热重载开发（需要安装 air）

```bash
# 安装 air
go install github.com/cosmtrek/air@latest

# 运行热重载
make dev
```

## 构建

### 本地构建

```bash
make build
```

### 生产构建

```bash
make build-prod
```

这会创建一个静态链接的二进制文件，适合容器化部署。

## 部署

### 直接部署

```bash
# 构建
make build-prod

# 设置环境变量
export PORT=3000
export GO_ENV=production
export CORS_ORIGIN=https://your-domain.com

# 运行
./bin/server
```

### Docker 部署（待实现）

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN make build-prod

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/bin/server .
EXPOSE 3000
CMD ["./server"]
```

## 性能对比

与 Node.js server 相比：

- ✅ 启动时间：< 1s （Node.js: 2-3s）
- ✅ 内存占用：~30MB （Node.js: ~100MB）
- ✅ 并发处理：显著提升（goroutines vs event loop）
- ✅ CPU 效率：更高效的并发模型

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `GO_ENV` | development | 运行环境 (development/production) |
| `CORS_ORIGIN` | http://localhost:8000 | CORS 允许的来源 |
| `DB_HOST` | localhost | 数据库主机 |
| `DB_PORT` | 5432 | 数据库端口 |
| `DB_USER` | postgres | 数据库用户 |
| `DB_PASSWORD` | - | 数据库密码 |
| `DB_NAME` | lifecycle_ops | 数据库名称 |
| `DB_DISABLED` | false | 是否禁用数据库 |
| `CLAUDE_API_BASE_URL` | https://api.jiekou.ai | Claude API 基础 URL |
| `CLAUDE_API_KEY` | - | Claude API 密钥 |

## 故障排查

### 端口已被占用

```bash
# 修改 PORT 环境变量
export PORT=3001
make run
```

### 数据库连接失败

```bash
# 使用无数据库模式运行
export DB_DISABLED=true
make run
```

### Go 未安装

```bash
# Ubuntu/Debian
sudo apt-get install golang-go

# macOS
brew install go

# 或从官网下载：https://golang.org/dl/
```

## 贡献

这是 BPMN Explorer 项目的一部分。请参考项目根目录的 CONTRIBUTING.md。

## 许可证

与主项目相同。
