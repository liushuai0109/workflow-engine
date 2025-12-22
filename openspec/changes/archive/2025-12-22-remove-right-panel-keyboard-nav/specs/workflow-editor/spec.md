## MODIFIED Requirements

### Requirement: Tab 导航迁移

Tab 导航 MUST 使用 Ant Design Tabs 组件,并 SHALL 提供一致的切换体验。所有 Tab 切换界面 SHALL 使用 `a-tabs` 和 `a-tab-pane` 实现。Tab 切换 SHALL 通过点击 Tab 标签完成,不支持键盘左右箭头导航。

#### Scenario: 右侧面板 Tab 切换

- **WHEN** 用户在右侧面板中切换 Tab
- **THEN** 使用 `a-tabs` 组件实现 Tab 导航
- **AND** Tab 包括:属性(SettingOutlined)、AI 助手(RobotOutlined)、Mock(ThunderboltOutlined)、Debug(BugOutlined)、拦截器(FilterOutlined)
- **AND** 每个 Tab 图标和文字间距为 5px
- **AND** 激活的 Tab 高亮显示
- **AND** Tab 切换时内容平滑过渡
- **AND** 支持 `keep-alive` 保持非激活面板状态
- **AND** 通过点击 Tab 标签进行切换,不响应键盘左右箭头

#### Scenario: Tab 样式定制

- **WHEN** Tab 导航渲染
- **THEN** 使用 type="card" 或 "line" 样式
- **AND** Tab 文字大小和间距符合设计规范
- **AND** 移除不必要的关闭按钮
- **AND** 容器元素不设置 `tabindex` 属性
- **AND** 不监听 `keydown` 事件用于 Tab 切换
