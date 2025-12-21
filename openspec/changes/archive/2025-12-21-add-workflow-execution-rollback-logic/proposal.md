# 变更：添加工作流执行回滚逻辑和自动流转机制

## Why

当前工作流执行引擎缺少回滚机制，无法处理从非当前节点执行的情况。同时，执行完节点后需要自动流转到下一个节点，但某些特殊节点类型（UserTask、IntermediateCatchEvent、EventBasedGateway）应该暂停执行，等待外部事件或用户操作。

## What Changes

- **ADDED**: 执行前回滚检查机制，根据 from_node 类型判断是否需要回滚
- **ADDED**: 边界事件节点的回滚判断逻辑（HandleBoundaryEventRollback）
- **ADDED**: 中间捕获事件节点的回滚判断逻辑（HandleIntermediateCatchEventRollback）
- **ADDED**: 普通节点的回滚判断逻辑（HandleOtherNodeRollback）
- **ADDED**: can_fallback 检查机制，在执行回滚前验证是否允许回滚
- **MODIFIED**: 节点执行后的自动流转逻辑，排除 UserTask、IntermediateCatchEvent、EventBasedGateway 节点类型
- **ADDED**: 跳步骤异常处理，当 from_node_id 在 current_node_ids 之后时抛出异常

## Impact

- **受影响的规范**：`backend-server` 规范中的工作流执行引擎相关需求
- **受影响的代码**：
  - `server/internal/services/workflow_engine.go` - 执行引擎核心逻辑
  - `server/internal/parser/bpmn_parser.go` - 需要添加 IntermediateCatchEvent、EventBasedGateway、BoundaryEvent 节点类型支持
  - `server/internal/models/node.go` - 需要添加节点属性（如 attached_node_id、can_fallback）
- **新增依赖**：无
- **破坏性变更**：无（向后兼容）


