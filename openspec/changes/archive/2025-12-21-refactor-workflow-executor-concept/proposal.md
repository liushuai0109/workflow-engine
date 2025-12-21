# 提案：重构工作流执行器概念

## 变更 ID
refactor-workflow-executor-concept

## 背景

当前工作流执行相关逻辑存在以下问题：

1. **命名不准确**：`server/internal/handlers/workflow_execution.go` 使用了 `workflow_execution` 命名，这与实际的执行记录（`WorkflowExecution` model）概念混淆。Handler 应该命名为 `workflow_executor` 以表示"执行器"的职责，而不是"执行记录"。

2. **初始状态缺失**：`WorkflowEngineService.ExecuteFromNode()` 方法在获取工作流实例后，未检查和补全 `current_node_ids`。当实例刚创建时，`current_node_ids` 为空，应该自动填入流程的 `start_events`，否则无法正确执行。

3. **执行记录生命周期不明确**：当前 `ExecuteFromNode` 使用 `getOrCreateExecution` 复用或创建执行记录，但执行记录的状态转换不够清晰。应该在每次执行时创建新的执行记录，并在执行前后明确状态：
   - 执行前：创建 `Running` 状态的记录
   - 执行成功后：更新为 `Completed` 状态
   - 执行失败后：更新为 `Failed` 状态

## 变更目标

1. 将 `workflow_execution` 相关的命名统一重构为 `workflow_executor`，以明确表示执行器的职责
2. 在 `ExecuteFromNode` 方法中添加逻辑，自动补全空的 `current_node_ids` 为流程的 `start_events`
3. 修改执行记录创建逻辑，在执行节点前后分别创建和更新 `WorkflowExecution` 记录：
   - **执行前**：创建状态为 `ExecutionStatusRunning` 的执行记录
   - **执行后**：更新状态为 `ExecutionStatusCompleted` 或 `ExecutionStatusFailed`

## 影响范围

### 受影响的文件

**命名重构：**
- `server/internal/handlers/workflow_execution.go` → `workflow_executor.go`
- `server/internal/handlers/workflow_execution_test.go` → `workflow_executor_test.go`
- `server/internal/routes/routes.go`（引用变更）

**逻辑修复：**
- `server/internal/services/workflow_engine.go`（添加 current_node_ids 补全逻辑 + 修改执行记录创建逻辑）
- `server/internal/services/workflow_engine_test.go`（添加测试用例）

### API 兼容性

- HTTP 端点路径保持不变：`POST /api/execute/:workflowInstanceId`
- 请求/响应格式保持不变
- 仅内部命名和逻辑调整，对外部无影响

## 设计决策

### 1. 命名规范

- **Executor（执行器）**：负责执行工作流的 Handler 和 Service
- **Execution（执行记录）**：工作流执行的状态记录（已有的 `WorkflowExecution` model）
- **Engine（引擎）**：工作流执行引擎服务（已有的 `WorkflowEngineService`）

这样可以清晰区分职责：
```
WorkflowExecutorHandler → 调用 → WorkflowEngineService → 创建/更新 → WorkflowExecution
```

### 2. current_node_ids 补全逻辑

在 `ExecuteFromNode` 方法中，获取实例后添加检查：

```go
// 获取工作流实例后
instance, err := s.instanceSvc.GetWorkflowInstanceByID(ctx, instanceId)

// 解析 BPMN 获取 WorkflowDefinition
wd, err := parser.ParseBPMN(workflow.BpmnXml)

// 补全 current_node_ids（如果为空）
if len(instance.CurrentNodeIds) == 0 {
    if len(wd.StartEvents) > 0 {
        instance.CurrentNodeIds = wd.StartEvents
        // 更新实例状态
        instance, err = s.instanceSvc.UpdateWorkflowInstance(ctx, instanceId, instance.Status, wd.StartEvents)
    }
}
```

**设计考虑：**
- 仅在 `current_node_ids` 为空时补全，避免覆盖已有状态
- 使用 BPMN 解析后的 `StartEvents` 作为初始节点
- 补全后立即更新实例，保持状态一致性
- 支持多个起始事件的场景

## 验证方法

### 1. 命名重构验证
- 运行所有测试确保无编译错误
- 验证 HTTP API 端点仍然正常工作
- 检查日志中的命名是否正确

### 2. 逻辑修复验证
- 创建新的工作流实例（`current_node_ids` 为空）
- 调用 `POST /api/execute/:instanceId` 执行工作流
- 验证系统自动从 `start_events` 开始执行
- 验证实例状态正确更新

## 风险评估

### 低风险
- 命名重构：仅内部文件重命名，不影响 API 接口
- 逻辑修复：仅在 `current_node_ids` 为空时生效，不影响已有实例

### 需要注意
- 确保所有引用都已更新（通过编译检查）
- 确保测试用例覆盖新的逻辑分支

## 后续工作

1. 更新相关文档（如果有）
2. 检查是否有其他类似的命名混淆问题
3. 考虑为工作流实例添加初始化方法，统一处理初始状态设置
