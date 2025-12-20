# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: Mock 实例管理 | 4 | 1-2 天 | | 无 |
| Phase 2: 执行引擎 Mock 模式支持 | 5 | 2-3 天 | | Phase 1 |
| Phase 3: Mock 执行 API 重构 | 4 | 1-2 天 | | Phase 2 |
| Phase 4: 前端 UI 更新 | 4 | 1-2 天 | | Phase 3 |
| **总计** | **17** | **5-9 天** | | |

## Phase 1: Mock 实例管理

- [ ] 1.1 创建 Mock 工作流实例数据模型
  - [ ] 定义 `MockWorkflowInstance` 结构体
  - [ ] 定义 `MockInstanceStore` 接口和内存实现
  - [ ] 实现 Mock 实例的 CRUD 操作

- [ ] 1.2 创建 Mock 实例管理服务
  - [ ] 实现 `MockInstanceService`
  - [ ] 实现创建 Mock 实例逻辑
  - [ ] 实现获取和更新 Mock 实例逻辑

- [ ] 1.3 创建 Mock 实例 API 端点
  - [ ] 实现 `GET /api/workflows/mock/instances/:instanceId`
  - [ ] 实现 `POST /api/workflows/mock/instances`（可选，用于手动创建）
  - [ ] 实现 `PUT /api/workflows/mock/instances/:instanceId`（可选）

- [ ] 1.4 编写单元测试
  - [ ] 测试 Mock 实例创建和管理
  - [ ] 测试 Mock 实例存储

## Phase 2: 执行引擎 Mock 模式支持

- [ ] 2.1 在执行引擎中添加 Mock 模式支持
  - [ ] 在 `WorkflowEngineService` 中添加 Mock 模式标识（通过 context）
  - [ ] 修改 `ExecuteFromNode` 方法支持 Mock 模式
  - [ ] 添加 Mock 模式检查逻辑

- [ ] 2.2 实现 Mock 服务调用器
  - [ ] 创建 `MockServiceCaller` 接口和实现
  - [ ] 在 `executeServiceTask` 中集成 Mock 调用器
  - [ ] 实现 Mock 数据查找和返回逻辑

- [ ] 2.3 修改执行引擎以支持 Mock 实例
  - [ ] 修改 `ExecuteFromNode` 以接受 Mock 实例
  - [ ] 确保 Mock 实例的状态更新逻辑与真实实例一致
  - [ ] 处理 Mock 实例的版本管理

- [ ] 2.4 实现 Mock 数据配置管理
  - [ ] 定义 `MockExecutionConfig` 结构体
  - [ ] 实现节点级别的 Mock 数据查找
  - [ ] 实现 Mock 数据注入逻辑

- [ ] 2.5 编写单元测试
  - [ ] 测试 Mock 模式下的执行引擎
  - [ ] 测试 Mock 服务调用器
  - [ ] 测试 Mock 数据注入

## Phase 3: Mock 执行 API 重构

- [ ] 3.1 重构 `ExecuteMock` 处理器
  - [ ] 修改请求体结构，添加 `executionApi`、`workflowInstanceId`、`fromNodeId` 等字段
  - [ ] 实现 Mock 实例自动创建逻辑
  - [ ] 调用真实的执行引擎服务（Mock 模式）

- [ ] 3.2 重构 `StepMockExecution` 处理器
  - [ ] 修改请求体，支持 `businessParams` 和 `nodeMockData`
  - [ ] 从 Mock 实例获取 `currentNodeIds`
  - [ ] 调用执行引擎执行下一步

- [ ] 3.3 更新 Mock 执行响应格式
  - [ ] 响应应包含 `workflowInstanceId`
  - [ ] 响应应包含 `currentNodeIds`（数组）
  - [ ] 响应应包含 `businessResponse` 和 `engineResponse`

- [ ] 3.4 编写集成测试
  - [ ] 测试完整的 Mock 执行流程
  - [ ] 测试 Mock 实例创建和更新
  - [ ] 测试多步骤执行

## Phase 4: 前端 UI 更新

- [ ] 4.1 更新 Mock 控制面板
  - [ ] 添加执行接口选择器
  - [ ] 添加参数输入区域（workflowInstanceId、fromNodeId、businessParams）
  - [ ] 添加 Mock 数据配置区域

- [ ] 4.2 更新 Mock 执行可视化
  - [ ] 基于 `currentNodeIds` 数组高亮显示当前节点
  - [ ] 显示 Mock 实例信息
  - [ ] 更新执行历史显示

- [ ] 4.3 实现"下一步"功能
  - [ ] 添加"下一步"按钮
  - [ ] 实现参数输入对话框
  - [ ] 发送 step 请求并更新显示

- [ ] 4.4 更新 Mock 服务
  - [ ] 修改 `executeWorkflow` 方法，支持新的请求格式
  - [ ] 修改 `stepExecution` 方法，支持参数传递
  - [ ] 添加获取 Mock 实例的方法

## 验收标准

- [ ] Mock 执行可以模拟真实的执行引擎接口
- [ ] Mock 执行自动创建和管理 Mock 工作流实例
- [ ] Mock 执行使用真实的执行引擎代码路径
- [ ] Mock 执行结果与流程图正确关联
- [ ] "下一步"功能可以继续执行并更新状态
- [ ] 所有 API 端点正常工作
- [ ] 前端 UI 响应式且易用
- [ ] 代码通过所有测试

