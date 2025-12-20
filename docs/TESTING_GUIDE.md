# 测试指南

本文档提供项目的测试策略、运行方法和故障排查指南。

## 测试架构

项目采用多层测试架构，确保代码质量：

1. **单元测试**：测试单个函数/组件
2. **集成测试**：测试模块间交互
3. **E2E测试**：测试完整用户流程
4. **验证脚本**：验证服务启动和基本功能

## 前端测试

### 单元测试

使用 Jest 进行单元测试：

```bash
cd client
npm run test              # 运行所有测试
npm run test:watch        # 监听模式
npm run test:coverage     # 生成覆盖率报告
```

**目标覆盖率**：> 70%

### 类型检查

```bash
cd client
npm run type-check
```

### 构建验证

```bash
cd client
npm run build
```

### Headless Browser 验证

使用 Playwright 进行 headless 浏览器验证：

```bash
cd client
npm run test:e2e:headless
```

验证内容：
- 应用可以正常加载
- 主要路由可以访问
- 关键组件可以渲染
- 无 JavaScript 运行时错误

### E2E 测试

```bash
cd client

# 快速测试（< 2分钟）
npm run test:e2e:quick

# 完整测试（< 10分钟）
npm run test:e2e:full

# 完整测试套件（< 30分钟）
npm run test:e2e:all

# UI 模式（调试）
npm run test:e2e:ui
```

### 服务启动验证

```bash
cd client
npm run verify:start
```

或使用完整验证脚本：

```bash
bash scripts/verify-frontend.sh
```

## 后端测试

### 单元测试

使用 Go testing 框架测试后端内部逻辑：

```bash
cd server
make test
```

**测试位置**：`server/internal/` 目录下的 `*_test.go` 文件

### 测试覆盖率

```bash
cd server
make test-coverage
```

覆盖率报告位置：`reports/coverage/coverage.html`

### 集成测试

使用 Go testing with tags 测试数据库交互：

```bash
cd server
INTEGRATION_TEST=true make test-integration
```

**测试位置**：`server/internal/services/integration_test.go`

**注意**：需要测试数据库环境，详见 `server/INTEGRATION_TEST.md`

### API 端点测试

后端 API 端点的测试有两种方式：

1. **Handler 单元测试**（推荐用于快速测试）：
   - 位置：`server/internal/handlers/*_test.go`
   - 使用 `httptest` 包模拟 HTTP 请求
   - 运行：`cd server && make test`

2. **API E2E 测试**（推荐用于完整验证）：
   - 位置：`tests/e2e/api-integration.spec.ts`
   - 使用 Playwright 的 `request` API 测试真实运行的服务器
   - 运行：`cd client && npm run test:e2e:full`
   - **注意**：需要后端服务运行（可通过 `make run` 启动）

### 编译验证

```bash
cd server
make verify:build
```

### 服务启动验证

```bash
cd server
make verify:start
```

或使用完整验证脚本：

```bash
bash scripts/verify-backend.sh
```

## E2E 测试

E2E 测试使用 Playwright，位于 `tests/e2e/` 目录。

### 测试架构说明

**为什么所有 E2E 测试都在 client 目录下运行？**

1. **Playwright 是 Node.js 工具**：需要 npm 环境和 Node.js 运行时
2. **统一测试框架**：使用同一个工具（Playwright）测试前端和后端，便于管理
3. **端到端测试**：E2E 测试关注的是整个系统的行为（前端+后端），而不是单独的后端

**测试分类：**

- **前端 E2E 测试**：使用 Playwright 的 `page` API 测试浏览器中的前端应用
  - 位置：`tests/e2e/core-features.spec.ts` 等
  - 测试内容：UI 交互、路由导航、组件渲染等

- **后端 API E2E 测试**：使用 Playwright 的 `request` API 测试后端 HTTP API
  - 位置：`tests/e2e/api-integration.spec.ts`
  - 测试内容：API 端点、错误处理、数据格式验证等
  - **注意**：这是从外部视角测试 API，不是后端内部的单元测试

- **后端单元/集成测试**：使用 Go testing 框架
  - 位置：`server/internal/` 目录下的 `*_test.go` 文件
  - 运行方式：`cd server && make test` 或 `make test-integration`
  - 测试内容：后端内部逻辑、数据库交互等

### 测试结构

```
tests/e2e/
├── core-features.spec.ts      # 前端核心功能测试（使用 page API）
├── api-integration.spec.ts     # 后端 API 集成测试（使用 request API）
├── regression.spec.ts          # 回归测试
├── lifecycle-workflow.spec.ts  # 工作流生命周期测试
├── global-setup.ts             # 全局设置
├── global-teardown.ts          # 全局清理
├── fixtures.ts                 # 测试 Fixtures
├── test-helpers.ts             # 测试辅助函数
└── README.md                   # E2E 测试详细文档
```

### 运行 E2E 测试

```bash
cd client

# 快速测试模式（< 2分钟）
npm run test:e2e:quick

# 完整测试模式（< 10分钟）
npm run test:e2e:full

# 完整测试套件（< 30分钟）
npm run test:e2e:all

# 查看测试报告
npm run test:e2e:report
```

### 测试报告

测试报告生成在 `reports/playwright-report/` 目录：

- **HTML 报告**：`reports/playwright-report/index.html`
- **JSON 报告**：`reports/playwright-report/results.json`
- **JUnit 报告**：`reports/playwright-report/junit.xml`

查看报告：

```bash
cd client
npm run test:e2e:report
```

## 验证脚本

### 前端验证

```bash
bash scripts/verify-frontend.sh
```

执行内容：
1. 类型检查
2. 构建验证
3. 单元测试
4. Headless Browser 验证

### 后端验证

```bash
bash scripts/verify-backend.sh
```

执行内容：
1. Go 编译
2. 单元测试
3. 服务启动验证

### 完整验证

```bash
bash scripts/verify-all.sh
```

执行前端和后端的所有验证。

## 故障排查

### 常见问题

#### 1. 测试超时

**问题**：测试执行超时

**解决方案**：
- 检查服务是否正常启动
- 增加测试超时时间（在 `playwright.config.ts` 中）
- 检查网络连接

#### 2. 元素找不到

**问题**：测试中找不到页面元素

**解决方案**：
- 检查选择器是否正确
- 增加等待时间
- 使用 `page.waitForSelector()` 等待元素出现
- 使用 `data-testid` 属性而不是 CSS 类名

#### 3. 网络请求失败

**问题**：API 请求失败

**解决方案**：
- 检查后端服务是否运行
- 检查 API URL 配置是否正确
- 检查 CORS 配置

#### 4. 测试不稳定

**问题**：测试有时通过，有时失败

**解决方案**：
- 使用 `page.waitForLoadState('networkidle')` 等待页面完全加载
- 使用明确的等待条件而不是固定延迟
- 检查是否有竞态条件

#### 5. Playwright 浏览器未安装

**问题**：`npx playwright install` 失败

**解决方案**：
```bash
cd client
npm run install:deps  # 自动安装依赖和浏览器
```

#### 6. 类型检查失败

**问题**：`npm run type-check` 报错

**解决方案**：
- 修复类型错误
- 检查 TypeScript 配置
- 确保所有依赖已安装

#### 7. 编译失败

**问题**：`npm run build` 或 `go build` 失败

**解决方案**：
- 检查代码语法错误
- 检查依赖是否正确安装
- 查看详细错误信息

### 调试技巧

1. **使用 UI 模式运行 E2E 测试**：
   ```bash
   cd client
   npm run test:e2e:ui
   ```

2. **查看测试报告**：
   ```bash
   cd client
   npm run test:e2e:report
   ```

3. **启用详细日志**：
   - 在测试中添加 `console.log()`
   - 使用 Playwright 的 `page.screenshot()` 截图
   - 使用 `page.video()` 录制视频

4. **检查服务日志**：
   - 前端：查看浏览器控制台
   - 后端：查看服务器日志

## 测试最佳实践

1. **使用明确的等待条件**：避免使用 `page.waitForTimeout()`，使用 `waitForSelector()` 等
2. **测试隔离**：每个测试应该独立，不依赖其他测试的状态
3. **使用数据测试ID**：在 HTML 中使用 `data-testid` 属性，而不是依赖 CSS 类名
4. **错误处理**：测试应该优雅地处理错误情况
5. **测试命名**：使用描述性的测试名称，清楚说明测试的内容
6. **遵循 TDD 原则**：先写测试，再写代码

## 相关文档

- [测试策略文档](TESTING_AND_VALIDATION_STRATEGY.md)
- [E2E 测试详细指南](../tests/e2e/README.md)
- [Playwright 官方文档](https://playwright.dev/)

