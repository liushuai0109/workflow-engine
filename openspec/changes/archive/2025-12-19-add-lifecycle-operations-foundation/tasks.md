# 实现任务

## 1. 类型定义和数据模型

- [x] 1.1 定义生命周期阶段枚举 (AARRR)
- [x] 1.2 创建用户分段类型定义
- [x] 1.3 定义触发条件类型
- [x] 1.4 创建工作流元数据架构
- [x] 1.5 定义用户配置文件数据结构
- [x] 1.6 创建事件数据类型定义

## 2. XFlow Extension 增强

- [x] 2.1 使用生命周期字段扩展 xflowExtension.json
- [x] 2.2 更新 XFlowPropertiesProvider 以支持生命周期属性
- [x] 2.3 将生命周期阶段选择器添加到属性面板
- [x] 2.4 实现用户分段配置 UI
- [x] 2.5 添加触发条件构建器
- [x] 2.6 更新 XFlowRenderer 以可视化生命周期阶段

## 3. Services 层

- [x] 3.1 创建 lifecycleService.ts 用于生命周期阶段管理
- [x] 3.2 创建 userSegmentService.ts 用于分段定义
- [x] 3.3 创建 triggerService.ts 用于条件评估
- [x] 3.4 创建 workflowMetadataService.ts 用于工作流上下文
- [x] 3.5 更新 editorOperationService 以处理生命周期属性

## 4. BpmnAdapter 更新

- [x] 4.1 创建包含生命周期元数据的 elementMapping.json
- [x] 4.2 创建 BpmnAdapter 用于 BPMN 导入/导出并保留生命周期
- [x] 4.3 添加生命周期元数据提取实用程序
- [x] 4.4 为增强生命周期的工作流添加验证

## 5. UI 组件

- [x] 5.1 创建 LifecycleStageSelector.vue 组件
- [x] 5.2 创建 UserSegmentBuilder.vue 组件
- [x] 5.3 创建 TriggerConditionEditor.vue 组件
- [x] 5.4 创建 WorkflowMetadataPanel.vue 组件
- [x] 5.5 更新 BpmnEditor.vue 以集成新组件

## 6. 配置和文档

- [x] 6.1 创建 lifecycle-stages.json 配置
- [x] 6.2 创建包含预定义分段的 user-segments.json
- [x] 6.3 创建包含常见触发器的 trigger-templates.json
- [x] 6.4 记录后端 API contracts (OpenAPI spec)
- [x] 6.5 编写现有工作流的迁移指南
- [x] 6.6 使用生命周期运营功能更新 README

## 7. 测试

- [x] 7.1 生命周期类型定义的单元测试
- [x] 7.2 生命周期服务的单元测试
- [x] 7.3 BpmnAdapter 与生命周期数据的集成测试
- [x] 7.4 新 UI 元素的组件测试
- [x] 7.5 创建增强生命周期工作流的 E2E 测试
- [x] 7.6 现有工作流的迁移测试

## 8. 迁移和兼容性

- [x] 8.1 为现有工作流创建迁移脚本
- [x] 8.2 在 BpmnAdapter 中添加向后兼容层
- [ ] 8.3 使用示例工作流测试迁移
- [ ] 8.4 验证所有现有 .bpmn 文件正确加载

## 9. 后端设计 (仅文档)

- [x] 9.1 设计工作流执行引擎架构
- [x] 9.2 定义 REST API endpoints (OpenAPI spec)
- [x] 9.3 设计用户配置文件的数据库架构
- [x] 9.4 设计事件流架构
- [x] 9.5 记录身份验证/授权要求
- [ ] 9.6 创建数据流图
