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

- [x] 1.1 创建 Mock 工作流实例数据模型
  - [x] 定义 `MockWorkflowInstance` 结构体
  - [x] 定义 `MockInstanceStore` 接口和内存实现
  - [x] 实现 Mock 实例的 CRUD 操作

- [x] 1.2 创建 Mock 实例管理服务
  - [x] 实现 `MockInstanceService`
  - [x] 实现创建 Mock 实例逻辑
  - [x] 实现获取和更新 Mock 实例逻辑

- [x] 1.3 创建 Mock 实例 API 端点
  - [x] 实现 `GET /api/workflows/mock/instances/:instanceId`
  - [x] 实现 `POST /api/workflows/mock/instances`（可选，用于手动创建）
  - [x] 实现 `PUT /api/workflows/mock/instances/:instanceId`（可选）

- [ ] 1.4 编写单元测试
  - [ ] 测试 Mock 实例创建和管理
  - [ ] 测试 Mock 实例存储

## Phase 2: 执行引擎 Mock 模式支持

- [x] 2.1 在执行引擎中添加 Mock 模式支持
  - [x] 在 `WorkflowEngineService` 中添加 Mock 模式标识（通过 context）
  - [x] 修改 `ExecuteFromNode` 方法支持 Mock 模式
  - [x] 添加 Mock 模式检查逻辑

- [x] 2.2 实现 Mock 服务调用器
  - [x] 创建 `MockServiceCaller` 接口和实现
  - [x] 在 `executeServiceTask` 中集成 Mock 调用器
  - [x] 实现 Mock 数据查找和返回逻辑

- [x] 2.3 修改执行引擎以支持 Mock 实例
  - [x] 修改 `ExecuteFromNode` 以接受 Mock 实例
  - [x] 确保 Mock 实例的状态更新逻辑与真实实例一致
  - [x] 处理 Mock 实例的版本管理

- [x] 2.4 实现 Mock 数据配置管理
  - [x] 定义 `MockExecutionConfig` 结构体
  - [x] 实现节点级别的 Mock 数据查找
  - [x] 实现 Mock 数据注入逻辑

- [ ] 2.5 编写单元测试
  - [ ] 测试 Mock 模式下的执行引擎
  - [ ] 测试 Mock 服务调用器
  - [ ] 测试 Mock 数据注入

## Phase 3: Mock 执行 API 重构

- [x] 3.1 重构 `ExecuteMock` 处理器
  - [x] 修改请求体结构，添加 `startNodeId`、`nodeMockData` 等字段
  - [x] 实现 Mock 实例自动创建逻辑
  - [x] 调用真实的执行引擎服务（Mock 模式）

- [x] 3.2 重构 `StepMockExecution` 处理器
  - [x] 修改请求体，支持 `businessParams` 和 `nodeMockData`
  - [x] 从 Mock 实例获取 `currentNodeIds`
  - [x] 调用执行引擎执行下一步

- [x] 3.3 更新 Mock 执行响应格式
  - [x] 响应包含 `workflowInstanceId`
  - [x] 响应包含 `currentNodeIds`（数组）
  - [x] 响应包含 `businessResponse` 和 `engineResponse`

- [ ] 3.4 编写集成测试
  - [ ] 测试完整的 Mock 执行流程
  - [ ] 测试 Mock 实例创建和更新
  - [ ] 测试多步骤执行

## Phase 4: 前端 UI 更新

- [x] 4.1 更新 Mock 控制面板
  - [x] 更新请求体结构以支持新的 API
  - [x] 添加执行结果显示（businessResponse 和 engineResponse）
  - [x] 更新状态管理以使用 instanceId 和 currentNodeIds

- [x] 4.2 更新 Mock 执行可视化
  - [x] 基于 `currentNodeIds` 数组显示当前节点
  - [x] 显示 Mock 实例信息（instanceId）
  - [x] 更新响应数据显示

- [x] 4.3 实现"下一步"功能
  - [x] 更新"单步"按钮使用新的 API（stepExecution）
  - [x] 支持传递 businessParams 和 nodeMockData

- [x] 4.4 更新 Mock 服务
  - [x] 修改 `executeWorkflow` 方法支持新的请求格式
  - [x] 修改 `stepExecution` 方法支持参数传递
  - [x] 添加获取 Mock 实例的方法（getInstance）
  - [x] 添加新的数据类型（ExecuteResult, MockInstance, NodeMockData）

## 验收标准

- [ ] Mock 执行可以模拟真实的执行引擎接口
- [ ] Mock 执行自动创建和管理 Mock 工作流实例
- [ ] Mock 执行使用真实的执行引擎代码路径
- [ ] Mock 执行结果与流程图正确关联
- [ ] "下一步"功能可以继续执行并更新状态
- [ ] 所有 API 端点正常工作
- [ ] 前端 UI 响应式且易用
- [ ] 代码通过所有测试

