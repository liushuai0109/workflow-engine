# Technical Design: UserTask BoundaryEvent Constraint

## Context

**背景**：
当前 BPMN Editor 支持创建 UserTask 节点，但缺少对 BoundaryEvent 的支持。这导致：
1. LLM 无法生成包含边界事件的流程图
2. 用户任务的完成状态建模不清晰（无法区分"审批通过"vs"审批拒绝"）
3. 缺少对 BPMN 结构的验证机制

**约束**：
- 必须保持与 bpmn-js 的兼容性
- 不能破坏现有的编辑器功能
- LLM 提示词限制（需要简洁清晰）
- 后端已支持 BoundaryEvent 解析（`server/internal/parser/bpmn_parser.go`）

**利益相关者**：
- LLM 集成用户：需要 LLM 自动生成符合规范的流程图
- 流程图设计者：需要清晰的任务完成状态建模
- 工作流引擎：需要规范的 BPMN 结构用于执行

## Goals / Non-Goals

### Goals
1. 实现 createBoundaryEvent LLM 工具，让 LLM 能够创建边界事件
2. 强制 UserTask 约束：所有 outgoing 必须从 BoundaryEvent 出发
3. 提供多层验证机制（LLM 提示词、前端验证、后端验证）
4. 清晰的错误提示和修复建议

### Non-Goals
1. 自动修复现有不符合约束的 BPMN（未来功能）
2. 支持其他节点类型的边界事件约束（仅限 UserTask）
3. 可视化边界事件位置拖拽调整（使用 bpmn-js 默认行为）
4. 边界事件高级配置（如 timer、message 等类型，暂不支持）

## Decisions

### 决策 1：BoundaryEvent 创建机制

**选择**：使用 bpmn-js 的标准 API（`modeling.createShape` + `{ attach: true }`）

**理由**：
- bpmn-js 已提供完整的 BoundaryEvent 支持
- 使用标准 API 确保与未来版本的兼容性
- 自动维护 `attachedToRef` 引用关系

**考虑的替代方案**：
- ❌ 直接修改 XML：复杂且容易出错，不推荐
- ❌ 自定义渲染器：过度工程，增加维护成本

### 决策 2：验证层级

**选择**：三层验证（LLM 提示词 + 前端验证 + 后端验证）

**理由**：
- **LLM 提示词**：第一道防线，引导 LLM 生成正确结构
- **前端验证**：用户交互反馈，在保存前阻止错误
- **后端验证**：最终防线，确保数据完整性

**考虑的替代方案**：
- ❌ 仅前端验证：无法防止直接 API 调用绕过验证
- ❌ 仅后端验证：用户体验差，缺少即时反馈

### 决策 3：BoundaryEvent 位置计算

**选择**：提供 4 个预设位置（top、bottom、left、right）

**理由**：
- 覆盖常见使用场景
- 简化 LLM 决策（无需计算精确坐标）
- 用户可以手动调整（使用 bpmn-js 拖拽功能）

**坐标计算公式**：
```typescript
// 节点中心坐标
centerX = element.x + element.width / 2
centerY = element.y + element.height / 2

// 4 个位置
bottom: { x: centerX, y: element.y + element.height }  // 默认，最常用
top:    { x: centerX, y: element.y }
left:   { x: element.x, y: centerY }
right:  { x: element.x + element.width, y: centerY }
```

**考虑的替代方案**：
- ❌ 自动智能布局：复杂度高，收益有限
- ❌ 8 个位置（含 4 个角）：过度设计

### 决策 4：cancelActivity 默认值

**选择**：由用户在每次创建时明确指定，不设置默认值（工具定义中不含 default）

**理由**：
- 中断型和非中断型有不同的语义，不应该隐式决定
- 强制 LLM 或用户思考业务逻辑（审批通过通常是中断型，通知通常是非中断型）
- 明确的参数提升可读性

**考虑的替代方案**：
- ❌ 默认 true（中断型）：可能不符合某些业务场景（如通知）
- ❌ 默认 false（非中断型）：不符合 BPMN 标准（标准默认是 true）

### 决策 5：attachedToRef 引用方式

**选择**：使用 businessObject 引用，不使用 ID 字符串

```typescript
// ✅ 正确
boundaryEventBO.attachedToRef = attachedElement.businessObject

// ❌ 错误
boundaryEventBO.attachedToRef = attachedElement.id
```

**理由**：
- bpmn-js 内部使用对象引用维护关系
- 自动生成正确的 XML（`<bpmn:boundaryEvent attachedToRef="UserTask_1">`）
- 符合 bpmn-js 的最佳实践

## Technical Architecture

### 组件交互流程

```
用户输入（"创建审批流程"）
    ↓
LLM (claudeLlmService)
    ↓
调用 createBoundaryEvent 工具
    ↓
claudeEditorBridge（工具处理器）
    ↓
editorOperationService.createBoundaryEvent()
    ├─ 1. 获取附加节点（elementRegistry.get）
    ├─ 2. 计算位置（calculateBoundaryPosition）
    ├─ 3. 创建 BO（bpmnFactory.create）
    ├─ 4. 创建形状（elementFactory.createShape）
    └─ 5. 添加到画布（modeling.createShape）
    ↓
bpmn-js 渲染 BoundaryEvent
    ↓
用户保存
    ↓
BpmnEditorPage.validateUserTaskConstraints()
    ├─ ✅ 通过 → 保存到后端
    └─ ❌ 失败 → 显示错误提示
    ↓
后端（bpmn_parser.ParseBPMN）
    ├─ 解析 XML
    ├─ validateUserTaskConstraints()
    ├─ ✅ 通过 → 保存到数据库
    └─ ❌ 失败 → 返回 400 错误
```

### 关键数据结构

**LLM 工具定义**：
```typescript
{
  name: 'createBoundaryEvent',
  parameters: {
    id: string             // 必需
    name?: string
    attachedToRef: string  // 必需
    cancelActivity?: boolean
    position?: 'top'|'bottom'|'left'|'right'
    documentation?: string
  }
}
```

**BPMN XML 结构**：
```xml
<bpmn:userTask id="UserTask_1" name="审批">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <!-- ❌ 错误：不能有 outgoing -->
</bpmn:userTask>

<bpmn:boundaryEvent id="BoundaryEvent_Approved"
                    name="通过"
                    attachedToRef="UserTask_1"
                    cancelActivity="true">
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
</bpmn:boundaryEvent>

<bpmn:sequenceFlow id="Flow_2"
                   sourceRef="BoundaryEvent_Approved"
                   targetRef="EndEvent_1" />
```

## Risks / Trade-offs

### 风险 1：LLM 不遵守约束

**风险**：即使提示词强调，LLM 仍可能直接从 UserTask 创建连线

**缓解**：
1. 提示词多处重复（系统提示词、工具描述、示例）
2. 使用 ✅ ❌ emoji 强化对比
3. 前端验证作为最后防线

### 风险 2：现有流程图破坏

**风险**：现有包含直接 UserTask outgoing 的 BPMN 无法保存

**缓解**：
1. 分阶段实施：导入时警告，保存时强制
2. 清晰的错误消息："需要添加 BoundaryEvent"
3. 未来提供"一键修复"工具

### 风险 3：性能问题

**风险**：大型流程图（100+ 节点）的验证性能

**缓解**：
1. 只验证 UserTask，其他跳过（O(n) 复杂度）
2. 预构建 BoundaryEvent 索引（O(1) 查找）
3. 早期退出优化

**权衡**：
- 复杂性 vs 规范性：增加了实现复杂度，但提升了 BPMN 质量
- 灵活性 vs 约束：限制了自由度，但减少了错误使用
- 学习曲线 vs 长期收益：初期需要学习，长期降低维护成本

## Migration Plan

### 阶段 1：实施（4-4.5 天）
1. 按 tasks.md 顺序实施所有功能
2. 确保所有测试通过

### 阶段 2：软发布（1 周）
1. 部署到测试环境
2. 内部用户测试和反馈
3. 修复发现的问题

### 阶段 3：全量发布
1. 更新用户文档
2. 发布迁移指南
3. 监控错误日志

### 回滚计划
如果发现严重问题：
1. 临时禁用后端验证（注释掉 validateUserTaskConstraints 调用）
2. 前端显示警告而不是阻止保存
3. 修复问题后重新启用

## Open Questions

1. **Q**: 是否需要支持多个 BoundaryEvent 附加到同一个 UserTask？
   **A**: 是的，已在设计中支持（如"通过"和"拒绝"两个 BoundaryEvent）

2. **Q**: BoundaryEvent 的视觉样式是否需要自定义？
   **A**: 否，使用 bpmn-js 默认样式即可

3. **Q**: 是否需要支持 BoundaryEvent 的拖拽调整位置？
   **A**: bpmn-js 默认支持，无需额外实现

4. **Q**: 导入不符合约束的 BPMN 时，是否应该自动添加 BoundaryEvent？
   **A**: 第一版不支持，仅显示警告；未来可作为独立功能实现
