# deployment Specification

## Purpose
定义项目的容器化部署能力，包括 Docker 配置、Kubernetes 编排、开发和生产环境的容器化支持。

## Requirements

### Requirement: Docker 配置文件

系统 SHALL 提供完整的 Docker 配置文件，支持前端、后端和数据库的容器化。

#### Scenario: 前端开发环境 Dockerfile

- **当** 构建前端开发环境镜像时
- **则** 系统应使用 `docker/client/Dockerfile.dev`
- **并且** 基于 `node:18-alpine` 镜像
- **并且** 安装项目依赖（`npm ci`）
- **并且** 暴露 8000 端口
- **并且** 启动 Vite 开发服务器（`npm run start`）

#### Scenario: 前端生产环境 Dockerfile

- **当** 构建前端生产环境镜像时
- **则** 系统应使用 `docker/client/Dockerfile`
- **并且** 使用多阶段构建
- **并且** 构建阶段基于 `node:18-alpine`，执行 `npm run build`
- **并且** 运行阶段基于 `nginx:alpine`，提供静态文件服务
- **并且** 使用 `docker/client/nginx.conf` 作为 Nginx 配置
- **并且** 暴露 80 端口

#### Scenario: 后端服务 Dockerfile

- **当** 构建后端服务镜像时
- **则** 系统应使用 `docker/server/Dockerfile`
- **并且** 使用多阶段构建
- **并且** 构建阶段基于 `golang:1.24-alpine`，编译 Go 应用
- **并且** 运行阶段基于 `alpine:latest`，只包含运行时文件
- **并且** 复制 migrations 目录到镜像
- **并且** 使用非 root 用户运行
- **并且** 暴露 3000 端口
- **并且** 配置健康检查端点

#### Scenario: Docker 忽略文件

- **当** 构建 Docker 镜像时
- **则** 系统应使用 `.dockerignore` 文件
- **并且** 排除 Git 相关文件
- **并且** 排除 node_modules 目录
- **并且** 排除构建产物和测试文件
- **并且** 排除文档和配置文件

### Requirement: Kubernetes 开发环境

系统 SHALL 提供 Kubernetes 配置，支持一键部署完整的开发环境。

#### Scenario: 部署开发环境

- **当** 运行 `kubectl apply -k k8s/overlays/dev` 时
- **则** 系统应部署以下资源：
  - PostgreSQL StatefulSet 和 Service
  - 后端 Deployment 和 Service
  - 前端 Deployment 和 Service
  - ConfigMap 和 Secret
- **并且** 服务间通过 Kubernetes Service 和 DNS 通信
- **并且** 数据库数据持久化到 PersistentVolume
- **并且** 前端和后端源代码通过 ConfigMap 或 Volume 挂载支持热重载

#### Scenario: 数据库 StatefulSet 配置

- **当** 部署数据库服务时
- **则** 系统应使用 StatefulSet 管理 PostgreSQL
- **并且** 使用 `postgres:15-alpine` 镜像
- **并且** 配置数据库名、用户名、密码（通过 Secret）
- **并且** 数据持久化到 PersistentVolumeClaim
- **并且** 创建 ClusterIP Service 用于服务发现
- **并且** 配置健康检查（liveness 和 readiness 探针）

#### Scenario: 服务间网络通信和服务发现

- **当** 前端需要访问后端 API 时
- **则** 前端应通过 Kubernetes Service DNS 名称访问后端（如 `http://server-service:3000`）
- **并且** 后端应通过 Kubernetes Service DNS 名称访问数据库（如 `postgres-service:5432`）
- **并且** 使用 Kubernetes DNS 进行服务发现
- **并且** Service 提供内置的负载均衡

#### Scenario: 开发环境热重载

- **当** 修改前端或后端源代码时
- **则** 前端应自动重新编译（Vite HMR，通过 Volume 挂载）
- **并且** 后端可通过 Volume 挂载支持代码热重载（如使用 air 工具）
- **并且** 无需重建 Docker 镜像或重新部署 Pod

### Requirement: Kubernetes 生产环境

系统 SHALL 提供生产环境的 Kubernetes 配置，优化构建和运行。

#### Scenario: 部署生产环境

- **当** 运行 `kubectl apply -k k8s/overlays/prod` 时
- **则** 系统应部署以下资源：
  - PostgreSQL StatefulSet 和 Service（ClusterIP，不暴露外部端口）
  - 后端 Deployment 和 Service（ClusterIP，不暴露外部端口）
  - 前端 Deployment 和 Service（ClusterIP）
  - Ingress 配置（用于外部访问）
  - ConfigMap 和 Secret（生产环境配置）
- **并且** 所有 Deployment 配置为自动重启（restartPolicy: Always）
- **并且** 使用生产环境 ConfigMap 和 Secret

#### Scenario: 生产环境优化

- **当** 构建生产环境镜像时
- **则** 前端应使用优化后的构建产物
- **并且** 后端应使用编译优化的二进制文件
- **并且** 镜像大小应尽可能小
- **并且** 不包含开发工具和调试信息
- **并且** 配置资源请求和限制（requests 和 limits）

#### Scenario: 数据持久化

- **当** 生产环境运行时
- **则** 数据库数据应持久化到 PersistentVolume
- **并且** 使用 PersistentVolumeClaim 管理存储
- **并且** 数据在 Pod 重启或迁移后保留
- **并且** 支持数据备份和恢复（通过 Volume Snapshot 或外部备份工具）

#### Scenario: Ingress 配置

- **当** 配置外部访问时
- **则** 系统应创建 Ingress 资源
- **并且** 配置前端路由规则（如 `/`）
- **并且** 配置后端 API 路由规则（如 `/api/*`）
- **并且** 生产环境配置 TLS 证书
- **并且** 支持域名和路径规则

### Requirement: 配置管理（ConfigMap 和 Secret）

系统 SHALL 使用 Kubernetes ConfigMap 和 Secret 管理配置。

#### Scenario: ConfigMap 配置

- **当** 部署 Kubernetes 服务时
- **则** 系统应使用 ConfigMap 存储非敏感配置
- **并且** 开发环境和生产环境使用不同的 ConfigMap
- **并且** 配置通过环境变量或文件挂载注入到容器
- **并且** 支持 ConfigMap 热更新（需要应用支持）

#### Scenario: Secret 配置

- **当** 存储敏感信息时
- **则** 系统应使用 Secret 存储敏感配置（如数据库密码、API Key）
- **并且** Secret 应使用 base64 编码
- **并且** 生产环境应使用加密的 Secret（如使用 Sealed Secrets 或云平台 Secret 管理）
- **并且** Secret 不应提交到代码库（仅提供模板）

#### Scenario: 数据库环境变量

- **当** 配置数据库连接时
- **则** 系统应支持以下环境变量：
  - `DB_HOST`：数据库主机（默认：`db`）
  - `DB_PORT`：数据库端口（默认：5432）
  - `DB_USER`：数据库用户名
  - `DB_PASSWORD`：数据库密码
  - `DB_NAME`：数据库名称
  - `DB_DISABLED`：是否禁用数据库（默认：false）

#### Scenario: 服务器环境变量

- **当** 配置后端服务时
- **则** 系统应支持以下环境变量：
  - `PORT`：服务端口（默认：3000）
  - `GO_ENV`：运行环境（development/production）
  - `CORS_ORIGIN`：CORS 允许的源
  - `CLAUDE_API_BASE_URL`：Claude API 基础 URL
  - `CLAUDE_API_KEY`：Claude API 密钥

### Requirement: 健康检查和探针

系统 SHALL 配置 Kubernetes 健康检查探针（liveness 和 readiness）。

#### Scenario: 后端健康检查探针

- **当** 后端 Pod 运行时
- **则** 系统应配置 liveness 探针
- **并且** 系统应配置 readiness 探针
- **并且** 探针端点：`http://:3000/health`
- **并且** liveness 探针间隔：30 秒，超时：3 秒，失败阈值：3
- **并且** readiness 探针间隔：10 秒，超时：3 秒，失败阈值：3
- **并且** 初始延迟：5 秒（startupProbe）

#### Scenario: 数据库健康检查探针

- **当** 数据库 Pod 运行时
- **则** 系统应配置 liveness 探针
- **并且** 系统应配置 readiness 探针
- **并且** 使用 `pg_isready` 命令检查数据库就绪状态
- **并且** readiness 探针间隔：10 秒，超时：5 秒，失败阈值：3
- **并且** liveness 探针间隔：30 秒，超时：5 秒，失败阈值：3

#### Scenario: 服务依赖和启动顺序

- **当** 部署服务时
- **则** 后端 Deployment 应配置 initContainer 运行数据库迁移
- **并且** 后端 Pod 应等待数据库 readiness 探针通过（通过 Service DNS）
- **并且** 前端 Pod 应等待后端 readiness 探针通过
- **并且** 使用 Kubernetes 的 readiness 探针机制确保服务就绪

### Requirement: Kubernetes 部署文档

系统 SHALL 提供完整的 Kubernetes 部署文档。

#### Scenario: Kubernetes 设置文档

- **当** 开发者需要了解 Kubernetes 配置时
- **则** 系统应提供 `DOCKER_SETUP.md` 文档（更新为包含 Kubernetes）
- **并且** 文档应包含：
  - 项目结构分析
  - Kubernetes 化方案说明
  - 详细的配置文件说明（Deployment、Service、ConfigMap、Secret、Ingress）
  - 本地开发环境设置（minikube/kind）
  - 使用说明（开发环境和生产环境）
  - 故障排查指南

#### Scenario: README 更新

- **当** 查看项目 README 时
- **则** README 应包含 Kubernetes 部署方式说明
- **并且** 提供快速开始命令示例
- **并且** 说明 Kubernetes 和传统方式的区别
- **并且** 提供本地 Kubernetes 环境设置指南

### Requirement: 自动扩缩容（HPA）

系统 SHALL 支持通过 HorizontalPodAutoscaler 自动扩缩容。

#### Scenario: HPA 配置

- **当** 配置自动扩缩容时
- **则** 系统应创建 HorizontalPodAutoscaler 资源
- **并且** 前端和后端应配置独立的 HPA
- **并且** 基于 CPU 和/或内存使用率进行扩缩容
- **并且** 设置最小副本数（如 1）和最大副本数（如 10）
- **并且** 目标 CPU 使用率：70%

