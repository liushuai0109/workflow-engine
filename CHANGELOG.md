# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **统一编辑器右侧面板布局**: 将 Properties、AI 助手、Mock、Debug、Interceptor 面板整合到统一的 Tab 面板中
  - 新增 `RightPanelContainer` 组件，使用 Ant Design Tabs 实现面板切换
  - 支持键盘导航（左右方向键切换 Tab）
  - 工具栏按钮与 Tab 状态同步
  - 所有面板状态保持，切换 Tab 不丢失数据

### Changed
- **改进用户体验**: 移除浮动窗口设计，采用固定右侧面板布局
  - 消除多个浮动窗口遮挡编辑器内容的问题
  - 提供更清晰的信息架构和导航方式
  - 优化空间利用率

### Removed
- 移除浮动面板的显示/隐藏状态管理
- 移除浮动面板相关的模板和样式代码

### Technical
- 使用 Ant Design Vue Tabs 组件实现 Tab 导航
- 保持 bpmn-js Properties Panel 挂载机制不变
- 添加键盘导航支持（方向键切换 Tab）
- E2E 测试覆盖 Tab 切换和面板功能

## [Previous Versions]

### 其他功能
- BPMN 编辑器基础功能
- AI 助手集成
- Mock 执行功能
- Debug 调试功能
- Interceptor 拦截器功能
- 流量可视化
- 用户任务约束验证
