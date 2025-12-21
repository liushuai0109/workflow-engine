# Ant Design Vue 集成

## 概述

将前端 UI 组件库从 TDesign Vue 迁移到 Ant Design Vue，以提供更成熟稳定的组件支持和更好的文档。

## 变更内容

### 1. 依赖更新
- **移除**: `tdesign-vue-next`, `tdesign-icons-vue-next`
- **新增**: `ant-design-vue@^4.2.6`, `@ant-design/icons-vue@^7.0.1`

### 2. 组件迁移

#### 主要组件映射
- `t-tabs` → `a-tabs` (v-model:value → v-model:activeKey)
- `t-button` → `a-button` (theme → type)
- `t-textarea` → `a-textarea`
- `t-input` → `a-input`
- `t-form` → `a-form`
- `t-tag` → `a-tag` (theme → type)
- `t-collapse` → `a-collapse`
- `t-alert` → `a-alert`
- `DialogPlugin` → `Modal.confirm`

#### 更新的组件文件
- `client/src/main.ts` - 全局注册 Ant Design
- `client/src/components/RightPanelContainer.vue` - 右侧面板容器
- `client/src/components/ChatBox.vue` - AI 聊天框
- `client/src/components/MockControlPanel.vue` - Mock 控制面板
- `client/src/components/DebugControlPanel.vue` - Debug 控制面板
- `client/src/components/InterceptorControlPanel.vue` - 拦截器控制面板
- `client/src/pages/BpmnEditorPage.vue` - BPMN 编辑器页面

### 3. 样式更新

#### Ant Design 设计系统
- **主色**: #1890ff
- **成功色**: #52c41a
- **警告色**: #faad14
- **错误色**: #ff4d4f
- **文本色**: rgba(0, 0, 0, 0.85)
- **次要文本**: rgba(0, 0, 0, 0.45)
- **边框色**: #d9d9d9
- **背景色**: #fafafa

#### 组件样式优化
- AI 聊天框完全采用 Ant Design 设计风格
- 输入框和按钮使用 Ant Design 标准样式
- 消息气泡、头像、按钮等统一为 Ant Design 风格
- 添加标准的 hover、focus 状态效果

### 4. 图标集成
- 工具栏按钮使用 `@ant-design/icons-vue`:
  - `FolderOpenOutlined` - 打开文件
  - `SaveOutlined` - 保存文件
  - `FileAddOutlined` - 新建文件
  - `LineChartOutlined` - 流量可视化
- 右侧面板 Tab 图标:
  - `SettingOutlined` - 属性
  - `RobotOutlined` - AI 助手
  - `ThunderboltOutlined` - Mock
  - `BugOutlined` - Debug
  - `FilterOutlined` - 拦截器

### 5. 构建配置优化

#### vite.config.ts 调整
```typescript
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          hoistStatic: false // 修复 Ant Design ref 警告
        }
      }
    })
  ],
  resolve: {
    alias: {
      'hammerjs': 'hammerjs/hammer.js'
    }
  },
  optimizeDeps: {
    exclude: ['diagram-js/lib/navigation/touch'],
    include: ['hammerjs']
  },
  build: {
    commonjsOptions: {
      include: [/hammerjs/, /node_modules/]
    },
    rollupOptions: {
      external: ['diagram-js/lib/navigation/touch']
    }
  }
})
```

### 6. 删除的文件
- `client/src/tdesign.config.ts`
- `client/src/theme/` 目录
- `client/src/components/common/` 目录

## UI 改进

### 聊天界面
- ✅ 修复消息气泡溢出问题
- ✅ 修复输入框和发送按钮被遮盖问题
- ✅ 统一 Ant Design 设计风格
- ✅ 输入框和按钮采用 Ant Design 标准样式
- ✅ 图标和文字间距优化为 5px

### 控制面板
- ✅ 移除不必要的关闭按钮（通过 Tab 切换管理）
- ✅ 统一 Ant Design 样式

### 工具栏
- ✅ 替换 emoji 图标为 Ant Design 图标组件

## 已修复的问题

1. **TDesign Tabs 加载错误**: addEventListener 未定义
2. **Vite 依赖缓存错误**: 通过清除 .vite 缓存解决
3. **Vue ref 警告**: 禁用静态提升
4. **diagram-js 模块解析错误**: 添加外部依赖排除
5. **hammerjs ES6 导入错误**: 添加 CommonJS 支持
6. **AI 聊天布局问题**: 重构 DOM 结构和 flex 布局

## 测试验证

- [x] 页面正常加载，无控制台错误
- [x] 所有 Tab 可正常切换
- [x] AI 聊天功能正常
- [x] Mock/Debug/拦截器面板正常工作
- [x] BPMN 编辑器正常工作
- [x] Properties Panel 正常挂载

## 版本信息

- Ant Design Vue: 4.2.6
- @ant-design/icons-vue: 7.0.1
- Vue: 3.x
- Vite: 最新稳定版
