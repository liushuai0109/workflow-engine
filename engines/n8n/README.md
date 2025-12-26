# n8n Workflow Automation - 可运行示例

## 快速启动

### 启动 n8n

```bash
docker-compose up -d
```

### 访问

打开浏览器访问: http://localhost:5678

首次访问时会要求创建管理员账号。

### 停止

```bash
docker-compose down
```

### 查看日志

```bash
docker-compose logs -f n8n
```

## 功能特性

- 400+ 预构建集成
- 可视化工作流编辑器
- Webhook 支持
- 定时任务
- JavaScript/Python 代码执行
- AI/LLM 集成

## 示例工作流

### 1. 创建简单的 HTTP 工作流

1. 点击右上角 "+" 创建新工作流
2. 添加 "Webhook" 节点作为触发器
3. 添加 "HTTP Request" 节点
4. 添加 "Respond to Webhook" 节点
5. 连接节点并配置
6. 点击 "Execute Workflow" 测试

### 2. 定时任务工作流

1. 添加 "Schedule Trigger" 节点
2. 配置执行时间（如：每天早上9点）
3. 添加你需要执行的操作节点
4. 激活工作流

## 常见问题

### 端口被占用

如果 5678 端口被占用，修改 `docker-compose.yml`:

```yaml
ports:
  - "8678:5678"  # 改为其他端口
```

### 数据持久化

所有数据保存在 Docker volume `n8n_data` 中，删除容器不会丢失数据。

要完全清理数据：

```bash
docker-compose down -v
```

## 资源

- 官方文档: https://docs.n8n.io
- 工作流模板: https://n8n.io/workflows
- 社区论坛: https://community.n8n.io
