# 快速启动指南

## 前置要求

✅ **Docker Desktop** 必须已安装并运行
- 下载地址: https://www.docker.com/products/docker-desktop/
- 安装后启动 Docker Desktop，等待完全就绪

## 一键启动

```bash
# 启动所有服务（Dify + n8n）
./start.sh

# 或明确指定
./start.sh start
```

## 常用命令

```bash
# 启动所有服务
./start.sh start

# 停止所有服务
./start.sh stop

# 重启所有服务
./start.sh restart

# 查看服务状态
./start.sh status

# 查看日志
./start.sh logs dify   # Dify 日志
./start.sh logs n8n    # n8n 日志

# 单独启动
./start.sh dify        # 仅启动 Dify
./start.sh n8n          # 仅启动 n8n
```

## 访问地址

启动成功后访问：

- **Dify**: http://localhost/install
  - 首次访问需要完成初始化设置
  
- **n8n**: http://localhost:5678
  - 首次访问需要创建管理员账号

## 服务说明

### Dify
- **端口**: 80
- **配置**: `dify/.env` (已自动创建)
- **启动时间**: 约 2-3 分钟（首次启动需要下载镜像）

### n8n
- **端口**: 5678
- **配置**: `n8n/docker-compose.yml`
- **启动时间**: 约 30 秒

## 故障排查

### Docker 未运行
```bash
# 检查 Docker 状态
docker info

# 如果报错，请启动 Docker Desktop
```

### 端口被占用
- Dify (80端口): 修改 `dify/docker-compose.yaml` 中的 `EXPOSE_NGINX_PORT`
- n8n (5678端口): 修改 `n8n/docker-compose.yml` 中的端口映射

### 查看详细日志
```bash
# Dify 日志
cd dify && docker compose logs -f

# n8n 日志
cd n8n && docker compose logs -f n8n
```

### 完全重置
```bash
# 停止并删除所有数据
./start.sh stop
cd dify && docker compose down -v
cd ../n8n && docker compose down -v
```

## 下一步

- 查看 [README.md](./README.md) 了解详细功能
- 查看 [dify/QUICKSTART.md](./dify/QUICKSTART.md) 了解 Dify 配置
- 查看 [n8n/README.md](./n8n/README.md) 了解 n8n 使用
