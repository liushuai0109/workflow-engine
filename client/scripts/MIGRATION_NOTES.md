# E2E 测试脚本迁移说明

## 概述

`run-e2e-with-services.sh` 的所有功能已完全迁移到 Playwright 的 `global-setup.ts` 和 `global-teardown.ts`，符合 Playwright 官方规范。

## 迁移对照表

### 命令迁移

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `./scripts/run-e2e-with-services.sh` | `npm run test:e2e:auto` | 运行所有测试，自动启动后端 |
| `./scripts/run-e2e-with-services.sh --project=quick` | `npm run test:e2e:auto:quick` | 快速测试模式 |
| `./scripts/run-e2e-with-services.sh --project=full` | `npm run test:e2e:auto:full` | 完整测试模式 |
| `./scripts/run-e2e-with-services.sh --project=headless-verification` | `npm run test:e2e:auto:headless` | Headless 验证 |
| `./scripts/run-e2e-with-services.sh --skip-backend` | `SKIP_BACKEND=true npm run test:e2e` | 跳过后端启动 |
| `./scripts/run-e2e-with-services.sh --headed` | `npm run test:e2e -- --headed` | 有界面模式 |
| `./scripts/run-e2e-with-services.sh --help` | 查看本文档 | 帮助信息 |

### 功能迁移

所有原有功能均已保留：

- ✅ 数据库可用性检查（PostgreSQL）
- ✅ 后端服务启动（带数据库检查）
- ✅ 后端服务健康检查
- ✅ 后端服务停止（智能判断是否原本在运行）
- ✅ 环境变量设置
- ✅ 错误处理和清理
- ✅ 命令行参数支持（通过 Playwright 原生支持）

## 技术优势

### 符合 Playwright 规范

- 服务生命周期由 Playwright 钩子管理
- 与 Playwright 生态系统完全集成
- 支持并行执行、重试机制等 Playwright 特性

### 代码维护性

- 所有逻辑集中在 TypeScript 文件中
- 类型安全
- 更好的错误处理
- 易于调试和测试

### 功能增强

- 智能判断后端是否原本在运行
- 数据库检查更加完善
- 更好的日志输出

## 环境变量

### 自动启动后端

```bash
# 自动启动后端并运行测试
AUTO_START_BACKEND=true npm run test:e2e

# 或使用便捷命令
npm run test:e2e:auto
```

### 跳过后端启动

```bash
# 假设后端已运行，只运行测试
SKIP_BACKEND=true npm run test:e2e
```

### 必须启动后端

```bash
# 如果后端启动失败，测试也会失败
REQUIRE_BACKEND=true AUTO_START_BACKEND=true npm run test:e2e
```

### 其他环境变量

- `BACKEND_URL`: 后端服务 URL（默认: http://localhost:3000）
- `BACKEND_PORT`: 后端服务端口（默认: 3000）
- `DB_PORT`: 数据库端口（默认: 5432）
- `E2E_SETUP`: 启用全局设置（通常由 AUTO_START_BACKEND 自动设置）
- `E2E_TEARDOWN`: 启用全局清理（通常由 AUTO_START_BACKEND 自动设置）

## 向后兼容

`run-e2e-with-services.sh` 脚本仍然保留，但已标记为废弃。它仍然可以工作，但建议迁移到新命令。

## 常见问题

### Q: 为什么迁移到 TypeScript？

A: 符合 Playwright 官方规范，更好的类型安全，更容易维护和调试。

### Q: 功能是否完全一致？

A: 是的，所有功能都已迁移并增强。

### Q: 如何在 CI/CD 中使用？

A: 使用新命令即可，例如：
```yaml
- run: npm run test:e2e:auto:full
```

### Q: 如何调试服务启动问题？

A: 查看 `/tmp/workflow-backend.log` 日志文件，或设置 `DEBUG=true` 环境变量。

## 下一步

1. 更新 CI/CD 配置使用新命令
2. 更新团队文档
3. 逐步移除对 `run-e2e-with-services.sh` 的引用

