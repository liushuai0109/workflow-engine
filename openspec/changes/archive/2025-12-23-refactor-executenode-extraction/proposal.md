# 变更：提取节点执行逻辑到 ExecuteNode 方法并使用拦截器调用

## Why

当前 `ExecuteFromNode` 方法中的节点执行逻辑（第 324-357 行）直接嵌入在主流程循环中，包含了对不同节点类型的处理（ServiceTask、UserTask、IntermediateCatchEvent、EventBasedGateway、ExclusiveGateway、EndEvent 等）。这种实现方式存在以下问题：

1. **代码结构混乱**：节点执行逻辑与流程控制逻辑耦合在一起，导致 `ExecuteFromNode` 方法过于庞大（497行），职责不清晰
2. **难以扩展和维护**：添加新的节点类型或修改现有节点逻辑时，需要修改主流程方法，增加了维护成本
3. **缺少拦截能力**：节点执行过程无法被拦截和Mock，不利于测试和调试
4. **不符合单一职责原则**：一个方法同时负责流程控制和节点执行两个职责

通过将节点执行逻辑提取到独立的 `ExecuteNode` 方法，并在 `ExecuteFromNode` 中以拦截器方式调用，可以实现更好的代码组织、提高可测试性，并与现有的拦截器架构保持一致。

## What Changes

- **ADDED**: 新增 `ExecuteNode` 方法，封装所有节点类型的执行逻辑
- **ADDED**: 新增 `ExecuteNodeParams` 结构体，包含节点执行所需的所有参数
- **MODIFIED**: 重构 `ExecuteFromNode` 方法，在执行节点时通过拦截器调用 `ExecuteNode`
- **MODIFIED**: 优化节点执行逻辑的结构和错误处理

具体变更内容：

1. **定义 ExecuteNodeParams 结构体**（`server/internal/services/workflow_engine.go`）
   - `NodeID string` - 节点ID（带 `intercept:"id"` tag）
   - `Node *models.Node` - 节点对象
   - `BusinessParams map[string]interface{}` - 业务参数
   - `Variables map[string]interface{}` - 流程变量
   - `Execution *models.WorkflowExecution` - 执行上下文

2. **创建 ExecuteNode 方法**（`server/internal/services/workflow_engine.go`）
   - 签名：`func (s *WorkflowEngineService) ExecuteNode(ctx context.Context, params ExecuteNodeParams) (*BusinessResponse, error)`
   - 封装当前在 `ExecuteFromNode` 第 324-357 行的 switch-case 逻辑
   - 统一处理所有节点类型的执行（ServiceTask、UserTask、IntermediateCatchEvent、EventBasedGateway、ExclusiveGateway、EndEvent 等）
   - 返回业务响应和错误

3. **更新 ExecuteFromNode 方法**（`server/internal/services/workflow_engine.go`）
   - 使用 `interceptor.Intercept` 调用 `ExecuteNode` 而不是直接执行 switch-case
   - 调用方式：
     ```go
     businessResponse, err = interceptor.Intercept(ctx,
         "ExecuteNode",
         s.ExecuteNode,
         ExecuteNodeParams{
             NodeID:         currentNodeId,
             Node:           currentNode,
             BusinessParams: businessParams,
             Variables:      execution.Variables,
             Execution:      execution,
         },
     )
     ```
   - 保持原有的错误处理和流程控制逻辑不变

4. **优化代码组织**
   - 将节点执行逻辑从主流程中分离，提高代码可读性
   - 保持与现有拦截器架构（GetInstance、GetWorkflow、UpdateInstance、ServiceTask）的一致性

## Impact

**受影响的规范**：
- `backend-server` - 工作流引擎核心执行逻辑

**受影响的代码**：
- `server/internal/services/workflow_engine.go` - 主要修改文件
  - 新增 `ExecuteNodeParams` 结构体（约 10 行）
  - 新增 `ExecuteNode` 方法（约 40 行）
  - 修改 `ExecuteFromNode` 方法（移除约 35 行，新增约 15 行）
  - 总体代码行数减少约 10 行，但结构更清晰

**破坏性变更**：无

**向后兼容性**：完全兼容
- 这是内部重构，不影响公共 API
- 不改变方法签名和返回值
- 不影响现有功能行为

**测试影响**：
- 需要为新的 `ExecuteNode` 方法添加单元测试
- 现有的集成测试应当继续通过
- 拦截器功能测试需要验证 ExecuteNode 的拦截能力

**性能影响**：
- 引入一层拦截器调用，预计性能影响 < 1%
- 通过拦截器架构实现的灵活性远大于微小的性能开销

**依赖关系**：
- 依赖现有的 `interceptor.Intercept` 泛型函数和拦截器架构
- 与 `refactor-interceptor-invocation` 变更保持一致的架构模式
