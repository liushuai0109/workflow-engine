# Claude API 配置指南

## 问题说明

由于 `api.aicodewith.com` 服务不稳定（All API channels unavailable），需要配置可用的Claude API。

## 配置步骤

### 方案1：使用 jiekou.ai 代理（推荐，国内可用）

1. **获取 API Key**
   - 访问 https://jiekou.ai
   - 注册账户并充值
   - 获取API Key

2. **配置服务器**
   编辑 `packages/server/.env`：
   ```bash
   CLAUDE_API_KEY=your-jiekou-api-key
   CLAUDE_BASE_URL=https://api.jiekou.ai
   ```

3. **重启服务**
   - 服务器会自动重启并加载新配置
   - 或手动重启: Ctrl+C 后再 `npm start`

4. **验证配置**
   ```bash
   curl http://localhost:3000/api/claude/health
   ```

### 方案2：使用官方 Anthropic API

1. **获取 API Key**
   - 访问 https://console.anthropic.com/
   - 注册/登录账户
   - 创建 API Key（需要绑定信用卡）

2. **配置服务器**
   编辑 `packages/server/.env`：
   ```bash
   CLAUDE_API_KEY=sk-ant-your-key-here
   CLAUDE_BASE_URL=https://api.anthropic.com
   ```

3. **配置前端**
   编辑 `packages/client/.env`：
   ```bash
   VITE_CLAUDE_BASE_URL=http://localhost:3000/api/claude
   VITE_CLAUDE_MODEL=claude-3-5-sonnet-20241022
   VITE_CLAUDE_API_KEY=
   ```

4. **重启服务**
   ```bash
   # 停止当前服务 (Ctrl+C)
   npm start
   ```

### 方案3：使用本地代理（需要科学上网）

如果您有科学上网环境，可以：

1. 启动本地代理（如 clash）
2. 配置 Node.js 使用代理：
   ```bash
   export HTTP_PROXY=http://127.0.0.1:7890
   export HTTPS_PROXY=http://127.0.0.1:7890
   ```

3. 使用官方API配置

## 验证配置

### 检查服务器配置
```bash
curl http://localhost:3000/api/claude/health
```

应该返回：
```json
{
  "configured": true,
  "baseUrl": "https://api.anthropic.com",
  "message": "Claude API is configured and ready"
}
```

### 测试API调用
```bash
curl -X POST http://localhost:3000/api/claude/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 常见问题

### 1. CORS 错误
- ✅ 已解决：使用后端代理，前端调用 `http://localhost:3000/api/claude`

### 2. 404 Not Found
- 检查服务器是否正常启动
- 检查路由是否正确注册
- 查看服务器日志

### 3. All API channels unavailable
- `api.aicodewith.com` 服务不可用
- 更换为官方API或其他代理

### 4. 503 Service Unavailable
- API服务暂时不可用
- 检查API Key是否有效
- 检查账户余额

## 推荐的API提供商

1. **jiekou.ai** (推荐，国内首选)
   - URL: https://api.jiekou.ai
   - 优点: 国内访问快、支持多种支付方式
   - 文档: https://docs.jiekou.ai

2. **Anthropic 官方** (国际用户)
   - URL: https://api.anthropic.com
   - 需要: 国际信用卡
   - 优点: 稳定、官方支持

3. **其他国内代理** (备选)
   - 搜索 "Claude API 代理"
   - 选择信誉良好的服务商
   - 注意保护 API Key 安全

## 安全提示

⚠️ **不要将 API Key 提交到 Git**
- `.env` 文件已被 gitignore
- 只提交 `.env.example` 作为模板
- API Key 应妥善保管

⚠️ **不要在前端暴露 API Key**
- API Key 只配置在服务器端
- 前端只调用后端代理接口
- 所有请求通过后端转发
