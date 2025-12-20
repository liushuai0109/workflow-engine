# E2E 测试指南

## 概述

本目录包含项目的端到端（E2E）测试套件，使用 Playwright 进行测试。

### 测试架构说明

**为什么所有 E2E 测试都在 client 目录下运行？**

1. **Playwright 是 Node.js 工具**：需要 npm 环境和 Node.js 运行时
2. **统一测试框架**：使用同一个工具（Playwright）测试前端和后端，便于管理
3. **端到端测试**：E2E 测试关注的是整个系统的行为（前端+后端），而不是单独的后端

**测试分类：**

- **前端 E2E 测试**：使用 Playwright 的 `page` API 测试浏览器中的前端应用
  - 文件：`core-features.spec.ts`、`regression.spec.ts` 等
  - 测试内容：UI 交互、路由导航、组件渲染等

- **后端 API E2E 测试**：使用 Playwright 的 `request` API 测试后端 HTTP API
  - 文件：`api-integration.spec.ts`
  - 测试内容：API 端点、错误处理、数据格式验证等
  - **注意**：这是从外部视角测试 API，不是后端内部的单元测试

- **后端单元/集成测试**：使用 Go testing 框架（在 `server/` 目录下）
  - 运行方式：`cd server && make test` 或 `make test-integration`
  - 测试内容：后端内部逻辑、数据库交互等

## 测试结构

```
tests/e2e/
├── core-features.spec.ts          # 核心功能测试
├── api-integration.spec.ts         # 接口集成测试
├── regression.spec.ts              # 回归测试
├── lifecycle-workflow.spec.ts      # 工作流生命周期测试（已存在）
├── headless-verification.spec.ts  # Headless浏览器验证（在client/src/__tests__/e2e/）
├── global-setup.ts                 # 全局设置
├── global-teardown.ts              # 全局清理
├── fixtures.ts                     # 测试Fixtures
└── README.md                       # 本文档
```

## 运行测试

### 前置要求

1. **安装依赖**：
   ```bash
   cd client
   npm install
   npx playwright install
   ```

2. **启动服务**（可选，Playwright可以自动启动）：
   ```bash
   # 前端
   cd client && npm run start
   
   # 后端（如果需要）
   cd server && make run
   ```

### 运行所有测试

```bash
cd client
npm run test:e2e
```

### 运行特定测试模式

#### 快速测试模式（< 2分钟）
```bash
cd client
npx playwright test --project=quick
```

#### 完整测试模式（< 10分钟）
```bash
cd client
npx playwright test --project=full
```

#### Headless Browser验证（< 1分钟）
```bash
cd client
npm run test:e2e:headless
```

#### 完整测试套件（< 30分钟）
```bash
cd client
npx playwright test --project=e2e
```

### 运行特定测试文件

```bash
cd client
npx playwright test tests/e2e/core-features.spec.ts
```

### 以UI模式运行（调试）

```bash
cd client
npm run test:e2e:ui
```

## 测试环境配置

### 环境变量

- `FRONTEND_URL`: 前端服务器URL（默认：http://localhost:8000）
- `BACKEND_URL`: 后端服务器URL（默认：http://localhost:8080）
- `CI`: 是否在CI环境中运行（影响重试和并行策略）
- `START_BACKEND`: 是否自动启动后端服务器（默认：false）
- `E2E_SETUP`: 是否启用全局设置（默认：false）
- `E2E_TEARDOWN`: 是否启用全局清理（默认：false）

### 配置文件

测试配置在 `client/playwright.config.ts` 中定义。

## 测试数据管理

### 测试数据准备

测试数据通常在测试用例中直接创建，使用 `beforeEach` 钩子准备。

### 测试数据清理

测试数据清理在 `afterEach` 或 `globalTeardown` 中执行。

### 测试数据隔离

每个测试用例应该使用独立的数据，避免测试之间的相互影响。

## 故障排查

### 常见问题

1. **测试超时**
   - 检查服务是否正常启动
   - 增加测试超时时间（在playwright.config.ts中）

2. **元素找不到**
   - 检查选择器是否正确
   - 增加等待时间
   - 使用 `page.waitForSelector()` 等待元素出现

3. **网络请求失败**
   - 检查后端服务是否运行
   - 检查API URL配置是否正确

4. **测试不稳定**
   - 使用 `page.waitForLoadState('networkidle')` 等待页面完全加载
   - 使用明确的等待条件而不是固定延迟

### 调试技巧

1. **使用UI模式**：
   ```bash
   npm run test:e2e:ui
   ```

2. **查看测试报告**：
   ```bash
   # 查看HTML报告
   npx playwright show-report ../reports/playwright-report
   
   # 或者直接打开报告文件
   open ../reports/playwright-report/index.html
   ```

3. **启用追踪**：
   在 `playwright.config.ts` 中设置 `trace: 'on'` 查看详细追踪信息

4. **截图和视频**：
   测试失败时会自动生成截图和视频，保存在 `test-results/` 目录

## 测试最佳实践

1. **使用明确的等待条件**：避免使用 `page.waitForTimeout()`，使用 `waitForSelector()` 等
2. **测试隔离**：每个测试应该独立，不依赖其他测试的状态
3. **使用数据测试ID**：在HTML中使用 `data-testid` 属性，而不是依赖CSS类名
4. **错误处理**：测试应该优雅地处理错误情况
5. **测试命名**：使用描述性的测试名称，清楚说明测试的内容

## 测试报告

### 报告类型

测试运行后会生成以下报告：

1. **HTML报告**：`reports/playwright-report/index.html`
   - 可视化测试结果
   - 包含截图、视频和追踪信息
   - 查看方式：`npx playwright show-report ../reports/playwright-report`

2. **JSON报告**：`reports/playwright-report/results.json`
   - 机器可读的测试结果
   - 可用于自动化分析

3. **JUnit报告**：`reports/playwright-report/junit.xml`
   - 标准JUnit格式
   - 可用于CI/CD集成

### 查看报告

```bash
# 在client目录下
cd client
npx playwright show-report ../reports/playwright-report
```

## 持续集成

在CI/CD环境中运行测试：

```bash
# 设置环境变量
export CI=true
export FRONTEND_URL=http://localhost:8000
export BACKEND_URL=http://localhost:8080

# 运行测试
cd client
npm run test:e2e

# 测试报告会自动生成到 reports/playwright-report/
```

## 相关文档

- [Playwright 官方文档](https://playwright.dev/)
- [测试策略文档](../../docs/TESTING_AND_VALIDATION_STRATEGY.md)

