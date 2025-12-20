# 变更：迭代 Mock 执行引擎功能

## 为什么

当前的 Mock 功能直接基于工作流定义（BPMN XML）执行，与实际的生产执行引擎（通过 `POST /api/execute/:workflowInstanceId` 接口）存在差异。为了更真实地模拟生产环境，Mock 功能应该：

1. **模拟真实的执行接口**：Mock 应该能够模拟真实的流程引擎执行接口（如 `POST /api/execute/:workflowInstanceId`），使用相同的参数和数据结构
2. **Mock 工作流实例数据**：在执行 Mock 时，应该能够创建和管理 Mock 的工作流实例（workflow_instance），就像真实环境一样
3. **统一的执行流程**：Mock 执行应该使用与真实执行引擎相同的代码路径，只是用 Mock 数据替代真实的外部服务调用
4. **更好的可视化**：执行结果应该与流程图更好地关联，清晰显示当前执行位置

这样可以确保 Mock 环境与生产环境的行为一致性，提高测试的可靠性。

## 变更内容

- **MODIFIED**: Mock 执行启动流程
  - 启动 Mock 时，需要选择要模拟的执行接口（目前支持 `POST /api/execute/:workflowInstanceId`）
  - 需要输入接口参数（`fromNodeId`、`workflowInstanceId` 等）
  - 如果 `workflowInstanceId` 不存在，系统自动创建 Mock 工作流实例

- **ADDED**: Mock 工作流实例管理
  - 支持创建 Mock 工作流实例（workflow_instance）
  - Mock 实例包含：workflowId、status、currentNodeIds、variables 等
  - Mock 实例数据存储在内存中（或可选的数据库表）

- **MODIFIED**: Mock 执行引擎
  - Mock 执行引擎调用真实的执行引擎服务（WorkflowEngineService）
  - 使用 Mock 数据替代真实的外部服务调用
  - 保持与真实执行引擎相同的执行逻辑和状态管理

- **ADDED**: Mock 执行参数配置
  - 支持为每个执行步骤配置 Mock 参数（businessParams）
  - 支持配置节点级别的 Mock 响应数据
  - Mock 参数可以在执行过程中动态更新

- **MODIFIED**: Mock 执行可视化
  - 执行结果与流程图节点关联
  - 清晰显示当前执行节点（currentNodeIds）
  - 支持通过"下一步"按钮触发继续执行
  - 每次"下一步"都需要提供相应的 Mock 数据

## 影响

- **受影响的规范**：
  - `backend-server` - 修改 Mock 执行 API，添加 Mock 实例管理
  - `workflow-editor` - 修改 Mock 控制面板，添加接口选择和参数输入

- **受影响的代码**：
  - `server/internal/handlers/mock.go` - 修改 ExecuteMock 处理逻辑
  - `server/internal/services/mock_executor.go` - 重构以使用真实执行引擎
  - `server/internal/services/workflow_engine.go` - 添加 Mock 模式支持
  - `client/src/components/MockControlPanel.vue` - 添加接口选择和参数输入 UI
  - `client/src/services/mockService.ts` - 修改 API 调用

