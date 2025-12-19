# 实施任务清单

## 1. 实施

- [x] 1.1 创建 BPMN 解析器包结构
  - 创建 `server/internal/parser/` 目录
  - 创建 `bpmn_parser.go` 文件
  - 定义 `ParseBPMN` 函数签名

- [x] 1.2 实现 XML 解析基础
  - 使用 Go XML 解析库解析 BPMN XML
  - 处理 BPMN 命名空间（`http://www.omg.org/spec/BPMN/20100524/MODEL`）
  - 提取 `<bpmn:process>` 元素

- [x] 1.3 实现节点解析
  - 解析 `<bpmn:startEvent>` 元素，提取 ID、名称等信息
  - 解析 `<bpmn:endEvent>` 元素
  - 解析任务节点（`<bpmn:userTask>`, `<bpmn:serviceTask>` 等）
  - 解析网关节点（`<bpmn:exclusiveGateway>`, `<bpmn:parallelGateway>` 等）
  - 提取节点的 `incoming` 和 `outgoing` 序列流引用
  - 构建 `Nodes` 映射

- [x] 1.4 实现序列流解析
  - 解析 `<bpmn:sequenceFlow>` 元素
  - 提取 `sourceRef` 和 `targetRef`
  - 提取条件表达式（`<bpmn:conditionExpression>`）
  - 提取优先级（如果存在）
  - 构建 `SequenceFlows` 映射

- [x] 1.5 实现消息解析
  - 解析 `<bpmn:message>` 元素（如果存在）
  - 提取消息 ID 和名称
  - 构建 `Messages` 映射

- [x] 1.6 构建邻接表
  - 根据序列流构建全局邻接表（`AdjacencyList`）
  - 构建反向邻接表（`ReverseAdjacencyList`）
  - 处理跨流程边界的情况（子流程等）

- [x] 1.7 识别开始和结束事件
  - 识别所有开始事件节点 ID，填充 `StartEvents` 数组
  - 识别所有结束事件节点 ID，填充 `EndEvents` 数组

- [x] 1.8 错误处理
  - 处理无效的 XML 格式
  - 处理缺失必需元素的情况
  - 返回有意义的错误信息

- [x] 1.9 编写单元测试
  - 使用 `examples/user-onboarding-with-lifecycle.bpmn` 作为测试用例
  - 验证解析结果的正确性
  - 测试错误情况

- [ ] 1.10 集成到工作流服务
  - 在 `WorkflowService` 中使用 `parseBPMN` 方法
  - 更新创建工作流和更新工作流的逻辑（可选）

## 2. 验证

- [x] 2.1 运行单元测试，确保所有测试通过
- [x] 2.2 使用示例 BPMN 文件验证解析结果
- [x] 2.3 检查解析后的 `WorkflowDefinition` 结构完整性
- [x] 2.4 验证邻接表构建的正确性

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1 | 10 | 5-7 天 | - | 无 |
| Phase 2 | 4 | 1-2 天 | - | Phase 1 |

