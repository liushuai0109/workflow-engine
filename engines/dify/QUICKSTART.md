# Dify 快速启动指南

## 前置要求

### 安装 Docker 和 Docker Compose

在开始之前，请确保已安装 Docker 和 Docker Compose。

#### macOS 安装

1. **下载 Docker Desktop for Mac**
   - 访问: https://www.docker.com/products/docker-desktop/
   - 下载适用于 Apple Silicon (M1/M2/M3) 或 Intel 芯片的版本
   - 双击 `.dmg` 文件并按照安装向导完成安装

2. **启动 Docker Desktop**
   - 在应用程序中找到 Docker 并启动
   - 等待 Docker 完全启动（菜单栏图标不再显示"正在启动"）

3. **验证安装**
   ```bash
   docker --version
   docker compose version
   ```

#### Linux 安装

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Windows 安装

1. 下载 Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. 运行安装程序并按照向导完成安装
3. 重启计算机（如需要）
4. 启动 Docker Desktop

## 快速启动（推荐）

### 1. 配置环境变量

```bash
cd docker
cp .env.example .env
```

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 访问

打开浏览器访问: http://localhost/install

首次访问会要求设置管理员账号。

## 停止服务

```bash
docker compose down
```

## 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f api
docker compose logs -f web
```

## 重启服务

```bash
docker compose restart
```

## 最低配置要求

- CPU: 2核心+
- 内存: 4GB+
- 硬盘: 20GB+
- Docker: 20.10.0+
- Docker Compose: 2.0.0+

## 主要功能

1. **聊天机器人**: 创建对话式 AI 应用
2. **文本生成**: 基于提示词生成内容
3. **AI Agent**: 具有工具调用能力的智能代理
4. **工作流**: 可视化构建复杂的 AI 工作流
5. **知识库**: RAG (检索增强生成) 应用
6. **提示词工程**: 优化和测试提示词
7. **LLMOps**: 监控和分析 LLM 应用

## 配置 LLM 提供商

在 Web 界面中：

1. 进入"设置" -> "模型提供商"
2. 添加 API 密钥：
   - OpenAI
   - Anthropic Claude
   - Google Gemini
   - 其他支持的提供商

或者在 `.env` 文件中配置：

```bash
# OpenAI
OPENAI_API_KEY=sk-your-api-key

# Anthropic
ANTHROPIC_API_KEY=your-api-key

# Google
GOOGLE_API_KEY=your-api-key
```

## 常见问题

### 端口冲突

如果 80 端口被占用，修改 `docker-compose.yaml` 中的端口映射：

```yaml
nginx:
  ports:
    - "8080:80"  # 改为 8080 或其他可用端口
```

### 数据持久化

数据保存在 Docker volumes 中：
- PostgreSQL 数据库
- Redis 缓存
- 向量数据库 (Weaviate)
- 上传的文件

### 完全清理数据

```bash
docker compose down -v
```

⚠️ 注意：这会删除所有数据！

## 升级

```bash
# 拉取最新镜像
docker compose pull

# 重启服务
docker compose up -d
```

## 资源

- 官方网站: https://dify.ai
- 文档: https://docs.dify.ai
- GitHub: https://github.com/langgenius/dify
- Discord: https://discord.gg/dify
