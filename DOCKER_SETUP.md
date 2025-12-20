# Docker 容器化方案

## 项目结构分析

项目包含以下组件：

1. **前端 (client/)** - Vue 3 + Vite 应用
   - 开发模式：`npm run start` (端口 8000)
   - 生产构建：`npm run build` (输出到 `dist/`)
   - 依赖：Node.js >= 18.0.0

2. **后端 (server/)** - Go 应用
   - 编译：`go build -o bin/server cmd/server/main.go`
   - 运行：`./bin/server` (默认端口 3000)
   - 依赖：Go 1.24.0, PostgreSQL 数据库
   - 环境变量：需要 `.env` 文件或环境变量

3. **数据库** - PostgreSQL
   - 默认端口：5432
   - 数据库名：`lifecycle_ops`
   - 需要运行 migrations

## Docker 化方案

### 方案一：多阶段构建 + Docker Compose（推荐）

#### 架构设计

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
│                                         │
│  ┌──────────┐    ┌──────────┐          │
│  │  Client  │───▶│  Server  │          │
│  │  :8000   │    │  :3000   │          │
│  └──────────┘    └────┬─────┘          │
│                       │                │
│                  ┌────▼─────┐          │
│                  │PostgreSQL │          │
│                  │  :5432   │          │
│                  └──────────┘          │
└─────────────────────────────────────────┘
```

#### 文件结构

```
workflow-engine/
├── docker/
│   ├── client/
│   │   ├── Dockerfile              # 前端 Dockerfile
│   │   └── nginx.conf              # Nginx 配置（生产环境）
│   ├── server/
│   │   └── Dockerfile              # 后端 Dockerfile
│   └── db/
│       └── init.sql                # 数据库初始化脚本（可选）
├── docker-compose.yml              # 开发环境编排
├── docker-compose.prod.yml         # 生产环境编排
├── .dockerignore                   # Docker 忽略文件
└── .env.example                    # 环境变量示例
```

### 详细方案

#### 1. 前端 Dockerfile（开发模式）

**文件：`docker/client/Dockerfile.dev`**

```dockerfile
# 开发模式 - 使用 Vite 开发服务器
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY client/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY client/ ./

# 暴露端口
EXPOSE 8000

# 启动开发服务器
CMD ["npm", "run", "start"]
```

#### 2. 前端 Dockerfile（生产模式）

**文件：`docker/client/Dockerfile`**

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY client/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY client/ ./

# 构建应用
RUN npm run build

# 生产阶段 - 使用 Nginx
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 3. 前端 Nginx 配置

**文件：`docker/client/nginx.conf`**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（如果需要）
    location /api {
        proxy_pass http://server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 4. 后端 Dockerfile

**文件：`docker/server/Dockerfile`**

```dockerfile
# 构建阶段
FROM golang:1.24-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache git make

WORKDIR /app

# 复制 go mod 文件
COPY server/go.mod server/go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY server/ ./

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o bin/server \
    cmd/server/main.go

# 生产阶段
FROM alpine:latest

# 安装 ca-certificates（用于 HTTPS 请求）
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/bin/server .

# 复制 migrations（如果需要）
COPY --from=builder /app/migrations ./migrations

# 创建非 root 用户
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["./server"]
```

#### 5. Docker Compose（开发环境）

**文件：`docker-compose.yml`**

```yaml
version: '3.8'

services:
  # PostgreSQL 数据库
  db:
    image: postgres:15-alpine
    container_name: workflow-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: lifecycle_ops
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - workflow-network

  # 后端服务
  server:
    build:
      context: .
      dockerfile: docker/server/Dockerfile
    container_name: workflow-server
    environment:
      PORT: 3000
      GO_ENV: development
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: lifecycle_ops
      DB_DISABLED: "false"
      CORS_ORIGIN: "http://localhost:8000,http://editor.workflow.com:8000"
      CLAUDE_API_BASE_URL: ${CLAUDE_API_BASE_URL:-https://api.jiekou.ai}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY:-}
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      # 开发模式：挂载源代码以实现热重载（可选）
      - ./server:/app
    networks:
      - workflow-network
    restart: unless-stopped

  # 前端服务（开发模式）
  client:
    build:
      context: .
      dockerfile: docker/client/Dockerfile.dev
    container_name: workflow-client
    environment:
      - NODE_ENV=development
    ports:
      - "8000:8000"
    volumes:
      # 开发模式：挂载源代码以实现热重载
      - ./client:/app
      - /app/node_modules
    depends_on:
      - server
    networks:
      - workflow-network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local

networks:
  workflow-network:
    driver: bridge
```

#### 6. Docker Compose（生产环境）

**文件：`docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  # PostgreSQL 数据库
  db:
    image: postgres:15-alpine
    container_name: workflow-db-prod
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-lifecycle_ops}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./server/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - workflow-network
    restart: always
    # 生产环境建议不暴露端口，或使用内部网络
    # ports:
    #   - "5432:5432"

  # 后端服务
  server:
    build:
      context: .
      dockerfile: docker/server/Dockerfile
    container_name: workflow-server-prod
    environment:
      PORT: 3000
      GO_ENV: production
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      DB_NAME: ${DB_NAME:-lifecycle_ops}
      DB_DISABLED: "false"
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:8000}
      CLAUDE_API_BASE_URL: ${CLAUDE_API_BASE_URL:-https://api.jiekou.ai}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - workflow-network
    restart: always
    # 生产环境建议使用反向代理，不直接暴露端口
    # ports:
    #   - "3000:3000"

  # 前端服务（生产模式）
  client:
    build:
      context: .
      dockerfile: docker/client/Dockerfile
    container_name: workflow-client-prod
    ports:
      - "80:80"
    depends_on:
      - server
    networks:
      - workflow-network
    restart: always

volumes:
  postgres_data_prod:
    driver: local

networks:
  workflow-network:
    driver: bridge
```

#### 7. .dockerignore

**文件：`.dockerignore`**

```
# Git
.git
.gitignore
.gitattributes

# Node
node_modules
npm-debug.log
yarn-error.log
.pnpm-debug.log

# Build outputs
dist
build
bin
*.exe
*.dll
*.so
*.dylib

# Test files
coverage
.nyc_output
test-results
*.test
*.spec

# IDE
.vscode
.idea
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs

# Environment
.env
.env.local
.env.*.local

# Documentation
*.md
docs/
README.md

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Other
.openspec
openspec/
examples/
reports/
scripts/
tests/
biz-sample/
```

#### 8. 环境变量示例

**文件：`.env.example`**

```env
# 数据库配置
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lifecycle_ops
DB_DISABLED=false

# 服务器配置
PORT=3000
GO_ENV=development
CORS_ORIGIN=http://localhost:8000,http://editor.workflow.com:8000

# Claude API 配置
CLAUDE_API_BASE_URL=https://api.jiekou.ai
CLAUDE_API_KEY=your_api_key_here
```

## 使用说明

### 开发环境

1. **启动所有服务**
   ```bash
   docker-compose up -d
   ```

2. **查看日志**
   ```bash
   # 查看所有服务日志
   docker-compose logs -f
   
   # 查看特定服务日志
   docker-compose logs -f server
   docker-compose logs -f client
   docker-compose logs -f db
   ```

3. **停止服务**
   ```bash
   docker-compose down
   ```

4. **重建服务（代码更新后）**
   ```bash
   docker-compose up -d --build
   ```

5. **运行数据库迁移**
   ```bash
   # 进入后端容器
   docker-compose exec server sh
   
   # 在容器内运行迁移（需要 migrate 工具）
   # 或者使用 init 脚本自动运行
   ```

6. **访问服务**
   - 前端：http://localhost:8000
   - 后端 API：http://localhost:3000
   - 数据库：localhost:5432

### 生产环境

1. **构建并启动**
   ```bash
   # 复制环境变量文件
   cp .env.example .env
   # 编辑 .env 文件，填入正确的配置
   
   # 启动生产环境
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **查看日志**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **停止服务**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

4. **数据持久化**
   - 数据库数据存储在 Docker volume `postgres_data_prod` 中
   - 备份：`docker run --rm -v workflow-engine_postgres_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz /data`

### 数据库迁移

#### 方案 A：使用 init 脚本（推荐）

在 `docker/db/init.sql` 中创建迁移脚本，PostgreSQL 容器启动时会自动执行。

#### 方案 B：手动运行迁移

```bash
# 进入后端容器
docker-compose exec server sh

# 安装 migrate 工具（如果容器内没有）
# 或使用外部 migrate 工具连接数据库执行迁移
```

#### 方案 C：使用迁移服务容器

创建一个专门的迁移服务容器，在数据库就绪后自动运行迁移。

## 优化建议

### 1. 多阶段构建优化

- 使用构建缓存层，加速重复构建
- 分离依赖安装和代码复制，提高缓存命中率

### 2. 镜像大小优化

- 使用 Alpine Linux 基础镜像
- 生产镜像只包含必要的运行时文件
- 使用 `.dockerignore` 排除不必要的文件

### 3. 安全性

- 使用非 root 用户运行容器
- 生产环境不暴露数据库端口
- 使用 secrets 管理敏感信息（Docker Swarm 或 Kubernetes）

### 4. 性能

- 前端使用 Nginx 提供静态文件服务
- 启用 Gzip 压缩
- 配置适当的缓存策略

### 5. 监控和日志

- 配置健康检查
- 使用集中式日志收集（如 ELK Stack）
- 配置监控和告警

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查 `DB_HOST` 环境变量（应使用服务名 `db`，不是 `localhost`）
   - 确认数据库健康检查通过
   - 检查网络连接

2. **前端无法访问后端 API**
   - 检查 CORS 配置
   - 确认后端服务正常运行
   - 检查网络配置

3. **端口冲突**
   - 修改 `docker-compose.yml` 中的端口映射
   - 检查本地是否有服务占用端口

4. **构建失败**
   - 检查 Dockerfile 中的路径是否正确
   - 确认所有依赖文件都已复制
   - 查看构建日志定位问题

## 下一步

1. 创建上述所有文件
2. 测试开发环境启动
3. 测试生产环境构建
4. 配置 CI/CD 自动构建和部署
5. 添加健康检查和监控

