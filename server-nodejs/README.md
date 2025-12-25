# Workflow Engine Server - Node.js

TypeScript + Koa 实现的工作流引擎服务端。

## 功能特性

- TypeScript + Koa 框架
- PostgreSQL 数据库支持
- BPMN 工作流管理
- 工作流实例和执行管理
- 聊天会话和消息管理
- 用户管理
- RESTful API
- 结构化日志 (Pino)
- CORS 支持
- 环境变量配置
- 事务支持

## 安装依赖

```bash
npm install
```

## 配置

复制 `.env.example` 到 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

主要配置项：

- `PORT`: 服务器端口（默认: 3000）
- `NODE_ENV`: 运行环境（development/production）
- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称
- `CORS_ORIGIN`: 允许的跨域源

## 运行

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm run build
npm start
```

## 测试

```bash
npm test
npm run test:coverage
```

## 代码质量

```bash
# 运行 ESLint
npm run lint
npm run lint:fix

# 运行 Prettier
npm run format
```

## API 端点

### 健康检查

- `GET /health` - 服务器健康状态

### 用户管理

- `POST /api/users` - 创建用户
- `GET /api/users/:userId` - 获取用户
- `PUT /api/users/:userId` - 更新用户

### 工作流管理

- `POST /api/workflows` - 创建工作流
- `GET /api/workflows/:workflowId` - 获取工作流
- `PUT /api/workflows/:workflowId` - 更新工作流
- `GET /api/workflows` - 列出工作流（支持分页）

### 聊天会话管理

- `POST /api/chat/conversations` - 创建会话
- `GET /api/chat/conversations` - 列出会话
- `GET /api/chat/conversations/:id` - 获取会话详情
- `PUT /api/chat/conversations/:id` - 更新会话
- `DELETE /api/chat/conversations/:id` - 删除会话
- `POST /api/chat/conversations/:id/messages` - 添加消息
- `POST /api/chat/conversations/:id/messages/batch` - 批量添加消息

## 项目结构

```
src/
├── config/           # 配置管理
├── handlers/         # 请求处理器
├── middleware/       # 中间件
├── models/           # 数据模型
├── pkg/             # 公共包
│   ├── database/    # 数据库连接
│   └── logger/      # 日志工具
├── routes/          # 路由定义
├── services/        # 业务逻辑层
└── index.ts         # 应用入口
```

## 数据库

使用 PostgreSQL 作为数据库。数据库迁移脚本位于 `migrations/` 目录。

## 开发说明

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 代码风格
- 编写单元测试覆盖核心功能
- 使用 Pino 进行结构化日志记录
