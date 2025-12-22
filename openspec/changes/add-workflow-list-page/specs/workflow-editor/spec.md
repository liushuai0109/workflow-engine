# workflow-editor 规范增量

## ADDED Requirements

### Requirement: 工作流列表页面

工作流编辑器 MUST 提供独立的工作流列表页面,展示数据库中保存的所有工作流,并支持打开和下载操作。

#### Scenario: 显示工作流列表

- **WHEN** 操作员访问 `/workflows` 路由
- **THEN** 系统应显示工作流列表页面
- **AND** 使用 `a-table` 或 `a-list` 组件展示工作流列表
- **AND** 列表包含以下列: 名称、描述、创建时间、更新时间、状态、操作
- **AND** 列表按创建时间倒序排列(最新的在前)
- **AND** 支持分页显示(如使用 `a-table`)

#### Scenario: 列表加载状态

- **WHEN** 工作流列表正在从后端加载
- **THEN** 显示 `a-spin` 加载状态
- **AND** 加载完成后显示列表内容

- **WHEN** 数据库中没有任何工作流
- **THEN** 显示 `a-empty` 空状态组件
- **AND** 提示用户"暂无工作流,点击创建新工作流"
- **AND** 提供"创建新工作流"按钮,导航到 `/editor`

#### Scenario: 打开工作流到编辑器

- **WHEN** 操作员点击列表项的"打开"按钮
- **THEN** 系统应导航到 `/editor/:workflowId` 路由
- **AND** 编辑器页面应加载该工作流的 BPMN XML
- **AND** 编辑器页面标题应显示工作流名称

#### Scenario: 从列表下载工作流

- **WHEN** 操作员点击列表项的"下载"按钮
- **THEN** 系统应直接下载该工作流的 BPMN XML 文件到本地
- **AND** 文件名格式为 `{workflowName}.bpmn`
- **AND** 如果工作流名称为空,使用 `workflow-{workflowId}.bpmn`

#### Scenario: 列表错误处理

- **WHEN** 加载工作流列表失败(网络错误或后端错误)
- **THEN** 显示错误提示 (`message.error("加载工作流列表失败")`)
- **AND** 提供"重试"按钮
- **AND** 列表区域显示错误状态

### Requirement: 工作流保存到数据库

工作流编辑器 MUST 支持将当前编辑的工作流保存到数据库,并区分创建和更新操作。

#### Scenario: 保存按钮状态

- **WHEN** 编辑器未加载任何流程图(`currentDiagram` 为空)
- **THEN** "Save" 按钮应处于禁用状态

- **WHEN** 编辑器加载了流程图
- **THEN** "Save" 按钮应处于可用状态

- **WHEN** 保存操作正在进行中
- **THEN** "Save" 按钮应显示加载状态(loading)
- **AND** 按钮文字显示"保存中..."

#### Scenario: 创建新工作流

- **WHEN** 操作员在 `/editor` 路由下点击"Save"按钮(无 workflowId)
- **THEN** 系统应从 BPMN XML 提取工作流名称
  - 从 `<bpmn:process name="...">` 元素读取 name 属性
  - 如果提取失败或为空,使用默认名称 "Untitled Workflow"
- **AND** 调用 `POST /api/workflows` 创建工作流
  - 请求体包含: `name`(提取的名称)、`description`(空字符串)、`bpmnXml`(当前 BPMN XML)
- **AND** 保存成功后:
  - 显示成功提示 (`message.success("工作流保存成功")`)
  - 导航到 `/editor/:workflowId`(使用返回的 workflowId)
  - 更新编辑器状态 `currentWorkflowId`
- **AND** 保存失败后:
  - 显示错误提示 (`message.error("保存工作流失败: {错误信息}")`)
  - 保持在当前页面

#### Scenario: 更新已有工作流

- **WHEN** 操作员在 `/editor/:workflowId` 路由下点击"Save"按钮
- **THEN** 系统应从 BPMN XML 提取工作流名称
- **AND** 调用 `PUT /api/workflows/:workflowId` 更新工作流
  - 请求体包含: `name`(提取的名称)、`description`(保持原值或空)、`bpmnXml`(当前 BPMN XML)
- **AND** 更新成功后:
  - 显示成功提示 (`message.success("工作流已更新")`)
  - 保持在当前页面
- **AND** 更新失败后:
  - 显示错误提示 (`message.error("更新工作流失败: {错误信息}")`)
  - 如果是 404 错误,提示"工作流不存在"

#### Scenario: BPMN 名称提取

- **WHEN** 系统需要从 BPMN XML 提取工作流名称
- **THEN** 使用 bpmn-js 的 BpmnModdle 解析 XML
- **AND** 查找第一个 `<bpmn:process>` 元素
- **AND** 读取其 `name` 属性
- **AND** 如果 `name` 属性不存在或为空字符串,返回 "Untitled Workflow"
- **AND** 如果 XML 解析失败,返回 "Untitled Workflow"

### Requirement: 工作流下载功能

工作流编辑器 MUST 提供独立的下载按钮,承接原保存按钮的本地文件下载功能。

#### Scenario: 下载按钮显示

- **WHEN** 编辑器加载了流程图
- **THEN** 工具栏应显示"Download"按钮
- **AND** 按钮图标使用 `DownloadOutlined` (Ant Design 图标)
- **AND** 按钮位于"Save"按钮之后

- **WHEN** 编辑器未加载流程图
- **THEN** "Download" 按钮应处于禁用状态

#### Scenario: 下载 BPMN 文件到本地

- **WHEN** 操作员点击"Download"按钮
- **THEN** 系统应将当前 BPMN XML 下载为 `.bpmn` 文件
- **AND** 文件名从以下来源之一获取(优先级从高到低):
  1. 从 BPMN XML 的 `<bpmn:process name="...">` 提取
  2. 如果当前路由包含 workflowId,使用 `workflow-{workflowId}.bpmn`
  3. 使用默认名称 `diagram.bpmn`
- **AND** 浏览器应触发文件下载
- **AND** 不应导航到其他页面

### Requirement: 从数据库加载工作流

工作流编辑器 MUST 支持通过路由参数 workflowId 从数据库加载工作流。

#### Scenario: 编辑器页面加载工作流

- **WHEN** 操作员访问 `/editor/:workflowId` 路由
- **THEN** 系统应在页面加载时(`onMounted`)检查路由参数
- **AND** 如果存在 `workflowId` 参数:
  - 调用 `GET /api/workflows/:workflowId` 获取工作流
  - 显示加载状态
  - 将返回的 `bpmnXml` 字段加载到编辑器
  - 更新 `currentWorkflowId` 状态
- **AND** 如果不存在 `workflowId` 参数:
  - 显示欢迎界面或空白编辑器
  - `currentWorkflowId` 为空

#### Scenario: 加载工作流失败

- **WHEN** 加载工作流失败(404 或网络错误)
- **THEN** 显示错误提示 (`message.error("加载工作流失败: {错误信息}")`)
- **AND** 如果是 404 错误,提示"工作流不存在"
- **AND** 提供"返回列表"按钮,导航到 `/workflows`
- **AND** 编辑器显示空白状态

## MODIFIED Requirements

### Requirement: 工具栏按钮布局

工作流编辑器 MUST 更新工具栏按钮顺序和功能,提供独立的保存和下载按钮。

#### Scenario: 工具栏按钮顺序

- **WHEN** 操作员查看工具栏
- **THEN** 按钮顺序应为:
  1. Back to List (返回列表页) - **新增**
  2. Open BPMN (打开本地文件)
  3. Save (保存到数据库) - **新增**
  4. Download (下载到本地) - **重命名自 Save BPMN**
  5. New (创建新流程图)
  6. 其他现有按钮(流量可视化等)

#### Scenario: 按钮图标和文字

- **WHEN** 工具栏渲染
- **THEN** "Back to List" 按钮使用 `UnorderedListOutlined` 图标,文字为 "Workflows"
- **AND** "Save" 按钮使用 `SaveOutlined` 图标,文字为 "Save"
- **AND** "Download" 按钮使用 `DownloadOutlined` 图标,文字为 "Download"
- **AND** 其他按钮保持不变

#### Scenario: 返回工作流列表

- **WHEN** 操作员点击 "Back to List" 按钮
- **THEN** 系统应导航到 `/workflows` 路由
- **AND** 显示工作流列表页

### Requirement: 路由结构

工作流编辑器 MUST 更新应用路由结构,将工作流列表设为入口页面。

#### Scenario: 路由映射

- **WHEN** 应用配置路由
- **THEN** 路由映射应包含:
  - `/` → 重定向到 `/workflows`
  - `/workflows` → `WorkflowListPage.vue`
  - `/editor` → `BpmnEditorPage.vue` (新建模式)
  - `/editor/:workflowId` → `BpmnEditorPage.vue` (编辑模式)
  - `/tool` → `RequestBodyConverter.vue` (保持不变)

#### Scenario: 默认路由行为

- **WHEN** 用户访问应用根路径 `/`
- **THEN** 应自动重定向到 `/workflows`
- **AND** 地址栏 URL 应更新为 `/workflows`

## ADDED Services

### Service: workflowService

新增前端工作流服务,封装工作流相关的 API 调用。

#### Methods

**listWorkflows(page: number, pageSize: number)**
- 调用 `GET /api/workflows?page={page}&pageSize={pageSize}`
- 返回工作流列表和分页元数据
- 处理错误并抛出用户友好的错误消息

**getWorkflow(workflowId: string)**
- 调用 `GET /api/workflows/:workflowId`
- 返回单个工作流对象(包含 bpmnXml 字段)
- 处理 404 错误

**createWorkflow(name: string, description: string, bpmnXml: string)**
- 调用 `POST /api/workflows`
- 请求体: `{ name, description, bpmnXml }`
- 返回创建的工作流对象(包含 id)

**updateWorkflow(workflowId: string, name: string, description: string, bpmnXml: string)**
- 调用 `PUT /api/workflows/:workflowId`
- 请求体: `{ name, description, bpmnXml }`
- 返回更新后的工作流对象

**extractWorkflowName(bpmnXml: string): string**
- 使用 bpmn-js BpmnModdle 解析 XML
- 提取 `<bpmn:process name="...">` 的 name 属性
- 失败时返回 "Untitled Workflow"

#### Types

```typescript
interface Workflow {
  id: string
  name: string
  description?: string
  bpmnXml: string
  version: string
  status: 'draft' | 'active' | 'inactive' | 'archived'
  createdAt: string
  updatedAt: string
}

interface WorkflowListResponse {
  success: boolean
  data: Workflow[]
  metadata: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}
```

## 交叉引用

本规范增量影响以下现有功能:
- **工作流编辑器页面** (`BpmnEditorPage.vue`): 工具栏按钮调整、保存/加载逻辑
- **路由配置** (`client/src/router/index.ts`): 路由结构调整
- **后端 API** (`backend-server` 规范): 依赖已有的工作流管理 API

本规范增量与以下功能相关:
- **工作流版本控制支持** (workflow-editor 规范): 未来可扩展版本管理功能
- **工作流元数据管理** (workflow-editor 规范): 未来可在列表页显示更多元数据
