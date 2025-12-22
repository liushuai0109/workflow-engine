# 设计文档: Ant Design 框架集成

## 架构设计

### 整体架构

```
client/
├── src/
│   ├── main.ts                    # 引入 Ant Design 全局配置
│   ├── components/
│   │   ├── ChatBox.vue            # 迁移到 Ant Design
│   │   ├── RightPanelContainer.vue # 迁移到 Ant Design
│   │   └── ...
│   └── style.css                  # 保留全局样式,减少自定义代码
└── package.json                   # 添加 Ant Design 依赖
```

### 依赖关系

```
Vue 3 App
    │
    ├─> Ant Design Vue (UI 组件库)
    │   ├─> 基础组件 (Button, Input, Select, etc.)
    │   ├─> 复杂组件 (Form, Table, Modal, etc.)
    │   └─> 主题系统
    │
    ├─> @ant-design/icons-vue (图标库)
    │
    ├─> bpmn-js (BPMN 编辑器 - 独立样式)
    │
    └─> 业务组件
        ├─> 使用 Ant Design 组件构建
        └─> 最小化自定义样式
```

## 技术选型

### Ant Design Vue 版本

- **版本**: `^4.2.6` (最新稳定版)
- **依赖**:
  - `ant-design-vue`: 核心组件库
  - `@ant-design/icons-vue`: 图标库
- **可选依赖**:
  - `less`: 用于主题定制 (如需要)

### 按需加载配置

Ant Design Vue 4.x 支持自动按需引入,配合 Vite 的 tree-shaking 特性:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          hoistStatic: false // 修复 Ant Design ref 警告
        }
      }
    })
  ]
})
```

## 主题配置

### 设计令牌映射

将当前自定义样式映射到 Ant Design 设计令牌:

| 当前样式 | Ant Design 令牌 | 默认值 |
|---------|----------------|-------|
| 主色 | `@primary-color` | `#1890ff` |
| 成功色 | `@success-color` | `#52c41a` |
| 警告色 | `@warning-color` | `#faad14` |
| 错误色 | `@error-color` | `#ff4d4f` |
| 文本色 | `@text-color` | `rgba(0,0,0,0.85)` |
| 次要文本 | `@text-color-secondary` | `rgba(0,0,0,0.45)` |
| 边框色 | `@border-color-base` | `#d9d9d9` |
| 背景色 | `@background-color-light` | `#fafafa` |
| 边框圆角 | `@border-radius-base` | `2px` |
| 阴影 | `@box-shadow-base` | `0 3px 6px -4px rgba(0,0,0,.12)` |

### 全局配置

```typescript
// src/main.ts
import { createApp } from 'vue'
import Ant Design from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)
app.use(Ant Design)
```

## 组件迁移策略

### 迁移模式

#### 模式 1: 直接替换
适用于简单组件,直接用 Ant Design 组件替换原生 HTML 元素。

**示例**: Button 迁移
```vue
<!-- 迁移前 -->
<button class="header-btn" @click="onClick">按钮</button>

<!-- 迁移后 -->
<a-button type="primary" size="small" @click="onClick">按钮</a-button>
```

#### 模式 2: 组合封装
适用于复杂组件,使用多个 Ant Design 组件组合实现。

**示例**: ChatBox 消息列表
```vue
<!-- 迁移前 -->
<div class="message" :class="message.role">
  <div class="message-avatar">{{ avatar }}</div>
  <div class="message-content">{{ content }}</div>
</div>

<!-- 迁移后 -->
<a-comment
  :avatar="avatar"
  :content="content"
  :datetime="timestamp"
/>
```

#### 模式 3: 保留定制
适用于高度定制的组件,保留核心逻辑,仅使用 Ant Design 基础组件。

**示例**: BpmnEditor
```vue
<!-- 保留 BPMN 画布,仅工具栏使用 Ant Design -->
<div class="bpmn-editor">
  <a-layout-header class="toolbar">
    <a-space>
      <a-button>保存</a-button>
      <a-button>导出</a-button>
    </a-space>
  </a-layout-header>
  <div ref="bpmnCanvas" class="canvas"></div>
</div>
```

### 关键组件迁移方案

#### 1. ChatBox 组件

**当前实现**: 自定义对话框,手动实现拖拽、最小化、消息列表

**迁移方案**:
- 使用 `a-modal` 作为容器 (支持拖拽)
- 使用 `a-list` 展示消息列表
- 使用 `a-textarea` + `a-button` 构建输入区
- 使用 `a-spin` 显示加载状态
- 保留会话管理逻辑,使用 `a-menu` 展示会话列表

**依赖组件**:
- `a-modal`: 对话框容器
- `a-list`: 消息列表
- `a-list-item`: 消息项
- `a-textarea`: 输入框
- `a-button`: 按钮
- `a-spin`: 加载指示器
- `a-menu`: 会话列表

#### 2. RightPanelContainer 组件

**当前实现**: 自定义 Tab 切换,手动管理激活状态

**迁移方案**:
- 使用 `a-tabs` 替换自定义 Tab 导航
- 使用 `a-tab-pane` 包装面板内容
- 保留 Properties Panel 的独立挂载点
- 使用 `keep-alive` 保持面板状态

**依赖组件**:
- `a-tabs`: Tab 容器
- `a-tab-pane`: Tab 面板

#### 3. MockControlPanel 组件

**当前实现**: 自定义表单和控制按钮

**迁移方案**:
- 使用 `a-form` 构建配置表单
- 使用 `a-form-item` 包装表单项
- 使用 `a-select` 替换下拉选择
- 使用 `a-input` 替换输入框
- 使用 `a-button` 统一按钮样式
- 使用 `a-collapse` 组织复杂配置项

**依赖组件**:
- `a-form`: 表单容器
- `a-form-item`: 表单项
- `a-select`: 下拉选择
- `a-input`: 输入框
- `a-button`: 按钮
- `a-collapse`: 折叠面板

#### 4. ExecutionTimeline 组件

**当前实现**: 自定义时间轴展示

**迁移方案**:
- 直接使用 `a-timeline` 组件
- 使用 `a-timeline-item` 展示每个执行步骤
- 使用 Ant Design Icons 表示状态

**依赖组件**:
- `a-timeline`: 时间轴
- `a-timeline-item`: 时间轴项
- `@ant-design/icons-vue`: 图标

## 样式隔离策略

### BPMN 编辑器样式隔离

由于 bpmn-js 有自己的样式系统,需要确保 Ant Design 样式不影响 BPMN 画布:

```vue
<template>
  <div class="bpmn-editor-wrapper">
    <!-- Ant Design 样式区域 -->
    <div class="toolbar">
      <a-button>工具栏按钮</a-button>
    </div>

    <!-- BPMN 样式隔离区域 -->
    <div class="bpmn-canvas-container" data-bpmn-scope>
      <div ref="canvas"></div>
    </div>
  </div>
</template>

<style scoped>
/* Ant Design 样式仅应用于非 bpmn-scope 区域 */
.toolbar {
  /* Ant Design 样式正常工作 */
}

/* BPMN 区域保持独立 */
.bpmn-canvas-container {
  isolation: isolate; /* CSS isolation */
}

/* 防止 Ant Design 全局样式影响 BPMN */
[data-bpmn-scope] * {
  all: revert; /* 重置所有样式 */
}
</style>
```

### CSS 命名空间

为 Ant Design 和自定义样式建立明确的命名空间:

- Ant Design 组件: `ant-*` 前缀 (默认)
- 自定义业务组件: `app-*` 前缀
- BPMN 相关: `bpmn-*` 前缀
- 工具类: `u-*` 前缀 (utility)

## 性能优化

### 按需加载

Ant Design Vue 4.x 支持自动按需引入:

```typescript
// 不需要手动配置按需加载插件
import { Button, Input, Modal } from 'ant-design-vue';
// Vite 会自动只打包使用的组件
```

### 组件懒加载

对于大型组件(如 Table、DatePicker),使用异步加载:

```typescript
import { defineAsyncComponent } from 'vue';

const ATable = defineAsyncComponent(() =>
  import('ant-design-vue').then(m => m.Table)
);
```

### 样式按需引入

只引入使用的组件样式:

```typescript
// main.ts
// 引入全局重置样式
import 'ant-design-vue/dist/reset.css';

// 组件样式会自动按需加载
```

## 类型定义

### 全局类型扩展

```typescript
// src/types/ant-design.d.ts
import { message, Modal } from 'ant-design-vue';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $message: typeof message;
    $modal: typeof Modal;
  }
}
```

### 组件 Props 类型

利用 Ant Design 提供的 TypeScript 类型:

```typescript
import type { ButtonProps, InputProps } from 'ant-design-vue';

interface CustomButtonProps extends ButtonProps {
  customProp?: string;
}
```

## 迁移检查清单

### 开发环境配置
- [x] 安装 Ant Design 相关依赖
- [x] 配置 Vite 构建选项
- [x] 配置 TypeScript 类型定义
- [x] 引入全局样式

### 组件迁移
- [x] 创建组件迁移优先级列表
- [x] RightPanelContainer 迁移到 a-tabs
- [x] ChatBox 迁移到 Ant Design 组件
- [x] MockControlPanel 迁移
- [x] DebugControlPanel 迁移
- [x] InterceptorControlPanel 迁移
- [x] BpmnEditorPage 工具栏迁移

### 样式清理
- [x] 移除未使用的自定义 CSS
- [x] 统一使用 Ant Design 设计令牌
- [x] 确保 BPMN 样式隔离

### 测试验证
- [x] 单元测试更新
- [x] E2E 测试验证
- [x] 视觉验证
- [x] 性能基准测试

### 文档更新
- [ ] 更新组件开发指南
- [ ] 添加 Ant Design 使用示例
- [ ] 更新项目 README
- [ ] 更新设计规范文档

## 风险缓解措施

### 1. 样式冲突
**风险**: Ant Design 全局样式与现有样式冲突

**缓解**:
- 使用 CSS Modules 或 scoped styles
- 为 BPMN 区域添加样式隔离
- 逐步迁移,避免大范围改动

### 2. 功能回退
**风险**: 迁移后某些功能不可用

**缓解**:
- 为每个组件编写迁移前后对比测试
- 保留关键功能的原实现作为 fallback
- 充分的 E2E 测试覆盖

### 3. 打包体积增加
**风险**: 引入 Ant Design 导致包体积显著增加

**缓解**:
- 配置按需加载
- 使用 Bundle Analyzer 监控体积
- 移除未使用的组件和样式

### 4. 学习曲线
**风险**: 团队不熟悉 Ant Design API

**缓解**:
- 提供详细的迁移指南和示例
- 建立 Ant Design 组件使用规范
- Code Review 确保正确使用

## 回滚策略

如果迁移过程中遇到严重问题,可以通过以下步骤回滚:

1. **分支管理**: 在独立分支进行迁移,主分支保持稳定
2. **版本控制**: 每个迁移阶段提交独立 commit,便于回滚
3. **功能开关**: 使用 feature flag 控制新旧组件切换
4. **降级方案**: 保留关键组件的原实现,作为降级选项

```typescript
// 示例: 功能开关
const USE_ANT_DESIGN = import.meta.env.VITE_USE_ANT_DESIGN === 'true';

const ButtonComponent = USE_ANT_DESIGN ? AButton : CustomButton;
```

## 参考资源

- [Ant Design Vue 官方文档](https://antdv.com/)
- [Ant Design Vue GitHub](https://github.com/vueComponent/ant-design-vue)
- [Ant Design 设计指南](https://ant.design/docs/spec/introduce-cn)
- [Vite 构建优化](https://vitejs.dev/guide/build.html)
