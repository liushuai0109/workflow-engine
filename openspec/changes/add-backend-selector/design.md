# 设计文档：后端选择配置

## 概述

本设计为前端应用添加后端选择配置功能，允许用户在 Node.js 和 Go 两个后端实现之间进行选择。设计遵循现有的配置管理模式（参考 `llmConfig`），确保类型安全、易用性和向后兼容性。

## 架构设计

### 配置管理架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  (Components, Services using backend configuration)          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   BackendConfigManager                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  - backend: BackendType                             │    │
│  │  - apiBaseUrl: string                               │    │
│  │  - claudeApiUrl: string (computed)                  │    │
│  │                                                      │    │
│  │  Methods:                                           │    │
│  │  + getConfig(): BackendConfig                       │    │
│  │  + updateConfig(partial): void                      │    │
│  │  + setBackend(type): void                           │    │
│  │  + getClaudeApiUrl(): string                        │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│               Environment Variables / Defaults               │
│  VITE_BACKEND_TYPE, VITE_API_BASE_URL, VITE_CLAUDE_BASE_URL │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
[Environment Variables]
    ↓
[ConfigManager Initialization]
    ↓
[Compute URLs based on backend type]
    ↓
[LLMConfig & Services consume configuration]
    ↓
[API Requests to selected backend]
```

## 技术决策

### 1. 配置管理模式

**决策**: 使用单例模式的配置管理器

**理由**:
- 与现有 `llmConfig` 保持一致
- 确保全局配置一致性
- 便于测试和维护

**备选方案**: 使用 Vuex/Pinia 状态管理
- **拒绝理由**: 项目当前不使用状态管理库，引入会增加复杂度

### 2. 后端类型定义

**决策**: 使用 TypeScript union type `'nodejs' | 'go'`

**理由**:
- 类型安全，编译时检查
- 易于扩展（添加新后端只需修改 union type）
- 自动补全支持

**实现**:
```typescript
export type BackendType = 'nodejs' | 'go'

export interface BackendConfig {
  backend: BackendType
  apiBaseUrl: string
  readonly claudeApiUrl: string
}
```

### 3. URL 构建策略

**决策**: 自动根据 backend 类型推断默认端口

**理由**:
- 简化配置
- 开发环境开箱即用
- 保持与 server 实现的一致性

**映射关系**:
- `nodejs` → `http://localhost:3000`
- `go` → `http://localhost:3001`

**Claude API URL 构建**:
- 格式: `{apiBaseUrl}/api/claude`
- 示例: `http://localhost:3000/api/claude`

### 4. 向后兼容策略

**决策**: 优先级顺序
1. `VITE_CLAUDE_BASE_URL`（旧配置，最高优先级）
2. `VITE_BACKEND_TYPE` + `VITE_API_BASE_URL`（新配置）
3. 默认值（Node.js, localhost:3000）

**理由**:
- 不破坏现有部署
- 允许渐进式迁移
- 提供清晰的升级路径

**实现逻辑**:
```typescript
function loadConfig(): BackendConfig {
  // 1. Check legacy config first
  const legacyUrl = import.meta.env.VITE_CLAUDE_BASE_URL
  if (legacyUrl) {
    return {
      backend: inferBackendFromUrl(legacyUrl),
      apiBaseUrl: extractBaseUrl(legacyUrl),
      claudeApiUrl: legacyUrl
    }
  }

  // 2. Use new config
  const backendType = (import.meta.env.VITE_BACKEND_TYPE || 'nodejs') as BackendType
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || getDefaultBaseUrl(backendType)

  return {
    backend: backendType,
    apiBaseUrl,
    claudeApiUrl: `${apiBaseUrl}/api/claude`
  }
}
```

### 5. 生产环境 URL 处理

**决策**: 生产环境支持相对路径和自动推断

**理由**:
- 避免硬编码生产 URL
- 支持多环境部署
- 提高安全性

**实现**:
```typescript
function getDefaultBaseUrl(backend: BackendType): string {
  if (import.meta.env.PROD) {
    // Production: use relative path or infer from window.location
    return '' // 相对路径，浏览器自动处理
  }

  // Development
  return backend === 'go' ? 'http://localhost:3001' : 'http://localhost:3000'
}
```

## 接口设计

### BackendConfig 接口

```typescript
export interface BackendConfig {
  /** 后端实现类型 */
  backend: BackendType

  /** API 基础 URL */
  apiBaseUrl: string

  /** Claude API 代理 URL (自动计算) */
  readonly claudeApiUrl: string
}
```

### BackendConfigManager 类

```typescript
class BackendConfigManager {
  private config: BackendConfig

  constructor() {
    this.config = this.loadFromEnv()
  }

  /**
   * 获取当前配置（返回副本）
   */
  getConfig(): BackendConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(partial: Partial<Omit<BackendConfig, 'claudeApiUrl'>>): void {
    this.config = {
      ...this.config,
      ...partial,
      claudeApiUrl: this.buildClaudeApiUrl(
        partial.apiBaseUrl || this.config.apiBaseUrl
      )
    }
  }

  /**
   * 设置后端类型
   */
  setBackend(backend: BackendType): void {
    this.updateConfig({ backend })
  }

  /**
   * 获取 Claude API URL
   */
  getClaudeApiUrl(): string {
    return this.config.claudeApiUrl
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this.config = this.loadFromEnv()
  }

  private loadFromEnv(): BackendConfig { /* ... */ }
  private buildClaudeApiUrl(baseUrl: string): string { /* ... */ }
}

// 导出单例
export const backendConfig = new BackendConfigManager()
```

## 集成点

### 1. LLM Config 集成

**修改**: `src/config/llmConfig.ts`

```typescript
import { backendConfig } from './backendConfig'

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'claude',
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',

  // 旧方式（向后兼容）
  baseUrl: import.meta.env.VITE_CLAUDE_BASE_URL ||
           // 新方式：使用 backendConfig
           backendConfig.getClaudeApiUrl(),

  model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
  temperature: 0.7,
  enableCache: true
}
```

### 2. Claude LLM Service 集成

**修改**: `src/services/claudeLlmService.ts`

```typescript
import { backendConfig } from '@/config/backendConfig'

class ClaudeLlmService implements LlmService {
  private client: ClaudeAPIClient

  constructor() {
    const config = llmConfig.getConfig()

    // 记录当前使用的后端
    console.log(`[ClaudeLLM] Using backend: ${backendConfig.getConfig().backend}`)
    console.log(`[ClaudeLLM] API URL: ${config.baseUrl}`)

    this.client = new ClaudeAPIClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model
    })
  }
}
```

## 配置示例

### 开发环境 - Node.js 后端

`.env`:
```env
# 方式 1: 使用新配置（推荐）
VITE_BACKEND_TYPE=nodejs
# VITE_API_BASE_URL 可以省略，自动使用 http://localhost:3000

# 方式 2: 使用旧配置（向后兼容）
VITE_CLAUDE_BASE_URL=http://localhost:3000/api/claude
```

### 开发环境 - Go 后端

`.env`:
```env
VITE_BACKEND_TYPE=go
# VITE_API_BASE_URL 可以省略，自动使用 http://localhost:3001
```

### 生产环境

`.env.production`:
```env
VITE_BACKEND_TYPE=go
VITE_API_BASE_URL=https://api.example.com
# 最终 Claude API URL: https://api.example.com/api/claude
```

### 自定义后端 URL

`.env`:
```env
VITE_BACKEND_TYPE=nodejs
VITE_API_BASE_URL=http://custom-backend:8080
# 最终 Claude API URL: http://custom-backend:8080/api/claude
```

## 测试策略

### 单元测试

1. **配置加载测试**
   - 测试默认值
   - 测试环境变量读取
   - 测试向后兼容性

2. **URL 构建测试**
   - 测试不同 backend 类型的 URL 生成
   - 测试自定义 base URL
   - 测试末尾斜杠处理

3. **配置更新测试**
   - 测试运行时更新
   - 测试 URL 自动重新计算

### 集成测试

1. **后端连接测试**
   - 启动 Node.js 后端，测试连接
   - 启动 Go 后端，测试连接
   - 验证 API 响应格式一致

2. **配置切换测试**
   - 测试运行时切换后端
   - 验证后续请求使用新后端

## 错误处理

### 无效后端类型

```typescript
function validateBackendType(type: string): BackendType {
  if (type !== 'nodejs' && type !== 'go') {
    console.warn(`[BackendConfig] Invalid backend type: ${type}, falling back to nodejs`)
    return 'nodejs'
  }
  return type as BackendType
}
```

### 后端不可用

- 在 API 请求失败时，提供友好的错误消息
- 建议用户检查后端是否启动
- 提供切换到其他后端的提示（未来 UI 功能）

## 迁移指南

### 从旧配置迁移到新配置

**步骤 1**: 识别当前配置
```bash
# 旧配置
VITE_CLAUDE_BASE_URL=http://localhost:3000/api/claude
```

**步骤 2**: 转换为新配置
```bash
# 新配置
VITE_BACKEND_TYPE=nodejs
# VITE_API_BASE_URL 可选，默认 http://localhost:3000
```

**步骤 3**: 测试验证
```bash
pnpm run dev
# 检查控制台输出，确认使用正确的后端
```

### 回滚方案

如果新配置出现问题，可以随时回退到旧配置：
```bash
# 删除或注释新配置
# VITE_BACKEND_TYPE=nodejs

# 恢复旧配置
VITE_CLAUDE_BASE_URL=http://localhost:3000/api/claude
```

## 未来扩展

### 1. 添加新后端

添加 Python 后端示例：
```typescript
// 1. 扩展类型定义
export type BackendType = 'nodejs' | 'go' | 'python'

// 2. 更新默认 URL 映射
function getDefaultBaseUrl(backend: BackendType): string {
  const portMap = {
    nodejs: 3000,
    go: 3001,
    python: 3002
  }
  return `http://localhost:${portMap[backend]}`
}
```

### 2. 后端健康检查

```typescript
class BackendConfigManager {
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  async getAvailableBackends(): Promise<BackendType[]> {
    // 检查所有后端的健康状态
    // 返回可用的后端列表
  }
}
```

### 3. UI 后端选择器

```vue
<template>
  <div class="backend-selector">
    <label>Backend:</label>
    <select v-model="selectedBackend" @change="onBackendChange">
      <option value="nodejs">Node.js</option>
      <option value="go">Go</option>
    </select>
    <span :class="statusClass">{{ connectionStatus }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { backendConfig } from '@/config/backendConfig'

const selectedBackend = ref(backendConfig.getConfig().backend)
const connectionStatus = ref<'connected' | 'disconnected'>('connected')

const onBackendChange = () => {
  backendConfig.setBackend(selectedBackend.value)
  // 可选：测试连接或重新加载
}
</script>
```

## 性能考虑

- 配置读取：O(1)，从内存读取
- 配置更新：O(1)，简单对象赋值
- URL 构建：O(1)，字符串拼接
- 无显著性能影响

## 安全考虑

1. **URL 验证**: 验证 URL 格式，防止注入攻击
2. **生产环境**: 避免在日志中暴露完整 URL
3. **API Key 保护**: 继续由后端管理 API Key，前端不存储
