# 实施任务清单

## 1. 实施

### Phase 1: 节点类型扩展
- [x] 1.1 在 `bpmn_parser.go` 中添加 IntermediateCatchEvent 节点类型常量
- [x] 1.2 在 `bpmn_parser.go` 中添加 EventBasedGateway 节点类型常量
- [x] 1.3 在 `bpmn_parser.go` 中添加 BoundaryEvent 节点类型常量
- [x] 1.4 在 `bpmn_parser.go` 中添加对应的 XML 解析逻辑
- [x] 1.5 在 `models.Node` 中添加 `AttachedNodeId` 字段（用于边界事件）
- [x] 1.6 在 `models.Node` 中添加 `CanFallback` 字段（用于回滚检查）

### Phase 2: 回滚判断逻辑实现
- [x] 2.1 实现 `HandleBoundaryEventRollback` 函数
  - [x] 2.1.1 检查 attached_node_id 是否为空，为空则抛异常
  - [x] 2.1.2 检查 attached_node_id 是否在 current_node_ids 中，在则返回（不回滚）
  - [x] 2.1.3 实现边界事件回滚逻辑（无论前后都回滚）
- [x] 2.2 实现 `HandleIntermediateCatchEventRollback` 函数
  - [x] 2.2.1 检查 from_node_id 是否在 current_node_ids 中
  - [x] 2.2.2 检查前置节点是否为 EVENT_BASED_GATEWAY 且在 current_node_ids 中
  - [x] 2.2.3 实现中间捕获事件回滚逻辑
  - [x] 2.2.4 实现跳步骤异常检查
- [x] 2.3 实现 `HandleOtherNodeRollback` 函数
  - [x] 2.3.1 检查 from_node_id 是否在 current_node_ids 中
  - [x] 2.3.2 实现普通节点回滚逻辑
  - [x] 2.3.3 实现跳步骤异常检查
- [x] 2.4 实现 `CheckAndHandleRollback` 主函数，根据节点类型调用相应的处理函数
- [x] 2.5 在回滚执行前添加 `can_fallback` 检查

### Phase 3: 自动流转逻辑修改
- [x] 3.1 修改 `advanceToNextNode` 函数，添加节点类型检查
- [x] 3.2 对于 UserTask、IntermediateCatchEvent、EventBasedGateway 节点，不自动流转
- [x] 3.3 更新执行引擎主流程，在执行前调用回滚检查

### Phase 4: 集成和测试
- [x] 4.1 在 `ExecuteFromNode` 函数开始处调用 `CheckAndHandleRollback`
- [x] 4.2 编写单元测试覆盖所有回滚场景
- [x] 4.3 编写单元测试覆盖自动流转逻辑
- [x] 4.4 编写集成测试验证完整流程
- [x] 4.5 更新相关文档

## 2. 验证

- [x] 2.1 运行单元测试：`cd server && go test ./internal/...`
- [x] 2.2 运行集成测试验证回滚逻辑
- [x] 2.3 验证边界事件回滚场景
- [x] 2.4 验证中间捕获事件回滚场景
- [x] 2.5 验证普通节点回滚场景
- [x] 2.6 验证跳步骤异常场景
- [x] 2.7 验证自动流转排除逻辑

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1 | 6 | 2-3 天 | 已完成 | 无 |
| Phase 2 | 5 | 3-4 天 | 已完成 | Phase 1 |
| Phase 3 | 3 | 1-2 天 | 已完成 | Phase 2 |
| Phase 4 | 5 | 2-3 天 | 已完成 | Phase 3 |
| **总计** | **19** | **8-12 天** | **已完成** | |

