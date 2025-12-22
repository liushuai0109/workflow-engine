# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: 项目初始化 | 6 | 1-2 天 | 1 天 | 无 |
| Phase 2: 后端开发 | 11 | 3-4 天 | 2 天 | Phase 1 |
| Phase 3: 前端开发 | 15 | 4-5 天 | 3 天 | Phase 1 |
| Phase 4: 集成测试 | 7 | 2-3 天 | 1 天 | Phase 2, Phase 3 |
| **总计** | **39** | **10-14 天** | **7 天** | - |

**备注**：
- 实际开发采用 React 18 + shadcn/ui 替代原计划的 Vue 3
- 前后端 API 集成已完成（核心业务流程）
- 完成度约 70%，剩余待完成功能为增强特性（认证、查询、提现）

## Phase 1: 项目初始化

- [x] 1.1 创建 `biz-sample/` 目录结构（monorepo）
  - [x] 创建根目录 `biz-sample/`
  - [x] 创建 `packages/` 目录
  - [x] 初始化根 `package.json`
  - [x] 配置 Lerna（`lerna.json`）
- [x] 1.2 初始化后端项目（Node.js + TypeScript + Koa）
  - [x] 创建 `biz-sample/packages/server/` 目录
  - [x] 初始化 `package.json`，配置 TypeScript、Koa 等依赖
  - [x] 配置 TypeScript 编译选项
  - [x] 配置启动脚本（`npm run start`）
- [x] 1.3 初始化前端项目（React 18 + TypeScript）
  - [x] 创建 `biz-sample/packages/client/` 目录
  - [x] 初始化 `package.json`，配置 React、TypeScript、Vite、shadcn/ui 等依赖
  - [x] 配置 Vite 构建选项
  - [x] 配置启动脚本（`npm run dev`）
- [x] 1.4 配置 Lerna monorepo
  - [x] 安装 Lerna 依赖（在根 package.json 中）
  - [x] 配置 `lerna.json`
  - [x] 配置根 `package.json` 的 scripts（统一启动命令）
- [x] 1.5 创建项目 README 文档
- [x] 1.6 验证项目可以正常启动

## Phase 2: 后端开发

- [x] 2.1 搭建 Koa 应用基础结构
  - [x] 创建主应用文件 `src/app.ts`
  - [x] 配置中间件（CORS、body parser、错误处理等）
  - [x] 配置路由
  - [x] 配置 CORS，允许 `client.biz.com` 域名（包括带端口的开发环境）
  - [x] 配置环境变量，支持 `server.biz.com` 域名配置
- [x] 2.2 实现健康检查端点 `GET /api/health`
- [x] 2.3 实现用户注册 API `POST /api/auth/register`
  - [x] 定义请求/响应类型
  - [x] 实现控制器逻辑
  - [x] 实现数据验证
  - [x] 实现内存存储（用户数据）
- [x] 2.4 实现开户 API `POST /api/account/open`
  - [x] 定义请求/响应类型
  - [x] 实现控制器逻辑
  - [x] 实现数据验证
  - [x] 实现内存存储（账户数据）
- [x] 2.5 实现入金 API `POST /api/account/deposit`
  - [x] 定义请求/响应类型
  - [x] 实现控制器逻辑
  - [x] 实现数据验证
  - [x] 实现余额更新逻辑
- [x] 2.6 实现买入交易 API `POST /api/trade/buy`
  - [x] 定义请求/响应类型
  - [x] 实现控制器逻辑
  - [x] 实现数据验证
  - [x] 实现交易逻辑（余额检查、订单创建等）
- [x] 2.7 实现卖出交易 API `POST /api/trade/sell`
  - [x] 定义请求/响应类型
  - [x] 实现控制器逻辑
  - [x] 实现数据验证
  - [x] 实现交易逻辑（持仓检查、订单创建等）
- [x] 2.8 实现统一错误处理中间件
- [x] 2.9 实现统一响应格式中间件
- [x] 2.10 添加 API 文档注释（基本注释已添加）
- [x] 2.11 验证所有 API 端点正常工作

## Phase 3: 前端开发

- [x] 3.1 搭建 React 18 应用基础结构
  - [x] 创建主应用文件 `src/main.tsx`
  - [x] 配置 API 服务（fetch）
  - [x] 配置 API 基础地址：
    - [x] 生产环境：`https://server.biz.com`
    - [x] 开发环境：`http://localhost:4000`
  - [x] 配置环境变量，支持开发/生产环境切换
  - [x] 配置 Vite 开发服务器
- [x] 3.2 实现布局组件
  - [x] 创建主应用组件（App.tsx）
  - [x] 实现底部导航（移动端）
- [x] 3.3 实现注册页面（RegisterPage）
  - [x] 创建注册页面组件
  - [x] 添加密码和确认密码字段
  - [x] 实现表单验证
  - [x] 实现 API 调用（集成后端注册 API）
  - [x] 实现响应式样式（移动端适配）
- [x] 3.4 实现开户页面（AccountOpeningPage）
  - [x] 创建开户页面组件
  - [x] 添加银行卡号和开户银行字段
  - [x] 实现表单验证
  - [x] 实现 API 调用（集成后端开户 API）
  - [x] 实现响应式样式
- [x] 3.5 实现资产页面（AssetsPage，包含入金功能）
  - [x] 创建资产页面组件
  - [x] 添加银行卡号输入到入金对话框
  - [x] 实现表单验证
  - [x] 实现 API 调用（集成后端入金 API）
  - [x] 实现响应式样式
- [x] 3.6 实现交易页面（TradePage）
  - [x] 创建交易页面组件
  - [x] 实现买入表单
  - [x] 实现卖出表单
  - [x] 实现 API 调用（集成后端交易 API）
  - [x] 实现响应式样式
- [x] 3.7 实现 API 服务层
  - [x] 创建 API 客户端封装（`services/api.ts`）
  - [x] 实现请求拦截器（支持 token 认证）
  - [x] 实现响应拦截器（统一错误处理）
- [x] 3.8 实现页面导航（通过组件状态切换）
- [x] 3.9 实现全局状态管理（使用 React Hooks）
- [x] 3.10 实现错误提示（使用 sonner toast）
- [x] 3.11 实现加载状态指示器
- [x] 3.12 实现移动端适配样式（使用 shadcn/ui + Tailwind CSS）
- [x] 3.13 添加页面间导航逻辑
- [x] 3.14 实现其他辅助页面（WelcomePage, HomePage, ProfilePage）
- [x] 3.15 验证所有页面正常工作

## Phase 4: 集成测试

- [x] 4.1 测试完整业务流程：注册 -> 开户 -> 入金 -> 交易
- [x] 4.2 测试 API 错误处理（无效参数、业务错误等）
- [x] 4.3 测试前端表单验证
- [x] 4.4 测试移动端响应式布局
- [x] 4.5 测试跨域请求（CORS）
- [x] 4.6 更新 README 文档，添加使用说明
- [x] 4.7 创建前后端集成状态报告（frontend-backend-alignment.md）

**说明**：
- 核心业务流程（注册、开户、入金、交易）已实现并可端到端运行
- 前后端 API 已集成，约 70% 功能完成
- 剩余待完成：用户认证/会话管理、持仓查询、交易记录查询、提现功能
- 详见 `frontend-backend-alignment.md`

