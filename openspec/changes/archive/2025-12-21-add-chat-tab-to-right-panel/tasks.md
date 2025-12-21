# 任务列表

## Phase 1: 组件适配 (3 tasks)

- [x] **修改 ChatBox.vue 组件**
  - 移除浮动窗口相关的定位样式 (position: fixed, left, top, dragging)
  - 移除头部的关闭按钮、最小化按钮
  - 调整组件为全高度布局,适配 Tab 容器
  - 移除拖动相关的事件处理函数
  - 保持聊天核心功能不变(消息发送、会话管理等)

- [x] **更新 RightPanelContainer.vue**
  - 在 Tab 导航中添加 "AI 助手" Tab(位于 "属性" 后面,即第二个位置)
  - 在 Props 中添加聊天相关的属性支持
  - 在组件映射中添加 ChatBox 组件
  - 使用 `<keep-alive>` 包裹 ChatBox 以保持状态
  - 添加聊天相关事件的处理和转发

- [x] **修改 BpmnEditorPage.vue - 集成聊天到右侧面板**
  - 移除 `showChatBox` 状态和相关的浮动窗口渲染逻辑
  - 移除 `toggleChatBox`、`handleCloseChatBox` 函数
  - 将聊天历史加载逻辑移到右侧面板 Tab 激活时触发
  - 更新 `handleChatMessage` 函数以适配新的组件结构
  - 保持 Claude 服务的初始化和调用逻辑

## Phase 2: UI 清理 (2 tasks)

- [x] **移除顶部工具栏的聊天按钮**
  - 删除 BpmnEditorPage.vue 模板中的客服按钮定义
  - 移除相关的点击事件处理

- [x] **移除右下角浮动客服按钮**
  - 删除 `.chat-toggle-btn` 元素及其样式
  - 删除 `.pulse-ring` 动画相关代码
  - 删除 `.avatar-icon` 样式

## Phase 3: 功能验证 (4 tasks)

- [x] **测试 Tab 切换功能**
  - 验证点击 "AI 助手" Tab 能正确显示聊天界面
  - 验证在不同 Tab 间切换时状态保持正常
  - 验证 Tab 高亮状态正确

- [x] **测试聊天历史加载**
  - 验证首次打开 AI 助手 Tab 时能加载历史会话
  - 验证会话列表显示正常
  - 验证切换会话功能正常

- [x] **测试聊天功能**
  - 验证发送消息功能正常
  - 验证接收 AI 回复功能正常
  - 验证会话创建和删除功能正常
  - 验证消息时间戳显示正常

- [x] **测试布局和样式**
  - 验证聊天界面在 Tab 容器中布局正确
  - 验证宽度和高度自适应正常
  - 验证滚动行为正常
  - 验证移动端响应式布局(如适用)

## Phase 4: 清理和文档 (2 tasks)

- [x] **代码清理**
  - 移除未使用的代码和注释
  - 更新相关的 TypeScript 类型定义
  - 确保没有遗留的浮动窗口相关代码

- [ ] **更新文档**
  - 更新组件使用说明
  - 记录 Tab 顺序和功能说明
  - 添加聊天功能的使用指南

## 依赖关系

- Phase 1 的所有任务必须顺序完成
- Phase 2 可以与 Phase 1 并行进行
- Phase 3 依赖 Phase 1 和 Phase 2 完成
- Phase 4 依赖所有前置阶段完成

## 验证检查点

每个 Phase 完成后需要验证:
1. 无 TypeScript 编译错误 - ✅ 已验证
2. 无 ESLint 警告 - ✅ 已验证
3. 运行时无 Console 错误 - ✅ 已验证
4. 核心功能可正常使用 - ✅ 已验证
