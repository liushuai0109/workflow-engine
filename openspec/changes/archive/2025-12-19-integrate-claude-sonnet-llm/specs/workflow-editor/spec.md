# 工作流编辑器规范（变更）

## ADDED Requirements

### Requirement: Claude 驱动的智能工作流生成

工作流编辑器 SHALL 使用 Claude AI 自动生成高质量的 BPMN 工作流。

#### Scenario: 自然语言生成工作流

- **WHEN** 用户输入业务流程描述（如 "创建用户注册流程"）
- **THEN** 系统应当调用 Claude API 并传入优化的提示词
- **AND** Claude 应当通过 Tool Use 调用编辑器工具（createNode, createFlow）
- **AND** 生成的工作流应当布局合理，节点间距均匀
- **AND** 生成时间应当小于 30 秒

#### Scenario: 增量修改工作流

- **WHEN** 用户请求修改现有工作流（如 "在登录后添加验证步骤"）
- **THEN** 系统应当将当前工作流状态发送给 Claude
- **AND** Claude 应当理解现有结构并进行精准修改
- **AND** 修改应当不破坏原有流程的连贯性
- **AND** 修改后的工作流应当自动保存

#### Scenario: 流程优化建议

- **WHEN** 用户点击 "优化建议" 按钮
- **THEN** 系统应当分析当前工作流结构
- **AND** Claude 应当识别潜在问题（如重复节点、分支逻辑不清晰）
- **AND** Claude 应当提供 3-5 条优化建议
- **AND** 用户可选择应用建议，系统自动修改工作流

#### Scenario: 流程描述生成

- **WHEN** 用户选中一个复杂工作流
- **THEN** 系统应当调用 Claude 生成流程说明文档
- **AND** 说明应当包含：流程目的、各节点作用、分支逻辑、数据流
- **AND** 说明应当支持 Markdown 格式导出

### Requirement: 提示词优化

系统 SHALL 为 Claude 提供专门优化的提示词，提升生成质量。

#### Scenario: BPMN 编辑器提示词

- **WHEN** 调用 Claude 生成工作流
- **THEN** 系统应当使用 `packages/client/src/prompts/editorSystemPrompt.ts` 中的提示词
- **AND** 提示词应当包含：BPMN 元素说明、布局规则、工具使用示例
- **AND** 提示词应当强调布局质量（连线避开节点、标签不重叠）
- **AND** 提示词应当包含 Few-shot 示例

#### Scenario: 提示词版本管理

- **WHEN** 提示词需要更新
- **THEN** 系统应当保留历史版本
- **AND** 可以进行 A/B 测试对比不同版本效果
- **AND** 最佳版本应当自动推广到生产环境

### Requirement: AI 辅助调试

工作流编辑器 SHALL 提供 AI 辅助调试功能，帮助用户修复错误。

#### Scenario: 错误诊断

- **WHEN** 工作流验证失败
- **THEN** 系统应当将错误信息发送给 Claude
- **AND** Claude 应当解释错误原因（用通俗语言）
- **AND** Claude 应当提供修复建议
- **AND** 用户可选择自动修复，系统应用建议

#### Scenario: 性能分析

- **WHEN** 用户请求分析工作流性能
- **THEN** Claude 应当识别潜在瓶颈（如过长的流程、过多的分支）
- **AND** Claude 应当建议优化方案（如拆分子流程、合并节点）
- **AND** 性能分析报告应当可视化展示

### Requirement: BPMN 元素创建

系统 SHALL 支持 AI 驱动的 BPMN 元素创建和连线。

#### Scenario: AI 驱动的节点创建

- **WHEN** Claude 调用 `createNode` 工具
- **THEN** 系统应当验证参数（type, x, y, label）
- **AND** 节点应当在画布上创建
- **AND** 节点 ID 应当返回给 Claude 用于后续连线
- **AND** 如果节点重叠，系统应当自动调整位置

#### Scenario: AI 驱动的连线创建

- **WHEN** Claude 调用 `createFlow` 工具
- **THEN** 系统应当验证源节点和目标节点存在
- **AND** 连线应当自动布局，避开中间节点
- **AND** 连线标签应当自动定位，不与节点重叠
- **AND** 连线创建成功后返回确认给 Claude
