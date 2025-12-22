# workflow-editor 规范增量

## ADDED Requirements

### Requirement: 统一的右侧面板布局

工作流编辑器 SHALL 提供统一的右侧面板容器，将所有控制面板整合在一个 Tab 导航系统中。

#### Scenario: 显示统一的右侧面板

- **WHEN** 操作员打开工作流编辑器并加载工作流
- **THEN** 右侧显示一个统一的面板容器
- **AND** 面板容器包含 Tab 导航栏，显示 4 个标签：属性、Mock、Debug、拦截器
- **AND** 默认激活"属性" Tab

#### Scenario: Tab 切换功能

- **WHEN** 操作员点击 Tab 导航栏中的不同标签
- **THEN** 面板内容区切换到对应的功能面板
- **AND** 当前激活的 Tab 有视觉高亮显示
- **AND** 切换 Tab 时不会丢失面板内的状态和数据

#### Scenario: 通过工具栏按钮激活对应 Tab

- **WHEN** 操作员点击工具栏的 Mock 按钮
- **THEN** 右侧面板自动切换到"Mock" Tab
- **AND** Mock 控制面板显示在面板内容区

- **WHEN** 操作员点击工具栏的 Debug 按钮
- **THEN** 右侧面板自动切换到"Debug" Tab
- **AND** Debug 控制面板显示在面板内容区

- **WHEN** 操作员点击工具栏的 Interceptor 按钮
- **THEN** 右侧面板自动切换到"拦截器" Tab
- **AND** Interceptor 控制面板显示在面板内容区

#### Scenario: Properties Panel 在 Tab 系统中正常工作

- **WHEN** 操作员选择工作流中的元素
- **THEN** 右侧面板自动切换到"属性" Tab（如果不在该 Tab）
- **AND** 属性面板显示所选元素的属性
- **AND** 操作员可以编辑属性并保存

#### Scenario: 面板状态保持

- **WHEN** 操作员在 Mock 面板启动执行并切换到其他 Tab
- **THEN** Mock 执行继续在后台运行
- **AND** 当操作员切回 Mock Tab 时，执行状态和数据完整保留

- **WHEN** 操作员在 Debug 面板设置断点并切换到其他 Tab
- **THEN** 断点设置被保留
- **AND** 当操作员切回 Debug Tab 时，断点列表完整显示

#### Scenario: 面板宽度和布局

- **WHEN** 操作员查看右侧面板
- **THEN** 面板宽度固定为 400px
- **AND** 面板高度占满编辑器主内容区的高度
- **AND** 面板内容可滚动（当内容超出可视区域时）

#### Scenario: 无浮动窗口遮挡

- **WHEN** 操作员使用 Mock、Debug 或 Interceptor 功能
- **THEN** 不会有浮动窗口覆盖在编辑器画布上
- **AND** 所有控制面板都嵌入在右侧固定面板中
- **AND** 编辑器画布保持完整可见

## MODIFIED Requirements

### Requirement: 增强的属性面板

工作流编辑器 SHALL 在统一的右侧面板容器中提供增强的属性面板，支持元素选择时的自动 Tab 切换。

#### Scenario: 上下文属性显示

- **WHEN** 操作员选择不同的元素类型
- **THEN** 右侧面板 SHALL 自动切换到"属性" Tab
- **AND** 属性面板 SHALL 显示上下文相关的字段
- **AND** 服务任务 SHALL 显示：操作类型、API 端点、参数、重试策略
- **AND** 用户任务 SHALL 显示：任务类型、通知设置、超时
- **AND** 网关 SHALL 显示：决策逻辑、分割比率、回退行为
