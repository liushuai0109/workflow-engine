# 更新日志

## 2025-12-24 - 服务端架构重构

### 主要变更

1. **创建 Node.js 服务端实现**
   - 新增 `server-nodejs` 目录，使用 TypeScript + Koa 框架
   - 提供与 Go 服务端相同的 API 接口
   - 支持热重载开发模式

2. **重命名 Go 服务端目录**
   - `server` → `server-go`
   - 保持所有功能不变

3. **统一服务端管理**
   - 新增 `server.config` 配置文件，用于选择服务端类型
   - 集成服务端启动逻辑到 `console.sh`
   - 删除独立的 `start-server.sh` 脚本

4. **更新安装脚本**
   - `install.sh` 现在支持安装 `server-nodejs` 依赖
   - 自动为 `server-go` 和 `server-nodejs` 配置环境变量
   - 向后兼容旧的 `server` 目录结构

### 文件变更

#### 新增文件
- `server-nodejs/` - Node.js 服务端完整实现
  - 包含完整的 TypeScript + Koa 项目结构
  - 配置文件、中间件、路由、服务层、数据模型
- `server.config` - 服务端类型配置
- `SERVER_USAGE.md` - 服务端使用指南
- `SERVER_COMPARISON.md` - 两种实现对比
- `INSTALLATION.md` - 完整安装指南

#### 重命名
- `server/` → `server-go/`

#### 修改
- `console.sh` - 集成服务端类型选择和启动逻辑
- `install.sh` - 支持 server-nodejs 和 server-go

#### 删除
- `start-server.sh` - 功能已集成到 console.sh

### 使用方法

#### 选择服务端类型

编辑 `server.config`：
```bash
SERVER_TYPE=nodejs  # 或 go
```

#### 启动服务端

```bash
./console.sh start server
```

#### 查看状态

```bash
./console.sh status
```

### 技术栈

#### Go 服务端 (server-go)
- 语言: Go 1.24+
- 框架: Gin
- 数据库: PostgreSQL (lib/pq)

#### Node.js 服务端 (server-nodejs)
- 语言: TypeScript 5.7+
- 运行时: Node.js 18+
- 框架: Koa 2.15
- 数据库: PostgreSQL (pg)
- 日志: Pino

### API 兼容性

两种服务端提供完全相同的 API 端点，可以无缝切换：

- `/health` - 健康检查
- `/api/users/*` - 用户管理
- `/api/workflows/*` - 工作流管理
- `/api/execute` - 工作流执行
- `/api/workflows/*/debug/*` - 调试会话
- `/api/chat/conversations/*` - 聊天对话
- `/api/claude/v1/*` - Claude API 代理

### 迁移指南

如果你之前使用的是 `server` 目录：

1. 停止服务：`./console.sh stop server`
2. 目录会自动识别（向后兼容）
3. 或者手动重命名：`mv server server-go`
4. 重新启动：`./console.sh start server`

### 开发建议

- **快速开发**: 使用 `server-nodejs`，支持热重载
- **高性能**: 使用 `server-go`，编译型语言，内存占用小
- **团队协作**: 统一选择一种实现，避免维护两套代码

### 注意事项

1. 两种服务端使用相同的数据库和数据结构
2. 切换服务端类型时无需迁移数据
3. 环境变量配置基本相同，只是文件位置不同：
   - Go: `server-go/.env`
   - Node.js: `server-nodejs/.env`

### 未来计划

- [ ] 为两种实现添加性能基准测试
- [ ] 统一测试覆盖率标准
- [ ] Docker 镜像支持
- [ ] Kubernetes 部署配置
