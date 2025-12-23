# workflow-editor 规范增量

## ADDED Requirements

### Requirement: Mock 面板拦截器列表展示

Mock 控制面板 MUST 提供清晰的拦截器调用列表,展示工作流执行过程中触发的所有拦截器。

#### Scenario: 展示拦截器调用列表

- **WHEN** 工作流执行完成且包含拦截器调用
- **THEN** Mock 面板的"拦截器调用"tab 显示拦截器列表
- **AND** 每个列表项包含序号徽章、拦截器名称、执行时间戳
- **AND** 列表项按执行顺序排列(序号从小到大)
- **AND** 列表可滚动,支持查看大量拦截器调用

#### Scenario: 拦截器列表项交互

- **WHEN** 用户点击拦截器列表项
- **THEN** 该列表项显示高亮(active)状态
- **AND** 下方详情区域显示该拦截器的详细信息
- **AND** 列表项 hover 时显示视觉反馈(边框或背景色变化)

#### Scenario: 拦截器模式切换

- **WHEN** 用户在列表项中切换拦截器模式
- **THEN** 提供"记录"、"Mock"、"禁用"三种模式选项
- **AND** 模式切换控件使用 `a-radio-group` 组件(button-style="solid")
- **AND** 当前模式状态清晰可见
- **AND** 模式切换不影响当前选中状态

#### Scenario: 空列表状态

- **WHEN** 工作流尚未执行或执行过程中无拦截器调用
- **THEN** 显示空状态提示"暂无拦截器调用记录"
- **AND** 空状态样式清晰友好,不显示空白区域

### Requirement: 拦截器详情视图

Mock 控制面板 MUST 提供拦截器详情视图,使用 Tabs 形式展示拦截器的入参和回包数据。

#### Scenario: 详情区域分屏布局

- **WHEN** 用户查看"拦截器调用"tab
- **THEN** 使用分屏布局(split-panel),上半部分显示列表,下半部分显示详情
- **AND** 上下两部分之间有可视分割线
- **AND** 两部分高度占比合理,详情区域有足够空间展示数据

#### Scenario: 详情 Tabs 切换

- **WHEN** 用户选中一个拦截器
- **THEN** 详情区域显示 `a-tabs` 组件,包含"入参"和"回包"两个 tab
- **AND** 默认显示"入参" tab
- **AND** 点击 tab 标签可切换视图
- **AND** Tab 切换响应迅速,无延迟感

#### Scenario: 入参数据展示

- **WHEN** 用户查看"入参" tab
- **THEN** 显示该拦截器调用的输入参数,以 JSON 格式呈现
- **AND** JSON 数据使用等宽字体,缩进为 2 个空格
- **AND** JSON 数据在 textarea 中展示,支持滚动查看
- **AND** 如果入参为空或不存在,显示占位符"暂无入参数据"

#### Scenario: 回包数据展示

- **WHEN** 用户查看"回包" tab
- **THEN** 显示该拦截器调用的输出结果,以 JSON 格式呈现
- **AND** JSON 数据使用等宽字体,缩进为 2 个空格
- **AND** JSON 数据在 textarea 中展示,支持滚动查看
- **AND** 如果回包为空或不存在,显示占位符"暂无回包数据"

#### Scenario: 未选中拦截器的空状态

- **WHEN** 用户尚未点击任何拦截器列表项
- **THEN** 详情区域显示提示"请选择拦截器查看详情"
- **AND** 空状态样式清晰友好,引导用户操作

### Requirement: 拦截器数据格式化

Mock 控制面板 MUST 对拦截器的入参和回包数据进行格式化,确保 JSON 数据清晰易读。

#### Scenario: JSON 自动格式化

- **WHEN** 拦截器详情数据加载
- **THEN** 入参和回包的 JSON 对象自动格式化为可读形式
- **AND** 使用 `JSON.stringify(obj, null, 2)` 进行格式化
- **AND** 缩进层次清晰,嵌套结构易于识别

#### Scenario: 时间戳格式化

- **WHEN** 拦截器列表项显示时间戳
- **THEN** 时间戳自动转换为本地时间格式
- **AND** 使用 `toLocaleTimeString()` 格式化为用户友好的时间字符串
- **AND** 如果时间戳无效,显示原始字符串

#### Scenario: 大型 JSON 数据处理

- **WHEN** 拦截器入参或回包包含大型 JSON 对象(> 1000 行)
- **THEN** JSON 数据仍然完整显示在 textarea 中
- **AND** textarea 支持滚动查看完整数据
- **AND** 格式化过程不应导致明显延迟(< 100ms)

### Requirement: 拦截器详情视图样式

Mock 控制面板的拦截器详情视图 MUST 使用清晰的视觉设计,确保在演示场景中效果良好。

#### Scenario: 列表项视觉设计

- **WHEN** 拦截器列表渲染
- **THEN** 序号徽章使用圆形设计,背景色为主题蓝色(#1890ff)
- **AND** 序号徽章宽高为 24px,字体大小 12px,居中对齐
- **AND** 拦截器名称使用 12px 字体,字重 500,支持长名称截断
- **AND** 时间戳使用 11px 字体,灰色(#999),右对齐

#### Scenario: 列表项交互状态

- **WHEN** 用户与拦截器列表交互
- **THEN** 默认状态:白色背景,浅灰色边框(#e8e8e8)
- **AND** Hover 状态:浅灰背景(#f5f5f5),蓝色边框(#1890ff)
- **AND** Active 状态:浅蓝背景(#e6f7ff),蓝色边框(#1890ff)
- **AND** 状态过渡使用 0.2s 的 transition 动画

#### Scenario: 详情区域样式

- **WHEN** 拦截器详情展示
- **THEN** 详情区域使用浅灰背景(#fafafa)
- **AND** 面板标题使用 13px 字体,字重 600
- **AND** Tabs 组件使用 line 类型,size 为 small
- **AND** JSON textarea 使用等宽字体('Monaco', 'Menlo', 'Courier New')
- **AND** JSON textarea 最小高度 150px,边框颜色 #e8e8e8

#### Scenario: 空状态样式

- **WHEN** 显示空状态提示
- **THEN** 空状态使用居中对齐,灰色文本(#999)
- **AND** 空状态背景为白色,带浅灰色边框
- **AND** 空状态 padding 为 16px,边框圆角 4px
- **AND** 空状态字体大小 12px

## MODIFIED Requirements

无

## REMOVED Requirements

无

## Cross-References

- 关联到 `backend-server` 规范:拦截器调用数据结构
  - `interceptorCalls` 数组包含所有拦截器调用记录
  - 每条记录包含 `name`、`order`、`timestamp`、`input`、`output` 字段

- 关联到现有 Mock 控制面板功能:
  - 已有的"请求/回包" tab 展示 API 级别的数据
  - 新增的"拦截器调用" tab 展示拦截器级别的数据
  - 两者共享同一个 Mock 控制面板组件(`MockControlPanel.vue`)

## Implementation Notes

1. **组件结构**:
   - 拦截器列表使用 `v-for` 循环渲染 `lastResult.interceptorCalls`
   - 选中状态通过 `selectedInterceptor` ref 跟踪
   - 详情数据通过 `selectedInterceptorDetails` computed 计算

2. **数据流**:
   - 工作流执行 API 返回 `interceptorCalls` 数组
   - 前端将数据存储在 `lastResult.value.interceptorCalls`
   - 用户点击列表项更新 `selectedInterceptor`
   - 详情视图自动响应 `selectedInterceptor` 变化

3. **样式实现**:
   - 使用 scoped CSS 确保样式隔离
   - 列表项使用 flex 布局
   - 分屏布局使用 flexbox,上下比例可根据需要调整
   - Ant Design 组件使用默认主题色

4. **性能考虑**:
   - 拦截器列表通常不超过 50 条,不需要虚拟滚动
   - JSON 格式化在 computed 中进行,自动缓存
   - Tab 切换不触发数据重新加载

5. **可访问性**:
   - 列表项可通过键盘导航(原生 div 的 tabindex)
   - Tab 切换支持键盘操作(Ant Design 原生支持)
   - 空状态提示清晰,不依赖视觉线索
