# 任务清单

## Phase 1: 前端基础设施 (3-4 天)

- [ ] **T1.1** 创建前端工作流服务 (`client/src/services/workflowService.ts`)
  - 实现 `listWorkflows(page, pageSize)` 方法
  - 实现 `getWorkflow(workflowId)` 方法
  - 实现 `createWorkflow(name, description, bpmnXml)` 方法
  - 实现 `updateWorkflow(workflowId, name, description, bpmnXml)` 方法
  - 包含错误处理和类型定义
  - 验证: 编写单元测试,测试 API 调用逻辑

- [ ] **T1.2** 创建 BPMN 解析工具函数
  - 在 `workflowService.ts` 中实现 `extractWorkflowName(bpmnXml)` 函数
  - 使用 bpmn-js 的 BpmnModdle 解析 XML
  - 从 `<bpmn:process name="...">` 提取名称
  - 提供默认名称 "Untitled Workflow"
  - 验证: 编写单元测试,测试各种 BPMN XML 格式

- [ ] **T1.3** 创建工作流列表页面组件 (`client/src/pages/WorkflowListPage.vue`)
  - 创建基础页面结构
  - 使用 `a-table` 或 `a-list` 展示工作流列表
  - 添加列: 名称、描述、创建时间、更新时间、状态、操作
  - 实现操作按钮: 打开、下载(可选)
  - 添加加载状态 (`a-spin`)
  - 添加空状态 (`a-empty`)
  - 验证: 编写组件单元测试

- [ ] **T1.4** 实现工作流列表页面逻辑
  - 页面加载时调用 `listWorkflows()` 获取数据
  - 实现分页功能(如果使用 `a-table`)
  - 实现"打开"按钮: 导航到 `/editor/:workflowId`
  - 实现"下载"按钮: 下载 BPMN XML 到本地
  - 处理加载错误和空数据状态
  - 验证: 编写 E2E 测试,测试列表加载和交互

## Phase 2: 路由重构 (1-2 天)

- [ ] **T2.1** 更新路由配置 (`client/src/router/index.ts`)
  - 添加 `/workflows` 路由 → `WorkflowListPage.vue`
  - 修改 `/` 路由: 重定向到 `/workflows`
  - 添加 `/editor` 路由 → `BpmnEditorPage.vue` (新建模式)
  - 添加 `/editor/:workflowId` 路由 → `BpmnEditorPage.vue` (编辑模式)
  - 保持 `/tool` 路由不变
  - 验证: 编写路由测试,确保所有路由正确映射

- [ ] **T2.2** 测试路由重定向
  - 测试访问 `/` 是否重定向到 `/workflows`
  - 测试所有新路由是否正常工作
  - 验证: 手动测试所有路由路径

## Phase 3: 编辑器页面重构 (4-5 天)

- [ ] **T3.1** 重构工具栏按钮布局
  - 修改 `BpmnEditorPage.vue` 工具栏部分
  - 保留 "Open BPMN" 按钮(本地文件打开)
  - 重命名 "Save BPMN" → "Download" (下载到本地)
  - 新增 "Save" 按钮(保存到数据库)
  - 调整按钮顺序: Open | Save | Download | New | ...
  - 验证: 视觉检查,确认按钮布局符合设计

- [ ] **T3.2** 实现 Download 按钮功能
  - 将现有 `saveFile()` 方法重命名为 `downloadFile()`
  - 绑定到新的 Download 按钮
  - 保持原有下载功能不变
  - 验证: 测试下载功能是否正常

- [ ] **T3.3** 实现 Save 按钮功能
  - 创建 `saveToDatabase()` 方法
  - 调用 `extractWorkflowName()` 从 BPMN XML 提取名称
  - 根据当前路由判断是创建还是更新:
    - 如果路由包含 `workflowId`,调用 `updateWorkflow()`
    - 否则调用 `createWorkflow()`
  - 成功后导航到 `/editor/:workflowId`
  - 显示保存成功提示 (`message.success()`)
  - 处理保存失败情况 (`message.error()`)
  - 验证: 编写单元测试和 E2E 测试

- [ ] **T3.4** 实现从路由加载工作流
  - 在 `onMounted()` 钩子中检查路由参数 `workflowId`
  - 如果存在 `workflowId`,调用 `getWorkflow(workflowId)`
  - 加载工作流的 BPMN XML 到编辑器
  - 显示加载状态
  - 处理加载失败情况(工作流不存在)
  - 验证: 编写 E2E 测试,测试从列表页打开工作流的完整流程

- [ ] **T3.5** 更新编辑器状态管理
  - 添加响应式状态: `currentWorkflowId`
  - 在保存成功后更新 `currentWorkflowId`
  - 在创建新工作流时清空 `currentWorkflowId`
  - 确保状态与路由同步
  - 验证: 测试状态变化是否正确

## Phase 4: 测试与验证 (2-3 天)

- [ ] **T4.1** 前端单元测试
  - 运行 `cd client && npm run test`
  - 确保 `workflowService.ts` 的所有测试通过
  - 确保 `WorkflowListPage.vue` 的组件测试通过
  - 确保 `BpmnEditorPage.vue` 的修改不影响现有测试
  - 验证: 所有单元测试绿灯

- [ ] **T4.2** 前端 E2E 测试
  - 编写 E2E 测试: 工作流列表页加载
  - 编写 E2E 测试: 从列表打开工作流
  - 编写 E2E 测试: 保存工作流到数据库
  - 编写 E2E 测试: 下载工作流到本地
  - 编写 E2E 测试: 创建新工作流并保存
  - 运行 `cd client && npm run test:e2e:headless`
  - 验证: 所有 E2E 测试通过

- [ ] **T4.3** 类型检查和构建
  - 运行 `cd client && npm run type-check`
  - 修复所有类型错误
  - 运行 `cd client && npm run build`
  - 确保构建成功
  - 验证: 类型检查和构建无错误

- [ ] **T4.4** 手动集成测试
  - 测试完整用户流程:
    1. 访问工作流列表页
    2. 创建新工作流并保存
    3. 从列表打开保存的工作流
    4. 修改工作流并保存
    5. 下载工作流到本地
  - 测试错误场景:
    1. 工作流 ID 不存在时的处理
    2. 网络错误时的处理
    3. 无效 BPMN XML 的处理
  - 验证: 所有场景正常工作

## Phase 5: 文档与清理 (1 天)

- [ ] **T5.1** 更新用户文档
  - 更新 README 说明新的工作流管理功能
  - 添加截图或 GIF 演示
  - 说明保存和下载的区别
  - 验证: 文档清晰易懂

- [ ] **T5.2** 代码审查与清理
  - 移除未使用的代码
  - 统一代码风格
  - 添加必要的代码注释
  - 验证: 代码质量检查通过

- [ ] **T5.3** 更新 CHANGELOG
  - 记录新增功能: 工作流列表页
  - 记录变更: 保存按钮功能调整
  - 记录变更: 路由结构调整
  - 验证: CHANGELOG 完整准确

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: 前端基础设施 | 4 | 3-4 天 | - | 无 |
| Phase 2: 路由重构 | 2 | 1-2 天 | - | Phase 1 |
| Phase 3: 编辑器页面重构 | 5 | 4-5 天 | - | Phase 1, Phase 2 |
| Phase 4: 测试与验证 | 4 | 2-3 天 | - | Phase 1, Phase 2, Phase 3 |
| Phase 5: 文档与清理 | 3 | 1 天 | - | Phase 4 |
| **总计** | **18** | **11-15 天** | - | - |

## 并行化建议

以下任务可以并行进行:
- T1.1, T1.2 可以并行(都是独立的工具函数)
- T1.3, T1.4 需要串行(先创建组件,再实现逻辑)
- Phase 1 完成后,T2.1 和 T3.1 可以并行(路由配置和工具栏 UI 调整)

## 依赖关系图

```
Phase 1 (T1.1, T1.2, T1.3, T1.4)
   ↓
Phase 2 (T2.1, T2.2) ←→ Phase 3 (T3.1, T3.2)
   ↓                           ↓
   └─────→ Phase 3 (T3.3, T3.4, T3.5)
                    ↓
           Phase 4 (T4.1, T4.2, T4.3, T4.4)
                    ↓
           Phase 5 (T5.1, T5.2, T5.3)
```

## 关键里程碑

1. ✅ Phase 1 完成: 基础服务和列表页可用
2. ✅ Phase 2 完成: 路由结构调整完成
3. ✅ Phase 3 完成: 编辑器保存/下载功能可用
4. ✅ Phase 4 完成: 所有测试通过
5. ✅ Phase 5 完成: 功能上线准备就绪
