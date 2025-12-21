# Implementation Tasks

## Phase 1: 基础设施层（后端验证 + 工具定义）
- [ ] 1.1 在 `server/internal/parser/bpmn_parser.go` 中实现 `validateUserTaskConstraints` 函数
- [ ] 1.2 在 `ParseBPMN` 函数中集成验证调用
- [ ] 1.3 在 `client/src/services/llmTools.ts` 中定义 `createBoundaryEventTool`
- [ ] 1.4 将 `createBoundaryEventTool` 添加到 `availableTools` 列表
- [ ] 1.5 为后端验证编写单元测试（`bpmn_parser_test.go`）
- [ ] 1.6 验证后端测试通过：`cd server && make test`
- [ ] 1.7 验证后端编译通过：`cd server && go build ./cmd/server/main.go`

## Phase 2: 前端实现层（编辑器操作 + 提示词）
- [ ] 2.1 在 `client/src/services/editorOperationService.ts` 中添加 `BoundaryEventConfig` 接口
- [ ] 2.2 实现 `createBoundaryEvent` 方法
- [ ] 2.3 实现 `calculateBoundaryPosition` 辅助方法
- [ ] 2.4 在 `claudeBpmnSystemPrompt.ts` 中添加 UserTask 约束规则说明
- [ ] 2.5 在 `editorSystemPrompt.ts` 中添加 UserTask 约束规则说明
- [ ] 2.6 在 `claudeEditorBridge.ts` 中注册 `createBoundaryEvent` 工具处理器
- [ ] 2.7 验证前端类型检查通过：`cd client && npm run type-check`
- [ ] 2.8 验证前端编译通过：`cd client && npm run build`

## Phase 3: 验证机制层（前端验证 + 集成测试）
- [ ] 3.1 在 `BpmnEditorPage.vue` 中实现 `validateUserTaskConstraints` 函数
- [ ] 3.2 在 `saveFile` 方法中集成验证调用
- [ ] 3.3 添加错误提示 UI 显示
- [ ] 3.4 为 `editorOperationService` 编写单元测试
- [ ] 3.5 创建 E2E 测试文件 `boundary-event-constraint.spec.ts`
- [ ] 3.6 实现 E2E 测试场景：
  - [ ] 3.6.1 测试创建 BoundaryEvent 功能
  - [ ] 3.6.2 测试保存时验证阻止直接 UserTask outgoing
  - [ ] 3.6.3 测试 LLM 自动生成符合约束的流程图
- [ ] 3.7 验证前端单元测试通过：`cd client && npm run test`
- [ ] 3.8 验证 E2E 测试通过：`cd client && npm run test:e2e:headless`

## Phase 4: 文档和验证
- [ ] 4.1 更新用户文档，说明 UserTask 约束规则
- [ ] 4.2 添加迁移指南，指导用户修复现有流程图
- [ ] 4.3 运行完整测试套件验证所有功能正常
- [ ] 4.4 手动测试 LLM 对话场景
- [ ] 4.5 验证前端服务可正常启动（至少 5 秒无错误）
- [ ] 4.6 验证后端服务可正常启动（至少 5 秒无错误）
- [ ] 4.7 运行 `openspec validate enforce-usertask-boundary-constraint --strict`

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1 | 7 | 1 天 | | 无 |
| Phase 2 | 8 | 1-1.5 天 | | Phase 1 |
| Phase 3 | 8 | 1-1.5 天 | | Phase 2 |
| Phase 4 | 7 | 0.5 天 | | Phase 3 |
| **总计** | **30** | **4-4.5 天** | | |

## 验证检查清单

### TDD 测试驱动开发
- [ ] 先创建测试用例（Red 阶段）
- [ ] 实现功能让测试通过（Green 阶段）
- [ ] 重构优化代码（Refactor 阶段）

### 代码质量
- [ ] 所有新功能都有对应的单元测试
- [ ] E2E 测试覆盖关键用户场景
- [ ] 类型检查通过（前端）
- [ ] 编译通过（前端 + 后端）
- [ ] 服务启动验证通过

### OpenSpec 验证
- [ ] `openspec validate --strict` 通过
- [ ] 所有规范增量格式正确
- [ ] 每个需求至少有一个场景
