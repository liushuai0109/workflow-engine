# 提案：新增工作流列表页面

## 变更 ID
`add-workflow-list-page`

## 概述
在 BPMN Explorer 中添加工作流列表页面,展示数据库中保存的所有工作流,并提供打开、下载等操作。同时重构工具栏保存按钮功能,将本地文件下载功能移至独立的下载按钮,保存按钮改为保存工作流到数据库。

## 背景与动机

### 当前痛点
1. **缺少工作流管理界面**：用户无法查看和管理已保存到数据库的工作流
2. **保存功能混乱**：当前"Save BPMN"按钮将 BPMN 文件下载到本地,而不是保存到数据库
3. **工作流无法复用**：用户无法从数据库加载已保存的工作流进行编辑

### 用户需求
- 查看数据库中所有已保存的工作流列表
- 从列表中选择工作流进入编辑器进行编辑
- 将当前编辑的工作流保存到数据库(新建或更新)
- 下载 BPMN XML 文件到本地

## 目标

### 主要目标
1. 新增独立的工作流列表页面(`/workflows`)
2. 重构保存/下载按钮功能,职责分离
3. 支持从数据库加载工作流到编辑器

### 非目标
- 工作流版本管理功能(后续迭代)
- 工作流删除功能(后续迭代)
- 工作流权限管理(后续迭代)

## 详细设计

### 1. 新增工作流列表页面

**路由**: `/workflows`

**功能**:
- 展示数据库中所有工作流的列表
- 每个列表项显示:
  - 工作流名称
  - 描述(如果有)
  - 创建时间
  - 更新时间
  - 状态(draft/active/inactive/archived)
- 列表项操作:
  - **打开**按钮: 导航到 `/editor/:workflowId` 打开该工作流
  - **下载**按钮(可选): 直接下载 BPMN XML 文件

**UI 组件**:
- 使用 Ant Design 组件:
  - `a-table` 或 `a-list` 展示工作流列表
  - `a-button` 用于操作按钮
  - `a-spin` 显示加载状态
  - `a-empty` 显示空状态

### 2. 重构编辑器页面路由

**原路由**: `/` → 编辑器页面(无工作流ID)

**新路由**:
- `/` → 重定向到 `/workflows`(工作流列表页)
- `/editor` → 编辑器页面(新建工作流)
- `/editor/:workflowId` → 编辑器页面(编辑已有工作流)

### 3. 重构工具栏按钮

**当前按钮**:
- Open BPMN: 从本地文件打开
- Save BPMN: 下载到本地
- New: 创建新流程图

**新设计**:
- **Open BPMN**: 从本地文件打开(保持不变)
- **Download**: 下载 BPMN XML 到本地(承接原保存功能)
- **Save**: 保存工作流到数据库(新功能)
- **New**: 创建新流程图(保持不变)

### 4. 保存到数据库的逻辑

**工作流名称提取**:
从 BPMN XML 的 `<bpmn:process name="...">` 元素提取名称

**保存逻辑**:
- 如果当前路由是 `/editor/:workflowId`,执行更新操作(`PUT /api/workflows/:workflowId`)
- 如果当前路由是 `/editor` 或新建流程,执行创建操作(`POST /api/workflows`)
- 成功后导航到 `/editor/:workflowId`(使用新创建或更新的 workflowId)

**保存按钮状态**:
- 禁用条件: `!currentDiagram`(没有加载流程图)
- 加载状态: 保存请求进行中

### 5. 前端服务层

**新增服务**: `workflowService.ts`

提供方法:
- `listWorkflows(page, pageSize)`: 获取工作流列表
- `getWorkflow(workflowId)`: 获取单个工作流
- `createWorkflow(name, description, bpmnXml)`: 创建工作流
- `updateWorkflow(workflowId, name, description, bpmnXml)`: 更新工作流

## 影响范围

### 前端变更
- 新增页面: `WorkflowListPage.vue`
- 修改页面: `BpmnEditorPage.vue`
  - 添加 Download 按钮
  - 重构 Save 按钮功能
  - 支持从路由参数加载 workflowId
- 修改路由: `client/src/router/index.ts`
- 新增服务: `workflowService.ts`

### 后端变更
无需变更,已有 API 支持:
- `GET /api/workflows` (列表)
- `GET /api/workflows/:workflowId` (详情)
- `POST /api/workflows` (创建)
- `PUT /api/workflows/:workflowId` (更新)

### 数据库变更
无需变更,已有 `workflows` 表支持所需字段

## 技术依赖

- 前端: Vue 3, Vue Router, Ant Design Vue, TypeScript
- 后端 API: 已存在的工作流管理 API
- 数据库: PostgreSQL (已有 workflows 表)

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| BPMN XML 解析失败 | 无法提取工作流名称 | 使用 bpmn-js 的 BpmnModdle 解析,解析失败时使用默认名称"Untitled Workflow" |
| 路由重构影响现有用户 | 用户访问旧路由 `/` 时迷失 | 添加路由重定向,`/` → `/workflows` |
| 保存按钮功能变更引起困惑 | 用户习惯了下载到本地 | 添加独立的 Download 按钮,保持下载功能可用 |

## 成功指标

- [ ] 工作流列表页面能成功展示数据库中的工作流
- [ ] 点击列表项的"打开"按钮能正确加载工作流到编辑器
- [ ] 保存按钮能成功将工作流保存到数据库
- [ ] 下载按钮能成功下载 BPMN XML 文件到本地
- [ ] 所有单元测试和 E2E 测试通过

## 未来考虑

1. **工作流删除功能**: 在列表页添加删除按钮
2. **工作流搜索和过滤**: 按名称、状态、创建时间过滤
3. **工作流版本管理**: 保存时创建新版本,支持版本历史查看和回滚
4. **工作流复制功能**: 从现有工作流创建副本
5. **工作流导出/导入**: 批量导出和导入工作流

## 相关规范

- `workflow-editor`: 工作流编辑器规范(新增列表页和保存功能)
- `backend-server`: 后端服务规范(已有工作流 API,无需修改)

## 审批状态

- [ ] 技术审批
- [ ] 产品审批
- [ ] 安全审批(如需要)
