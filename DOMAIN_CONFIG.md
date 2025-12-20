# 域名配置说明

## 域名信息

- **前端域名**: `editor.workflow.com` (IP: 21.91.238.173)
- **后端域名**: `api.workflow.com` (IP: 21.91.238.173)

## 前端配置

### 环境变量

前端使用 Vite 环境变量 `VITE_API_BASE_URL` 来配置 API 地址。

#### 开发环境
创建 `client/.env.local` 文件：
```bash
VITE_API_BASE_URL=http://api.workflow.com/api
```

#### 生产环境
创建 `client/.env.production` 文件：
```bash
VITE_API_BASE_URL=http://api.workflow.com/api
```

或者使用 HTTPS：
```bash
VITE_API_BASE_URL=https://api.workflow.com/api
```

### 已创建的文件

- `client/.env.local` - 本地开发环境配置
- `client/.env.production.local` - 生产环境配置

## 后端配置

### 环境变量

后端使用 `CORS_ORIGIN` 环境变量来配置允许的前端域名。

#### 开发环境
```bash
CORS_ORIGIN=http://localhost:8000
```

#### 生产环境
```bash
CORS_ORIGIN=http://editor.workflow.com,https://editor.workflow.com
```

### CORS 中间件

已更新 `server/internal/middleware/cors.go` 以支持多个域名（逗号分隔）。

### 默认配置

后端默认配置已更新为：
```go
CORSOrigin: getEnv("CORS_ORIGIN", "http://editor.workflow.com,http://localhost:8000")
```

## 部署步骤

### 1. 配置 DNS

确保以下 DNS 记录已配置：
```
editor.workflow.com  A  21.91.238.173
api.workflow.com     A  21.91.238.173
```

### 2. 配置前端

1. 在生产环境，确保 `client/.env.production` 或 `client/.env.production.local` 存在并配置了正确的 API 地址
2. 构建前端：
   ```bash
   cd client
   npm run build
   ```

### 3. 配置后端

1. 设置环境变量：
   ```bash
   export CORS_ORIGIN="http://editor.workflow.com,https://editor.workflow.com"
   export PORT=3000
   export GO_ENV=production
   ```

2. 或者创建 `server/.env` 文件：
   ```bash
   CORS_ORIGIN=http://editor.workflow.com,https://editor.workflow.com
   PORT=3000
   GO_ENV=production
   ```

3. 启动后端服务器

## 验证配置

### 检查前端 API 配置
在浏览器控制台运行：
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

### 检查后端 CORS
使用 curl 测试：
```bash
curl -H "Origin: http://editor.workflow.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://api.workflow.com/api/health
```

应该看到 `Access-Control-Allow-Origin: http://editor.workflow.com` 响应头。

## 注意事项

1. **HTTPS**: 生产环境建议使用 HTTPS，需要配置 SSL 证书
2. **端口**: 确保防火墙允许相应端口的访问
3. **环境变量优先级**: 
   - 开发环境：`.env.local` > `.env.development` > `.env`
   - 生产环境：`.env.production.local` > `.env.production` > `.env`

