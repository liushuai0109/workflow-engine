# Change: Enforce UserTask BoundaryEvent Constraint

## Why

当前系统允许 UserTask 直接连接到下一个节点，这违反了 BPMN 最佳实践。UserTask 应该通过 BoundaryEvent 来表示不同的完成结果（如审批通过、审批拒绝、超时等），使流程图的语义更加清晰和可维护。

**问题**：
- UserTask 可以直接创建 outgoing 连线，缺少对任务完成状态的明确建模
- LLM 生成的流程图缺少 BoundaryEvent 支持，无法表达复杂的任务完成场景
- 没有验证机制确保 BPMN 结构符合约束规则

**机会**：
- 通过强制约束提升流程图质量和可读性
- 使 LLM 能够生成更规范的 BPMN 流程图
- 为未来的工作流引擎提供清晰的任务完成状态建模

## What Changes

**核心约束**：UserTask 的所有 outgoing 连线必须从 BoundaryEvent 出发，不能直接从 UserTask 连线到下一个节点。

**变更列表**：
1. **ADDED**: LLM 工具 - createBoundaryEvent 工具定义
2. **ADDED**: 前端编辑器操作 - createBoundaryEvent 方法实现
3. **ADDED**: 后端验证逻辑 - validateUserTaskConstraints 函数
4. **MODIFIED**: LLM 系统提示词 - 添加 UserTask 约束规则说明
5. **ADDED**: 前端验证机制 - 保存时验证 BPMN 结构
6. **ADDED**: 测试用例 - 单元测试、E2E 测试

**用户可见变化**：
- LLM 在生成包含 UserTask 的流程图时，会自动创建 BoundaryEvent
- 用户尝试保存不符合约束的 BPMN 时，会收到明确的错误提示
- 后端拒绝接受不符合约束的 BPMN XML

**Breaking Changes**：
- **BREAKING**: 现有的直接从 UserTask 连线的 BPMN 将无法保存和执行（需要用户手动修复）

## Impact

**受影响的规范**：
- `ai-integration` - 新增 createBoundaryEvent 工具，修改系统提示词
- `backend-server` - 新增 BPMN 验证逻辑
- `workflow-editor` - 新增前端验证和 BoundaryEvent 创建功能

**受影响的代码**：
- `client/src/services/llmTools.ts` - 添加新工具定义
- `client/src/services/editorOperationService.ts` - 实现 createBoundaryEvent 方法
- `client/src/prompts/claudeBpmnSystemPrompt.ts` - 更新提示词
- `client/src/prompts/editorSystemPrompt.ts` - 更新提示词
- `client/src/pages/BpmnEditorPage.vue` - 添加验证逻辑
- `server/internal/parser/bpmn_parser.go` - 添加验证函数

**受影响的用户**：
- 所有使用 LLM 生成 BPMN 的用户（自动适配，无需手动操作）
- 现有流程图包含直接 UserTask 连线的用户（需要手动添加 BoundaryEvent 修复）

**迁移策略**：
- 导入时只警告，不阻止（给用户修复时间）
- 保存时强制验证（确保新保存的 BPMN 符合规范）
- 未来可提供"一键修复"工具自动添加 BoundaryEvent

**风险**：
- LLM 可能不完全遵守约束（缓解：多层验证机制）
- 用户学习曲线（缓解：清晰的错误提示和文档）
- 现有流程图需要修复（缓解：分阶段实施，先警告后强制）
