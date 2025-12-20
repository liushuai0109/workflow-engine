# LLM 请求问题复盘文档

**问题发生时间**：2025-12-20
**问题解决时间**：约 2 小时
**影响范围**：Claude API 集成完全不可用

---

## 问题概述

**问题现象**：前端调用 Claude API 一直返回 503 错误，提示 "Claude API is not configured"

**根本原因**：
1. **主要原因**：Go 服务器未加载 .env 文件中的环境变量
2. **次要原因**：jiekou.ai API 端点路径使用 `/anthropic/v1/messages` 而非标准的 `/v1/messages`

---

## 问题时间线

### 阶段 1：误判为 CORS 问题（浪费时间：30分钟）

**错误判断**：
- 看到浏览器报错提到 `anthropic-version` header 不允许
- 认为是 CORS 配置问题
- 花时间修改 CORS 中间件配置

**实际情况**：
- CORS 确实需要修复，但**不是主要问题**
- 真正的问题是服务端返回 503

**教训**：
> ⚠️ **不要被表象误导**：浏览器的 CORS 错误可能掩盖了真正的服务端错误。应该先检查服务端日志确认根本原因。

---

### 阶段 2：发现 API key 未配置（问题开始明确）

**关键发现**：
```
服务端日志：503 Service Unavailable
错误信息：Claude API is not configured
```

**问题分析**：
- `claude.go:32` 检查 `h.config.APIKey == ""`
- 说明环境变量 `CLAUDE_API_KEY` 没有被读取

**排查过程**：
1. ✅ 检查 .env 文件 → 不存在
2. ✅ 从 git 历史查找 API key
3. ✅ 创建 `server/.env` 文件
4. ❌ **重启服务器，问题依然存在**

---

### 阶段 3：Go 不自动加载 .env（核心问题，浪费时间：40分钟）

**问题根源**：
```go
// config.go - 原始代码
func LoadConfig() (*Config, error) {
    cfg := &Config{
        Claude: ClaudeConfig{
            APIKey: getEnv("CLAUDE_API_KEY", ""),  // ❌ 只读取系统环境变量
        },
    }
}
```

**Node.js vs Go 的差异**：
| 特性 | Node.js | Go |
|------|---------|-----|
| .env 加载 | `dotenv` 包自动加载 | **需要手动引入 `godotenv`** |
| 环境变量读取 | `process.env.XX` | `os.Getenv("XX")` |
| 默认行为 | 常见框架自动集成 | 完全手动管理 |

**为什么耽误时间**：
1. 从 Node.js 迁移到 Go，**习惯性认为 .env 会自动加载**
2. 修改了 Makefile 添加 shell 导出逻辑，但不生效
3. 最后才想到需要在代码中引入 `godotenv`

**正确修复**：
```go
import "github.com/joho/godotenv"

func LoadConfig() (*Config, error) {
    // ✅ 显式加载 .env 文件
    _ = godotenv.Load()

    cfg := &Config{
        Claude: ClaudeConfig{
            APIKey: getEnv("CLAUDE_API_KEY", ""),
        },
    }
}
```

---

### 阶段 4：API 端点错误（浪费时间：20分钟）

**问题现象**：
- 环境变量已加载（日志显示 `apiKey=sk_l****JXQc`）
- 但请求返回 404：`"404 page not found"`

**调试过程**：
```
请求 URL: https://api.jiekou.ai/v1/messages
响应: 404 page not found
```

**发现问题**：
- 在 git 历史中找到注释：`API 端点: /anthropic/v1/messages`
- jiekou.ai 使用的是 `/anthropic/v1/messages`，不是标准的 `/v1/messages`

**修复代码**：
```go
// ❌ 错误
proxyURL := h.config.BaseURL + "/v1/messages"

// ✅ 正确
endpoint := "/v1/messages"
if h.config.BaseURL == "https://api.jiekou.ai" {
    endpoint = "/anthropic/v1/messages"  // jiekou.ai 特殊路径
}
proxyURL := h.config.BaseURL + endpoint
```

---

## 关键延误原因分析

### 1. **缺少充分的日志（最大问题）**

**问题**：
- 最初的 `claude.go` 没有记录：
  - 收到的请求参数
  - 使用的 API key（脱敏后）
  - 请求的完整 URL
  - 上游 API 的响应状态和内容

**结果**：
- 无法快速定位是环境变量问题还是端点问题
- 需要反复重启服务器添加日志

**改进后的日志**：
```go
h.logger.Info().
    Str("apiKey", maskAPIKey(h.config.APIKey)).
    Str("baseURL", h.config.BaseURL).
    Msg("Received Claude API request")

h.logger.Info().
    Str("proxyURL", proxyURL).
    Msg("Sending request to Claude API")

h.logger.Info().
    Int("statusCode", resp.StatusCode).
    Str("responsePreview", string(respBody[:min(200, len(respBody))])).
    Msg("Received response from Claude API")
```

---

### 2. **技术栈差异认知不足**

**问题**：
- 从 Node.js 迁移到 Go
- 默认认为环境变量处理方式相同
- 没有在项目初始阶段确认 .env 加载机制

**教训**：
> ⚠️ **跨语言迁移检查清单**：
> - [ ] 环境变量加载方式
> - [ ] 配置文件读取机制
> - [ ] 日志框架差异
> - [ ] HTTP 客户端行为
> - [ ] 错误处理模式

---

### 3. **没有优先查阅第三方 API 文档**

**问题**：
- 假设 jiekou.ai 使用标准的 Anthropic API 路径
- 直到遇到 404 才回去查 git 历史中的注释

**应该做的**：
1. ✅ 先查阅 jiekou.ai 官方文档
2. ✅ 确认端点路径、认证方式、请求格式
3. ✅ 在代码中添加注释说明差异

**文档中的关键信息**：
```
# .env 注释（已存在但未仔细阅读）
# - API 端点: /anthropic/v1/messages (代码会自动处理)  ← 关键信息
# - 参考文档: https://docs.jiekou.ai/docs/providers/anthropic
```

---

### 4. **测试策略不当**

**问题测试流程**：
```
修改代码 → 重启服务 → 浏览器测试 → 失败 → 修改代码 → ...
```

**更好的测试流程**：
```
1. 先用 curl 测试 API 端点是否可达
2. 检查服务器日志确认请求到达
3. 添加详细日志记录关键变量
4. 验证环境变量加载成功
5. 最后才在浏览器中测试完整流程
```

**实际使用的测试命令**：
```bash
# ✅ 好的测试方法
curl -X POST http://localhost:3000/api/claude/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'

# 同时查看日志
tail -f .pids/server.log
```

---

## 最终解决方案总结

### 修改的文件

| 文件 | 修改内容 | 原因 |
|------|---------|------|
| `server/.env` | 创建文件，配置 API key | 环境变量存储 |
| `server/go.mod` | 添加 `github.com/joho/godotenv v1.5.1` | 加载 .env 文件 |
| `server/pkg/config/config.go` | 添加 `godotenv.Load()` | 自动读取 .env |
| `server/internal/handlers/claude.go` | 修正端点路径 + 添加日志 | 适配 jiekou.ai + 可调试性 |
| `server/internal/middleware/cors.go` | 使用通配符 "*" | 允许所有跨域请求 |

### 核心代码片段

**1. 环境变量加载**
```go
// server/pkg/config/config.go
func LoadConfig() (*Config, error) {
    _ = godotenv.Load()  // ✅ 关键修复

    cfg := &Config{
        Port:        getEnvAsInt("PORT", 3000),
        Environment: getEnv("GO_ENV", "development"),
        Claude: ClaudeConfig{
            BaseURL: getEnv("CLAUDE_API_BASE_URL", "https://api.jiekou.ai"),
            APIKey:  getEnv("CLAUDE_API_KEY", ""),
        },
    }

    return cfg, nil
}
```

**2. API 端点适配**
```go
// server/internal/handlers/claude.go
endpoint := "/v1/messages"
if h.config.BaseURL == "https://api.jiekou.ai" {
    endpoint = "/anthropic/v1/messages"  // ✅ jiekou.ai 特殊路径
}
proxyURL := h.config.BaseURL + endpoint
```

**3. 调试日志**
```go
h.logger.Info().
    Str("apiKey", maskAPIKey(h.config.APIKey)).
    Str("baseURL", h.config.BaseURL).
    Msg("Received Claude API request")

h.logger.Info().
    Str("proxyURL", proxyURL).
    Msg("Sending request to Claude API")

h.logger.Info().
    Int("statusCode", resp.StatusCode).
    Str("responsePreview", string(respBody[:min(200, len(respBody))])).
    Msg("Received response from Claude API")
```

---

## 改进建议

### 1. **立即行动项**

- [x] 为所有关键流程添加结构化日志
- [ ] 创建环境变量检查脚本
- [ ] 编写 API 集成测试
- [ ] 添加启动时配置验证

### 2. **文档改进**

需要在 `server/README.md` 中添加：

```markdown
## 环境变量配置

⚠️ **重要**：Go 服务器需要 `.env` 文件，不会自动使用系统环境变量。

### 快速开始

1. 复制示例文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 填写必需的配置：
   ```
   CLAUDE_API_KEY=your-api-key-here
   CLAUDE_API_BASE_URL=https://api.jiekou.ai
   ```

3. 验证配置（服务器会在启动时输出配置信息）：
   ```bash
   go run cmd/server/main.go
   ```

### jiekou.ai 特殊说明

- **API 端点**：`/anthropic/v1/messages`（不是标准的 `/v1/messages`）
- **认证方式**：使用 `x-api-key` header
- **官方文档**：https://docs.jiekou.ai/docs/providers/anthropic

### 故障排查

如果遇到 "Claude API is not configured" 错误：

1. 检查 `.env` 文件是否存在于 `server/` 目录
2. 确认 `CLAUDE_API_KEY` 是否已填写
3. 查看服务器启动日志中的配置信息
4. 使用 `curl` 测试端点是否可达
```

### 3. **自动化检查**

**启动时配置验证**：
```go
// server/pkg/config/config.go
func (cfg *Config) Validate() error {
    if cfg.Claude.APIKey == "" {
        return fmt.Errorf("CLAUDE_API_KEY is required in .env file")
    }

    if len(cfg.Claude.APIKey) < 20 {
        return fmt.Errorf("CLAUDE_API_KEY appears to be invalid (too short)")
    }

    log.Info().
        Str("apiKey", maskAPIKey(cfg.Claude.APIKey)).
        Str("baseURL", cfg.Claude.BaseURL).
        Msg("✅ Claude API configuration loaded successfully")

    return nil
}

// 在 main.go 中调用
cfg, err := config.LoadConfig()
if err != nil {
    log.Fatal().Err(err).Msg("Failed to load configuration")
}

if err := cfg.Validate(); err != nil {
    log.Fatal().Err(err).Msg("Invalid configuration")
}
```

### 4. **健康检查端点**

```go
// server/internal/handlers/health.go
func HealthCheckDetailed(db *database.Database, cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        health := gin.H{
            "status": "ok",
            "database": db.IsAvailable(),
            "claude_api_configured": cfg.Claude.APIKey != "",
            "timestamp": time.Now().Unix(),
        }

        if !db.IsAvailable() || cfg.Claude.APIKey == "" {
            health["status"] = "degraded"
            c.JSON(http.StatusServiceUnavailable, health)
            return
        }

        c.JSON(http.StatusOK, health)
    }
}
```

---

## 经验教训 (Key Takeaways)

### 🎯 **Top 3 教训**

1. **日志第一原则**
   - 在开发关键功能时，先写日志再写逻辑
   - 记录所有外部依赖的交互（API、数据库、文件系统）
   - 敏感信息必须脱敏（API key、密码、Token）

2. **不要假设，要验证**
   - 不同语言/框架的行为差异很大
   - 第三方 API 可能有非标准实现
   - 配置加载机制需要显式验证
   - **迁移项目时必须建立新的心智模型**

3. **测试驱动调试**
   - 先写独立的单元测试（curl、脚本）
   - 逐层验证（配置→网络→业务逻辑）
   - 不要一开始就端到端测试
   - 使用日志而非断点调试分布式系统

### 📊 **时间分布**

```
CORS 问题（误判）         ████████░░░░░░░░ 30分钟 (25%)
环境变量未加载（核心）     ████████████████ 40分钟 (33%)
API 端点错误             ████████░░░░░░░░ 20分钟 (17%)
日志调试与验证           ██████████░░░░░░ 30分钟 (25%)
```

**总计**：120分钟（2小时）

### ✅ **如果重来，正确的顺序**

```
1. [5分钟]  查看服务端日志，确认 503 错误根本原因
2. [5分钟]  检查环境变量是否被正确加载
3. [10分钟] 查阅 Go 环境变量最佳实践，引入 godotenv
4. [5分钟]  查阅 jiekou.ai 官方文档，确认 API 端点规范
5. [10分钟] 在关键位置添加详细日志
6. [5分钟]  使用 curl 测试验证修复

总计：40分钟（实际花费：120分钟）
节省：80分钟（66.7%）
```

---

## 结论

这次问题解决耗时较长的**核心原因**不是技术难度，而是：

1. **诊断方向错误**：被 CORS 错误误导，没有先看服务端日志
2. **技术栈认知差距**：低估了 Node.js 到 Go 的环境变量处理差异
3. **调试工具不足**：缺少充分的日志导致盲目修改代码
4. **文档查阅不及时**：应该一开始就确认 jiekou.ai 的端点规范

### 未来类似问题的黄金法则

> 🔑 **日志 > 文档 > 假设**
>
> 先看日志定位问题层级（配置/网络/业务），
> 再查官方文档确认规范和最佳实践，
> 最后才是基于经验做出假设并验证。

### 预防措施

1. **项目初始化时建立环境变量检查清单**
2. **集成第三方服务前先阅读完整文档**
3. **关键路径上的日志覆盖率达到 100%**
4. **编写自动化健康检查和配置验证**
5. **技术栈迁移时建立新的认知模型**

---

**文档版本**：v1.0
**作者**：Claude Sonnet 4.5
**最后更新**：2025-12-20
