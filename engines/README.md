# Workflow Engines - 可运行示例项目

这个目录包含三个流行的工作流自动化框架的可运行示例项目。

## 项目概览

| 框架 | 类型 | 端口 | 启动方式 |
|------|------|------|----------|
| **FlowGram** | React 可视化工作流编辑器 | 5173 | `npm run dev` |
| **n8n** | Docker 工作流自动化平台 | 5678 | `docker-compose up -d` |
| **Dify** | Docker LLM 应用开发平台 | 80 | `docker-compose up -d` |

---

## 🚀 快速启动（推荐）

### 一键启动所有服务

使用统一启动脚本可以快速启动 Dify 和 n8n：

```bash
# 启动所有服务
./start.sh start

# 或者直接运行（默认启动所有服务）
./start.sh
```

### 启动脚本命令

```bash
./start.sh start      # 启动所有服务（默认）
./start.sh stop       # 停止所有服务
./start.sh restart    # 重启所有服务
./start.sh status     # 查看服务状态
./start.sh logs dify  # 查看 Dify 日志
./start.sh logs n8n   # 查看 n8n 日志
./start.sh dify       # 仅启动 Dify
./start.sh n8n        # 仅启动 n8n
```

### 前置要求

- **Docker Desktop** 已安装并运行
  - macOS: https://www.docker.com/products/docker-desktop/
  - 启动后等待 Docker 完全就绪

启动完成后访问：
- **Dify**: http://localhost/install
- **n8n**: http://localhost:5678

---

## 1. FlowGram - 可视化工作流编辑器

基于 React Flow 的工作流编辑器示例。

### 快速启动

```bash
cd flowgram
npm install
npm run dev
```

### 访问地址

http://localhost:5173

### 功能特点

- 拖拽式节点编辑
- 可视化连接
- 小地图导航
- 预置 AI 工作流示例

### 停止服务

按 `Ctrl+C` 或 `Cmd+C`

[查看详细文档 →](./flowgram/README.md)

---

## 2. n8n - 工作流自动化平台

功能完整的工作流自动化平台，支持 400+ 集成。

### 快速启动

**方式一：使用启动脚本（推荐）**
```bash
./start.sh n8n
```

**方式二：手动启动**
```bash
cd n8n
docker compose up -d
```

### 访问地址

http://localhost:5678

首次访问需要创建管理员账号。

### 功能特点

- 400+ 预构建集成
- Webhook 触发器
- 定时任务
- JavaScript/Python 代码节点
- AI/LLM 集成

### 查看日志

```bash
docker-compose logs -f
```

### 停止服务

```bash
docker-compose down
```

[查看详细文档 →](./n8n/README.md)

---

## 3. Dify - LLM 应用开发平台

开源的 LLM 应用开发平台，支持 RAG、Agent 等功能。

### 快速启动

**方式一：使用启动脚本（推荐）**
```bash
./start.sh dify
```

**方式二：手动启动**
```bash
cd dify
# .env 文件已自动创建，如需重新配置可删除后重新复制
docker compose up -d
```

启动可能需要 2-3 分钟，因为包含多个服务。

### 访问地址

http://localhost/install

首次访问需要完成初始化设置。

### 功能特点

- 100+ LLM 模型支持
- RAG 知识库
- AI Agent 工具
- 可视化工作流构建
- LLMOps 监控

### 查看日志

```bash
docker-compose logs -f api
```

### 停止服务

```bash
docker-compose down
```

[查看详细文档 →](./dify/QUICKSTART.md)

---

## 快速对比

### 使用场景

**选择 FlowGram 如果你需要：**
- 轻量级的前端工作流编辑器
- 快速原型开发
- 自定义工作流 UI
- 纯前端解决方案

**选择 n8n 如果你需要：**
- 连接多个外部服务和 API
- 自动化业务流程
- 数据同步和转换
- 即用型的自动化平台

**选择 Dify 如果你需要：**
- 构建 LLM 应用
- RAG 知识库应用
- AI Agent 开发
- LLM 应用的完整生命周期管理

### 技术栈对比

| 特性 | FlowGram | n8n | Dify |
|------|----------|-----|------|
| 前端技术 | React + Vite | Vue.js | TypeScript + Next.js |
| 后端技术 | 无（纯前端） | Node.js | Python (FastAPI) |
| 数据库 | 无 | SQLite/PostgreSQL | PostgreSQL |
| 部署方式 | Web 应用 | Docker/npm | Docker |
| AI 能力 | 基础 | 通过集成 | 原生支持 |

---

## 系统要求

### FlowGram
- Node.js 18+
- npm 或 yarn

### n8n
- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ 内存

### Dify
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ 内存
- 20GB+ 磁盘空间

---

## 同时运行多个服务

所有三个服务可以同时运行，因为它们使用不同的端口：

```bash
# 终端 1 - FlowGram
cd flowgram && npm run dev

# 终端 2 - n8n
cd n8n && docker-compose up -d

# 终端 3 - Dify
cd dify/docker && docker-compose up -d
```

访问：
- FlowGram: http://localhost:5173
- n8n: http://localhost:5678
- Dify: http://localhost

---

## 常见问题

### Q: FlowGram 启动失败？
**A**: 确保已安装依赖 `npm install`，检查 Node.js 版本 >= 18

### Q: n8n 端口 5678 被占用？
**A**: 修改 `docker-compose.yml` 中的端口映射，例如改为 `8678:5678`

### Q: Dify 启动慢或失败？
**A**:
- 确保 Docker 有足够的内存（至少 4GB）
- 等待 2-3 分钟让所有服务完全启动
- 查看日志: `docker-compose logs -f`

### Q: 如何完全清理 Docker 数据？
**A**:
```bash
# n8n
cd n8n && docker-compose down -v

# Dify
cd dify/docker && docker-compose down -v
```
⚠️ 这会删除所有数据！

---

## 学习资源

### FlowGram
- React Flow 文档: https://reactflow.dev/
- 本地示例代码: `flowgram/src/App.jsx`

### n8n
- 官方文档: https://docs.n8n.io
- 工作流模板: https://n8n.io/workflows
- 社区论坛: https://community.n8n.io

### Dify
- 官方文档: https://docs.dify.ai
- GitHub: https://github.com/langgenius/dify
- Discord 社区: https://discord.gg/dify
- 云版本（免费试用）: https://cloud.dify.ai

---

## 贡献

欢迎提交问题和改进建议！

## 许可证

- FlowGram 示例: MIT
- n8n: Sustainable Use License
- Dify: Apache 2.0
