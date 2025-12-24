# E2E 测试脚本说明

## 自动化 E2E 测试脚本

### run-e2e-with-services.sh

这个脚本会自动管理所有需要的服务，并运行 E2E 测试。

#### 功能特性

1. **自动服务管理**
   - 自动检测并启动后端服务（如果未运行）
   - 自动检测数据库可用性
   - 如果数据库不可用，自动使用 `DB_DISABLED=true` 模式启动后端
   - 前端服务由 Playwright 的 webServer 配置自动管理

2. **智能清理**
   - 测试完成后自动停止脚本启动的服务
   - 不会停止脚本运行前已存在的服务
   - 支持优雅退出（Ctrl+C）

3. **健康检查**
   - 等待服务启动并通过健康检查
   - 超时保护（默认 30 秒）
   - 详细的日志输出

#### 使用方法

##### 通过 npm 脚本（推荐）

```bash
# 运行所有 E2E 测试（自动启动服务）
npm run test:e2e:auto

# 运行快速测试（核心功能，<2分钟）
npm run test:e2e:auto:quick

# 运行完整测试（核心功能 + API 集成 + 回归测试，<10分钟）
npm run test:e2e:auto:full

# 运行 headless 验证（<1分钟）
npm run test:e2e:auto:headless
```

##### 直接运行脚本

```bash
# 运行所有测试
./scripts/run-e2e-with-services.sh

# 运行特定项目
./scripts/run-e2e-with-services.sh --project=quick
./scripts/run-e2e-with-services.sh --project=full
./scripts/run-e2e-with-services.sh --project=headless-verification

# 跳过后端启动（如果后端已经在运行）
./scripts/run-e2e-with-services.sh --skip-backend

# 使用 headed 模式运行（可以看到浏览器）
./scripts/run-e2e-with-services.sh --headed

# 查看帮助信息
./scripts/run-e2e-with-services.sh --help
```

#### 配置说明

脚本会自动从以下位置读取配置：

1. **后端配置**（`server/.env`）
   - `PORT`: 后端服务端口（默认：3000）
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: 数据库配置

2. **环境变量**
   - `BACKEND_URL`: 后端 URL（默认：http://localhost:3000）
   - `FRONTEND_URL`: 前端 URL（默认：http://localhost:8000）

#### 数据库处理

脚本会自动检测 PostgreSQL 数据库：

- **数据库可用**: 后端正常连接数据库，所有测试运行
- **数据库不可用**: 后端自动使用 `DB_DISABLED=true` 启动，跳过需要数据库的测试

要启用数据库支持，确保：
1. PostgreSQL 已安装并运行
2. 数据库 `workflow_engine` 已创建
3. 用户权限配置正确

参考：`server/DATABASE_SETUP.md`

#### 日志文件

- **后端日志**: `/tmp/workflow-backend.log`
- **前端日志**: 由 Playwright webServer 管理，显示在控制台

#### 故障排查

##### 1. 后端启动失败

```bash
# 查看后端日志
cat /tmp/workflow-backend.log

# 手动测试后端启动
cd server
make run
```

##### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
pg_isready -h localhost -p 5432

# 查看数据库配置
cat server/.env | grep DB_

# 手动连接测试
psql -h localhost -p 5432 -U postgres -d workflow_engine
```

##### 3. 前端启动失败

```bash
# 手动测试前端启动
cd client
npm run start
```

##### 4. 测试超时

脚本会等待最多 30 秒让服务启动。如果服务启动较慢，可以修改脚本中的 `MAX_WAIT_TIME` 变量。

#### 与传统测试命令的对比

| 传统方式 | 自动化脚本 |
|---------|-----------|
| 需要手动启动后端 | 自动启动后端 |
| 需要手动启动前端 | Playwright 自动启动 |
| 需要手动检查服务状态 | 自动健康检查 |
| 测试后需要手动清理 | 自动清理 |
| 数据库问题导致测试卡住 | 自动降级到无数据库模式 |

#### 最佳实践

1. **日常开发**: 使用 `npm run test:e2e:auto:quick` 快速验证核心功能
2. **提交前**: 使用 `npm run test:e2e:auto:full` 运行完整测试
3. **CI/CD**: 使用 `npm run test:e2e:auto` 运行所有测试
4. **调试**: 使用 `npm run test:e2e:ui` 打开 Playwright UI 模式

## 其他脚本

### install-deps.sh

安装项目依赖的脚本。

```bash
npm run install:deps
# 或
./scripts/install-deps.sh
```

### verify-start.sh

验证应用是否能正常启动的脚本。

```bash
npm run verify:start
# 或
./scripts/verify-start.sh
```

## 相关文档

- [E2E 测试指南](../tests/e2e/README.md)
- [数据库设置](../../server/DATABASE_SETUP.md)
- [Playwright 配置](../playwright.config.ts)
