# 设计文档：Go Server 实现

## 架构概述

### 目标
添加 Go 语言实现的后端服务，与现有 Node.js 实现并存，提供相同的 REST API 接口。

### 架构原则
1. **API 兼容性优先**：Go 和 Node.js 实现必须提供完全相同的 REST API
2. **独立部署**：两个实现可以独立构建、部署和扩展
3. **共享数据层**：使用相同的数据库 schema 和查询逻辑
4. **统一配置**：使用相同的环境变量配置策略

## 项目结构对比

### Node.js Server (server-nodejs)
```
packages/server-nodejs/
├── src/
│   ├── controllers/       # HTTP 请求处理
│   ├── services/          # 业务逻辑
│   ├── models/            # 数据模型
│   ├── routes/            # 路由定义
│   ├── middleware/        # 中间件
│   ├── types/             # TypeScript 类型
│   ├── utils/             # 工具函数
│   └── index.ts           # 入口文件
├── package.json
└── tsconfig.json
```

### Go Server (server-go)
```
packages/server-go/
├── cmd/
│   └── server/
│       └── main.go        # 入口文件
├── internal/              # 私有包
│   ├── handlers/          # HTTP 请求处理 (对应 controllers)
│   ├── services/          # 业务逻辑
│   ├── models/            # 数据模型
│   ├── middleware/        # 中间件
│   └── routes/            # 路由定义
├── pkg/                   # 可导出的公共包
│   ├── database/          # 数据库连接
│   ├── logger/            # 日志
│   └── config/            # 配置管理
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

## 技术栈选择

### Web 框架
**推荐：Gin**
- 高性能（基于 httprouter）
- 丰富的中间件生态
- 良好的文档和社区支持
- 与 Express 风格相似，便于团队适应

**备选：Echo、Chi**

### 数据库驱动
- **PostgreSQL**: `github.com/lib/pq` 或使用 GORM ORM
- 连接池配置与 Node.js (pg) 保持一致

### 日志库
**推荐：zerolog**
- 结构化日志
- 零内存分配（高性能）
- JSON 输出格式

**备选：zap**

### 配置管理
**推荐：viper**
- 支持多种配置源（环境变量、配置文件）
- 与 Node.js dotenv 风格一致

### HTTP 客户端
- **标准库 net/http**：用于 Claude API 代理
- 连接池和超时配置

## API 设计

### 端点映射

| 端点 | 方法 | Node.js 实现 | Go 实现 | 说明 |
|------|------|--------------|---------|------|
| `/health` | GET | ✅ | ✅ | 健康检查 |
| `/api/users` | POST | ✅ | ✅ | 创建用户 |
| `/api/users/:userId` | GET | ✅ | ✅ | 获取用户 |
| `/api/users/:userId` | PUT | ✅ | ✅ | 更新用户 |
| `/api/workflows` | GET | ✅ | ✅ | 列出工作流 |
| `/api/workflows/:workflowId` | GET | ✅ | ✅ | 获取工作流 |
| `/api/workflows` | POST | ✅ | ✅ | 创建工作流 |
| `/api/workflows/:workflowId` | PUT | ✅ | ✅ | 更新工作流 |
| `/api/claude/v1/messages` | POST | ✅ | ✅ | Claude API 代理 |

### 响应格式标准

#### 成功响应
```json
{
  "success": true,
  "data": { ... }
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

#### 分页响应
```json
{
  "success": true,
  "data": [ ... ],
  "metadata": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  }
}
```

## 数据层设计

### 数据库连接
```go
// pkg/database/db.go
type Database struct {
    *sql.DB
    available bool
}

func (db *Database) Connect(connStr string) error {
    // 连接逻辑
    // 配置连接池
}

func (db *Database) IsAvailable() bool {
    return db.available
}

func (db *Database) QueryOne(ctx context.Context, query string, args ...interface{}) (*sql.Row, error) {
    // 类似 Node.js database.queryOne
}
```

### 模型定义
```go
// internal/models/user.go
type UserProfile struct {
    ID         string                 `json:"id" db:"id"`
    Email      string                 `json:"email" db:"email"`
    Attributes map[string]interface{} `json:"attributes" db:"attributes"`
    CreatedAt  time.Time              `json:"createdAt" db:"created_at"`
    UpdatedAt  time.Time              `json:"updatedAt" db:"updated_at"`
}
```

## 中间件设计

### CORS 中间件
```go
func CORSMiddleware(allowedOrigin string) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        // ... 其他 CORS 头

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}
```

### 日志中间件
```go
func LoggerMiddleware(logger *zerolog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        c.Next()

        latency := time.Since(start)
        logger.Info().
            Str("method", c.Request.Method).
            Str("path", path).
            Int("status", c.Writer.Status()).
            Dur("latency", latency).
            Msg("request completed")
    }
}
```

### 错误处理中间件
```go
func ErrorHandlerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()

        if len(c.Errors) > 0 {
            err := c.Errors.Last()
            // 统一的错误响应格式
            c.JSON(c.Writer.Status(), gin.H{
                "success": false,
                "error": gin.H{
                    "code":    getErrorCode(err),
                    "message": err.Error(),
                },
            })
        }
    }
}
```

## 配置管理

### 环境变量映射

| 变量名 | Node.js 默认值 | Go 默认值 | 说明 |
|--------|----------------|-----------|------|
| `PORT` | 3000 | 3000 | 服务端口 |
| `CORS_ORIGIN` | http://localhost:8000 | http://localhost:8000 | CORS 来源 |
| `NODE_ENV` / `GO_ENV` | development | development | 运行环境 |
| `DB_HOST` | localhost | localhost | 数据库主机 |
| `DB_PORT` | 5432 | 5432 | 数据库端口 |
| `DB_USER` | postgres | postgres | 数据库用户 |
| `DB_PASSWORD` | - | - | 数据库密码 |
| `DB_NAME` | lifecycle_ops | lifecycle_ops | 数据库名称 |
| `DB_DISABLED` | false | false | 是否禁用数据库 |
| `CLAUDE_API_BASE_URL` | - | - | Claude API 基础 URL |
| `CLAUDE_API_KEY` | - | - | Claude API 密钥 |

### 配置加载示例
```go
// pkg/config/config.go
type Config struct {
    Port        int    `mapstructure:"PORT"`
    CORSOrigin  string `mapstructure:"CORS_ORIGIN"`
    Environment string `mapstructure:"GO_ENV"`
    Database    DatabaseConfig
    Claude      ClaudeConfig
}

func LoadConfig() (*Config, error) {
    viper.SetDefault("PORT", 3000)
    viper.SetDefault("CORS_ORIGIN", "http://localhost:8000")
    viper.SetDefault("GO_ENV", "development")

    viper.AutomaticEnv()

    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, err
    }

    return &config, nil
}
```

## 部署和运行

### 构建
```bash
# Node.js server
cd packages/server-nodejs
npm run build
npm run start:prod

# Go server
cd packages/server-go
go build -o bin/server cmd/server/main.go
./bin/server
```

### Docker 支持（可选后续添加）
```dockerfile
# Dockerfile.go
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
EXPOSE 3000
CMD ["./server"]
```

## 性能考虑

### 预期性能提升
- **启动时间**：Go < 1s vs Node.js 2-3s
- **内存占用**：Go ~30MB vs Node.js ~100MB
- **吞吐量**：Go 预计 2-3x Node.js（取决于工作负载）
- **并发处理**：Go goroutines 更轻量，适合高并发

### 基准测试计划
使用 `wrk` 或 `hey` 测试：
- 简单 GET 请求 `/health`
- 用户 CRUD 操作
- 大并发下的稳定性

## 维护和演进

### 代码组织
- 使用 `internal/` 包避免外部依赖
- `pkg/` 包可被其他 Go 项目复用
- 遵循 Go 项目布局标准

### API 版本控制
- 当前版本：v1（无版本前缀）
- 未来版本：`/api/v2/...`
- 两个实现同步更新 API 版本

### 测试策略
- 单元测试：handlers、services 层
- 集成测试：数据库交互
- 合约测试：确保 Go 和 Node.js API 一致

## 风险缓解

### 技术风险
1. **Go 团队熟悉度**：提供培训和文档
2. **库选择**：选择成熟、维护活跃的库
3. **调试复杂度**：配置好日志和错误跟踪

### 运维风险
1. **部署流程差异**：提供详细的部署文档
2. **监控指标**：确保两个实现提供相同的监控端点
3. **故障回滚**：保留 Node.js 实现作为备份

## 后续优化方向

1. **性能优化**：使用 pprof 进行性能分析
2. **并发优化**：合理使用 goroutines 和 channels
3. **缓存层**：添加 Redis 缓存支持
4. **API 网关**：考虑使用 API 网关统一流量入口
5. **服务发现**：在微服务场景下添加服务注册发现
