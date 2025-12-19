# 项目上下文

## 目的
BPMN Explorer 是一个基于 Vue 3 和 TypeScript 构建的综合性 BPMN 图表编辑器。该项目使用户能够创建、编辑和可视化业务流程图，并完全支持 BPMN 2.0。它为工作流建模提供了现代化、直观的界面，具有自定义上下文面板、属性面板和实时图表编辑等功能。

## 技术栈
- **前端框架**：Vue 3 with Composition API
- **语言**：TypeScript（严格模式）
- **构建工具**：Vite
- **BPMN 引擎**：bpmn-js v11.5.0
- **属性面板**：bpmn-js-properties-panel、@bpmn-io/properties-panel
- **图表引擎**：diagram-js v15.4.0
- **路由**：Vue Router v4.6.3
- **测试**：Jest with @vue/test-utils、ts-jest
- **包管理器**：pnpm

## 项目约定

### 代码风格
- 使用 TypeScript 严格模式和显式类型
- Vue 组件优先使用 Composition API 而非 Options API
- 组件文件名和元素名称使用 kebab-case
- 导入时组件名称使用 PascalCase
- 变量和函数使用 camelCase
- 文件路径别名：`@/` 映射到 `src/`
- 为所有函数参数和返回值包含类型定义
- 异步操作使用 async/await
- 为复杂函数包含 JSDoc 注释

### 架构模式
- **组件结构**：单文件组件（SFC），包含 `<template>`、`<script setup>`、`<style scoped>`
- **状态管理**：响应式 refs 和计算属性（目前不使用 Vuex/Pinia）
- **服务层**：业务逻辑的单独服务文件（例如 `localStorageService.ts`、`llmService.ts`）
- **扩展系统**：`src/extensions/` 下的模块化扩展，用于自定义 BPMN 功能
- **路由器**：Vue Router 用于视图间导航
- **类型安全**：集中的类型定义在 `src/types/index.ts`
- **关注点分离**：UI 组件在 `src/components/`，业务逻辑在 `src/services/`

### 测试策略
- 使用 Jest 和 @vue/test-utils 进行单元测试
- 测试文件位于源文件旁边的 `__tests__/` 目录
- 测试文件命名：`*.test.ts`
- 运行测试：`pnpm test`
- 监视模式：`pnpm run test:watch`
- 覆盖率报告：`pnpm run test:coverage`
- 专注于测试服务层和适配器逻辑
- 复杂 UI 交互的组件测试

### Git 工作流
- **主分支**：`master`
- **功能分支**：`feature/[feature-name]`
- **当前分支**：`feature/futu`
- 提交消息应该是描述性的并遵循常规格式
- 使用有意义的分支名称描述功能或修复
- 保持提交原子化并专注于单一关注点

## 领域上下文
- **BPMN 2.0**：业务流程模型和符号工作流图的标准
- **图表元素**：开始事件、任务、结束事件、序列流、网关
- **上下文面板**：选择图表元素时出现的 UI 元素，提供快速操作
- **属性面板**：用于编辑元素属性的右侧面板
- **调色板**：包含可用图表元素的左侧面板
- **建模器**：处理图表渲染和编辑的核心 bpmn-js 组件
- **XML 格式**：BPMN 图表存储为具有特定命名空间约定的 XML

## 重要约束
- BPMN 图表必须是符合 BPMN 2.0 规范的有效 XML
- 文件上传大小限制：10MB
- 支持的文件格式：.bpmn、.xml
- 浏览器兼容性：支持 ES6+ 的现代浏览器
- 本地存储用于自动保存功能
- BPMN 使用 `bpmn:` 前缀
- XFlow 扩展使用 `xflow:` 前缀，必须包装在 `bpmn:extensionElements` 中

## 外部依赖
- **bpmn-js**：来自 bpmn.io 的核心 BPMN 渲染和建模库
- **diagram-js**：bpmn-js 使用的低级图表框架
- **本地存储**：用于图表持久化的浏览器存储
- **文件系统 API**：用于文件上传/下载操作
- **无外部后端**：目前仅为客户端应用程序
