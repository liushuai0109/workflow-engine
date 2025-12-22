# 工作流管理功能使用指南

本文档介绍工作流编辑器的工作流管理功能,包括如何列出、创建、编辑、保存和下载工作流。

## 功能概览

工作流管理系统提供以下核心功能:

- **工作流列表页**: 查看数据库中保存的所有工作流
- **保存到数据库**: 将当前编辑的工作流保存到数据库
- **本地下载**: 将工作流导出为 BPMN XML 文件
- **打开工作流**: 从数据库加载工作流到编辑器
- **路由导航**: 在列表页和编辑器之间无缝切换

## 页面结构

### 工作流列表页 (`/workflows`)

工作流列表页是应用的入口页面,展示数据库中所有已保存的工作流。

**功能特性:**
- **工作流表格**: 显示工作流名称、描述、创建时间、更新时间、状态
- **操作按钮**:
  - `打开`: 在编辑器中打开工作流进行编辑
  - `下载`: 将工作流导出为 `.bpmn` 文件
- **创建新工作流**: 点击"创建新工作流"按钮进入编辑器
- **分页**: 支持分页浏览大量工作流
- **加载状态**: 显示加载动画和空状态提示

**访问方式:**
- 直接访问根路径 `/` 会自动重定向到 `/workflows`
- 从编辑器点击"Workflows"按钮返回列表页

### 工作流编辑器页 (`/editor`)

工作流编辑器提供 BPMN 流程图的可视化编辑功能。

**工具栏按钮:**

1. **Workflows** (返回列表)
   - 返回工作流列表页
   - 不会保存当前编辑

2. **Open BPMN** (打开本地文件)
   - 从本地文件系统打开 `.bpmn` 或 `.xml` 文件
   - 用于导入外部 BPMN 文件

3. **Save** (保存到数据库)
   - 保存当前工作流到数据库
   - 自动从 BPMN XML 提取工作流名称
   - 新建工作流时创建新记录
   - 编辑已有工作流时更新记录

4. **Download** (下载到本地)
   - 将当前工作流导出为 `.bpmn` 文件
   - 文件名根据工作流名称自动生成

5. **New** (创建新流程图)
   - 创建一个空白的 BPMN 流程图

6. **显示流量** (可选)
   - 启用/关闭流量可视化功能

## 使用场景

### 场景 1: 创建新工作流并保存

1. 访问 `/workflows` 或根路径 `/`
2. 点击"创建新工作流"按钮
3. 在编辑器中设计 BPMN 流程图
4. 在流程图中设置 `<bpmn:process name="...">` 属性作为工作流名称
5. 点击"Save"按钮保存到数据库
6. 成功后自动导航到 `/editor/:workflowId`
7. 后续修改可以直接点击"Save"更新

### 场景 2: 编辑已有工作流

1. 访问工作流列表页 `/workflows`
2. 找到要编辑的工作流
3. 点击"打开"按钮
4. 编辑器自动加载该工作流
5. 修改流程图
6. 点击"Save"保存更新

### 场景 3: 下载工作流到本地

**从列表页下载:**
1. 在工作流列表页找到目标工作流
2. 点击"下载"按钮
3. BPMN 文件自动下载到本地

**从编辑器下载:**
1. 在编辑器中打开或创建工作流
2. 点击"Download"按钮
3. BPMN 文件下载到本地,文件名格式: `{workflowName}.bpmn`

### 场景 4: 导入本地 BPMN 文件

1. 在编辑器页面点击"Open BPMN"按钮
2. 选择本地 `.bpmn` 或 `.xml` 文件
3. 文件内容加载到编辑器
4. 如需保存到数据库,点击"Save"按钮

## 工作流命名规则

工作流名称从 BPMN XML 的 `<bpmn:process>` 元素的 `name` 属性中提取:

```xml
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="My Workflow Name" isExecutable="false">
    <!-- ... -->
  </bpmn:process>
</bpmn:definitions>
```

**命名规则:**
- 如果 `name` 属性存在且非空,使用该名称
- 如果 `name` 属性不存在或为空,使用默认名称 "Untitled Workflow"
- 名称会自动去除前后空格

**最佳实践:**
- 在 BPMN 编辑器的属性面板中设置流程名称
- 使用有意义的名称,便于在列表中识别
- 避免使用特殊字符(保存时会自动处理)

## 保存 vs 下载

### 保存 (Save)
- **目标**: 数据库
- **用途**: 持久化存储,版本管理,团队协作
- **操作**: 自动提取工作流名称,创建或更新记录
- **结果**: 可在列表页查看,可供其他用户访问

### 下载 (Download)
- **目标**: 本地文件系统
- **用途**: 备份,离线编辑,分享文件
- **操作**: 导出为 `.bpmn` 文件
- **结果**: 本地文件,可用其他 BPMN 工具打开

**推荐工作流程:**
1. 在编辑器中设计流程图
2. 点击"Save"保存到数据库(主要存储)
3. 必要时点击"Download"创建本地备份

## API 端点

工作流管理功能使用以下后端 API:

- `GET /api/workflows?page={page}&pageSize={pageSize}` - 列出工作流
- `GET /api/workflows/{workflowId}` - 获取单个工作流
- `POST /api/workflows` - 创建新工作流
- `PUT /api/workflows/{workflowId}` - 更新工作流

**请求体格式 (POST/PUT):**
```json
{
  "name": "My Workflow",
  "description": "Optional description",
  "bpmnXml": "<?xml version=\"1.0\"?>..."
}
```

**响应格式:**
```json
{
  "success": true,
  "data": {
    "id": "workflow-123",
    "name": "My Workflow",
    "description": "Optional description",
    "bpmnXml": "<?xml version=\"1.0\"?>...",
    "version": "1.0",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

## 错误处理

### 常见错误及解决方案

**1. "加载工作流列表失败"**
- **原因**: 后端 API 不可用或网络错误
- **解决**: 检查后端服务是否运行,网络连接是否正常

**2. "工作流不存在"**
- **原因**: 尝试打开已删除或无效的 workflowId
- **解决**: 返回列表页,选择有效的工作流

**3. "保存工作流失败"**
- **原因**: BPMN XML 无效,或服务器错误
- **解决**: 检查流程图是否完整,检查服务器日志

**4. "无法提取工作流名称"**
- **原因**: BPMN XML 格式错误或缺少 process 元素
- **解决**: 系统会使用默认名称 "Untitled Workflow",可在编辑器中重新设置

### 空状态

**列表页为空:**
- 显示"暂无工作流"提示
- 提供"创建新工作流"按钮引导用户

**加载失败:**
- 显示错误提示消息
- 提供"重试"按钮

## 快捷键和操作

### 键盘快捷键

- `Ctrl/Cmd + S`: 保存当前工作流(浏览器可能拦截)
- `Ctrl/Cmd + O`: 打开本地文件(浏览器可能拦截)

### 鼠标操作

- 双击列表项: 打开工作流(如果实现)
- 右键菜单: 快速访问操作(如果实现)

## 浏览器兼容性

工作流管理功能支持以下浏览器:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**注意事项:**
- 文件下载功能依赖浏览器的 Blob API
- 部分浏览器可能阻止自动下载,需要用户授权

## 故障排查

### 问题: 保存按钮一直禁用

**可能原因:**
1. 编辑器未加载完成
2. 没有可保存的流程图内容

**解决方法:**
1. 等待编辑器完全加载
2. 创建或打开一个 BPMN 流程图
3. 确保流程图包含至少一个元素

### 问题: 下载的文件名不正确

**可能原因:**
- BPMN XML 中 process 元素缺少 name 属性

**解决方法:**
1. 在编辑器中选择 process 元素
2. 在属性面板中设置 name 属性
3. 重新下载

### 问题: 列表页一直显示加载状态

**可能原因:**
1. 后端 API 响应超时
2. 网络连接问题

**解决方法:**
1. 检查浏览器开发者工具的网络标签
2. 验证后端 API 是否返回正确的数据格式
3. 刷新页面重试

## 最佳实践

1. **定期保存**: 编辑过程中定期点击"Save"保存到数据库
2. **有意义的命名**: 使用清晰的工作流名称,便于管理
3. **本地备份**: 对重要工作流使用"Download"创建本地备份
4. **浏览器兼容**: 使用现代浏览器以获得最佳体验
5. **网络稳定**: 保存时确保网络连接稳定

## 未来功能

以下功能计划在未来版本中添加:

- 工作流删除功能
- 工作流搜索和过滤
- 工作流版本管理和历史记录
- 工作流复制功能
- 批量导出/导入
- 工作流权限管理

## 技术细节

### 前端架构

- **框架**: Vue 3 + TypeScript
- **UI 组件**: Ant Design Vue
- **路由**: Vue Router 4
- **BPMN 解析**: bpmn-moddle

### 数据流

1. **列表加载**: `WorkflowListPage.vue` → `workflowService.listWorkflows()` → API Client → Backend
2. **打开工作流**: `router.push('/editor/:id')` → `BpmnEditorPage.vue` → `workflowService.getWorkflow(id)` → 加载到编辑器
3. **保存工作流**: 编辑器 → `workflowService.extractWorkflowName()` → `workflowService.createWorkflow()` 或 `updateWorkflow()` → Backend
4. **下载工作流**: 编辑器 → `workflowService.downloadWorkflow()` → 创建 Blob → 触发下载

### 文件位置

- **工作流服务**: `client/src/services/workflowService.ts`
- **列表页组件**: `client/src/pages/WorkflowListPage.vue`
- **编辑器组件**: `client/src/pages/BpmnEditorPage.vue`
- **路由配置**: `client/src/router/index.ts`
- **API Client**: `client/src/services/api.ts`

## 支持

如有问题或建议,请:

1. 查看本文档的"故障排查"章节
2. 检查浏览器开发者工具的控制台错误
3. 联系技术支持团队

---

**文档版本**: 1.0
**最后更新**: 2025-12-23
**变更 ID**: add-workflow-list-page
