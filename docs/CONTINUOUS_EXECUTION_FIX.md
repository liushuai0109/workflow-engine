# 工作流引擎持续执行修复

## 问题描述

在之前的 `ExecuteFromNode` 实现中，当执行一个节点后，只会**计算**下一个节点的 ID 并更新实例状态，但**不会实际执行**该节点。

这导致了一个问题：如果流程中有多个连续的 `shouldAutoAdvance=true` 的节点，需要多次调用 `ExecuteFromNode` 才能完成执行。

### 示例场景

假设有如下流程：
```
StartEvent -> ServiceTask1 -> ExclusiveGateway -> ServiceTask2 -> UserTask
```

**之前的行为：**
1. 调用 `ExecuteFromNode(StartEvent)` → 执行 StartEvent，更新 currentNodeIds 为 `[ServiceTask1]`
2. 调用 `ExecuteFromNode(ServiceTask1)` → 执行 ServiceTask1，更新 currentNodeIds 为 `[ExclusiveGateway]`
3. 调用 `ExecuteFromNode(ExclusiveGateway)` → 执行 ExclusiveGateway，更新 currentNodeIds 为 `[ServiceTask2]`
4. 调用 `ExecuteFromNode(ServiceTask2)` → 执行 ServiceTask2，更新 currentNodeIds 为 `[UserTask]`

需要 **4 次调用** 才能到达 UserTask。

**期望的行为：**
1. 调用 `ExecuteFromNode(StartEvent)` → 自动执行 StartEvent → ServiceTask1 → ExclusiveGateway → ServiceTask2，停在 UserTask

只需 **1 次调用** 就能到达 UserTask。

## 解决方案

在 `workflow_engine.go:198-293` 中实现了一个执行循环，持续执行节点直到遇到以下任一情况：

1. **遇到不应自动推进的节点**：UserTask、IntermediateCatchEvent、EventBasedGateway
2. **到达 EndEvent**
3. **没有下一个节点**
4. **执行出错**

### 核心逻辑

```go
// 循环执行节点，直到遇到不能自动推进的节点
for {
    // 6.1 执行当前节点（ServiceTask、UserTask 等）

    // 6.2 检查是否应该自动推进
    if !s.shouldAutoAdvance(currentNode.Type) {
        // 停在当前节点（UserTask、IntermediateCatchEvent、EventBasedGateway）
        break
    }

    // 6.3 推进到下一个节点
    nextNodeIds = s.advanceToNextNode(...)

    // 6.4 检查是否有下一个节点
    if len(nextNodeIds) == 0 {
        break
    }

    // 6.5 检查下一个节点是否是 EndEvent
    if nextNode.Type == parser.NodeTypeEndEvent {
        break
    }

    // 6.6 继续执行下一个节点
    currentNode = &nextNode
    currentNodeId = nextNodeIds[0]
}
```

### shouldAutoAdvance 规则

根据节点类型决定是否自动推进：

| 节点类型 | shouldAutoAdvance | 说明 |
|---------|-------------------|------|
| UserTask | ❌ false | 需要用户操作，等待外部输入 |
| IntermediateCatchEvent | ❌ false | 等待外部事件 |
| EventBasedGateway | ❌ false | 等待事件分支选择 |
| ServiceTask | ✅ true | 自动执行并推进 |
| ExclusiveGateway | ✅ true | 自动评估条件并推进 |
| StartEvent | ✅ true | 自动推进 |
| EndEvent | ✅ true | 标记流程结束 |

## 影响

### 性能提升
- 减少了不必要的数据库查询和更新
- 一次调用完成多个节点的执行

### 用户体验改善
- 调用者无需关心流程中间的自动节点
- 只需在需要人工干预的节点处等待

### 示例对比

**修复前：**
```go
// 需要多次调用
result1 := ExecuteFromNode(instanceId, "start", params)
result2 := ExecuteFromNode(instanceId, "service1", nil)
result3 := ExecuteFromNode(instanceId, "gateway", nil)
result4 := ExecuteFromNode(instanceId, "service2", nil)
// 现在到达 UserTask
```

**修复后：**
```go
// 只需一次调用
result := ExecuteFromNode(instanceId, "start", params)
// 自动执行到 UserTask 并停止
```

## 相关文件

- `server/internal/services/workflow_engine.go:198-293` - 主要修改
- `server/internal/services/workflow_engine.go:567-579` - `shouldAutoAdvance` 方法

## 测试建议

创建测试流程验证以下场景：

1. **连续 ServiceTask**：验证多个 ServiceTask 能一次性执行完
2. **Gateway 后跟 ServiceTask**：验证条件判断后能继续执行
3. **停在 UserTask**：验证在 UserTask 处正确停止
4. **到达 EndEvent**：验证流程能正确完成

## 注意事项

1. **businessParams 清空**：在循环中，只有第一个节点使用外部传入的 `businessParams`，后续节点自动推进时不需要外部参数
2. **日志记录**：每个节点的执行都有详细日志，便于调试
3. **错误处理**：任何节点执行失败都会立即中断循环并返回错误
