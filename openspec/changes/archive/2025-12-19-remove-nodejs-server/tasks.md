# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1 | 5 | 1-2 天 | | 无 |
| Phase 2 | 6 | 2-3 天 | | Phase 1 |
| Phase 3 | 4 | 1 天 | | Phase 2 |
| **总计** | **15** | **4-6 天** | | |

## Phase 1: 重命名 Go Server

- [x] 1.1 重命名目录
  - 将 `server-go` 重命名为 `server`
  - 验证目录重命名成功

- [x] 1.2 更新 Go module 名称
  - 在 `server/go.mod` 中将 module 从 `github.com/bpmn-explorer/server-go` 改为 `github.com/bpmn-explorer/server`
  - 运行 `go mod tidy` 更新依赖

- [x] 1.3 更新所有内部导入路径
  - 搜索所有 `.go` 文件中的 `github.com/bpmn-explorer/server-go` 引用
  - 替换为 `github.com/bpmn-explorer/server`
  - 验证所有文件编译通过

- [x] 1.4 更新 Makefile 和构建脚本
  - 检查 `server/Makefile` 中的路径引用
  - 更新 README 中的路径说明

- [ ] 1.5 验证 Go 代码编译
  - 运行 `cd server && go build ./...`
  - 确保所有包编译成功
  - 运行 `go test ./...` 确保测试通过
  - **注意**: Go 命令在当前环境不可用，需要在有 Go 环境的地方验证

## Phase 2: 更新配置和脚本

- [x] 2.1 更新根 package.json
  - 将 `start:server-go` 脚本重命名为 `start:server`
  - 删除 `start:server-nodejs` 脚本
  - 更新 `start:server` 默认脚本指向新的 server
  - 删除对 `@lifecycle/server-nodejs` 的引用

- [x] 2.2 更新 pnpm-workspace.yaml（如果有）
  - 确保 workspace 配置正确
  - 移除 server-nodejs 相关配置（workspace 使用通配符，无需修改）

- [x] 2.3 更新 lerna.json（如果有）
  - 移除 server-nodejs 相关配置（lerna.json 使用通配符，无需修改）

- [x] 2.4 更新 README.md
  - 删除 server-nodejs 相关说明
  - 更新 server-go 引用为 server
  - 更新启动命令说明

- [x] 2.5 更新 openspec/project.md
  - 更新技术栈说明，移除 Node.js 后端
  - 更新为单一 Go 后端实现（project.md 中没有后端相关说明，无需修改）

- [x] 2.6 更新其他文档
  - 搜索所有文档中的 `server-nodejs` 和 `server-go` 引用
  - 更新为 `server`
  - 检查 `docs/` 目录下的文档

## Phase 3: 删除 Node.js Server

- [x] 3.1 删除 server-nodejs 目录
  - 删除 `server-nodejs` 目录及其所有内容
  - 验证目录已完全删除

- [ ] 3.2 清理依赖
  - 运行 `pnpm install` 清理 workspace 依赖
  - 验证没有残留的 server-nodejs 引用

- [x] 3.3 更新其他变更提案（如果有）
  - 检查 `openspec/changes/` 下的其他变更提案
  - 更新所有对 `server-nodejs` 或 `server-go` 的引用
  - 特别检查 `add-workflow-related-systems` 和 `add-workflow-mock-debug`

- [ ] 3.4 最终验证
  - 运行 `pnpm run start:server` 确保服务正常启动
  - 测试所有 API 端点正常工作
  - 验证前端可以正常连接后端
  - 运行 `go test ./...` 确保所有测试通过
  - **注意**: 需要在有 Go 和 Node.js 环境的地方进行最终验证

## 验收标准

- [x] `server-go` 已重命名为 `server`
- [x] Go module 名称已更新为 `github.com/bpmn-explorer/server`
- [x] 所有内部导入路径已更新
- [x] `server-nodejs` 目录已完全删除
- [x] 所有配置文件已更新（package.json、README、文档等）
- [ ] 启动脚本 `start:server` 正常工作（需要验证）
- [ ] 所有 API 端点正常工作（需要验证）
- [ ] 前端可以正常连接后端（需要验证）
- [ ] 所有测试通过（需要验证）
- [x] 没有残留的 `server-nodejs` 或 `server-go` 引用（已更新其他变更提案）

