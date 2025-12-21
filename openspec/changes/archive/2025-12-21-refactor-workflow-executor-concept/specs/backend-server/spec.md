# backend-server Specification Delta

## MODIFIED Requirements

### Requirement: 工作流执行管理 API

系统 SHALL 提供工作流执行器 API，支持从指定节点执行工作流。

#### Scenario: 工作流执行器端点

- **当** 客户端请求 `POST /api/execute/:workflowInstanceId` 时
- **则** 系统应使用 `WorkflowExecutorHandler` 处理请求
- **并且** Handler 名称应为 `WorkflowExecutorHandler`（而非 `WorkflowExecutionHandler`）
- **并且** 请求体包含：
  - `fromNodeId`: 起始节点 ID（必需）
  - `businessParams`: 业务参数（可选）
- **并且** 响应包含：
  - `businessResponse`: 业务 API 响应（如果有）
  - `engineResponse`: 引擎响应（包括 instanceId, currentNodeIds, nextNodeIds, status, executionId, variables）

**注**: 此需求修改了命名规范，将 `WorkflowExecutionHandler` 重命名为 `WorkflowExecutorHandler`，以区分"执行器"（Executor）和"执行记录"（Execution）的概念。

## NEW Requirements

### Requirement: 工作流实例初始状态补全

系统 SHALL 在首次执行工作流时自动初始化实例的 current_node_ids。

#### Scenario: 自动补全空的 current_node_ids

- **当** 调用 `ExecuteFromNode` 方法时
- **并且** 工作流实例的 `current_node_ids` 为空
- **则** 系统应：
  - 解析工作流的 BPMN XML
  - 提取 `StartEvents` 列表
  - 将 `current_node_ids` 设置为 `StartEvents`
  - 更新实例状态到数据库（真实实例）或内存存储（Mock 实例）
- **并且** 记录 Info 级别日志，包含 instanceId 和 startEvents
- **并且** 如果工作流没有起始事件，返回错误 "workflow has no start events"

#### Scenario: 保留已有的 current_node_ids

- **当** 调用 `ExecuteFromNode` 方法时
- **并且** 工作流实例的 `current_node_ids` 非空
- **则** 系统应：
  - 保持 `current_node_ids` 不变
  - 不执行补全操作
  - 继续正常的执行流程

#### Scenario: Mock 实例的 current_node_ids 补全

- **当** 调用 `ExecuteFromNode` 方法时
- **并且** 实例 ID 以 "mock-instance-" 开头（Mock 实例）
- **并且** 工作流实例的 `current_node_ids` 为空
- **则** 系统应：
  - 调用 `MockInstanceService.UpdateMockInstance` 更新 Mock 实例
  - 将 `current_node_ids` 设置为 `StartEvents`
  - 转换 Mock 实例为 WorkflowInstance 继续执行

#### Scenario: 工作流无起始事件时返回错误

- **当** 调用 `ExecuteFromNode` 方法时
- **并且** 工作流实例的 `current_node_ids` 为空
- **并且** 工作流的 BPMN 定义中没有起始事件（`len(StartEvents) == 0`）
- **则** 系统应：
  - 返回错误，包含消息 "workflow has no start events"
  - 不更新实例状态
  - 记录 Error 级别日志

### Requirement: 工作流执行记录生命周期管理

系统 SHALL 在每次执行工作流时创建独立的执行记录，并明确管理其状态转换。

#### Scenario: 执行前创建 Running 状态的执行记录

- **当** 调用 `ExecuteFromNode` 方法时
- **并且** 准备开始执行节点
- **则** 系统应：
  - 对真实实例：
    - 调用 `CreateWorkflowExecution` 创建新的执行记录（状态为 Pending）
    - 立即调用 `UpdateWorkflowExecution` 更新状态为 `ExecutionStatusRunning`
    - 设置 `StartedAt` 为当前时间
    - 将 `businessParams` 作为初始变量
  - 对 Mock 实例：
    - 创建内存执行记录，状态直接设置为 `ExecutionStatusRunning`
    - 设置 `StartedAt` 为当前时间
    - 将 `businessParams` 作为初始变量
- **并且** 记录 Debug/Info 级别日志，包含 executionId

#### Scenario: 执行成功后更新为 Completed 状态

- **当** 节点执行成功完成时
- **则** 系统应：
  - 对真实实例：
    - 调用 `UpdateWorkflowExecution` 更新状态为 `ExecutionStatusCompleted`
    - 保存执行过程中的变量
    - 设置 `CompletedAt` 为当前时间
  - 对 Mock 实例：
    - 直接更新内存执行记录状态为 `ExecutionStatusCompleted`
    - 设置 `CompletedAt` 为当前时间
- **并且** 记录 Info 级别日志

#### Scenario: 执行失败后更新为 Failed 状态

- **当** 节点执行过程中发生错误时
- **则** 系统应：
  - 对真实实例：
    - 调用 `UpdateWorkflowExecution` 更新状态为 `ExecutionStatusFailed`
    - 保存错误消息到 `ErrorMessage` 字段
    - 保存执行过程中的变量
    - 设置 `CompletedAt` 为当前时间
  - 对 Mock 实例：
    - 直接更新内存执行记录状态为 `ExecutionStatusFailed`
    - 设置 `ErrorMessage` 字段
    - 设置 `CompletedAt` 为当前时间
- **并且** 记录 Error 级别日志，包含错误详情
- **并且** 返回错误给调用方

#### Scenario: 每次执行创建新的执行记录

- **当** 多次调用 `ExecuteFromNode` 执行同一工作流实例时
- **则** 系统应：
  - 每次都创建新的执行记录
  - 不复用或更新之前的执行记录
  - 每个执行记录有独立的 ID 和时间戳
- **并且** 可以通过 `ListWorkflowExecutions` 查看完整的执行历史

#### Scenario: 状态转换流程

- **当** 执行记录从创建到完成的完整生命周期时
- **则** 状态应按以下顺序转换：
  1. `Pending`（创建时，仅真实实例）
  2. `Running`（立即更新或创建时设置）
  3. `Completed` 或 `Failed`（执行结束时）
- **并且** Mock 实例跳过 Pending 状态，直接创建为 Running

## 实现细节

### 文件重命名

| 原文件 | 新文件 |
|--------|--------|
| `server/internal/handlers/workflow_execution.go` | `server/internal/handlers/workflow_executor.go` |
| `server/internal/handlers/workflow_execution_test.go` | `server/internal/handlers/workflow_executor_test.go` |

### 类型重命名

| 原类型 | 新类型 |
|--------|--------|
| `WorkflowExecutionHandler` | `WorkflowExecutorHandler` |
| `NewWorkflowExecutionHandler` | `NewWorkflowExecutorHandler` |

### 受影响的文件

- `server/internal/routes/routes.go` - 更新 Handler 构造函数调用
- `server/internal/services/workflow_engine.go` - 添加 current_node_ids 补全逻辑

## 向后兼容性

- ✅ HTTP API 端点路径不变：`POST /api/execute/:workflowInstanceId`
- ✅ 请求/响应格式不变
- ✅ 已存在的实例（current_node_ids 非空）行为不变
- ⚠️ 代码级别：需要更新对 `WorkflowExecutionHandler` 的引用

## 测试要求

必须添加以下测试用例：

**current_node_ids 补全：**
1. `TestExecuteFromNode_AutoInitializeCurrentNodeIds` - 验证自动补全功能
2. `TestExecuteFromNode_PreserveExistingCurrentNodeIds` - 验证不覆盖已有值
3. `TestExecuteFromNode_NoStartEvents_ReturnsError` - 验证错误处理
4. `TestExecuteFromNode_MockInstance_AutoInitializeCurrentNodeIds` - 验证 Mock 实例场景

**执行记录生命周期：**
5. `TestExecuteFromNode_CreatesNewExecutionRecord` - 验证每次都创建新记录
6. `TestExecuteFromNode_ExecutionStatusTransition` - 验证状态转换（Pending → Running → Completed）
7. `TestExecuteFromNode_ExecutionFailed_UpdatesStatus` - 验证失败场景
8. `TestExecuteFromNode_MockInstance_ExecutionRecordLifecycle` - 验证 Mock 实例执行记录

## 相关文档

- `docs/EXECUTE_WORKFLOW_IMPLEMENTATION.md` - 需要更新 Handler 命名和补全逻辑说明
