# 变更：添加后端选择配置

## Why

当前项目已经支持两个后端实现（Node.js 和 Go），但前端 client 缺少配置选项来指定使用哪个后端。用户需要手动修改环境变量中的 `VITE_CLAUDE_BASE_URL` 来切换后端，这不够灵活且容易出错。

我们需要：

1. **简化后端切换**：提供用户友好的配置方式，无需修改环境变量
2. **环境感知**：开发环境可以快速切换后端进行测试
3. **默认值管理**：根据部署环境自动选择合适的后端
4. **可扩展性**：未来支持更多后端实现时易于扩展

## What Changes

### 1. 添加后端配置管理
- 在 `src/config/` 下创建 `backendConfig.ts`
- 定义 `BackendConfig` 接口，包含：
  - `backend`: 后端类型（'nodejs' | 'go'）
  - `apiBaseUrl`: API 基础 URL
  - 自动根据 backend 类型生成完整的 Claude API 代理 URL
- 实现 `BackendConfigManager` 单例，类似 `llmConfig`

### 2. 环境变量支持
- 添加 `VITE_BACKEND_TYPE` 环境变量（可选，默认 'nodejs'）
- 添加 `VITE_API_BASE_URL` 环境变量（可选，默认根据 backend 类型推断）
- 更新 `.env.example` 文件说明新配置项

### 3. 集成到现有服务
- 更新 `claudeLlmService.ts`，使用 `backendConfig` 替代硬编码的 URL
- 确保 LLM 服务能正确获取当前后端配置
- 保持向后兼容性

### 4. 类型定义
- 在 `src/types/index.ts` 中添加 `BackendType` 类型
- 导出配置相关类型供其他模块使用

## Impact

- **受影响的规范**：
  - 需要创建新的 `frontend-config` 规范，定义前端配置管理需求
  - 可能影响 `ai-integration` 规范（LLM 服务配置）

- **受影响的代码**：
  - 新增 `packages/client/src/config/backendConfig.ts`
  - 修改 `packages/client/src/services/claudeLlmService.ts`
  - 修改 `packages/client/src/config/llmConfig.ts`（可选，整合配置）
  - 更新 `packages/client/.env.example`
  - 更新 `packages/client/src/types/index.ts`

- **数据影响**：
  - 无数据库变更
  - LocalStorage 可以缓存用户选择的后端（可选功能）

- **用户影响**：
  - 用户可以通过环境变量快速切换后端
  - 开发者可以在不同后端之间轻松测试
  - 保持向后兼容，现有配置继续有效
  - 未来可以在 UI 中添加后端切换组件

## Migration Path

对于现有部署：
1. **默认行为不变**：如果未设置 `VITE_BACKEND_TYPE`，默认使用 Node.js 后端
2. **渐进式采用**：可以逐步迁移到新的配置方式
3. **环境变量映射**：
   - 旧：`VITE_CLAUDE_BASE_URL=http://localhost:3000/api/claude`
   - 新：`VITE_BACKEND_TYPE=nodejs` + `VITE_API_BASE_URL=http://localhost:3000`（自动拼接 `/api/claude`）
4. **兼容性**：如果设置了旧的 `VITE_CLAUDE_BASE_URL`，优先使用它以保持兼容性
