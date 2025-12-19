# 变更：添加 BPMN 解析功能

## 为什么

当前后端服务缺少将 BPMN XML 内容解析为结构化数据的能力。为了支持工作流的存储、查询和分析，需要实现一个 `parseBPMN` 方法，将 BPMN XML 字符串转换为 `WorkflowDefinition` 结构体，以便后续的业务逻辑处理。

## 变更内容

- 添加 `parseBPMN` 方法，接受 BPMN XML 字符串作为输入
- 解析 BPMN XML 并提取以下信息：
  - 节点（Node）：包括开始事件、结束事件、任务、网关等
  - 序列流（SequenceFlow）：节点之间的连接关系
  - 消息（Message）：流程中定义的消息元素
  - 构建全局邻接表和反向邻接表，用于图遍历算法
- 返回 `WorkflowDefinition` 结构体，包含所有解析后的数据
- 支持标准的 BPMN 2.0 XML 格式（如 `examples/user-onboarding-with-lifecycle.bpmn`）

## 影响

- 受影响的规范：`backend-server` - 添加新的 BPMN 解析能力
- 受影响的代码：
  - `server/internal/models/workflow.go` - 已定义 `WorkflowDefinition` 结构
  - 需要创建新的解析器包或服务（如 `server/internal/parser/` 或 `server/internal/services/bpmn_parser.go`）
- 依赖：需要 Go XML 解析库（标准库 `encoding/xml` 或第三方库如 `github.com/beevik/etree`）

