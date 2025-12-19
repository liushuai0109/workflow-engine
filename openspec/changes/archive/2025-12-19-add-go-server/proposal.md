# 变更：添加 Go Server 实现并重命名 Node.js Server

## Why

当前项目仅有一个 Node.js/Express 后端实现。为了支持多语言后端选择和提升性能，我们需要：

1. **添加 Go 语言的 server 实现**：Go 在处理并发请求、内存占用和启动速度方面具有优势，适合构建高性能的 API 服务
2. **重命名现有 server**：将 `server` 重命名为 `server-nodejs`，使命名更明确，便于区分不同语言的实现
3. **统一 API 接口**：两个 server 实现应提供相同的 REST API 接口，确保前端可以无缝切换后端

这样可以：
- 为用户提供部署选择（Node.js vs Go）
- 利用 Go 的性能优势处理高负载场景
- 保持 API 兼容性，降低维护成本
- 支持渐进式迁移策略

## What Changes

### 1. 重命名现有 Node.js Server
- 将 `server` 目录重命名为 `server-nodejs`
- 更新 `package.json` 中的 workspace 名称：`@lifecycle/server` → `@lifecycle/server-nodejs`
- 更新 Lerna 和根 package.json 中的脚本引用
- 更新文档和配置文件中的路径引用

### 2. 创建新的 Go Server
- 在 `server-go` 创建新的 Go 项目
- 使用 Go 标准库和流行框架（如 Gin 或 Echo）实现 REST API
- 实现与 Node.js server 相同的核心功能：
  - 用户管理 API (UserProfile CRUD)
  - 工作流管理 API (Workflow CRUD)
  - Claude AI 代理 API
  - 健康检查端点
- 复用相同的环境变量配置策略
- 实现相同的 CORS、日志、错误处理中间件

### 3. 统一 API 规范
- 两个 server 实现提供完全相同的 REST API 接口
- 相同的端点路径、请求/响应格式
- 相同的错误码和消息格式
- 相同的环境变量配置

### 4. 更新构建和部署脚本
- 添加 `start:server-nodejs` 和 `start:server-go` 脚本
- 更新 Lerna 配置以支持新的 package 结构
- 更新 CI/CD 配置（如果有）

## Impact

- **受影响的规范**：需要创建新的 `backend-server` 规范，定义统一的 API 接口
- **受影响的代码**：
  - 重命名 `server` → `server-nodejs`
  - 创建 `server-go`
  - 更新根目录 `package.json`、`lerna.json`、`pnpm-workspace.yaml`
  - 更新文档中的路径引用
- **数据影响**：无，两个 server 实现可以连接相同的数据库
- **用户影响**：
  - 用户可以选择使用 Node.js 或 Go 后端
  - 前端配置无需改变（通过环境变量指定后端 URL）
  - API 接口保持完全兼容

## Migration Path

对于现有部署：
1. 默认继续使用重命名后的 `server-nodejs`
2. 可选地切换到 `server-go` 以获得性能提升
3. 两个实现可以并行部署用于 A/B 测试或灰度发布
