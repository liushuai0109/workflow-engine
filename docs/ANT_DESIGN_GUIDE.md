# Ant Design 组件使用指南

本文档提供项目中使用 Ant Design Vue 组件的规范和最佳实践。

## 目录

- [引入组件](#引入组件)
- [常用组件使用示例](#常用组件使用示例)
- [样式规范](#样式规范)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 引入组件

### 全局引入（已配置）

项目已在 `src/main.ts` 中全局注册 Ant Design，所有组件可直接使用：

```typescript
import { createApp } from 'vue'
import Ant Design from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

app.use(Ant Design)
```

### 按需引入图标

图标需要按需引入：

```vue
<script setup lang="ts">
import {
  SettingOutlined,
  RobotOutlined,
  BugOutlined
} from '@ant-design/icons-vue'
</script>

<template>
  <a-button>
    <template #icon><SettingOutlined /></template>
    设置
  </a-button>
</template>
```

## 常用组件使用示例

### 1. 按钮 (Button)

```vue
<template>
  <!-- 基础按钮 -->
  <a-button>默认按钮</a-button>

  <!-- 主要按钮 -->
  <a-button type="primary">主要按钮</a-button>

  <!-- 危险按钮 -->
  <a-button danger>删除</a-button>

  <!-- 加载状态 -->
  <a-button :loading="isLoading">提交</a-button>

  <!-- 带图标 -->
  <a-button type="primary">
    <template #icon><SaveOutlined /></template>
    保存
  </a-button>

  <!-- 不同尺寸 -->
  <a-button size="small">小按钮</a-button>
  <a-button size="middle">中按钮</a-button>
  <a-button size="large">大按钮</a-button>
</template>
```

### 2. 输入框 (Input/Textarea)

```vue
<template>
  <!-- 基础输入框 -->
  <a-input
    v-model:value="inputValue"
    placeholder="请输入"
    allow-clear
  />

  <!-- 文本域 -->
  <a-textarea
    v-model:value="textValue"
    placeholder="请输入多行文本"
    :auto-size="{ minRows: 2, maxRows: 6 }"
    :maxlength="500"
    show-count
    @pressEnter="handleSubmit"
  />

  <!-- 带前缀/后缀 -->
  <a-input
    v-model:value="searchValue"
    placeholder="搜索"
  >
    <template #prefix>
      <SearchOutlined />
    </template>
  </a-input>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'

const inputValue = ref('')
const textValue = ref('')
const searchValue = ref('')

const handleSubmit = () => {
  console.log('提交:', textValue.value)
}
</script>
```

### 3. 表单 (Form)

```vue
<template>
  <a-form
    :model="formState"
    :rules="rules"
    layout="vertical"
    @finish="onFinish"
  >
    <a-form-item label="用户名" name="username">
      <a-input v-model:value="formState.username" />
    </a-form-item>

    <a-form-item label="邮箱" name="email">
      <a-input v-model:value="formState.email" type="email" />
    </a-form-item>

    <a-form-item label="状态" name="status">
      <a-select v-model:value="formState.status">
        <a-select-option value="active">激活</a-select-option>
        <a-select-option value="inactive">未激活</a-select-option>
      </a-select>
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit">提交</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Rule } from 'ant-design-vue/es/form'

interface FormState {
  username: string
  email: string
  status: string
}

const formState = reactive<FormState>({
  username: '',
  email: '',
  status: 'active'
})

const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名' }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' }
  ]
}

const onFinish = (values: FormState) => {
  console.log('表单提交:', values)
}
</script>
```

### 4. 标签页 (Tabs)

```vue
<template>
  <a-tabs v-model:activeKey="activeKey" type="card">
    <a-tab-pane key="1">
      <template #tab>
        <span class="tab-label">
          <SettingOutlined />
          <span>属性</span>
        </span>
      </template>
      <div>属性面板内容</div>
    </a-tab-pane>

    <a-tab-pane key="2" force-render>
      <template #tab>
        <span class="tab-label">
          <RobotOutlined />
          <span>AI 助手</span>
        </span>
      </template>
      <div>AI 助手面板内容</div>
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SettingOutlined, RobotOutlined } from '@ant-design/icons-vue'

const activeKey = ref('1')
</script>

<style scoped>
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
```

### 5. 消息提示 (Message)

```vue
<script setup lang="ts">
import { message } from 'ant-design-vue'

const showSuccess = () => {
  message.success('操作成功')
}

const showError = () => {
  message.error('操作失败，请重试')
}

const showWarning = () => {
  message.warning('请注意检查数据')
}

const showInfo = () => {
  message.info('这是一条提示信息')
}

const showLoading = () => {
  const hide = message.loading('加载中...', 0)
  // 3秒后关闭
  setTimeout(hide, 3000)
}
</script>

<template>
  <a-button @click="showSuccess">成功提示</a-button>
  <a-button @click="showError">错误提示</a-button>
  <a-button @click="showWarning">警告提示</a-button>
  <a-button @click="showInfo">信息提示</a-button>
  <a-button @click="showLoading">加载提示</a-button>
</template>
```

### 6. 确认对话框 (Modal)

```vue
<script setup lang="ts">
import { Modal } from 'ant-design-vue'

const showDeleteConfirm = () => {
  Modal.confirm({
    title: '确认删除',
    content: '删除后数据将无法恢复，确定要继续吗？',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk() {
      console.log('确认删除')
      return new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    },
    onCancel() {
      console.log('取消删除')
    }
  })
}
</script>

<template>
  <a-button danger @click="showDeleteConfirm">删除</a-button>
</template>
```

### 7. 加载指示器 (Spin)

```vue
<template>
  <!-- 包裹内容 -->
  <a-spin :spinning="isLoading" tip="加载中...">
    <div class="content">
      <p>这里是需要加载的内容</p>
    </div>
  </a-spin>

  <!-- 单独使用 -->
  <div v-if="isLoading" class="loading-container">
    <a-spin size="small" />
    <span>处理中...</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isLoading = ref(false)
</script>
```

## 样式规范

### 1. 使用 Ant Design 设计令牌

优先使用 Ant Design 的颜色和间距：

```css
/* ✅ 推荐：使用 Ant Design 颜色 */
.success-text {
  color: #52c41a; /* Ant Design 成功色 */
}

.primary-button {
  background: #1890ff; /* Ant Design 主色 */
}

/* ❌ 避免：自定义颜色 */
.custom-color {
  color: #123456; /* 不推荐 */
}
```

### 2. 标准间距

使用 8px 倍数的间距：

```css
.container {
  padding: 16px; /* 2 * 8px */
  margin-bottom: 24px; /* 3 * 8px */
  gap: 8px;
}
```

### 3. 响应式设计

使用 Ant Design 的栅格系统：

```vue
<template>
  <a-row :gutter="16">
    <a-col :xs="24" :sm="12" :md="8">
      <div>列1</div>
    </a-col>
    <a-col :xs="24" :sm="12" :md="8">
      <div>列2</div>
    </a-col>
    <a-col :xs="24" :sm="24" :md="8">
      <div>列3</div>
    </a-col>
  </a-row>
</template>
```

### 4. 深度选择器

需要覆盖 Ant Design 组件内部样式时，使用 `:deep()`：

```vue
<style scoped>
/* ✅ 正确：使用 :deep() */
.custom-input :deep(.ant-input) {
  border-radius: 6px;
  border-color: #d9d9d9;
}

/* ❌ 错误：直接选择不会生效 */
.custom-input .ant-input {
  border-radius: 6px;
}
</style>
```

## 最佳实践

### 1. 组件 Props 使用

- 使用 `v-model:value` 而非 `v-model`（Ant Design 规范）
- 使用 `@pressEnter` 而非 `@keydown.enter`（Textarea 组件）

```vue
<!-- ✅ 正确 -->
<a-input v-model:value="inputValue" />
<a-textarea @pressEnter="handleSubmit" />

<!-- ❌ 错误 -->
<a-input v-model="inputValue" />
<a-textarea @keydown.enter="handleSubmit" />
```

### 2. 表单验证

使用 Ant Design Form 的内置验证：

```typescript
const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 20, message: '用户名长度为 3-20 个字符' }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' }
  ]
}
```

### 3. 图标使用

- 从 `@ant-design/icons-vue` 按需引入
- 使用语义化的图标名称
- 保持图标大小一致

```vue
<script setup lang="ts">
import {
  SaveOutlined,      // 保存
  DeleteOutlined,    // 删除
  EditOutlined,      // 编辑
  SearchOutlined,    // 搜索
  DownloadOutlined,  // 下载
} from '@ant-design/icons-vue'
</script>
```

### 4. 加载状态管理

统一管理加载状态：

```typescript
const isLoading = ref(false)

const fetchData = async () => {
  isLoading.value = true
  try {
    await api.getData()
    message.success('加载成功')
  } catch (error) {
    message.error('加载失败')
  } finally {
    isLoading.value = false
  }
}
```

### 5. 避免样式冲突

BPMN 编辑器等第三方组件需要样式隔离：

```vue
<template>
  <div class="editor-container">
    <!-- Ant Design 区域 -->
    <div class="toolbar">
      <a-button>工具栏</a-button>
    </div>

    <!-- 第三方组件隔离区域 -->
    <div class="bpmn-canvas" data-bpmn-scope>
      <div ref="canvas"></div>
    </div>
  </div>
</template>

<style scoped>
/* BPMN 样式隔离 */
.bpmn-canvas {
  isolation: isolate;
}

[data-bpmn-scope] * {
  all: revert;
}
</style>
```

## 常见问题

### Q1: 如何自定义主题颜色？

A: 在 Vite 配置中使用 Less 变量覆盖：

```typescript
// vite.config.ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          'primary-color': '#1890ff',
          'success-color': '#52c41a',
        },
        javascriptEnabled: true,
      },
    },
  },
})
```

### Q2: 为什么 Textarea 的 Enter 键不工作？

A: 使用 `@pressEnter` 而非 `@keydown.enter`：

```vue
<!-- ✅ 正确 -->
<a-textarea @pressEnter="handleSubmit" />
```

### Q3: 如何禁用按钮？

A: 使用 `disabled` 属性或计算属性：

```vue
<template>
  <a-button :disabled="!canSubmit">提交</a-button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const inputValue = ref('')
const isLoading = ref(false)

const canSubmit = computed(() => {
  return inputValue.value.trim().length > 0 && !isLoading.value
})
</script>
```

### Q4: 如何处理表单验证？

A: 使用 Form 组件的 `rules` 属性：

```vue
<a-form :model="formState" :rules="rules" @finish="onFinish">
  <!-- 表单项 -->
</a-form>
```

### Q5: 如何在 TypeScript 中使用组件类型？

A: 从 ant-design-vue 导入类型：

```typescript
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { SelectProps } from 'ant-design-vue/es/select'

const formRef = ref<FormInstance>()
const rules: Record<string, Rule[]> = {
  // 验证规则
}
```

## 参考资源

- [Ant Design Vue 官方文档](https://antdv.com/)
- [Ant Design 设计规范](https://ant.design/docs/spec/introduce-cn)
- [Ant Design Icons](https://www.antdv.com/components/icon-cn)
- [组件 API 文档](https://antdv.com/components/overview-cn)
