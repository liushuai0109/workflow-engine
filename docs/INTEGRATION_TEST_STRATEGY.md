# 集成测试策略方案

## 一、集成测试定义与范围

### 1.1 什么是集成测试

集成测试是测试多个组件或模块协同工作的测试方法，验证它们之间的接口和交互是否正确。在本项目中，集成测试包括：

1. **后端集成测试**：测试服务层与数据库的交互
2. **API 集成测试**：测试 HTTP API 端点的完整功能
3. **前后端集成测试**：测试前端应用与后端 API 的完整交互流程
4. **系统集成测试**：测试整个系统的端到端业务流程

### 1.2 集成测试 vs 单元测试 vs E2E 测试

| 测试类型 | 测试范围 | 测试目标 | 执行速度 | 示例 |
|---------|---------|---------|---------|------|
| **单元测试** | 单个函数/组件 | 验证逻辑正确性 | 快（毫秒级） | 测试一个函数的计算逻辑 |
| **集成测试** | 多个模块/服务 | 验证模块间交互 | 中（秒级） | 测试服务与数据库交互 |
| **E2E 测试** | 完整系统 | 验证用户流程 | 慢（分钟级） | 测试用户创建并执行工作流 |

## 二、集成测试分层架构

### 2.1 测试金字塔

```
                    /\
                   /  \
                  /E2E \         少量（< 10%）
                 /------\
                /        \
               / Integration\    适量（20-30%）
              /------------\
             /              \
            /   Unit Tests   \   大量（60-70%）
           /------------------\
```

### 2.2 三层集成测试架构

#### 第一层：后端服务集成测试（Backend Service Integration）

**测试范围**：
- 服务层与数据库的交互
- 数据持久化和查询
- JSONB 字段序列化/反序列化
- 事务处理
- 数据完整性约束

**测试位置**：`server/internal/services/integration_test.go`

**运行方式**：
```bash
cd server
export INTEGRATION_TEST=true
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=your_password
export TEST_DB_NAME=bpmn_explorer_test
make test-integration
```

**测试覆盖**：
- ✅ UserService CRUD 操作
- ✅ WorkflowService CRUD 操作
- ✅ WorkflowInstanceService CRUD 操作
- ✅ WorkflowExecutionService CRUD 操作
- ✅ JSONB 字段序列化/反序列化
- ✅ 完整工作流生命周期
- ✅ 工作流引擎执行逻辑

#### 第二层：API 集成测试（API Integration）

**测试范围**：
- HTTP API 端点的完整功能
- 请求/响应格式验证
- 错误处理
- 认证和授权（如果有）
- API 性能基准

**测试位置**：`client/tests/e2e/api-integration.spec.ts`

**运行方式**：
```bash
cd client
# 确保后端服务运行
cd ../server && make run &
cd ../client
npm run test:e2e:full
```

**测试覆盖**：
- ✅ 工作流管理 API（创建、查询、更新、删除）
- ✅ 工作流执行 API（启动、查询状态、取消）
- ✅ Mock 执行 API（启动、单步执行、继续、停止）
- ✅ Debug 调试 API（启动、设置断点、查看变量）
- ✅ 聊天 API（创建会话、发送消息、获取历史）
- ✅ 错误场景处理（404、400、500 等）
- ✅ 数据验证（必填字段、格式验证等）

#### 第三层：前后端集成测试（Frontend-Backend Integration）

**测试范围**：
- 前端 UI 与后端 API 的完整交互
- 用户操作触发的完整业务流程
- 数据同步和状态管理
- 错误处理和用户反馈

**测试位置**：`client/tests/e2e/workflow-operations.spec.ts`、`mock-debug.spec.ts` 等

**运行方式**：
```bash
cd client
# 确保前后端服务都运行
npm run test:e2e:full
```

**测试覆盖**：
- ✅ 工作流创建、编辑、保存的完整流程
- ✅ 工作流执行和状态跟踪
- ✅ Mock 执行功能的完整交互
- ✅ Debug 调试功能的完整交互
- ✅ 聊天功能的完整交互
- ✅ 数据持久化和加载

## 三、测试环境配置

### 3.1 测试数据库配置

**独立测试数据库**：
- 数据库名：`bpmn_explorer_test`
- 与开发/生产数据库完全隔离
- 每次测试前自动清理数据

**环境变量配置**：
```bash
export INTEGRATION_TEST=true
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=your_password
export TEST_DB_NAME=bpmn_explorer_test
```

### 3.2 测试服务配置

**后端测试服务**：
- 端口：8080（可配置）
- 数据库：使用测试数据库
- 日志级别：DEBUG（测试时）

**前端测试服务**：
- 端口：8000（可配置）
- API 端点：指向测试后端
- 环境：测试模式

### 3.3 Docker 测试环境（推荐）

使用 Docker Compose 创建隔离的测试环境：

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: bpmn_explorer_test
    ports:
      - "5433:5432"
    volumes:
      - test-db-data:/var/lib/postgresql/data

  test-backend:
    build:
      context: ./server
    environment:
      DB_HOST: test-db
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: bpmn_explorer_test
    depends_on:
      - test-db
    ports:
      - "8080:8080"

volumes:
  test-db-data:
```

## 四、测试数据管理

### 4.1 测试数据策略

**原则**：
1. **测试隔离**：每个测试用例使用独立的数据，互不影响
2. **数据清理**：测试前后自动清理数据
3. **数据可预测**：使用固定的测试数据，确保测试结果可重复
4. **数据最小化**：只创建测试所需的最小数据集

### 4.2 测试数据准备

**后端集成测试**：
```go
// 在每个测试前准备测试数据
func setupTestData(t *testing.T, db *database.Database) {
    // 创建测试用户
    user := &models.User{
        ID: "test-user-1",
        Name: "Test User",
        // ...
    }
    // 插入数据库
}

// 在每个测试后清理数据
func cleanupTestData(t *testing.T, db *database.Database) {
    // 删除所有测试数据
}
```

**API 集成测试**：
```typescript
// 使用 Playwright fixtures 管理测试数据
test.beforeEach(async ({ request, backendUrl }) => {
  // 创建测试数据
  const workflow = await createWorkflowTestData(request, backendUrl, {
    name: 'Test Workflow',
    xml: testBpmnXml,
  });
});

test.afterEach(async ({ request, backendUrl }) => {
  // 清理测试数据
  await cleanupTestData(request, backendUrl, workflowId);
});
```

### 4.3 测试数据工厂

创建测试数据工厂函数，便于复用：

```go
// server/internal/services/test_factory.go
func CreateTestUser(t *testing.T, db *database.Database) *models.User {
    user := &models.User{
        ID: fmt.Sprintf("test-user-%d", time.Now().UnixNano()),
        Name: "Test User",
        // ...
    }
    // 插入并返回
    return user
}

func CreateTestWorkflow(t *testing.T, db *database.Database, userID string) *models.Workflow {
    workflow := &models.Workflow{
        ID: fmt.Sprintf("test-workflow-%d", time.Now().UnixNano()),
        UserID: userID,
        // ...
    }
    // 插入并返回
    return workflow
}
```

```typescript
// client/tests/e2e/test-factory.ts
export async function createTestWorkflow(
  request: APIRequestContext,
  backendUrl: string,
  overrides?: Partial<WorkflowData>
): Promise<Workflow> {
  const defaultData = {
    name: `Test Workflow ${Date.now()}`,
    xml: defaultBpmnXml,
    ...overrides,
  };
  return createTestData(request, backendUrl, '/api/workflows', defaultData);
}
```

## 五、测试执行策略

### 5.1 测试执行时机

| 时机 | 执行的测试 | 目标时间 |
|-----|----------|---------|
| **代码修改后** | 单元测试 + 快速集成测试 | < 1 分钟 |
| **提交前** | 单元测试 + 后端集成测试 + API 集成测试 | < 5 分钟 |
| **PR 合并前** | 所有测试（包括 E2E） | < 30 分钟 |
| **每日构建** | 完整测试套件 | < 1 小时 |

### 5.2 测试执行命令

**快速集成测试（开发时）**：
```bash
# 后端服务集成测试
cd server
make test-integration

# API 集成测试（快速模式）
cd client
npm run test:e2e:quick
```

**完整集成测试（提交前）**：
```bash
# 运行所有集成测试
cd server && make test-integration && cd ../client && npm run test:e2e:full
```

**完整测试套件（CI/CD）**：
```bash
# 运行所有测试
bash scripts/verify-all.sh
```

### 5.3 测试并行执行

**后端集成测试**：
- 使用 Go 的并行测试功能：`t.Parallel()`
- 注意：需要确保测试数据隔离

**API 集成测试**：
- Playwright 支持并行执行
- 配置：`workers: 4`（根据机器性能调整）

**注意事项**：
- 确保测试数据隔离
- 避免共享资源竞争
- 使用独立的测试数据库或表前缀

## 六、测试用例设计原则

### 6.1 测试用例结构

**AAA 模式**（Arrange-Act-Assert）：
```go
func TestIntegration_WorkflowService_Create(t *testing.T) {
    // Arrange: 准备测试数据和环境
    db := setupTestDB(t)
    defer cleanupTestData(t, db)
    service := NewWorkflowService(db, logger)
    
    // Act: 执行被测试的操作
    workflow, err := service.CreateWorkflow(ctx, &CreateWorkflowRequest{
        Name: "Test Workflow",
        XML: testBpmnXml,
    })
    
    // Assert: 验证结果
    require.NoError(t, err)
    assert.NotNil(t, workflow)
    assert.Equal(t, "Test Workflow", workflow.Name)
}
```

### 6.2 测试覆盖原则

**必须覆盖的场景**：
1. ✅ **正常流程**：所有功能点的正常使用场景
2. ✅ **边界条件**：空值、最大值、最小值等
3. ✅ **错误处理**：各种错误场景和异常情况
4. ✅ **数据完整性**：数据创建、更新、删除的完整性
5. ✅ **并发安全**：并发操作的数据一致性

**测试用例命名规范**：
- 格式：`TestIntegration_ServiceName_MethodName_Scenario`
- 示例：`TestIntegration_WorkflowService_Create_Success`
- 示例：`TestIntegration_WorkflowService_Create_InvalidXML`

### 6.3 测试断言原则

**使用明确的断言**：
```go
// 好的断言：明确说明期望值
assert.Equal(t, expectedValue, actualValue, "Workflow name should match")

// 不好的断言：只检查非空
assert.NotNil(t, workflow) // 不够明确
```

**使用 require 和 assert 的区别**：
- `require.*`：测试失败时立即停止，用于关键前置条件
- `assert.*`：测试失败时继续执行，用于验证结果

## 七、CI/CD 集成

### 7.1 GitHub Actions 配置

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: bpmn_explorer_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run backend integration tests
        env:
          INTEGRATION_TEST: true
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: postgres
          TEST_DB_NAME: bpmn_explorer_test
        run: |
          cd server
          make test-integration

  api-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: bpmn_explorer_test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd client
          npm ci
          npx playwright install --with-deps
      
      - name: Start backend server
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: postgres
          DB_NAME: bpmn_explorer_test
        run: |
          cd server
          make run &
          sleep 10
      
      - name: Run API integration tests
        env:
          BACKEND_URL: http://localhost:8080
          FRONTEND_URL: http://localhost:8000
        run: |
          cd client
          npm run test:e2e:full
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: client/reports/playwright-report/
```

### 7.2 测试报告

**后端集成测试报告**：
- 使用 Go 的 `-cover` 标志生成覆盖率报告
- 输出位置：`server/reports/coverage/coverage.html`

**API 集成测试报告**：
- Playwright 自动生成 HTML 报告
- 输出位置：`client/reports/playwright-report/index.html`

**报告查看**：
```bash
# 后端覆盖率报告
open server/reports/coverage/coverage.html

# API 测试报告
cd client && npm run test:e2e:report
```

## 八、最佳实践

### 8.1 测试隔离

**原则**：每个测试用例应该独立，不依赖其他测试的执行顺序或状态。

**实现方式**：
- 每个测试前准备数据
- 每个测试后清理数据
- 使用独立的测试数据库或表前缀
- 避免共享全局状态

### 8.2 测试速度优化

**策略**：
1. **并行执行**：使用 `t.Parallel()` 和 Playwright workers
2. **测试数据复用**：使用 `beforeAll` 准备共享数据
3. **跳过慢速测试**：开发时只运行快速测试
4. **测试分层**：快速测试和完整测试分离

### 8.3 测试稳定性

**策略**：
1. **明确的等待条件**：使用 `waitForSelector` 而不是固定延迟
2. **重试机制**：对不稳定的操作添加重试
3. **错误处理**：优雅处理测试中的错误
4. **日志记录**：记录详细的测试执行日志

### 8.4 测试维护

**策略**：
1. **测试代码规范**：遵循与业务代码相同的编码规范
2. **测试文档**：为复杂的测试用例添加注释
3. **定期审查**：定期审查和重构测试代码
4. **测试覆盖率监控**：监控测试覆盖率趋势

## 九、故障排查

### 9.1 常见问题

**问题 1：数据库连接失败**
```
Error: failed to connect to test database
```
**解决方案**：
- 检查数据库是否运行
- 验证环境变量配置
- 检查数据库用户权限

**问题 2：测试数据冲突**
```
Error: duplicate key value violates unique constraint
```
**解决方案**：
- 确保测试前后清理数据
- 使用唯一标识符（如时间戳）生成测试数据
- 检查测试是否并行执行导致冲突

**问题 3：测试超时**
```
Error: Test timeout after 30s
```
**解决方案**：
- 检查服务是否正常启动
- 增加测试超时时间
- 优化慢速操作

**问题 4：API 请求失败**
```
Error: Failed to fetch
```
**解决方案**：
- 检查后端服务是否运行
- 验证 API URL 配置
- 检查 CORS 配置

### 9.2 调试技巧

1. **启用详细日志**：
   ```bash
   # 后端
   export LOG_LEVEL=debug
   
   # 前端
   DEBUG=* npm run test:e2e
   ```

2. **使用测试调试器**：
   ```bash
   # Go 测试
   dlv test -- -test.run TestIntegration_WorkflowService
   
   # Playwright 调试模式
   npm run test:e2e:ui
   ```

3. **查看测试报告**：
   ```bash
   # 后端覆盖率
   open server/reports/coverage/coverage.html
   
   # API 测试报告
   cd client && npm run test:e2e:report
   ```

## 十、实施路线图

### Phase 1: 完善后端集成测试（1-2 天）

- [ ] 完善现有集成测试用例
- [ ] 添加更多边界条件测试
- [ ] 添加并发安全测试
- [ ] 优化测试执行速度

### Phase 2: 完善 API 集成测试（2-3 天）

- [ ] 扩展 API 集成测试覆盖范围
- [ ] 添加错误场景测试
- [ ] 添加性能基准测试
- [ ] 优化测试数据管理

### Phase 3: 完善前后端集成测试（3-5 天）

- [ ] 完善工作流操作测试
- [ ] 完善 Mock/Debug 功能测试
- [ ] 完善聊天功能测试
- [ ] 添加回归测试用例

### Phase 4: CI/CD 集成（1-2 天）

- [ ] 配置 GitHub Actions
- [ ] 设置测试报告上传
- [ ] 配置测试通知
- [ ] 优化 CI/CD 执行时间

### Phase 5: 测试优化和维护（持续）

- [ ] 监控测试覆盖率
- [ ] 优化慢速测试
- [ ] 定期审查测试用例
- [ ] 更新测试文档

## 十一、总结

本集成测试方案提供了：

1. **清晰的分层架构**：后端集成测试、API 集成测试、前后端集成测试
2. **完整的测试环境配置**：包括 Docker 测试环境
3. **规范的测试数据管理**：确保测试隔离和可重复性
4. **灵活的测试执行策略**：支持快速测试和完整测试
5. **CI/CD 集成方案**：自动化测试执行和报告
6. **最佳实践指南**：测试隔离、速度优化、稳定性保障

通过实施此方案，可以确保：
- ✅ 代码修改后立即发现集成问题
- ✅ 模块间交互的正确性
- ✅ 系统功能的完整性
- ✅ 持续集成的自动化保障

