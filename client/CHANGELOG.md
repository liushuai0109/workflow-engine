# Changelog

All notable changes to the Workflow Editor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2025-12-23 (add-workflow-list-page)

#### 工作流列表页面
- 新增独立的工作流列表页面 (`/workflows`),作为应用入口
- 显示数据库中所有已保存的工作流,包含名称、描述、创建时间、更新时间、状态
- 支持分页浏览大量工作流
- 列表项操作:
  - "打开"按钮: 在编辑器中打开工作流
  - "下载"按钮: 将工作流导出为 BPMN XML 文件
- 加载状态显示(a-spin)和空状态提示(a-empty)
- 错误处理和重试机制

#### 路由重构
- 根路径 `/` 自动重定向到 `/workflows`
- 新增 `/editor` 路由(新建模式)
- 新增 `/editor/:workflowId` 路由(编辑模式)
- 保持 `/tool` 路由不变

#### 编辑器工具栏增强
- 新增 "Back to List" 按钮: 返回工作流列表页
- 新增 "Save" 按钮: 保存工作流到数据库
  - 自动从 BPMN XML 提取工作流名称
  - 支持创建新工作流和更新已有工作流
  - 成功后自动导航到 `/editor/:workflowId`
- 重命名 "Save BPMN" → "Download": 下载 BPMN XML 到本地
- 工具栏按钮顺序调整: Back to List | Open BPMN | Save | Download | New | 其他按钮

#### 前端服务层
- 新增 `workflowService.ts` 封装工作流 API 调用
  - `listWorkflows(page, pageSize)`: 获取工作流列表
  - `getWorkflow(workflowId)`: 获取单个工作流
  - `createWorkflow(name, description, bpmnXml)`: 创建工作流
  - `updateWorkflow(workflowId, name, description, bpmnXml)`: 更新工作流
  - `extractWorkflowName(bpmnXml)`: 从 BPMN XML 提取名称
  - `downloadWorkflow(bpmnXml, filename)`: 下载为本地文件
- 使用 bpmn-moddle 解析 BPMN XML
- 完善的错误处理和类型定义

#### 测试
- 新增 workflowService 单元测试(17 个测试用例,全部通过)
- 新增工作流列表页 E2E 测试套件
  - 测试列表展示、操作按钮、导航、分页等功能
  - 测试错误处理和空状态

#### 文档
- 新增 `WORKFLOW_MANAGEMENT.md` 用户使用指南
  - 功能概览和页面结构说明
  - 详细使用场景和操作步骤
  - 保存 vs 下载功能对比
  - API 端点文档
  - 错误处理和故障排查
  - 最佳实践建议

### Changed - 2025-12-23 (add-workflow-list-page)

#### 编辑器功能调整
- 保存按钮功能从"下载到本地"改为"保存到数据库"
- 下载功能移至独立的 "Download" 按钮
- 编辑器支持从路由参数 `workflowId` 加载工作流
- 新增状态管理: `currentWorkflowId` 跟踪当前编辑的工作流
- 保存成功后更新 URL 并同步 `currentWorkflowId`

#### API 配置
- API Client baseUrl 配置为 `http://api.workflow.com:3000/api`
- 所有工作流 API 请求路径以 `/api` 开头

### Fixed - 2025-12-23 (add-workflow-list-page)

- 修复工作流列表页空值检查,防止 "Cannot read properties of undefined" 错误
- 确保 workflows 数组在所有情况下都初始化
- 移除未使用的 `saveFile` 别名
- 移除调试日志,保留必要的错误日志

### Technical Details

**依赖变更:**
- 新增 `@types/bpmn-moddle` 开发依赖

**文件变更统计:**
- 新增文件: 4 (workflowService.ts, WorkflowListPage.vue, 测试文件, 文档)
- 修改文件: 3 (BpmnEditorPage.vue, router/index.ts, api.ts)
- 总代码行数: ~1000+ 行

**测试覆盖:**
- 单元测试: 17/17 通过
- E2E 测试: 15+ 测试场景

## [Previous Versions]

_暂无历史版本记录_

---

## 变更类型说明

- **Added**: 新增功能
- **Changed**: 功能变更
- **Deprecated**: 即将废弃的功能
- **Removed**: 已移除的功能
- **Fixed**: Bug 修复
- **Security**: 安全性修复
