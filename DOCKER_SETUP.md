# Kubernetes 容器化部署方案

## 项目结构分析

项目包含以下组件：

1. **前端 (client/)** - Vue 3 + Vite 应用
   - 开发模式：`npm run start` (端口 8000)
   - 生产构建：`npm run build` (输出到 `dist/`)
   - 依赖：Node.js >= 18.0.0

2. **后端 (server/)** - Go 应用
   - 编译：`go build -o bin/server cmd/server/main.go`
   - 运行：`./bin/server` (默认端口 3000)
   - 依赖：Go 1.24.0, PostgreSQL 数据库
   - 环境变量：需要 `.env` 文件或环境变量

3. **数据库** - PostgreSQL
   - 默认端口：5432
   - 数据库名：`lifecycle_ops`
   - 需要运行 migrations

## Kubernetes 化方案

### 架构设计

```
┌─────────────────────────────────────────┐
│         Kubernetes Cluster             │
│                                         │
│  ┌──────────┐      ┌──────────┐       │
│  │ Ingress  │─────▶│  Client  │       │
│  │          │      │ Service  │       │
│  └──────────┘      └────┬─────┘       │
│                         │             │
│                    ┌────▼─────┐       │
│                    │  Server  │       │
│                    │ Service  │       │
│                    └────┬─────┘       │
│                         │             │
│                    ┌────▼─────┐       │
│                    │   DB     │       │
│                    │Service   │       │
│                    └──────────┘       │
└─────────────────────────────────────────┘
```

### 文件结构

```
workflow-engine/
├── docker/
│   ├── client/
│   │   ├── Dockerfile.dev        # 前端开发环境 Dockerfile
│   │   ├── Dockerfile            # 前端生产环境 Dockerfile
│   │   └── nginx.conf            # Nginx 配置（生产环境）
│   └── server/
│       └── Dockerfile            # 后端 Dockerfile
├── k8s/
│   ├── base/                     # 基础配置
│   │   ├── kustomization.yaml
│   │   ├── client-deployment.yaml
│   │   ├── client-service.yaml
│   │   ├── server-deployment.yaml
│   │   ├── server-service.yaml
│   │   ├── db-statefulset.yaml
│   │   ├── db-service.yaml
│   │   ├── configmap.yaml
│   │   └── secret.yaml
│   ├── overlays/
│   │   ├── dev/                   # 开发环境覆盖
│   │   │   ├── kustomization.yaml
│   │   │   └── patches/
│   │   └── prod/                  # 生产环境覆盖
│   │       ├── kustomization.yaml
│   │       ├── patches/
│   │       └── ingress.yaml
│   └── migrations/                # 数据库迁移 Job
│       └── migration-job.yaml
├── .dockerignore                  # Docker 忽略文件
└── .env.example                   # 环境变量示例
```

## 详细方案

### 1. 前端 Dockerfile（开发模式）

**文件：`docker/client/Dockerfile.dev`**

```dockerfile
# 开发模式 - 使用 Vite 开发服务器
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY client/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY client/ ./

# 暴露端口
EXPOSE 8000

# 启动开发服务器
CMD ["npm", "run", "start"]
```

### 2. 前端 Dockerfile（生产模式）

**文件：`docker/client/Dockerfile`**

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY client/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY client/ ./

# 构建应用
RUN npm run build

# 生产阶段 - 使用 Nginx
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. 前端 Nginx 配置

**文件：`docker/client/nginx.conf`**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（如果需要）
    location /api {
        proxy_pass http://server-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. 后端 Dockerfile

**文件：`docker/server/Dockerfile`**

```dockerfile
# 构建阶段
FROM golang:1.24-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache git make

WORKDIR /app

# 复制 go mod 文件
COPY server/go.mod server/go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY server/ ./

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o bin/server \
    cmd/server/main.go

# 生产阶段
FROM alpine:latest

# 安装 ca-certificates（用于 HTTPS 请求）
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/bin/server .

# 复制 migrations（如果需要）
COPY --from=builder /app/migrations ./migrations

# 创建非 root 用户
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["./server"]
```

### 5. Kubernetes 基础配置

#### 5.1 前端 Deployment（开发环境）

**文件：`k8s/base/client-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-deployment
  labels:
    app: client
spec:
  replicas: 1
  selector:
    matchLabels:
      app: client
  template:
    metadata:
      labels:
        app: client
    spec:
      containers:
      - name: client
        image: workflow-client:dev
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8000
        env:
        - name: NODE_ENV
          value: "development"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 5.2 前端 Service

**文件：`k8s/base/client-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: client-service
  labels:
    app: client
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8000
    protocol: TCP
    name: http
  selector:
    app: client
```

#### 5.3 后端 Deployment

**文件：`k8s/base/server-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server-deployment
  labels:
    app: server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      initContainers:
      - name: migrate
        image: workflow-server:latest
        command: ["sh", "-c"]
        args:
        - |
          # 等待数据库就绪
          until pg_isready -h postgres-service -p 5432 -U postgres; do
            echo "Waiting for database..."
            sleep 2
          done
          # 运行迁移（需要 migrate 工具）
          # migrate -path /app/migrations -database "postgres://postgres:$(DB_PASSWORD)@postgres-service:5432/lifecycle_ops?sslmode=disable" up
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_HOST
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: DB_PASSWORD
      containers:
      - name: server
        image: workflow-server:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: PORT
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_HOST
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: DB_PASSWORD
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

#### 5.4 后端 Service

**文件：`k8s/base/server-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: server-service
  labels:
    app: server
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: server
```

#### 5.5 数据库 StatefulSet

**文件：`k8s/base/db-statefulset.yaml`**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-statefulset
  labels:
    app: postgres
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: DB_PASSWORD
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_NAME
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

#### 5.6 数据库 Service

**文件：`k8s/base/db-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  labels:
    app: postgres
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
    name: postgres
  selector:
    app: postgres
```

#### 5.7 ConfigMap

**文件：`k8s/base/configmap.yaml`**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  PORT: "3000"
  GO_ENV: "development"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_USER: "postgres"
  DB_NAME: "lifecycle_ops"
  DB_DISABLED: "false"
  CORS_ORIGIN: "http://localhost:8000,http://editor.workflow.com:8000"
  CLAUDE_API_BASE_URL: "https://api.jiekou.ai"
```

#### 5.8 Secret（模板）

**文件：`k8s/base/secret.yaml`**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
stringData:
  DB_PASSWORD: "postgres"  # 生产环境应使用加密的 Secret
  CLAUDE_API_KEY: ""       # 生产环境应使用加密的 Secret
```

**注意**：Secret 中的敏感信息不应提交到代码库，应使用以下方式管理：
- 使用 `kubectl create secret` 命令创建
- 使用 Sealed Secrets
- 使用云平台的 Secret 管理服务

#### 5.9 Kustomization（基础）

**文件：`k8s/base/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - client-deployment.yaml
  - client-service.yaml
  - server-deployment.yaml
  - server-service.yaml
  - db-statefulset.yaml
  - db-service.yaml
  - configmap.yaml
  - secret.yaml
```

### 6. 开发环境覆盖配置

**文件：`k8s/overlays/dev/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

namespace: workflow-dev

patchesStrategicMerge:
  - patches/client-dev.yaml
  - patches/server-dev.yaml

configMapGenerator:
  - name: app-config
    behavior: merge
    literals:
      - GO_ENV=development
      - CORS_ORIGIN=http://localhost:8000
```

### 7. 生产环境覆盖配置

**文件：`k8s/overlays/prod/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

namespace: workflow-prod

patchesStrategicMerge:
  - patches/client-prod.yaml
  - patches/server-prod.yaml
  - ingress.yaml

configMapGenerator:
  - name: app-config
    behavior: merge
    literals:
      - GO_ENV=production
      - CORS_ORIGIN=https://workflow.example.com

replicas:
  - name: client-deployment
    count: 2
  - name: server-deployment
    count: 2
```

#### 7.1 生产环境 Ingress

**文件：`k8s/overlays/prod/ingress.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: workflow-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - workflow.example.com
    secretName: workflow-tls
  rules:
  - host: workflow.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: client-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: server-service
            port:
              number: 3000
```

### 8. HorizontalPodAutoscaler（可选）

**文件：`k8s/base/hpa.yaml`**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: client-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: client-deployment
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: server-deployment
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 9. .dockerignore

**文件：`.dockerignore`**

```
# Git
.git
.gitignore
.gitattributes

# Node
node_modules
npm-debug.log
yarn-error.log
.pnpm-debug.log

# Build outputs
dist
build
bin
*.exe
*.dll
*.so
*.dylib

# Test files
coverage
.nyc_output
test-results
*.test
*.spec

# IDE
.vscode
.idea
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs

# Environment
.env
.env.local
.env.*.local

# Documentation
*.md
docs/
README.md

# Docker
Dockerfile*
.dockerignore

# Kubernetes
k8s/

# Other
.openspec
openspec/
examples/
reports/
scripts/
tests/
biz-sample/
```

### 10. 环境变量示例

**文件：`.env.example`**

```env
# 数据库配置
DB_HOST=postgres-service
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lifecycle_ops
DB_DISABLED=false

# 服务器配置
PORT=3000
GO_ENV=development
CORS_ORIGIN=http://localhost:8000,http://editor.workflow.com:8000

# Claude API 配置
CLAUDE_API_BASE_URL=https://api.jiekou.ai
CLAUDE_API_KEY=your_api_key_here
```

## 使用说明

### 前置要求

1. **Kubernetes 集群**
   - 本地开发：minikube、kind 或 Docker Desktop Kubernetes
   - 生产环境：云平台 Kubernetes（EKS、GKE、AKS）或自建集群

2. **工具**
   - `kubectl` - Kubernetes 命令行工具
   - `kustomize` - Kubernetes 配置管理工具（kubectl 内置）
   - `docker` - 构建镜像

### 本地开发环境设置

#### 使用 minikube

```bash
# 安装 minikube（macOS）
brew install minikube

# 启动 minikube
minikube start

# 配置 Docker 使用 minikube 的 Docker daemon
eval $(minikube docker-env)

# 构建镜像
docker build -f docker/client/Dockerfile.dev -t workflow-client:dev .
docker build -f docker/server/Dockerfile -t workflow-server:latest .
```

#### 使用 kind

```bash
# 安装 kind
brew install kind

# 创建集群
kind create cluster --name workflow

# 加载镜像到 kind
kind load docker-image workflow-client:dev --name workflow
kind load docker-image workflow-server:latest --name workflow
```

### 开发环境部署

1. **创建命名空间**
   ```bash
   kubectl create namespace workflow-dev
   ```

2. **创建 Secret**
   ```bash
   kubectl create secret generic app-secret \
     --from-literal=DB_PASSWORD=postgres \
     --from-literal=CLAUDE_API_KEY=your_api_key \
     -n workflow-dev
   ```

3. **部署应用**
   ```bash
   kubectl apply -k k8s/overlays/dev
   ```

4. **查看部署状态**
   ```bash
   kubectl get pods -n workflow-dev
   kubectl get services -n workflow-dev
   ```

5. **查看日志**
   ```bash
   # 查看所有 Pod 日志
   kubectl logs -f -l app=client -n workflow-dev
   kubectl logs -f -l app=server -n workflow-dev
   kubectl logs -f -l app=postgres -n workflow-dev
   ```

6. **端口转发（访问服务）**
   ```bash
   # 前端
   kubectl port-forward service/client-service 8000:80 -n workflow-dev
   
   # 后端
   kubectl port-forward service/server-service 3000:3000 -n workflow-dev
   
   # 数据库（如需要）
   kubectl port-forward service/postgres-service 5432:5432 -n workflow-dev
   ```

7. **访问服务**
   - 前端：http://localhost:8000
   - 后端 API：http://localhost:3000

### 生产环境部署

1. **构建并推送镜像到镜像仓库**
   ```bash
   # 构建镜像
   docker build -f docker/client/Dockerfile -t your-registry/workflow-client:latest .
   docker build -f docker/server/Dockerfile -t your-registry/workflow-server:latest .
   
   # 推送镜像
   docker push your-registry/workflow-client:latest
   docker push your-registry/workflow-server:latest
   ```

2. **更新镜像地址**
   在 `k8s/overlays/prod/kustomization.yaml` 中添加：
   ```yaml
   images:
     - name: workflow-client
       newName: your-registry/workflow-client
       newTag: latest
     - name: workflow-server
       newName: your-registry/workflow-server
       newTag: latest
   ```

3. **创建 Secret（生产环境）**
   ```bash
   kubectl create secret generic app-secret \
     --from-literal=DB_PASSWORD=secure_password \
     --from-literal=CLAUDE_API_KEY=your_api_key \
     -n workflow-prod
   ```

4. **部署应用**
   ```bash
   kubectl apply -k k8s/overlays/prod
   ```

5. **配置 Ingress**
   - 确保集群已安装 Ingress Controller（如 Nginx Ingress）
   - 配置 DNS 指向 Ingress 的 IP 地址
   - 配置 TLS 证书（如使用 cert-manager）

### 数据库迁移

#### 方案 A：使用 Init Container（推荐）

在 Deployment 中配置 initContainer，在应用启动前运行迁移。

#### 方案 B：使用 Kubernetes Job

**文件：`k8s/migrations/migration-job.yaml`**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: workflow-server:latest
        command: ["sh", "-c"]
        args:
        - |
          migrate -path /app/migrations \
            -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable" \
            up
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DB_HOST
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: DB_PASSWORD
      restartPolicy: Never
  backoffLimit: 3
```

运行迁移：
```bash
kubectl apply -f k8s/migrations/migration-job.yaml -n workflow-dev
kubectl wait --for=condition=complete job/db-migration -n workflow-dev --timeout=300s
```

## 优化建议

### 1. 多阶段构建优化

- 使用构建缓存层，加速重复构建
- 分离依赖安装和代码复制，提高缓存命中率
- 使用多阶段构建减小镜像体积

### 2. 镜像大小优化

- 使用 Alpine Linux 基础镜像
- 生产镜像只包含必要的运行时文件
- 使用 `.dockerignore` 排除不必要的文件

### 3. 安全性

- 使用非 root 用户运行容器
- 使用 Secret 管理敏感信息，生产环境使用加密的 Secret
- 配置 NetworkPolicy 限制服务间通信
- 定期更新基础镜像和依赖

### 4. 性能

- 前端使用 Nginx 提供静态文件服务
- 启用 Gzip 压缩
- 配置适当的缓存策略
- 使用 HPA 自动扩缩容

### 5. 监控和日志

- 配置 liveness 和 readiness 探针
- 使用 Prometheus 和 Grafana 监控
- 使用集中式日志收集（如 ELK Stack、Loki）
- 配置告警规则

### 6. 资源管理

- 为每个容器设置合理的资源请求和限制
- 使用 ResourceQuota 限制命名空间资源使用
- 监控资源使用情况，及时调整

## 故障排查

### 常见问题

1. **Pod 无法启动**
   ```bash
   # 查看 Pod 状态
   kubectl describe pod <pod-name> -n <namespace>
   
   # 查看 Pod 日志
   kubectl logs <pod-name> -n <namespace>
   
   # 查看事件
   kubectl get events -n <namespace> --sort-by='.lastTimestamp'
   ```

2. **数据库连接失败**
   - 检查 Service DNS 名称（应使用 `postgres-service`，不是 `localhost`）
   - 确认数据库 Pod 正常运行：`kubectl get pods -l app=postgres`
   - 检查 ConfigMap 和 Secret 配置
   - 验证网络策略（NetworkPolicy）

3. **前端无法访问后端 API**
   - 检查 Service 配置：`kubectl get svc server-service`
   - 检查 CORS 配置
   - 验证 Ingress 配置（生产环境）
   - 检查网络策略

4. **镜像拉取失败**
   - 检查镜像是否存在：`docker images`
   - 本地环境：确保镜像已加载到集群（minikube/kind）
   - 生产环境：检查镜像仓库访问权限

5. **PersistentVolume 挂载失败**
   - 检查 StorageClass：`kubectl get storageclass`
   - 检查 PVC 状态：`kubectl get pvc`
   - 检查 PV 状态：`kubectl get pv`

6. **健康检查失败**
   - 检查探针配置
   - 验证健康检查端点可访问
   - 检查初始延迟时间设置

### 调试命令

```bash
# 查看所有资源
kubectl get all -n <namespace>

# 进入 Pod 调试
kubectl exec -it <pod-name> -n <namespace> -- sh

# 查看配置
kubectl get configmap app-config -n <namespace> -o yaml
kubectl get secret app-secret -n <namespace> -o yaml

# 查看 Service 端点
kubectl get endpoints -n <namespace>

# 测试 Service 连接
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup postgres-service
```

## 下一步

1. 创建上述所有文件
2. 设置本地 Kubernetes 环境（minikube/kind）
3. 测试开发环境部署
4. 构建并推送生产镜像
5. 配置生产环境 Kubernetes 集群
6. 配置 CI/CD 自动构建和部署
7. 配置监控和日志收集
8. 配置备份和灾难恢复
