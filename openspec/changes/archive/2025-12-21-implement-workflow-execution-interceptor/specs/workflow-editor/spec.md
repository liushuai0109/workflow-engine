# workflow-editor 增量规范

本文件定义了工作流执行拦截器(Workflow Execution Interceptor)功能对 workflow-editor 规范的增量变更。

---

## ADDED Requirements

### Requirement: 拦截器前端服务

系统 MUST 提供前端服务,封装与后端拦截器 API 的交互。

#### Scenario: 初始化拦截执行

- **当** 调用 `interceptorService.initializeIntercept(workflowId, mockData, initialVariables, bpmnXml)` 时
- **则** 系统应发送 `POST /api/interceptor/workflows/:workflowId/execute` 请求
- **并且** 请求体应包含:
  - `mockData`: Mock 数据配置(按节点 ID 映射)
  - `initialVariables`: 初始变量(可选)
  - `bpmnXml`: BPMN XML(可选)
- **并且** 成功响应应返回 `InterceptSession` 对象,包含:
  - `sessionId`: 会话 ID
  - `instanceId`: 实例 ID
  - `workflowId`: 工作流 ID
  - `status`: 实例状态
  - `currentNodeIds`: 当前节点 ID 列表
  - `variables`: 变量对象

#### Scenario: 触发节点继续执行

- **当** 调用 `interceptorService.triggerNode(sessionId, instanceId, request)` 时
- **并且** `request` 包含:
  - `nodeId`: 要触发的节点 ID
  - `businessParams`: 业务参数(可选)
- **则** 系统应发送 `POST /api/interceptor/instances/:instanceId/trigger?sessionId=:sessionId` 请求
- **并且** 成功响应应返回 `TriggerNodeResult` 对象,包含:
  - `result`: 执行结果(`ExecuteResult`)
  - `executionLog`: 执行日志数组

#### Scenario: 获取会话信息

- **当** 调用 `interceptorService.getSession(sessionId)` 时
- **则** 系统应发送 `GET /api/interceptor/sessions/:sessionId` 请求
- **并且** 成功响应应返回会话信息

#### Scenario: 获取执行日志

- **当** 调用 `interceptorService.getExecutionLog(sessionId)` 时
- **则** 系统应发送 `GET /api/interceptor/sessions/:sessionId/log` 请求
- **并且** 成功响应应返回执行日志数组
- **并且** 每个日志条目应包含:
  - `timestamp`: 时间戳
  - `operation`: 操作名称
  - `isMocked`: 是否使用 Mock 数据
  - `output`: 输出数据(可选)
  - `error`: 错误信息(可选)

#### Scenario: 重置执行

- **当** 调用 `interceptorService.resetExecution(sessionId)` 时
- **则** 系统应发送 `POST /api/interceptor/sessions/:sessionId/reset` 请求
- **并且** 成功响应应清理本地会话状态

---

### Requirement: 拦截器控制面板

系统 MUST 提供拦截器控制面板组件,支持初始化拦截执行、触发节点、查看日志和重置。

#### Scenario: 显示会话信息

- **当** 拦截会话已创建时
- **则** 控制面板应显示以下信息:
  - Session ID
  - Instance ID
  - 实例状态(Status badge)
  - 当前节点 ID 列表(Node chips)
- **并且** 当前节点应在 BPMN 图中高亮显示

#### Scenario: Mock 数据配置编辑器

- **当** 用户编辑 Mock 数据配置时
- **则** 系统应提供 JSON 编辑器,支持:
  - 语法高亮
  - 自动缩进
  - 错误提示
- **并且** 应提供配置示例,格式如下:
  ```json
  {
    "ServiceTask:CheckBalance": {
      "statusCode": 200,
      "body": { "balance": 5000, "sufficient": true }
    },
    "UserTask:ApprovalTask": {
      "statusCode": 200,
      "body": { "approved": true, "approver": "manager@company.com" }
    }
  }
  ```
- **并且** 在会话创建后,编辑器应禁用(disabled)

#### Scenario: 初始化拦截执行按钮

- **当** 用户点击"初始化拦截执行"按钮时
- **并且** 尚未创建会话时
- **则** 系统应:
  - 解析 Mock 数据配置 JSON
  - 调用 `interceptorService.initializeIntercept()`
  - 创建拦截会话
  - 高亮起始节点
  - 加载当前节点信息
- **并且** 如果 JSON 解析失败,应显示错误提示
- **并且** 如果没有选择工作流,应提示用户先选择工作流

#### Scenario: 触发下一步按钮

- **当** 用户点击"触发下一步"按钮时
- **并且** 会话已创建且状态不是 `completed` 时
- **并且** `currentNodeIds` 不为空时
- **则** 系统应:
  - 获取第一个当前节点 ID
  - 调用 `interceptorService.triggerNode()`
  - 更新会话状态
  - 更新执行日志
  - 高亮新的当前节点
  - 加载新节点信息
  - 显示执行结果
- **并且** 如果没有会话或已完成,按钮应禁用

#### Scenario: 查看/隐藏日志按钮

- **当** 用户点击"查看日志"按钮时
- **则** 系统应显示执行日志面板
- **并且** 日志面板应显示所有执行日志条目

- **当** 用户再次点击"隐藏日志"按钮时
- **则** 系统应隐藏执行日志面板

#### Scenario: 重置按钮

- **当** 用户点击"重置"按钮时
- **并且** 会话已创建时
- **则** 系统应:
  - 调用 `interceptorService.resetExecution()`
  - 清空会话状态
  - 清空执行日志
  - 清空当前节点信息
  - 清除节点高亮
- **并且** 如果没有会话,按钮应禁用

---

### Requirement: 当前节点信息显示

系统 MUST 显示当前执行节点的详细信息,包括节点类型、是否自动推进、交互界面。

#### Scenario: 显示节点基本信息

- **当** 工作流执行到某个节点时
- **则** 控制面板应显示:
  - 节点 ID
  - 节点类型(带颜色标识的 badge)
  - 是否自动推进(显示"是"或"否(需手动触发)")

#### Scenario: UserTask 表单显示

- **当** 当前节点类型为 `userTask` 时
- **则** 控制面板应显示用户任务表单,包含:
  - 表单标题:"用户任务表单"
  - 动态表单字段(根据节点配置 `formFields`)
  - "完成任务"按钮
- **并且** 每个表单字段应包含:
  - `label`: 字段标签
  - `name`: 字段名称
  - `type`: 输入类型(text, number, checkbox 等)
  - `placeholder`: 占位符文本

#### Scenario: UserTask 完成任务

- **当** 用户填写 UserTask 表单并点击"完成任务"按钮时
- **则** 系统应:
  - 收集表单数据
  - 调用 `interceptorService.triggerNode()`,传递 `businessParams` 为表单数据
  - 更新会话状态
  - 更新执行日志
  - 清空表单数据
  - 高亮新的当前节点

#### Scenario: EventBasedGateway 事件选择显示

- **当** 当前节点类型为 `eventBasedGateway` 时
- **则** 控制面板应显示事件选择界面,包含:
  - 标题:"选择触发事件"
  - 事件选项列表(根据节点配置 `events`)
  - 每个事件的触发按钮

#### Scenario: EventBasedGateway 触发事件

- **当** 用户点击某个事件的触发按钮时
- **则** 系统应:
  - 调用 `interceptorService.triggerNode()`,传递 `businessParams` 包含:
    - `eventId`: 事件 ID
    - `eventName`: 事件名称
    - `eventData`: 事件数据
  - 更新会话状态
  - 更新执行日志
  - 高亮新的当前节点

---

### Requirement: 执行日志面板

系统 MUST 提供执行日志面板,显示所有拦截执行的详细日志。

#### Scenario: 日志条目显示

- **当** 执行日志面板打开时
- **则** 系统应显示所有日志条目,每个条目包含:
  - 时间戳(格式化为本地时间)
  - 操作名称
  - Mock/Real 标识(带颜色的 badge)
  - 输出数据(可展开查看 JSON)
  - 错误信息(如果有)

#### Scenario: Mock 调用标识

- **当** 日志条目的 `isMocked` 为 `true` 时
- **则** 系统应:
  - 显示绿色 "MOCKED" badge
  - 日志条目左边框为绿色

#### Scenario: Real 调用标识

- **当** 日志条目的 `isMocked` 为 `false` 时
- **则** 系统应:
  - 显示蓝色 "REAL" badge
  - 日志条目左边框为蓝色

#### Scenario: 错误日志标识

- **当** 日志条目包含 `error` 字段时
- **则** 系统应:
  - 日志条目左边框为红色
  - 日志条目背景为浅红色
  - 显示错误消息

#### Scenario: 日志滚动

- **当** 日志条目数量超过面板高度时
- **则** 系统应提供垂直滚动条
- **并且** 最大高度应限制为 400px

---

### Requirement: 节点高亮联动

系统 MUST 在 BPMN 图中高亮当前执行节点,与拦截器控制面板状态联动。

#### Scenario: 高亮当前节点

- **当** 拦截会话的 `currentNodeIds` 更新时
- **则** 系统应在 BPMN 图中高亮这些节点
- **并且** 应使用特殊颜色或边框标识
- **并且** 应清除之前高亮的节点

#### Scenario: 清除高亮

- **当** 用户点击"重置"按钮时
- **或者** 工作流执行完成时
- **则** 系统应清除所有节点高亮

---

## MODIFIED Requirements

### Requirement: BPMN 编辑器页面集成拦截器控制面板

系统 MUST 在 BPMN 编辑器页面集成拦截器控制面板,替换或共存旧的 Mock 控制面板。

#### Scenario: 控制面板布局

- **当** 用户打开 BPMN 编辑器页面时
- **则** 系统应在右侧面板或底部面板显示拦截器控制面板
- **并且** 控制面板应包含以下区域:
  - 会话信息区
  - Mock 数据配置区
  - 控制按钮区
  - 当前节点信息区
  - 执行日志面板(可折叠)

#### Scenario: 向后兼容

- **当** 系统存在旧的 Mock 控制面板时
- **则** 新的拦截器控制面板应:
  - 使用不同的组件名称(`InterceptorControlPanel.vue`)
  - 使用不同的 API 端点(`/api/interceptor/*`)
  - 可与旧面板共存(通过选项卡切换)
- **并且** 应在文档中标记旧面板为 deprecated

---

## Implementation Notes

### 前端文件结构

```
client/src/
├── services/
│   └── interceptorService.ts      # 拦截器服务
├── components/
│   └── InterceptorControlPanel.vue # 控制面板组件
└── types/
    └── interceptor.ts              # TypeScript 类型定义
```

### TypeScript 类型定义

```typescript
// InterceptSession
export interface InterceptSession {
  sessionId: string
  instanceId: string
  workflowId: string
  status: string
  currentNodeIds: string[]
  variables: Record<string, any>
}

// TriggerNodeRequest
export interface TriggerNodeRequest {
  nodeId: string
  businessParams?: Record<string, any>
}

// TriggerNodeResult
export interface TriggerNodeResult {
  result: ExecuteResult
  executionLog: ExecutionLogEntry[]
}

// ExecutionLogEntry
export interface ExecutionLogEntry {
  timestamp: string
  operation: string
  input?: any
  output?: any
  isMocked: boolean
  error?: string
}

// InitializeInterceptRequest
export interface InitializeInterceptRequest {
  startNodeId?: string
  initialVariables?: Record<string, any>
  mockData?: Record<string, NodeMockData>
  bpmnXml?: string
}

// NodeMockData
export interface NodeMockData {
  statusCode: number
  body: any
  headers?: Record<string, string>
}
```

### 样式指南

- Session 信息卡片: 白色背景,圆角 6px,阴影
- Status badge:
  - `ready`: 黄色背景 (#fff3cd)
  - `running`: 蓝色背景 (#d1ecf1)
  - `completed`: 绿色背景 (#d4edda)
  - `failed`: 红色背景 (#f8d7da)
- Node chips: 蓝色背景 (#007bff),白色文字
- Mock badge: 绿色背景 (#28a745)
- Real badge: 蓝色背景 (#007bff)
- 按钮:
  - 主要按钮: 蓝色 (#007bff)
  - 成功按钮: 绿色 (#28a745)
  - 信息按钮: 青色 (#17a2b8)
  - 警告按钮: 黄色 (#ffc107)

### 性能要求

- 控制面板渲染时间应 < 100ms
- Mock 数据 JSON 编辑器应支持至少 10KB 的数据
- 日志面板应使用虚拟滚动,支持至少 1000 条日志
- 节点高亮应有平滑过渡动画(< 300ms)
