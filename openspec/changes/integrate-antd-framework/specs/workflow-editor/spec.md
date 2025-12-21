# workflow-editor 规范增量

## ADDED Requirements

### Requirement: Ant Design UI 框架集成

工作流编辑器 SHALL 集成 Ant Design Vue 组件库,提供统一的企业级 UI 体验。所有新开发的 UI 组件 MUST 使用 Ant Design 组件构建。

#### Scenario: Ant Design 全局配置

- **WHEN** 应用程序启动
- **THEN** Ant Design 全局注册到 Vue 应用
- **AND** 全局样式(reset.css)生效
- **AND** 所有 Ant Design 组件可用

#### Scenario: 组件库按需加载

- **WHEN** 构建应用程序
- **THEN** 仅打包实际使用的 Ant Design 组件
- **AND** 未使用的组件不包含在最终 bundle 中
- **AND** 打包体积相比全量引入减少至少 60%

#### Scenario: 主题定制

- **WHEN** 开发者配置自定义主题
- **THEN** 可以通过 ConfigProvider 覆盖 Ant Design 默认令牌
- **AND** 自定义主题应用到所有 Ant Design 组件
- **AND** 主题变更实时生效

### Requirement: 基础交互组件迁移

核心交互组件 MUST 迁移到 Ant Design 实现,并 SHALL 保持功能完整性。所有按钮、输入框、选择器组件 SHALL 使用对应的 Ant Design 组件。

#### Scenario: 按钮组件统一

- **WHEN** 页面中使用按钮
- **THEN** 使用 `a-button` 组件
- **AND** 支持 type(primary/default/dashed/text/link)
- **AND** 支持 size(small/middle/large)
- **AND** 支持 danger 属性
- **AND** 支持 loading 状态
- **AND** 支持 disabled 状态

#### Scenario: 输入框组件统一

- **WHEN** 表单中需要文本输入
- **THEN** 使用 `a-input` 或 `a-textarea` 组件
- **AND** 支持 placeholder、allowClear、maxLength
- **AND** 支持实时验证和错误提示
- **AND** 支持 prefix/suffix 插槽(图标或文本)
- **AND** 支持 @pressEnter 事件

#### Scenario: 选择器组件统一

- **WHEN** 表单中需要下拉选择
- **THEN** 使用 `a-select` 组件
- **AND** 支持单选和多选模式(mode="multiple")
- **AND** 支持搜索和过滤(showSearch)
- **AND** 支持分组显示(a-select-opt-group)
- **AND** 支持远程数据加载

### Requirement: 对话框和弹窗迁移

对话框和弹窗组件 MUST 使用 Ant Design 实现,并 SHALL 提供一致的交互体验。所有模态对话框 SHALL 使用 `a-modal` 组件,所有消息提示 SHALL 使用 `message` API。

#### Scenario: 聊天框组件迁移

- **WHEN** 用户打开 AI 聊天框
- **THEN** 聊天框容器使用 Ant Design 组件构建
- **AND** 消息列表使用 `a-list` 组件展示
- **AND** 输入区使用 `a-textarea` + `a-button` 组合
- **AND** 加载状态使用 `a-spin` 组件
- **AND** 输入框采用 Ant Design 标准样式(6px 圆角、标准边框色)
- **AND** 发送按钮为 32px 圆形、主色背景
- **AND** 保留原有的会话管理功能

#### Scenario: 确认对话框

- **WHEN** 执行删除等危险操作
- **THEN** 使用 `a-modal` 或 `Modal.confirm` 显示确认对话框
- **AND** 对话框包含清晰的操作说明
- **AND** 提供取消和确认按钮
- **AND** 确认按钮使用危险样式(danger: true)

#### Scenario: 消息提示

- **WHEN** 需要向用户显示操作结果
- **THEN** 使用 `message` API 显示 toast 消息
- **AND** 支持 success/warning/error/info 类型
- **AND** 消息自动在 3 秒后消失
- **AND** 支持手动关闭

### Requirement: 表单组件迁移

表单相关组件 MUST 使用 Ant Design Form 系统,并 SHALL 提供统一的验证和布局。所有表单 MUST 使用 `a-form` 包裹,所有表单项 MUST 使用 `a-form-item` 包装。

#### Scenario: Mock 配置表单

- **WHEN** 用户配置 Mock 执行参数
- **THEN** 表单使用 `a-form` 包裹
- **AND** 每个表单项使用 `a-form-item` 包装
- **AND** 表单项支持 label 和 required 标识
- **AND** 表单验证规则集中管理
- **AND** 验证失败时显示错误提示
- **AND** 提交按钮在验证失败时禁用

#### Scenario: 表单布局

- **WHEN** 表单包含多个字段
- **THEN** 使用 Ant Design 的 layout 属性控制布局(vertical/horizontal/inline)
- **AND** 复杂表单支持分组(使用 `a-collapse`)
- **AND** 表单宽度响应式调整

#### Scenario: 表单验证

- **WHEN** 用户输入表单数据
- **THEN** 执行实时验证(blur 或 change 事件)
- **AND** 验证规则包括:必填、格式、长度、自定义规则
- **AND** 验证错误以红色文本显示在字段下方
- **AND** 表单级验证在提交时触发

### Requirement: Tab 导航迁移

Tab 导航 MUST 使用 Ant Design Tabs 组件,并 SHALL 提供一致的切换体验。所有 Tab 切换界面 SHALL 使用 `a-tabs` 和 `a-tab-pane` 实现。

#### Scenario: 右侧面板 Tab 切换

- **WHEN** 用户在右侧面板中切换 Tab
- **THEN** 使用 `a-tabs` 组件实现 Tab 导航
- **AND** Tab 包括:属性(SettingOutlined)、AI 助手(RobotOutlined)、Mock(ThunderboltOutlined)、Debug(BugOutlined)、拦截器(FilterOutlined)
- **AND** 每个 Tab 图标和文字间距为 5px
- **AND** 激活的 Tab 高亮显示
- **AND** Tab 切换时内容平滑过渡
- **AND** 支持 `keep-alive` 保持非激活面板状态

#### Scenario: Tab 样式定制

- **WHEN** Tab 导航渲染
- **THEN** 使用 type="card" 或 "line" 样式
- **AND** Tab 文字大小和间距符合设计规范
- **AND** 移除不必要的关闭按钮

### Requirement: 图标集成

工具栏和面板 MUST 使用 @ant-design/icons-vue 提供的图标组件。所有 emoji 图标 SHALL 替换为语义化的 Ant Design 图标。

#### Scenario: 工具栏图标

- **WHEN** 工具栏渲染
- **THEN** 打开文件按钮使用 `FolderOpenOutlined`
- **AND** 保存文件按钮使用 `SaveOutlined`
- **AND** 新建文件按钮使用 `FileAddOutlined`
- **AND** 流量可视化按钮使用 `LineChartOutlined`
- **AND** 所有图标大小和颜色一致

#### Scenario: Tab 图标

- **WHEN** 右侧面板 Tab 渲染
- **THEN** 属性 Tab 使用 `SettingOutlined`
- **AND** AI 助手 Tab 使用 `RobotOutlined`
- **AND** Mock Tab 使用 `ThunderboltOutlined`
- **AND** Debug Tab 使用 `BugOutlined`
- **AND** 拦截器 Tab 使用 `FilterOutlined`

### Requirement: 列表和时间轴组件迁移

列表和时间轴组件 MUST 使用 Ant Design 实现,并 SHALL 提供清晰的数据展示。时间轴 MUST 使用 `a-timeline` 组件,列表 MUST 使用 `a-list` 组件。

#### Scenario: 执行时间轴

- **WHEN** 显示工作流执行历史
- **THEN** 使用 `a-timeline` 组件
- **AND** 每个执行步骤使用 `a-timeline-item` 展示
- **AND** 时间轴项显示:时间、节点名称、状态
- **AND** 不同状态使用不同的图标和颜色
- **AND** 支持展开查看详细信息

#### Scenario: 会话列表

- **WHEN** 显示聊天会话列表
- **THEN** 使用 `a-list` 组件
- **AND** 每个会话使用 `a-list-item` 展示
- **AND** 列表项包括:会话标题、更新时间、激活状态
- **AND** 激活的会话高亮显示
- **AND** 支持悬停显示删除按钮

### Requirement: 变量监视表格

变量监视面板 MUST 使用 Ant Design Table 组件展示变量数据。表格 SHALL 支持排序、过滤和复杂数据类型展示。

#### Scenario: 变量表格展示

- **WHEN** 用户查看工作流变量
- **THEN** 使用 `a-table` 组件展示变量列表
- **AND** 表格列包括:变量名、类型、值、作用域
- **AND** 支持按列排序(sorter)
- **AND** 支持搜索过滤
- **AND** 复杂数据类型(对象/数组)支持展开查看(expandable)

#### Scenario: 表格交互

- **WHEN** 用户与表格交互
- **THEN** 支持行选择(rowSelection)
- **AND** 支持行操作按钮(编辑、删除)
- **AND** 空数据时显示 empty 状态(locale.emptyText)
- **AND** 数据加载时显示 loading 状态

## MODIFIED Requirements

### Requirement: 增强的属性面板

工作流编辑器 SHALL 为生命周期运营提供增强的属性面板,并 MUST 使用 Ant Design 组件构建以提供更好的交互体验。所有属性表单字段 SHALL 使用对应的 Ant Design 表单组件。

#### Scenario: 属性表单组件

- **WHEN** 操作员编辑元素属性
- **THEN** 属性表单使用 `a-form` 构建
- **AND** 表单字段使用对应的 Ant Design 组件:
  - 文本输入: `a-input`
  - 下拉选择: `a-select`
  - 日期选择: `a-date-picker`
  - 开关: `a-switch`
  - 单选: `a-radio-group`
  - 多选: `a-checkbox-group`
- **AND** 表单验证使用 Ant Design Form 验证系统
- **AND** 验证错误实时显示

### Requirement: 工作流元数据管理

工作流编辑器 SHALL 支持运营上下文的综合元数据,并 MUST 使用 Ant Design 组件增强用户体验。标签输入 SHALL 使用 `a-select` (mode="tags"),日期选择 SHALL 使用 `a-date-picker`。

#### Scenario: 元数据编辑表单

- **WHEN** 操作员编辑工作流元数据
- **THEN** 使用 `a-form` 构建元数据表单
- **AND** 标签输入使用 `a-select` (mode="tags")
- **AND** 目的选择使用 `a-select` 组件
- **AND** 描述输入使用 `a-textarea` 组件
- **AND** 日期显示使用 `a-date-picker` 组件(disabled)
- **AND** 表单布局使用 `a-space` 或 grid 系统

#### Scenario: 成功指标配置

- **WHEN** 操作员配置成功指标
- **THEN** 使用 `a-input-number` 设置目标值
- **AND** 使用 `a-select` 选择指标类型
- **AND** 使用 `a-slider` 设置百分比类指标
- **AND** 指标列表使用 `a-list` 或 `a-table` 展示

## 样式隔离要求

### Requirement: BPMN 编辑器样式隔离

Ant Design 样式 MUST NOT 影响 BPMN 编辑器画布的渲染。BPMN 画布区域 SHALL 使用样式隔离机制。

#### Scenario: BPMN 画布独立样式

- **WHEN** BPMN 画布渲染
- **THEN** BPMN 画布容器添加 `data-bpmn-scope` 属性
- **AND** Ant Design 全局样式不应用于 `[data-bpmn-scope]` 区域
- **AND** BPMN 元素样式保持原有效果
- **AND** 属性面板(bpmn-js-properties-panel)样式不受 Ant Design 影响

#### Scenario: 工具栏和侧边栏使用 Ant Design

- **WHEN** BPMN 编辑器包含工具栏和侧边栏
- **THEN** 工具栏按钮使用 `a-button`
- **AND** 侧边栏面板使用 `a-drawer` 或 `a-layout-sider`
- **AND** 工具栏和画布样式明确隔离

## 性能要求

### Requirement: 打包体积控制

集成 Ant Design 后,打包体积增加 MUST 在可接受范围内。应用程序 SHALL 实现组件按需加载以优化打包体积。

#### Scenario: 按需加载验证

- **WHEN** 构建生产版本
- **THEN** 只打包实际使用的 Ant Design 组件
- **AND** Ant Design 相关资源大小不超过 250KB (gzipped)
- **AND** 总打包体积增加不超过 30%

#### Scenario: 首屏加载性能

- **WHEN** 用户首次访问应用
- **THEN** 首屏加载时间增加不超过 15%
- **AND** Ant Design 样式文件在关键路径之外异步加载
- **AND** 非关键组件延迟加载

## 可访问性要求

### Requirement: 增强的可访问性支持

应用程序 MUST 利用 Ant Design 的 ARIA 支持,提升应用的可访问性。所有交互组件 SHALL 支持键盘导航和屏幕阅读器。

#### Scenario: 键盘导航

- **WHEN** 用户使用键盘操作
- **THEN** 所有 Ant Design 交互组件支持 Tab 键导航
- **AND** 焦点顺序符合逻辑
- **AND** 对话框和弹窗支持 Esc 键关闭
- **AND** 表单支持 Enter 键提交

#### Scenario: 屏幕阅读器支持

- **WHEN** 使用屏幕阅读器访问应用
- **THEN** 所有 Ant Design 组件包含适当的 ARIA 标签
- **AND** 交互元素有明确的 aria-label
- **AND** 表单验证错误可被屏幕阅读器读取
- **AND** 动态内容变化有 aria-live 通知

## 兼容性要求

### Requirement: 浏览器和 Vue 版本兼容

Ant Design 集成 MUST 与现有技术栈兼容。所有 Ant Design 组件 SHALL 完全支持 Vue 3 Composition API 和 TypeScript。

#### Scenario: Vue 3 兼容性

- **WHEN** 使用 Ant Design 组件
- **THEN** 所有组件兼容 Vue 3 Composition API
- **AND** 组件支持 `<script setup>` 语法
- **AND** 组件 Props 和 Emits 有完整的 TypeScript 类型
- **AND** 组件支持 Vue 3 响应式系统(ref、reactive、computed)

#### Scenario: TypeScript 支持

- **WHEN** 开发者使用 TypeScript 编写组件
- **THEN** Ant Design 组件有完整的类型定义
- **AND** IDE 提供组件 Props 自动补全
- **AND** 类型错误在编译时检测

#### Scenario: 浏览器兼容性

- **WHEN** 用户在不同浏览器访问应用
- **THEN** Ant Design 组件在 Chrome/Edge/Firefox/Safari 最新版本正常工作
- **AND** 支持的最低浏览器版本与 Vue 3 要求一致
- **AND** 不支持 IE 浏览器

## 已知问题和解决方案

### Requirement: 构建配置优化

为确保 Ant Design 与项目现有依赖(bpmn-js、diagram-js)兼容,构建配置 MUST 包含特定优化。

#### Scenario: Vue ref 警告修复

- **WHEN** 使用 Ant Design 组件
- **THEN** Vite 配置中禁用静态提升(hoistStatic: false)
- **AND** 无 Vue ref 警告出现

#### Scenario: diagram-js 依赖处理

- **WHEN** 构建包含 BPMN 编辑器的应用
- **THEN** diagram-js/lib/navigation/touch 配置为外部依赖
- **AND** hammerjs 正确解析(别名配置)
- **AND** CommonJS 模块支持已配置

#### Scenario: Vite 依赖优化

- **WHEN** 启动开发服务器
- **THEN** Ant Design 依赖自动预优化
- **AND** 清除 .vite 缓存后无错误
- **AND** 开发服务器正常启动
