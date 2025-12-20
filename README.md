# 用户全生命周期运营管理平台

一个通过 AARRR 框架管理用户全生命周期运营的综合平台。

## 项目结构

- **client** - 基于 Vue 3 的前端应用，包含 BPMN 编辑器
- **server** - 基于 Go 的后端 API

## 快速开始

### 前置要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0（前端使用）
- **Go**: >= 1.21（仅后端需要）

### 安装步骤

```bash
# 安装前端依赖
cd client
npm install
npm run install:deps  # 自动安装 Playwright 浏览器

# 启动前端
npm run start

# 启动后端（需要 Go 环境）
cd ../server
make run
```

### 测试和验证

#### 前端测试

```bash
cd client

# 运行单元测试
npm run test

# 运行 E2E 测试
npm run test:e2e:headless  # 快速验证（< 1分钟）
npm run test:e2e:quick      # 快速测试（< 2分钟）
npm run test:e2e:full       # 完整测试（< 10分钟）
npm run test:e2e:all        # 完整测试套件（< 30分钟）

# 运行验证脚本
npm run verify:start         # 验证服务启动
bash ../../scripts/verify-frontend.sh  # 完整前端验证
```

#### 后端测试

```bash
cd server

# 运行单元测试
make test

# 运行测试覆盖率
make test-coverage

# 运行集成测试（需要测试数据库）
INTEGRATION_TEST=true make test-integration

# 运行验证脚本
make verify:build    # 验证编译
make verify:start    # 验证服务启动
make verify:all      # 完整后端验证
```

**注意**：
- 后端单元/集成测试在 `server` 目录下运行（使用 Go testing）
- 后端 API 的 E2E 测试在 `client` 目录下运行（使用 Playwright，测试文件在 `tests/e2e/api-integration.spec.ts`）

#### 完整验证

```bash
# 运行所有验证脚本（前端 + 后端）
bash scripts/verify-all.sh
```

#### E2E 测试（前端 + 后端 API）

```bash
cd client

# 快速测试（< 2分钟）- 包括前端和后端 API 测试
npm run test:e2e:quick

# 完整测试（< 10分钟）
npm run test:e2e:full

# 完整测试套件（< 30分钟）
npm run test:e2e:all
```

**注意**：所有 E2E 测试（包括后端 API 测试）都在 `client` 目录下运行，因为 Playwright 是 Node.js 工具。后端 API 测试使用 Playwright 的 `request` API 从外部测试 API 端点。

更多测试信息请参见 [测试文档](docs/TESTING_AND_VALIDATION_STRATEGY.md)、[测试指南](docs/TESTING_GUIDE.md) 和 [E2E 测试指南](tests/e2e/README.md)。

### 安装 Go（如果未安装）

如果系统未安装 Go，可以通过以下方式安装：

**Linux/macOS:**
```bash
# 使用包管理器（推荐）
# Ubuntu/Debian
sudo apt-get install golang-go

# macOS (使用 Homebrew)
brew install go

# 或从官网下载：https://go.dev/dl/
```

**验证安装:**
```bash
go version  # 应显示 go version go1.21.x 或更高版本
```

详细信息请参见 client 和 server 目录。
