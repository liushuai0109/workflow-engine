# 用户全生命周期运营管理平台

一个通过 AARRR 框架管理用户全生命周期运营的综合平台。

## Monorepo 项目结构

- **@lifecycle/client** - 基于 Vue 3 的前端应用，包含 BPMN 编辑器
- **@lifecycle/server-nodejs** - 基于 Node.js Express 的后端 API
- **@lifecycle/server-go** - 基于 Go 的后端 API（开发中）

## 快速开始

```bash
pnpm install
pnpm run bootstrap

# 启动前端和 Node.js 后端
pnpm run start

# 或分别启动
pnpm run start:client
pnpm run start:server-nodejs
```

详细信息请参见 packages/client、packages/server-nodejs 和 packages/server-go。
