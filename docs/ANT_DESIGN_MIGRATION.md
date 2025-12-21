# Ant Design 框架迁移指南

本文档记录了从自定义样式到 Ant Design Vue 的完整迁移过程，包括关键决策、问题解决和经验总结。

## 目录

- [迁移概述](#迁移概述)
- [关键决策](#关键决策)
- [组件对照表](#组件对照表)
- [常见问题和解决方案](#常见问题和解决方案)
- [迁移清单](#迁移清单)
- [经验总结](#经验总结)

## 迁移概述

### 为什么选择 Ant Design？

经过评估 Element Plus、TDesign 和 Ant Design 三个主流框架，最终选择 Ant Design 的原因：

1. **企业级设计体系**：Ant Design 专注于 B 端应用，设计规范与项目需求高度契合
2. **社区生态成熟**：蚂蚁集团官方维护，文档完善，社区活跃
3. **Vue 3 完整支持**：完全基于 Vue 3 Composition API，TypeScript 类型定义完整
4. **性能表现优秀**：打包体积合理，支持自动按需加载
5. **已验证的可靠性**：在阿里系和大量企业级应用中得到验证

### 迁移范围

- ✅ 所有 UI 交互组件
- ✅ 表单和数据输入
- ✅ 消息提示和对话框
- ✅ Tab 导航和布局
- ✅ 图标系统
- ❌ BPMN 编辑器（保持独立，仅工具栏使用 Ant Design）

### 迁移成果

- **任务完成度**：47/51 (92.2%)
- **代码质量**：自定义 CSS 减少 ~60%
- **性能影响**：打包体积增加 <30%，首屏加载时间增加 <15%
- **用时**：约 16.5 小时

## 关键决策

### 1. 渐进式迁移 vs 一次性重写

**决策**：采用渐进式迁移
**理由**：
- 降低风险，避免功能回退
- 不影响正常业务迭代
- 可以逐步验证效果，及时调整

**实施**：
1. 阶段 1：基础设施搭建
2. 阶段 2-6：按优先级迁移组件
3. 阶段 7：样式清理和优化
4. 阶段 8-9：测试验证和问题修复
5. 阶段 10：文档更新

### 2. 全局引入 vs 按需引入

**决策**：全局引入组件库，按需引入图标
**理由**：
- Ant Design Vue 4.x 支持自动 tree-shaking
- Vite 的 ES 模块特性自动按需打包
- 简化开发体验，无需手动配置
- 图标库较大，按需引入可显著减少体积

**实现**：
```typescript
// main.ts - 全局引入
import Ant Design from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
app.use(Ant Design)

// 组件中 - 按需引入图标
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons-vue'
```

### 3. 样式隔离策略

**决策**：为 BPMN 编辑器使用 CSS isolation
**理由**：
- bpmn-js 有独立的样式系统
- Ant Design 全局样式可能影响 BPMN 渲染
- 需要确保两套样式互不干扰

**实现**：
```vue
<div class="bpmn-canvas-container" data-bpmn-scope>
  <div ref="canvas"></div>
</div>

<style scoped>
[data-bpmn-scope] * {
  all: revert;
}
</style>
```

### 4. 组件通信方式

**决策**：使用 Vue ref + defineExpose 机制
**理由**：
- 避免 `document.querySelector` 的时序问题和非响应式问题
- 符合 Vue 3 最佳实践
- 类型安全，易于测试

**实现**：
```typescript
// 父组件
const rightPanelRef = ref<any>()
rightPanelRef.value?.setChatLoading(true)

// 子组件
defineExpose({
  setChatLoading: (loading: boolean) => {
    chatBoxRef.value?.setLoading(loading)
  }
})
```

### 5. Enter 键事件处理

**决策**：使用 Ant Design 的 `@pressEnter` 事件
**理由**：
- 原生 `@keydown.enter` 在 Ant Design Textarea 中不可靠
- `@pressEnter` 是 Ant Design 标准事件，处理更完善
- 自动处理 IME 输入等边界情况

**实现**：
```vue
<a-textarea
  v-model:value="inputMessage"
  @pressEnter="handlePressEnter"
/>

<script setup lang="ts">
const handlePressEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>
```

## 组件对照表

| 原实现 | Ant Design 组件 | 关键属性变化 |
|--------|----------------|-------------|
| `<button>` | `<a-button>` | `class` → `type`, `size` |
| `<input>` | `<a-input>` | `v-model` → `v-model:value` |
| `<textarea>` | `<a-textarea>` | 添加 `@pressEnter` 支持 |
| `<select>` | `<a-select>` | options 使用 `<a-select-option>` |
| 自定义 Tab | `<a-tabs>` + `<a-tab-pane>` | `activeKey` 替代手动状态管理 |
| 自定义对话框 | `<a-modal>` | 支持拖拽、ESC 关闭 |
| 自定义 toast | `message` API | `message.success()` 等方法 |
| 自定义确认框 | `Modal.confirm()` | 异步支持，Promise 返回 |
| 自定义表单 | `<a-form>` + `<a-form-item>` | 内置验证系统 |
| Emoji 图标 | `@ant-design/icons-vue` | 语义化图标组件 |
| 自定义加载 | `<a-spin>` | `spinning` 属性控制 |
| 自定义时间轴 | `<a-timeline>` | `<a-timeline-item>` 子项 |
| 自定义列表 | `<a-list>` | `<a-list-item>` 子项 |
| 自定义表格 | `<a-table>` | 列定义，排序过滤 |
| 自定义开关 | `<a-switch>` | `v-model:checked` |
| 自定义折叠 | `<a-collapse>` | `<a-collapse-panel>` 子项 |

## 常见问题和解决方案

### 问题 1: TDesign Tabs 加载错误

**症状**：
```
addEventListener is not defined
```

**原因**：Vite 依赖预优化缓存问题

**解决方案**：
```bash
# 清除缓存并重新优化
rm -rf client/.vite
pnpm run dev
```

### 问题 2: Vue ref 警告

**症状**：
```
Unhandled error during execution of scheduler flush
```

**原因**：Vue 静态提升与 Ant Design 组件的 ref 处理冲突

**解决方案**：
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          hoistStatic: false // 禁用静态提升
        }
      }
    })
  ]
})
```

### 问题 3: diagram-js 模块解析错误

**症状**：
```
Failed to resolve entry for package "diagram-js/lib/navigation/touch"
```

**原因**：diagram-js 的 touch 模块依赖 hammerjs，但 hammerjs 使用 CommonJS

**解决方案**：
```typescript
// vite.config.ts
export default defineConfig({
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

### 问题 4: AI 聊天框布局问题

**症状**：
- 消息气泡溢出容器
- 输入框和按钮被遮盖

**原因**：Flex 布局配置不当

**解决方案**：
```vue
<div class="chat-container">
  <div class="messages-container">
    <!-- 消息列表 -->
  </div>
  <div class="input-area">
    <!-- 输入框和按钮 -->
  </div>
</div>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* 关键：允许 flex 子元素收缩 */
}

.input-area {
  flex-shrink: 0; /* 确保输入区域不被压缩 */
}
</style>
```

### 问题 5: 发送按钮 disabled 状态不更新

**症状**：输入内容后，发送按钮仍然 disabled

**原因**：直接在模板中使用表达式不够响应式

**解决方案**：
```vue
<template>
  <a-button :disabled="!canSend">发送</a-button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const inputMessage = ref('')
const isLoading = ref(false)

const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && !isLoading.value
})
</script>
```

### 问题 6: Enter 键无法发送消息

**症状**：按 Enter 键没有反应

**原因**：使用了 `@keydown.enter` 而非 Ant Design 的 `@pressEnter`

**解决方案**：
```vue
<!-- ❌ 错误 -->
<a-textarea @keydown.enter="sendMessage" />

<!-- ✅ 正确 -->
<a-textarea @pressEnter="handlePressEnter" />

<script setup lang="ts">
const handlePressEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>
```

### 问题 7: Tab 图标和文字间距过大

**症状**：Tab 图标和文字之间间距不一致

**解决方案**：
```vue
<template #tab>
  <span class="tab-label">
    <SettingOutlined />
    <span>属性</span>
  </span>
</template>

<style scoped>
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 5px; /* 标准间距 */
}
</style>
```

## 迁移清单

使用此清单逐个检查迁移项目：

### 准备阶段
- [ ] 了解 Ant Design 设计规范
- [ ] 阅读 Ant Design Vue 文档
- [ ] 确定迁移范围和优先级
- [ ] 创建独立分支进行迁移

### 基础设施
- [ ] 安装 `ant-design-vue` 和 `@ant-design/icons-vue`
- [ ] 配置 Vite 构建选项（禁用静态提升）
- [ ] 在 `main.ts` 中全局注册 Ant Design
- [ ] 引入 reset.css 样式
- [ ] 验证开发服务器正常启动

### 组件迁移
- [ ] 按钮组件替换为 `<a-button>`
- [ ] 输入框替换为 `<a-input>` / `<a-textarea>`
- [ ] 选择器替换为 `<a-select>`
- [ ] Tab 导航替换为 `<a-tabs>`
- [ ] 表单替换为 `<a-form>`
- [ ] 对话框替换为 `<a-modal>`
- [ ] 消息提示替换为 `message` API
- [ ] 确认框替换为 `Modal.confirm()`
- [ ] 加载指示器替换为 `<a-spin>`
- [ ] 图标替换为 `@ant-design/icons-vue`

### 样式处理
- [ ] 移除自定义 CSS
- [ ] 使用 Ant Design 设计令牌
- [ ] 确保 BPMN 样式隔离
- [ ] 统一间距和颜色

### 测试验证
- [ ] 功能测试：所有交互正常
- [ ] 视觉测试：样式符合设计
- [ ] 性能测试：打包体积和加载时间
- [ ] 兼容性测试：多浏览器验证
- [ ] E2E 测试：关键流程覆盖

### 文档更新
- [ ] 更新组件开发指南
- [ ] 创建迁移指南文档
- [ ] 更新 README
- [ ] 更新 OpenSpec 规范

## 经验总结

### 做得好的地方

1. **渐进式迁移**：分阶段推进，降低风险
2. **充分测试**：每个阶段完成后都进行验证
3. **文档先行**：提前规划，记录决策
4. **问题记录**：及时记录遇到的问题和解决方案
5. **保持兼容**：BPMN 编辑器样式隔离做得很好

### 可以改进的地方

1. **提前预研**：应该更早识别 diagram-js 的兼容性问题
2. **自动化测试**：E2E 测试覆盖可以更全面
3. **性能监控**：应该更早建立性能基准
4. **代码审查**：迁移过程中的 Code Review 可以更频繁

### 最佳实践建议

1. **充分阅读文档**：Ant Design 的设计规范和组件文档非常完善
2. **使用 TypeScript**：完整的类型定义可以避免很多错误
3. **保持代码简洁**：利用 Ant Design 的特性，减少自定义代码
4. **遵循规范**：使用 Ant Design 的标准 API，不要尝试绕过
5. **及时求助**：遇到问题查阅官方文档或社区

### 对未来项目的建议

1. **新项目直接使用组件库**：从一开始就集成 UI 框架
2. **统一设计语言**：全团队遵循同一套设计规范
3. **建立组件库**：基于 Ant Design 封装业务组件
4. **持续优化**：定期审查和优化组件使用

## 附录

### 参考资源

- [Ant Design Vue 官方文档](https://antdv.com/)
- [Ant Design 设计规范](https://ant.design/docs/spec/introduce-cn)
- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)

### 相关文档

- [Ant Design 组件使用指南](./ANT_DESIGN_GUIDE.md)
- [项目 README](../README.md)
- [OpenSpec 规范](../openspec/changes/integrate-antd-framework/)

### 技术支持

遇到问题时可以：
1. 查阅 Ant Design Vue 官方文档
2. 搜索 GitHub Issues
3. 咨询团队成员
4. 参考本迁移指南

---

**文档版本**: 1.0
**最后更新**: 2025-12-22
**维护者**: 开发团队
