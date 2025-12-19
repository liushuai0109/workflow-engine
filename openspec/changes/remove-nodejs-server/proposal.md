# 变更：删除 Node.js Server 并将 Go Server 重命名为 Server

## 为什么

当前项目同时维护两个后端实现（server-nodejs 和 server-go），增加了维护成本和复杂性。由于：

1. **Go Server 已完整实现**：server-go 已经实现了所有核心功能（用户管理、工作流管理、Claude API 代理等）
2. **性能优势**：Go 在处理并发请求、内存占用和启动速度方面具有优势
3. **简化架构**：单一后端实现可以简化部署、维护和开发流程
4. **减少维护负担**：不需要同时维护两套代码和文档

因此，我们决定：
- 删除 `server-nodejs` 目录及其所有代码
- 将 `server-go` 重命名为 `server`
- 更新所有相关配置、脚本和文档引用

## 变更内容

- **REMOVED**: Node.js Server 实现
  - 删除 `server-nodejs` 目录
  - 删除相关的 npm 脚本和依赖
  - 删除相关的文档引用

- **RENAMED**: Go Server 重命名为 Server
  - 将 `server-go` 重命名为 `server`
  - 更新 Go module 名称（从 `github.com/bpmn-explorer/server-go` 到 `github.com/bpmn-explorer/server`）
  - 更新所有内部导入路径
  - 更新启动脚本（`start:server-go` → `start:server`）
  - 更新文档和 README

- **MODIFIED**: 后端服务器规范
  - 移除多语言后端支持的需求
  - 更新为单一 Go 后端实现
  - 更新启动方式和路径引用

## 影响

- **受影响的规范**：
  - `backend-server` - 移除多语言支持，更新为单一 Go 实现

- **受影响的代码**：
  - `server-go/` - 重命名为 `server/`
  - `package.json` - 更新脚本和 workspace 配置
  - `README.md` - 更新文档
  - `openspec/project.md` - 更新技术栈说明
  - 所有引用 `server-go` 或 `server-nodejs` 的配置文件

- **BREAKING**: 这是一个破坏性变更
  - 删除 server-nodejs 将导致依赖它的代码无法工作
  - Go module 路径变更需要更新所有导入
  - 启动脚本名称变更

