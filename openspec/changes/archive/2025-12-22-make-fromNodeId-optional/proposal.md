# 变更：将 ExecuteWorkflow API 的 fromNodeId 参数设为可选

## Why

当前工作流执行 API (`POST /api/execute/:workflowInstanceId`) 要求在请求体中必须提供 `fromNodeId` 参数。然而，在许多工作流执行场景中，用户希望从工作流实例的当前节点继续执行，而不是显式指定起始节点。强制要求 `fromNodeId` 会导致：

1. **客户端调用复杂度增加**：客户端需要先查询工作流实例的 `current_node_ids`，然后再传递给执行接口
2. **API 使用体验不佳**：对于"继续执行"这一最常见的场景，用户需要提供冗余信息
3. **与工作流引擎设计不一致**：工作流实例已经维护了 `current_node_ids` 状态，应该能够自动从当前节点继续执行

将 `fromNodeId` 设为可选参数可以简化 API 使用，提升开发者体验。当 `fromNodeId` 未提供时，系统自动从工作流实例的 `current_node_ids` 继续执行。

## What Changes

- **MODIFIED**: `POST /api/execute/:workflowInstanceId` API 的请求体参数
  - `fromNodeId` 从 `required` 改为 `optional`
  - 当未提供 `fromNodeId` 时，系统从工作流实例的 `current_node_ids` 继续执行
  - 当提供 `fromNodeId` 时，保持原有逻辑不变（支持从指定节点执行和回滚场景）

- **MODIFIED**: `WorkflowExecutorHandler.ExecuteWorkflow` 方法的参数验证逻辑
  - 移除 `binding:"required"` 标签
  - 添加条件逻辑：当 `fromNodeId` 为空时，从实例的 `current_node_ids` 获取起始节点

- **MODIFIED**: `WorkflowEngineService.ExecuteFromNode` 方法的调用方式
  - 支持 `fromNodeId` 为空字符串的情况
  - 当 `fromNodeId` 为空时，使用实例的 `current_node_ids` 作为起始节点

## Impact

- **受影响的规范**：`backend-server` 规范能力领域中的"工作流执行引擎 API"需求
- **受影响的代码**：
  - `server/internal/handlers/workflow_executor.go` - 修改请求参数验证逻辑
  - `server/internal/services/workflow_engine.go` - 修改执行引擎服务逻辑
- **兼容性**：向后兼容，现有客户端可以继续提供 `fromNodeId` 参数
- **测试影响**：需要添加测试用例验证 `fromNodeId` 为空时的执行逻辑
