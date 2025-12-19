# Capability: Frontend Configuration (frontend-config)

## Overview
前端配置管理系统，负责管理应用程序的运行时配置，包括后端选择、API 端点等。

## ADDED Requirements

### Requirement: Backend Type Configuration
系统 SHALL 支持配置后端实现类型。

**Rationale**: 项目支持多个后端实现（Node.js 和 Go），需要允许用户选择使用哪个后端。

#### Scenario: Default backend selection
**Given** 用户未指定后端类型
**When** 应用程序启动
**Then** 系统应默认使用 Node.js 后端

#### Scenario: Explicit backend selection via environment variable
**Given** 环境变量 `VITE_BACKEND_TYPE` 设置为 "go"
**When** 应用程序启动
**Then** 系统应使用 Go 后端
**And** Claude API 代理 URL 应指向 Go server 端点

#### Scenario: Invalid backend type
**Given** 环境变量 `VITE_BACKEND_TYPE` 设置为无效值（如 "python"）
**When** 应用程序启动
**Then** 系统应回退到默认 Node.js 后端
**And** 控制台应输出警告信息

---

### Requirement: API Base URL Configuration
系统 SHALL 支持配置 API 基础 URL。

**Rationale**: 不同部署环境（开发、生产）需要不同的 API 端点。

#### Scenario: Default API base URL for development
**Given** 用户未指定 API base URL
**And** 应用程序运行在开发模式
**When** 系统初始化配置
**Then** API base URL 应默认为 "http://localhost:3000"（Node.js）或 "http://localhost:3001"（Go）

#### Scenario: Custom API base URL
**Given** 环境变量 `VITE_API_BASE_URL` 设置为 "https://api.example.com"
**When** 系统初始化配置
**Then** 所有 API 请求应使用 "https://api.example.com" 作为基础 URL

#### Scenario: API URL construction for Claude proxy
**Given** backend 类型为 "nodejs"
**And** API base URL 为 "http://localhost:3000"
**When** 系统构建 Claude API 代理 URL
**Then** 完整 URL 应为 "http://localhost:3000/api/claude"

---

### Requirement: Configuration Manager Singleton
系统 SHALL 提供单例配置管理器。

**Rationale**: 确保整个应用程序使用一致的配置，避免配置冲突。

#### Scenario: Configuration manager initialization
**Given** 应用程序首次启动
**When** 配置管理器被导入
**Then** 应创建单例实例
**And** 配置应从环境变量加载

#### Scenario: Get current configuration
**Given** 配置管理器已初始化
**When** 服务调用 `getConfig()` 方法
**Then** 应返回当前配置的副本（防止直接修改）

#### Scenario: Update configuration at runtime
**Given** 配置管理器已初始化
**When** 调用 `updateConfig({ backend: 'go' })`
**Then** 后端类型应更新为 'go'
**And** API base URL 应相应更新
**And** 其他服务应能获取到最新配置

---

### Requirement: Backward Compatibility with Legacy Configuration
系统 SHALL 保持与现有配置方式的向后兼容性。

**Rationale**: 避免破坏现有部署和开发流程。

#### Scenario: Legacy CLAUDE_BASE_URL takes precedence
**Given** 环境变量 `VITE_CLAUDE_BASE_URL` 设置为 "http://legacy:3000/api/claude"
**And** 环境变量 `VITE_BACKEND_TYPE` 设置为 "go"
**When** 系统初始化配置
**Then** 应优先使用 `VITE_CLAUDE_BASE_URL` 的值
**And** backend 类型配置应被忽略

#### Scenario: No legacy configuration present
**Given** 环境变量 `VITE_CLAUDE_BASE_URL` 未设置
**When** 系统初始化配置
**Then** 应使用新的 `VITE_BACKEND_TYPE` 和 `VITE_API_BASE_URL` 配置

---

### Requirement: Type-Safe Configuration Interface
系统 SHALL 提供类型安全的配置接口。

**Rationale**: TypeScript 类型系统确保配置使用的正确性，减少运行时错误。

#### Scenario: Backend type validation
**Given** TypeScript 编译时
**When** 代码尝试设置 `backend` 为不在 union type 中的值
**Then** TypeScript 编译应报错

#### Scenario: Configuration object structure
**Given** 配置对象已定义
**Then** 应包含以下必需字段：
- `backend`: 'nodejs' | 'go'
- `apiBaseUrl`: string
- `claudeApiUrl`: string (computed from backend and apiBaseUrl)

---

### Requirement: Environment-Specific Defaults
系统 MUST 根据部署环境提供合理的默认配置。

**Rationale**: 减少配置负担，提供开箱即用的体验。

#### Scenario: Development environment defaults
**Given** 应用程序运行在开发环境（`NODE_ENV=development`）
**When** 未提供任何配置
**Then** 应使用以下默认值：
- backend: 'nodejs'
- apiBaseUrl: 'http://localhost:3000'
- claudeApiUrl: 'http://localhost:3000/api/claude'

#### Scenario: Production environment defaults
**Given** 应用程序运行在生产环境（`NODE_ENV=production`）
**When** 未提供 API base URL
**Then** 应使用相对路径或从 window.location 推断
**And** 应记录警告提示显式配置 API URL
