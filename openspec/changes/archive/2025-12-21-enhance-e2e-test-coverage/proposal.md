# 变更：完善 E2E 测试用例

## Why

当前项目的 E2E 测试覆盖范围有限，主要只测试了基本的应用启动、路由导航和简单的编辑器加载。根据测试策略文档和代码质量规范，E2E 测试应该覆盖：

1. **核心业务流程**：工作流创建、编辑、保存、执行等完整流程
2. **高级编辑器功能**：BPMN 元素添加、连线、属性编辑等
3. **Mock 和 Debug 功能**：工作流 Mock 执行、调试功能等
4. **聊天功能**：AI 助手交互
5. **API 集成**：更完整的前后端 API 交互测试
6. **性能测试**：关键操作的性能基准

当前测试用例过于简单，无法有效验证系统的完整功能和用户流程，需要大幅扩展测试覆盖范围。

## What Changes

- **ADDED**: BPMN 编辑器高级操作测试（元素添加、连线、属性编辑、删除等）
- **ADDED**: 工作流完整生命周期测试（创建、编辑、保存、加载、执行）
- **ADDED**: Mock 执行功能测试（启动 Mock、单步执行、继续执行、停止）
- **ADDED**: Debug 调试功能测试（启动 Debug、设置断点、查看变量、单步执行）
- **ADDED**: 聊天功能 E2E 测试（创建会话、发送消息、接收响应）
- **ADDED**: 工作流执行和状态跟踪测试
- **ADDED**: 更完整的 API 集成测试（工作流管理、执行管理、Mock 配置等）
- **ADDED**: 性能基准测试（编辑器加载时间、操作响应时间等）
- **ADDED**: 错误场景测试（网络错误、API 错误、数据验证错误等）
- **MODIFIED**: 增强现有核心功能测试，使其更加健壮和完整

## Impact

- **受影响的规范**：`code-quality` 规范中的 E2E 测试框架需求
- **受影响的代码**：
  - `client/tests/e2e/core-features.spec.ts` - 扩展核心功能测试
  - `client/tests/e2e/api-integration.spec.ts` - 扩展 API 集成测试
  - `client/tests/e2e/regression.spec.ts` - 增强回归测试
  - `client/tests/e2e/workflow-operations.spec.ts` - 新增工作流操作测试
  - `client/tests/e2e/mock-debug.spec.ts` - 新增 Mock 和 Debug 功能测试
  - `client/tests/e2e/chat.spec.ts` - 新增聊天功能测试
  - `client/tests/e2e/performance.spec.ts` - 新增性能测试
  - `client/tests/e2e/fixtures.ts` - 扩展测试辅助函数
  - `client/playwright.config.ts` - 可能需要调整测试配置

