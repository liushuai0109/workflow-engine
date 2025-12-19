# 用户全生命周期运营管理平台

一个通过 AARRR 框架管理用户全生命周期运营的综合平台。

## 项目结构

- **client** - 基于 Vue 3 的前端应用，包含 BPMN 编辑器
- **server** - 基于 Go 的后端 API

## 快速开始

### 前置要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Go**: >= 1.21（仅后端需要）

### 安装步骤

```bash
# 安装前端依赖
cd client
pnpm install

# 启动前端
pnpm run start

# 启动后端（需要 Go 环境）
cd ../server
make run
```

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
