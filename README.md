# BPMN Explorer

一个基于 Vue 3 + TypeScript + vue-bpmn 的现代化 BPMN 图表编辑器，提供完整的 BPMN 2.0 支持。

## ✨ 功能特性

### 🎨 核心功能
- **完整的 BPMN 2.0 支持** - 支持所有标准 BPMN 元素
- **Vue 3 + TypeScript** - 现代化的开发体验
- **响应式设计** - 适配各种屏幕尺寸
- **实时编辑** - 所见即所得的编辑体验

### 📁 文件操作
- **打开 BPMN 文件** - 支持 .bpmn 和 .xml 格式
- **保存 BPMN 文件** - 导出为标准 BPMN 2.0 XML
- **文件验证** - 自动验证文件格式和内容
- **拖拽上传** - 支持拖拽文件到编辑器

### 🎨 编辑功能
- **画板 (Palette)** - 完整的元素选择面板
- **属性面板 (Properties Panel)** - 详细的元素属性编辑
- **自定义 Context Pad** - 包含 "Append Element" 按钮
- **键盘快捷键** - 提高编辑效率

### 🎯 用户体验
- **加载状态** - 友好的加载提示
- **错误处理** - 完善的错误提示和重试机制
- **状态栏** - 实时显示编辑状态
- **欢迎界面** - 引导用户开始使用

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

应用将在 `http://localhost:8003` 启动

### 构建生产版本
```bash
npm run build
```

## 📖 使用指南

### 基本操作

1. **创建新图表**
   - 点击工具栏的 "New" 按钮
   - 或使用欢迎界面的 "Create New Diagram" 按钮

2. **打开文件**
   - 点击 "Open BPMN" 按钮选择文件
   - 或直接拖拽 BPMN 文件到编辑器

3. **保存文件**
   - 点击 "Save BPMN" 按钮
   - 文件将自动下载为 .bpmn 格式

### 编辑功能

1. **添加元素**
   - 使用左侧的 Palette 选择元素
   - 拖拽到画布上创建

2. **编辑属性**
   - 选择元素后，在右侧 Properties Panel 中编辑
   - 支持名称、描述等属性修改

3. **连接元素**
   - 使用鼠标从源元素拖拽到目标元素
   - 自动创建序列流连接

4. **自定义 Context Pad**
   - 右键点击元素查看上下文菜单
   - 使用 "Append Element" 按钮快速添加后续元素

### 工具栏功能

- **📁 Open BPMN** - 打开 BPMN 文件
- **💾 Save BPMN** - 保存当前图表
- **🆕 New** - 创建新图表
- **🎨 Show/Hide Palette** - 切换画板显示
- **⚙️ Show/Hide Properties** - 切换属性面板显示

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速的构建工具
- **bpmn-js** - BPMN 2.0 渲染和编辑库
- **vue-bpmn** - Vue 3 的 BPMN 组件
- **bpmn-js-properties-panel** - 属性面板支持

## 📁 项目结构

```
bpmn-explorer/
├── public/                 # 静态资源
│   └── sample.bpmn        # 示例 BPMN 文件
├── src/
│   ├── components/        # Vue 组件
│   │   └── BpmnEditor.vue # 自定义 BPMN 编辑器
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts      # 类型声明
│   ├── App.vue           # 主应用组件
│   ├── main.ts           # 应用入口
│   └── styles.css        # 全局样式
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 配置
└── README.md            # 项目文档
```

## 🎨 自定义功能

### Context Pad 自定义按钮

项目包含一个自定义的 "Append Element" 按钮，位于 Context Pad 中：

```typescript
// 在 BpmnEditor.vue 中定义
const CustomContextPadModule = {
  __init__: ['contextPad'],
  contextPad: ['type', CustomContextPad]
}
```

### 样式自定义

所有 BPMN 元素的样式都可以通过 `src/styles.css` 进行自定义：

- 线条粗细
- 颜色主题
- 字体样式
- 响应式布局

## 🔧 开发指南

### 添加新的 BPMN 元素

1. 在 `BpmnEditor.vue` 中扩展 `CustomContextPadModule`
2. 添加新的元素类型到 Palette
3. 更新类型定义

### 自定义属性面板

1. 创建自定义属性提供者
2. 在 `additionalModules` 中注册
3. 配置属性面板选项

### 扩展功能

- 添加新的文件格式支持
- 集成云存储服务
- 添加协作功能
- 实现版本控制

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请查看：
- [bpmn-js 文档](https://github.com/bpmn-io/bpmn-js)
- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)