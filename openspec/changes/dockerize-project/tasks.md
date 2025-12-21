# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: Docker 配置文件创建 | 8 | 1-2 天 | - | 无 |
| Phase 2: Kubernetes 配置 | 10 | 2-3 天 | - | Phase 1 |
| Phase 3: 文档和验证 | 5 | 1 天 | - | Phase 2 |
| **总计** | **23** | **4-6 天** | - | - |

## Phase 1: Docker 配置文件创建

- [ ] 1.1 创建 `docker/client/Dockerfile.dev` - 前端开发环境 Dockerfile
  - 使用 `node:18-alpine` 基础镜像
  - 配置工作目录和依赖安装
  - 暴露 8000 端口
  - 启动 Vite 开发服务器

- [ ] 1.2 创建 `docker/client/Dockerfile` - 前端生产环境 Dockerfile
  - 多阶段构建：构建阶段 + Nginx 生产阶段
  - 构建阶段：安装依赖并构建应用
  - 生产阶段：使用 Nginx 提供静态文件服务

- [ ] 1.3 创建 `docker/client/nginx.conf` - Nginx 配置文件
  - 配置 SPA 路由支持
  - 配置 API 代理到后端服务
  - 配置 Gzip 压缩
  - 配置静态资源缓存

- [ ] 1.4 创建 `docker/server/Dockerfile` - 后端服务 Dockerfile
  - 多阶段构建：构建阶段 + 运行阶段
  - 构建阶段：使用 `golang:1.24-alpine`，编译 Go 应用
  - 运行阶段：使用 `alpine:latest`，只包含运行时文件
  - 复制 migrations 目录
  - 配置非 root 用户运行
  - 添加健康检查

- [ ] 1.5 创建 `.dockerignore` 文件
  - 排除 Git 文件
  - 排除 node_modules
  - 排除构建产物
  - 排除测试文件
  - 排除文档和配置文件

- [ ] 1.6 创建 `.env.example` 文件
  - 数据库配置示例
  - 服务器配置示例
  - Claude API 配置示例

- [ ] 1.7 验证所有 Dockerfile 语法正确
  - 检查 Dockerfile 语法
  - 验证基础镜像版本
  - 验证路径和命令正确性

- [ ] 1.8 验证 `.dockerignore` 配置正确
  - 确保不会复制不必要的文件
  - 确保构建上下文大小合理

## Phase 2: Kubernetes 配置

- [ ] 2.1 创建基础 Kubernetes 配置结构
  - 创建 `k8s/base/` 目录结构
  - 创建 `k8s/overlays/dev/` 和 `k8s/overlays/prod/` 目录
  - 配置 Kustomize 基础文件（kustomization.yaml）

- [ ] 2.2 创建前端 Deployment 和 Service
  - 创建前端 Deployment（开发和生产环境）
  - 配置资源请求和限制
  - 配置健康检查（liveness 和 readiness 探针）
  - 创建前端 Service（ClusterIP）
  - 配置环境变量（通过 ConfigMap）

- [ ] 2.3 创建后端 Deployment 和 Service
  - 创建后端 Deployment（开发和生产环境）
  - 配置资源请求和限制
  - 配置健康检查（liveness 和 readiness 探针）
  - 创建后端 Service（ClusterIP）
  - 配置环境变量（通过 ConfigMap 和 Secret）
  - 配置 Init Container 运行数据库迁移

- [ ] 2.4 创建数据库 StatefulSet 和 Service
  - 创建 PostgreSQL StatefulSet
  - 配置 PersistentVolumeClaim 用于数据持久化
  - 创建数据库 Service（ClusterIP）
  - 配置数据库初始化脚本（通过 ConfigMap）

- [ ] 2.5 创建 ConfigMap 和 Secret
  - 创建开发环境 ConfigMap（数据库配置、服务器配置）
  - 创建生产环境 ConfigMap
  - 创建 Secret 模板（数据库密码、API Key）
  - 配置不同环境的覆盖配置

- [ ] 2.6 创建 Ingress 配置
  - 配置 Ingress 规则（前端和 API 路由）
  - 配置 TLS 证书（生产环境）
  - 配置域名和路径规则

- [ ] 2.7 配置 PersistentVolume
  - 创建数据库 PersistentVolumeClaim
  - 配置存储类（StorageClass）
  - 验证数据持久化配置

- [ ] 2.8 配置 HorizontalPodAutoscaler（可选）
  - 配置前端 HPA（基于 CPU/内存）
  - 配置后端 HPA（基于 CPU/内存）
  - 设置最小和最大副本数

- [ ] 2.9 配置网络策略（可选）
  - 创建 NetworkPolicy 限制服务间通信
  - 配置允许的入口和出口规则

- [ ] 2.10 验证 Kubernetes 配置
  - 使用 `kubectl apply --dry-run=client` 验证配置
  - 使用 `kustomize build` 验证 Kustomize 配置
  - 检查所有资源定义正确

## Phase 3: 文档和验证

- [ ] 3.1 更新 `DOCKER_SETUP.md` 文档
  - 添加 Kubernetes 快速开始指南
  - 添加本地开发环境设置（minikube/kind）
  - 添加开发环境部署说明
  - 添加生产环境部署说明
  - 添加故障排查指南

- [ ] 3.2 更新 `README.md`
  - 添加 Kubernetes 部署方式说明
  - 添加 Kubernetes 相关命令示例
  - 添加本地开发环境要求

- [ ] 3.3 创建 Kubernetes 部署脚本
  - 创建部署脚本（deploy.sh）
  - 创建清理脚本（cleanup.sh）
  - 创建验证脚本（verify.sh）

- [ ] 3.4 验证本地 Kubernetes 环境（minikube/kind）
  - 设置本地 Kubernetes 集群
  - 部署开发环境配置
  - 验证前端可访问（通过 NodePort 或 Ingress）
  - 验证后端 API 可访问
  - 验证数据库连接正常
  - 验证服务发现和负载均衡
  - 验证数据持久化
  - 验证健康检查和自动重启

- [ ] 3.5 验证生产环境配置
  - 验证生产环境 Kustomize 配置
  - 验证资源限制配置合理
  - 验证安全配置（Secret、非 root 用户）
  - 验证 Ingress 和 TLS 配置

