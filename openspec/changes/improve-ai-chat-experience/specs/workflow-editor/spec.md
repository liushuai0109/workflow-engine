# Workflow Editor Spec - Layout and Styling Improvements

## MODIFIED Requirements

### Requirement: BPMN Editor Layout

The BPMN editor MUST fill 100% of the available container height to ensure proper canvas display without scrolling. The system SHALL display a full-screen loading overlay with appropriate messaging when the AI is processing diagram operations.

#### Scenario: Editor fills container height
**Given** the BPMN editor is displayed in the main content area
**When** the page is loaded
**Then** the editor should fill 100% of the available container height
**And** the editor canvas should be fully visible without scrolling

**Technical Notes:**
- Apply `height: 100%` to the full chain:
  - `.editor-container :deep(.ant-spin-nested-loading)`
  - `.editor-container :deep(.ant-spin-nested-loading .ant-spin-container)`
  - `.editor-container :deep(.bpmn-editor)`
- Use descendant selectors, not direct child selectors

#### Scenario: AI processing overlay on editor
**Given** the AI is processing a user request
**When** the AI is creating or modifying the diagram
**Then** a full-screen loading overlay should appear over the editor
**And** the overlay should show "AI 正在处理流程图..." message
**And** the overlay should use Ant Design Spin component with large size

**Technical Notes:**
- Wrap BpmnEditor with `<a-spin :spinning="isAIProcessing" tip="...">`
- Use `isAIProcessing` ref to control overlay state
- Overlay should prevent user interaction during processing

### Requirement: Right Panel Tab Styling

The right panel tab labels MUST have consistent icon-text spacing of 5px and use appropriate Ant Design icons. All tabs SHALL follow the same spacing and styling pattern to ensure visual consistency.

#### Scenario: Tab icons have consistent spacing
**Given** the right panel tabs are displayed
**When** the user views any tab (属性, AI 助手, Mock, Debug, 拦截器)
**Then** each tab icon should be 5px away from its label text
**And** the spacing should be consistent across all tabs

**Technical Notes:**
- Add `.tab-label` class wrapper for each tab
- Use `display: inline-flex` with `gap: 5px`
- Apply to all tabs: properties, chat, mock, debug, interceptor

#### Scenario: Tab icons match functionality
**Given** the right panel tabs are displayed
**Then** each tab should have an appropriate Ant Design icon:
  - 属性: `<SettingOutlined />`
  - AI 助手: `<RobotOutlined />`
  - Mock: `<ThunderboltOutlined />`
  - Debug: `<BugOutlined />`
  - 拦截器: `<FilterOutlined />`

**Technical Notes:**
- Import icons from `@ant-design/icons-vue`
- Icons should be semantic and recognizable

## Cross-references

- Relates to: **ai-integration** spec (AI processing states)
- Depends on: **integrate-antd-framework** change (Ant Design components and icons)
