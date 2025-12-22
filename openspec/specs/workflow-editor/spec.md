# workflow-editor 规范

## Purpose
工作流编辑器规范定义了 BPMN 工作流编辑器的功能需求，包括生命周期阶段分配、用户分群定位、触发条件配置、工作流元数据管理和 AI 驱动的智能工作流生成能力。
## Requirements
### Requirement: 生命周期阶段分配

工作流编辑器 MUST 允许操作员将 AARRR 生命周期阶段分配给工作流元素。

#### Scenario: 为任务分配生命周期阶段

- **WHEN** 操作员选择工作流任务元素
- **THEN** 属性面板显示生命周期阶段下拉菜单
- **AND** 可用阶段包括：Acquisition（获取）、Activation（激活）、Retention（留存）、Revenue（收益）、Referral（推荐）
- **AND** 所选阶段持久化在工作流 XML 中

#### Scenario: 生命周期阶段的视觉指示

- **WHEN** 工作流元素已分配生命周期阶段
- **THEN** 元素显示指示阶段的彩色徽章
- **AND** 颜色方案遵循：Acquisition（蓝色）、Activation（绿色）、Retention（黄色）、Revenue（紫色）、Referral（橙色）

#### Scenario: 按生命周期阶段筛选元素

- **WHEN** 操作员应用生命周期阶段筛选器
- **THEN** 仅高亮显示与所选阶段匹配的元素
- **AND** 其他元素变暗

### Requirement: 用户分群定位

工作流编辑器 MUST 支持为工作流定位配置用户分群。

#### Scenario: 为工作流定义目标分群

- **WHEN** 操作员打开工作流属性
- **THEN** 提供用户分群构建器
- **AND** 可以按人口统计信息（年龄、位置、性别）定义分群
- **AND** 可以按行为（参与度、购买历史、会话计数）定义分群
- **AND** 可以使用 AND/OR 逻辑组合多个分群条件

#### Scenario: 预定义分群模板

- **WHEN** 操作员打开分群构建器
- **THEN** 提供预定义的分群模板
- **AND** 模板包括："新用户"、"活跃用户"、"流失风险用户"、"VIP 客户"、"休眠用户"
- **AND** 操作员可以自定义模板或创建自定义分群

#### Scenario: 将分群分配给工作流元素

- **WHEN** 操作员为任务元素分配分群
- **THEN** 该任务将仅对符合分群条件的用户执行
- **AND** 分群条件显示在属性面板中

### Requirement: 触发条件配置

工作流编辑器 MUST 支持定义工作流执行的触发条件。

#### Scenario: 基于时间的触发器

- **WHEN** 操作员配置开始事件
- **THEN** 提供基于时间的触发器选项
- **AND** 支持的触发器包括：scheduled（定时，cron）、delay（延迟，持续时间）、time window（时间窗口，开始/结束）
- **AND** 触发器时间表经过正确性验证

#### Scenario: 基于事件的触发器

- **WHEN** 操作员配置开始事件
- **THEN** 提供基于事件的触发器选项
- **AND** 支持的事件包括：user_signup（用户注册）、purchase_completed（完成购买）、page_viewed（查看页面）、session_started（开始会话）、milestone_reached（达到里程碑）
- **AND** 可以应用事件过滤器（例如，purchase_completed WHERE amount > 100）

#### Scenario: 数据阈值触发器

- **WHEN** 操作员配置网关决策
- **THEN** 提供数据阈值条件
- **AND** 条件可以比较用户属性（例如，engagement_score > 70）
- **AND** 可以使用逻辑运算符组合多个条件

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

### Requirement: 工作流版本控制支持

工作流编辑器 MUST 支持工作流变更的版本跟踪。

#### Scenario: 创建工作流版本

- **WHEN** 操作员保存对活动工作流的更改
- **THEN** 创建新版本
- **AND** 版本号遵循语义版本控制（major.minor.patch）
- **AND** 版本元数据包括：时间戳、作者、变更描述

#### Scenario: 查看版本历史

- **WHEN** 操作员打开版本历史
- **THEN** 列出所有先前版本及其元数据
- **AND** 操作员可以预览先前版本
- **AND** 操作员可以比较版本（差异视图）

#### Scenario: 回滚到先前版本

- **WHEN** 操作员选择先前版本
- **THEN** 提供回滚选项
- **AND** 回滚前需要确认
- **AND** 回滚创建新版本（非破坏性）

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

