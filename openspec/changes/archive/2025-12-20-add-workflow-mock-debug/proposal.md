# 变更：添加工作流 Mock 和 Debug 功能

## 为什么

在开发和测试工作流时，操作员需要能够：
1. **Mock 功能**：在不连接真实外部服务的情况下，模拟工作流执行，用于快速验证流程逻辑和测试不同执行路径
2. **Debug 功能**：调试工作流执行过程，查看执行状态、变量值、节点输入输出，支持单步执行和断点，帮助定位问题

这些功能对于工作流的开发、测试和问题排查至关重要。

## 变更内容

- **ADDED**: 工作流 Mock 执行功能
  - 支持配置每个节点的 mock 响应数据
  - 支持模拟不同的执行路径（网关分支）
  - 支持模拟延迟和错误场景
  - 在前端编辑器中可视化 mock 执行过程

- **ADDED**: 工作流 Debug 功能
  - 单步执行工作流节点
  - 查看执行上下文（变量、状态、历史）
  - 设置断点暂停执行
  - 查看每个节点的输入输出数据
  - 执行历史时间线视图
  - 变量值实时监控

- **ADDED**: Mock 数据管理
  - 保存和加载 mock 配置
  - 支持为不同节点配置不同的 mock 响应
  - Mock 配置与工作流关联存储

- **ADDED**: Debug 控制面板
  - 执行控制（开始、暂停、继续、停止）
  - 变量监视面板
  - 调用栈视图
  - 日志输出面板

## 影响

- **受影响的规范**：
  - `workflow-editor` - 添加 mock 和 debug UI 组件
  - `backend-server` - 添加 mock 执行引擎和 debug API

- **受影响的代码**：
  - `client/src/components/BpmnEditor.vue` - 添加 mock/debug 控制面板
  - `client/src/services/` - 添加 mock 和 debug 服务
  - `server/internal/handlers/` - 添加 mock/debug API 端点
  - `server/internal/services/` - 添加 mock 执行引擎

