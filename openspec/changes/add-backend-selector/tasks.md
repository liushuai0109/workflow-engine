# 实施任务清单

## Phase 1: 类型定义和配置管理 🔄

### Task 1.1: 定义后端类型
- [ ] 在 `src/types/index.ts` 中添加 `BackendType` 类型定义
  - 定义 union type: `'nodejs' | 'go'`
  - 添加 JSDoc 注释说明每个后端类型
- [ ] 定义 `BackendConfig` 接口
  - `backend`: BackendType
  - `apiBaseUrl`: string
  - `claudeApiUrl`: string (只读，自动计算)

**验收标准**:
- TypeScript 编译通过
- 类型定义有完整的 JSDoc 注释

---

### Task 1.2: 创建配置管理器
- [ ] 创建 `src/config/backendConfig.ts` 文件
- [ ] 实现 `BackendConfigManager` 类
  - `getConfig()`: 获取当前配置
  - `updateConfig(partial)`: 更新配置
  - `setBackend(type)`: 设置后端类型
  - `getClaudeApiUrl()`: 获取 Claude API URL
  - `reset()`: 重置为默认配置
- [ ] 实现配置初始化逻辑
  - 从环境变量读取 `VITE_BACKEND_TYPE`
  - 从环境变量读取 `VITE_API_BASE_URL`
  - 处理向后兼容：检查 `VITE_CLAUDE_BASE_URL`
  - 设置合理的默认值

**验收标准**:
- 配置管理器导出单例实例
- 支持运行时更新配置
- 向后兼容现有环境变量

---

### Task 1.3: 实现 URL 构建逻辑
- [ ] 实现根据 backend 类型自动推断 API base URL
  - nodejs: `http://localhost:3000`
  - go: `http://localhost:3001`
- [ ] 实现 Claude API URL 构建
  - 格式: `{apiBaseUrl}/api/claude`
- [ ] 处理生产环境的 URL 推断
  - 支持相对路径
  - 支持从 window.location 推断

**验收标准**:
- URL 构建逻辑正确
- 支持绝对路径和相对路径
- 处理末尾斜杠问题

---

## Phase 2: 集成到现有服务 🔄

### Task 2.1: 更新 LLM 配置
- [ ] 修改 `src/config/llmConfig.ts`
  - 导入 `backendConfig`
  - 使用 `backendConfig.getClaudeApiUrl()` 替代硬编码
  - 保持向后兼容性（优先使用 VITE_CLAUDE_BASE_URL）

**验收标准**:
- llmConfig 能正确获取后端配置
- 现有代码行为不受影响

---

### Task 2.2: 更新 Claude LLM Service
- [ ] 修改 `src/services/claudeLlmService.ts`
  - 使用 `backendConfig` 获取 API URL
  - 确保服务能感知后端类型变化
- [ ] 添加日志输出当前使用的后端

**验收标准**:
- Claude 服务使用正确的 API 端点
- 控制台输出当前后端信息

---

### Task 2.3: 更新 Claude API Client
- [ ] 检查 `src/services/claude/ClaudeAPIClient.ts` 是否需要修改
- [ ] 确保 API Client 能正确处理不同后端的响应

**验收标准**:
- API Client 兼容所有后端实现
- 错误处理统一

---

## Phase 3: 环境变量和文档 🔄

### Task 3.1: 更新环境变量示例
- [ ] 更新 `packages/client/.env.example`
  - 添加 `VITE_BACKEND_TYPE` 说明
  - 添加 `VITE_API_BASE_URL` 说明
  - 更新注释说明后端选择方式
  - 保留旧配置说明（向后兼容）

**验收标准**:
- .env.example 清晰说明所有配置选项
- 提供 nodejs 和 go 两种配置示例

---

### Task 3.2: 更新项目文档
- [ ] 更新 `packages/client/README.md`
  - 说明后端选择配置
  - 提供配置示例
  - 说明向后兼容性
- [ ] 更新根目录 `README.md`（如果需要）
  - 说明多后端支持和配置方式

**验收标准**:
- 文档完整准确
- 包含配置示例

---

## Phase 4: 测试和验证 🔄

### Task 4.1: 手动测试
- [ ] 测试默认配置（未设置环境变量）
  - 验证使用 Node.js 后端
  - 验证 API 调用成功
- [ ] 测试显式设置 backend='nodejs'
  - 验证使用正确的端口
- [ ] 测试显式设置 backend='go'
  - 验证使用 Go 后端（端口 3001）
- [ ] 测试自定义 API base URL
- [ ] 测试向后兼容性（使用旧的 VITE_CLAUDE_BASE_URL）

**验收标准**:
- 所有配置场景都能正常工作
- Claude AI 功能在不同后端下都可用

---

### Task 4.2: 编写单元测试
- [ ] 为 `backendConfig.ts` 编写单元测试
  - 测试默认值
  - 测试配置更新
  - 测试 URL 构建逻辑
  - 测试向后兼容性
- [ ] 运行测试确保通过

**验收标准**:
- 测试覆盖率 > 80%
- 所有测试通过

---

### Task 4.3: 集成测试
- [ ] 启动 Node.js 后端，测试前端连接
- [ ] 启动 Go 后端，测试前端连接
- [ ] 测试运行时切换后端（如果支持）

**验收标准**:
- 前端能成功连接到两个后端
- API 请求响应正确

---

## Phase 5: 可选增强功能 ⏸️

### Task 5.1: 添加配置持久化（可选）
- [ ] 使用 localStorage 缓存用户选择的后端
- [ ] 页面刷新后恢复用户选择

**验收标准**:
- 配置持久化到 localStorage
- 刷新页面后配置保持

---

### Task 5.2: 添加 UI 后端切换器（可选）
- [ ] 在设置面板添加后端选择下拉框
- [ ] 实现实时切换后端
- [ ] 显示当前使用的后端状态

**验收标准**:
- UI 组件美观易用
- 切换后端立即生效

---

### Task 5.3: 添加后端健康检查（可选）
- [ ] 实现后端健康检查 API 调用
- [ ] 在 UI 显示后端连接状态
- [ ] 自动切换到可用的后端

**验收标准**:
- 能检测后端是否在线
- UI 显示连接状态

---

## 时间估算

| Phase | 任务数 | 预计时间 | 状态 |
|-------|--------|----------|------|
| Phase 1 | 3 | 2-3 小时 | 🔄 待开始 |
| Phase 2 | 3 | 1-2 小时 | 🔄 待开始 |
| Phase 3 | 2 | 0.5-1 小时 | 🔄 待开始 |
| Phase 4 | 3 | 2-3 小时 | 🔄 待开始 |
| Phase 5 | 3 | 3-4 小时（可选） | ⏸️ 可选 |
| **必需部分** | **11** | **5.5-9 小时** | **待开始** |
| **总计** | **14** | **8.5-13 小时** | **待开始** |

## 依赖关系

- Phase 2 依赖 Phase 1（需要先定义配置管理器）
- Phase 3 可以与 Phase 2 并行
- Phase 4 依赖 Phase 1、2、3 完成
- Phase 5 是可选的增强功能，可以在主要功能完成后添加

## 风险和注意事项

1. **向后兼容性**：必须确保现有配置方式继续有效
2. **环境变量优先级**：明确定义多个配置源的优先级
3. **URL 格式**：处理各种 URL 格式（带/不带末尾斜杠，http/https）
4. **生产环境**：生产环境可能需要不同的 URL 推断逻辑
5. **错误处理**：当后端不可用时需要友好的错误提示
