# 集成测试指南

## 概述

集成测试用于测试服务与真实数据库的交互，包括完整的CRUD流程和JSONB字段的序列化/反序列化。

## 前置要求

1. **PostgreSQL 14+** 数据库
2. **测试数据库**：需要创建一个专门的测试数据库
3. **环境变量**：配置测试数据库连接信息

## 设置测试数据库

### 1. 创建测试数据库

```sql
CREATE DATABASE bpmn_explorer_test;
```

### 2. 配置环境变量

在运行集成测试前，设置以下环境变量：

```bash
export INTEGRATION_TEST=true
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=your_password
export TEST_DB_NAME=bpmn_explorer_test
```

### 3. 运行迁移

集成测试会自动运行迁移脚本，但也可以手动运行：

```bash
make migrate-up
# 或使用环境变量
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=your_password DB_NAME=bpmn_explorer_test make migrate-up
```

## 运行集成测试

### 方法1：使用 Makefile

```bash
# 设置环境变量
export INTEGRATION_TEST=true
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=your_password
export TEST_DB_NAME=bpmn_explorer_test

# 运行集成测试
make test-integration
```

### 方法2：直接使用 go test

```bash
export INTEGRATION_TEST=true
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=your_password
export TEST_DB_NAME=bpmn_explorer_test

go test -tags=integration -v ./internal/services/... -run TestIntegration
```

## 测试覆盖

集成测试包括以下测试用例：

1. **UserService CRUD**：测试用户服务的完整CRUD流程
2. **UserService JSONB序列化**：测试复杂JSONB结构的序列化/反序列化
3. **WorkflowService CRUD**：测试工作流服务的完整CRUD流程
4. **WorkflowInstanceService CRUD**：测试工作流实例服务的完整CRUD流程
5. **WorkflowExecutionService CRUD**：测试工作流执行服务的完整CRUD流程
6. **WorkflowExecutionService JSONB序列化**：测试执行变量的复杂JSONB结构
7. **完整工作流生命周期**：测试从创建到完成的完整流程

## 测试数据清理

集成测试会在每个测试前后自动清理测试数据，确保测试的独立性。

## 注意事项

1. **测试数据库隔离**：确保使用独立的测试数据库，避免影响开发或生产数据
2. **并发测试**：如果多个测试并发运行，确保使用不同的测试数据库或表前缀
3. **迁移脚本**：确保迁移脚本是最新的，测试会自动运行迁移
4. **环境变量**：如果未设置 `INTEGRATION_TEST=true`，集成测试会被跳过

## 故障排查

### 数据库连接失败

```
Error: failed to connect to test database
```

**解决方案**：
- 检查数据库是否运行
- 验证环境变量配置
- 检查数据库用户权限

### 迁移失败

```
Error: failed to run migrations
```

**解决方案**：
- 检查迁移脚本文件是否存在
- 验证数据库用户是否有创建表的权限
- 手动运行迁移脚本检查错误

### 测试数据清理失败

测试会在每个测试后清理数据，如果清理失败，可以手动清理：

```sql
DELETE FROM workflow_executions;
DELETE FROM workflow_instances;
DELETE FROM workflows;
DELETE FROM users;
```

## CI/CD 集成

在CI/CD流水线中运行集成测试：

```yaml
# 示例 GitHub Actions
- name: Run Integration Tests
  env:
    INTEGRATION_TEST: true
    TEST_DB_HOST: localhost
    TEST_DB_PORT: 5432
    TEST_DB_USER: postgres
    TEST_DB_PASSWORD: ${{ secrets.TEST_DB_PASSWORD }}
    TEST_DB_NAME: bpmn_explorer_test
  run: make test-integration
```

