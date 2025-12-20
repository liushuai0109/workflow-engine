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

```bash
cd server
make test
```

### 测试覆盖率

```bash
cd server
make test-coverage
```

覆盖率报告位置：`reports/coverage/coverage.html`

### 集成测试

需要测试数据库环境：

```bash
cd server
INTEGRATION_TEST=true make test-integration
```

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

### 测试结构

```
tests/e2e/
├── core-features.spec.ts      # 核心功能测试
├── api-integration.spec.ts     # 接口集成测试
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

