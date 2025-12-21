# 变更：Docker 化项目

## Why

当前项目需要手动配置开发环境（Node.js、Go、PostgreSQL），部署过程复杂且容易出错。通过 Docker 容器化可以：

1. **简化开发环境搭建**：新开发者无需手动安装和配置各种依赖，只需运行 Kubernetes 命令即可启动完整环境
2. **环境一致性**：确保开发、测试、生产环境的一致性，避免"在我机器上能跑"的问题
3. **简化部署流程**：生产环境通过 Kubernetes 容器编排工具一键部署，与主流云原生方案对齐
4. **生产就绪**：使用 Kubernetes 提供高可用、自动扩缩容、服务发现等生产级能力
4. **隔离依赖**：各服务（前端、后端、数据库）在独立容器中运行，避免依赖冲突
5. **便于 CI/CD**：容器化后更容易集成到持续集成/持续部署流程中

## What Changes

### 1. Docker 配置文件
- **ADDED**: 前端 Dockerfile（开发模式和生产模式）
- **ADDED**: 后端 Dockerfile（多阶段构建）
- **ADDED**: Nginx 配置文件（生产环境前端）
- **ADDED**: `.dockerignore` 文件
- **ADDED**: `.env.example` 环境变量示例文件

### 2. Kubernetes 配置文件
- **ADDED**: Kubernetes 部署清单（Deployment、Service、ConfigMap、Secret）
- **ADDED**: 开发环境和生产环境的 Kubernetes 配置
- **ADDED**: Ingress 配置（用于外部访问）
- **ADDED**: PersistentVolume 配置（用于数据库持久化）
- **ADDED**: 健康检查和就绪探针配置

### 3. 目录结构
- **ADDED**: `k8s/` 目录，包含 Kubernetes 配置文件
  - `k8s/base/` - 基础配置（Deployment、Service）
  - `k8s/overlays/dev/` - 开发环境覆盖配置
  - `k8s/overlays/prod/` - 生产环境覆盖配置
  - `k8s/ingress/` - Ingress 配置
- **ADDED**: `docker/` 目录，包含各服务的 Docker 配置文件
  - `docker/client/Dockerfile.dev` - 前端开发环境
  - `docker/client/Dockerfile` - 前端生产环境
  - `docker/client/nginx.conf` - Nginx 配置
  - `docker/server/Dockerfile` - 后端服务

### 4. 部署能力
- **ADDED**: 支持通过 Kubernetes 一键部署完整环境（前端、后端、数据库）
- **ADDED**: 支持开发模式（热重载）和生产模式（优化构建）
- **ADDED**: 数据库自动初始化和迁移支持
- **ADDED**: 服务健康检查、就绪探针和存活探针
- **ADDED**: 自动扩缩容（HPA）配置
- **ADDED**: 服务发现和负载均衡

### 4. 文档
- **ADDED**: Docker 使用文档（`DOCKER_SETUP.md`）
- **MODIFIED**: 更新 `README.md` 添加 Docker 启动说明

## Impact

- **受影响的规范**：
  - **ADDED**: `deployment` - 新增部署规范能力领域
  - **MODIFIED**: `backend-server` - 更新启动方式说明，支持 Docker 启动
- **受影响的代码**：
  - 无代码变更，仅添加 Docker 配置文件
  - 不影响现有代码逻辑和功能
- **数据影响**：
  - 数据库数据通过 Kubernetes PersistentVolume 持久化
  - 现有数据库迁移脚本兼容
- **用户影响**：
  - **开发人员**：可以选择使用 Docker 或传统方式启动项目
  - **运维人员**：简化部署流程，支持容器化部署
  - **向后兼容**：不影响现有的本地开发方式，Docker 是可选的

