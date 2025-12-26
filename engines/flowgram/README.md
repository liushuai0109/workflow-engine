# FlowGram 工作流示例

这是一个基于 React Flow 的可视化工作流演示项目，展示了类似 FlowGram 的工作流编辑器功能。

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问应用

打开浏览器访问显示的地址（通常是 http://localhost:5173）

## 功能特性

- **可视化流程编辑器**: 拖拽式节点编辑
- **节点类型**:
  - 开始节点
  - LLM 处理节点
  - 条件判断节点
  - 输出节点
- **连接管理**: 可视化的节点连接
- **小地图**: 快速导航大型工作流
- **背景网格**: 对齐辅助

## 项目结构

```
flowgram/
├── src/
│   ├── App.jsx          # 主应用组件
│   ├── App.css          # 样式文件
│   └── main.jsx         # 入口文件
├── package.json         # 项目配置
└── vite.config.js       # Vite 配置
```

## 示例工作流

项目包含一个预定义的 AI 工作流示例：

1. **开始节点** → 接收输入
2. **LLM 处理节点** → 使用 AI 模型处理
3. **条件判断节点** → 判断处理结果
4. **成功/失败输出** → 根据条件分支
5. **结束节点** → 完成流程

## 自定义节点

要添加自定义节点类型，修改 `src/App.jsx` 中的节点定义：

```javascript
const customNode = {
  id: 'custom-1',
  type: 'custom',
  data: { label: '自定义节点' },
  position: { x: 100, y: 100 },
};
```

## 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/` 目录中。

## 预览生产构建

```bash
npm run preview
```

## 技术栈

- **React** - UI 框架
- **Vite** - 构建工具
- **React Flow** - 流程图库 (替代 FlowGram 核心)
- **@xyflow/react** - React Flow 最新版本

## 扩展功能

可以添加的功能：

- [ ] 节点配置面板
- [ ] 工作流执行引擎
- [ ] 保存/加载工作流
- [ ] 自定义节点样式
- [ ] 节点验证逻辑
- [ ] 工作流导出/导入

## 参考资源

- React Flow 文档: https://reactflow.dev/
- FlowGram 官方: https://github.com/bytedance/flowgram.ai
- Vite 文档: https://vitejs.dev/

## 注意事项

这是一个演示项目，展示了工作流编辑器的基本功能。

要使用完整的 FlowGram 功能，请参考官方文档：
```bash
npx @flowgram.ai/create-app@latest
```
