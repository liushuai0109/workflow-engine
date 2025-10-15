# BPMN Explorer - Vue 3 + TypeScript 版本

基于 Vue 3、TypeScript 和 bpmn-js 构建的现代 BPMN 图表编辑器，从原生 JavaScript 版本改造而来。

## 改造内容

### 从原生 JavaScript 到 Vue 3 的改造

1. **项目结构改造**：
   - 使用 Vite 作为构建工具
   - 采用 Vue 3 Composition API
   - 组件化架构设计

2. **核心组件**：
   - `App.vue` - 主应用组件，包含文件操作和自动保存功能
   - `BpmnModeler.vue` - BPMN 模型器组件，封装 bpmn-js 功能

3. **功能特性**：
   - **创建和编辑 BPMN 图表**：功能完整的 BPMN 2.0 图表编辑器
   - **文件操作**：从本地文件打开和保存 BPMN 图表
   - **自动保存**：自动将编辑内容保存到本地存储，防止数据丢失
   - **键盘快捷键**：完整的键盘快捷键支持，提高编辑效率
   - **现代界面**：受 demo.bpmn.io 启发的简洁响应式界面
   - **Vue 响应式**：利用 Vue 的响应式系统管理状态

## 技术栈

- **Vue 3** - 前端框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 构建工具
- **bpmn-js** - BPMN 图表库
- **原生 CSS** - 样式设计

## 快速开始

### 前置要求

- Node.js（版本 16 或更高）
- npm 或 yarn

### 安装

1. 克隆或下载此仓库
2. 安装依赖：
   ```bash
   npm install
   ```

### 运行应用

启动开发服务器：
```bash
npm run dev
```

这将在 `http://localhost:8008` 启动本地服务器。

或者使用：
```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

## 使用方法

### 创建新图表

1. 在欢迎屏幕上点击"创建新图表"，或
2. 使用键盘快捷键 `Ctrl+N`（Mac 上为 `Cmd+N`）

### 打开图表

1. **通过按钮打开**：点击标题栏中的"打开"按钮
2. **通过快捷键**：使用键盘快捷键 `Ctrl+O`（Mac 上为 `Cmd+O`）
3. **拖拽打开**：直接将 `.bpmn` 或 `.xml` 文件拖拽到画布上
4. **文件选择**：从本地系统选择一个有效的 BPMN 文件

#### 支持的文件格式
- `.bpmn` - BPMN 2.0 文件
- `.xml` - XML 格式的 BPMN 文件

#### 文件验证
- 自动验证文件格式和内容
- 支持最大 10MB 的文件
- 检查 BPMN 2.0 XML 结构
- 提供详细的错误提示

### 保存图表

1. 点击标题栏中的"保存"，或
2. 使用键盘快捷键 `Ctrl+S`（Mac 上为 `Cmd+S`）
3. 图表将作为 `.bpmn` 文件下载

### 自动保存功能

BPMN Explorer 具有智能的自动保存功能：

- **自动触发**：当您编辑图表时，系统会在 2 秒后自动保存到浏览器本地存储
- **状态指示**：页面右上角会显示自动保存状态（"Auto-saved"、"Auto-save enabled" 等）
- **自动恢复**：重新打开应用时，如果有未保存的更改，会自动恢复图表
- **数据清理**：自动保存的数据会在 24 小时后自动清理
- **手动清除**：使用 `Ctrl+Shift+Delete` 快捷键可以手动清除自动保存数据

## 项目结构

```
bpmn-explorer/
├── index.html              # 主 HTML 文件
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── env.d.ts               # 环境类型定义
├── package.json            # 项目依赖
├── src/
│   ├── main.ts            # Vue 应用入口
│   ├── App.vue            # 主应用组件
│   ├── styles.css         # 全局样式
│   ├── types/
│   │   └── index.ts       # 类型定义
│   └── components/
│       └── BpmnModeler.vue # BPMN 模型器组件
└── README.md              # 项目说明
```

## 改造优势

1. **组件化**：代码更加模块化，易于维护和扩展
2. **类型安全**：TypeScript 提供编译时类型检查，减少运行时错误
3. **响应式**：利用 Vue 的响应式系统，状态管理更加清晰
4. **现代化**：使用最新的前端技术栈
5. **可扩展性**：更容易添加新功能和组件
6. **开发体验**：更好的开发工具支持、智能提示和热重载
7. **代码质量**：严格的类型检查提高代码质量和可维护性

## 键盘快捷键

- `Ctrl+O` - 打开文件
- `Ctrl+S` - 保存文件
- `Ctrl+N` - 创建新图表
- `Ctrl+P` - 切换元素选择面板
- `Ctrl+Shift+Delete` - 清除自动保存数据

## 功能特性

### BPMN 元素选择面板 (Palette)
- **可视化元素选择**：左侧显示 BPMN 元素选择面板
- **拖拽创建**：从面板拖拽元素到画布创建新元素
- **元素分类**：按功能分组显示不同类型的 BPMN 元素
- **快捷键控制**：使用 `Ctrl+P` 快速切换面板显示/隐藏
- **工具栏按钮**：点击 "Palette" 按钮控制面板显示

## 许可证

MIT License