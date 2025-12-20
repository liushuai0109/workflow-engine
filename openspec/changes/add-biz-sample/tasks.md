# 实施任务清单

## 时间估算

| Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
|-------|-------|---------|---------|------|
| Phase 1: 项目初始化 | 5 | 1-2 天 | - | 无 |
| Phase 2: 后端开发 | 12 | 3-4 天 | - | Phase 1 |
| Phase 3: 前端开发 | 15 | 4-5 天 | - | Phase 1 |
| Phase 4: 集成测试 | 8 | 2-3 天 | - | Phase 2, Phase 3 |
| **总计** | **40** | **10-14 天** | - | - |

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
  - [x] 配置启动脚本（`npm run start`，替代 `dev`）
- [x] 1.3 初始化前端项目（Vue 3 + TypeScript）
  - [x] 创建 `biz-sample/packages/client/` 目录
  - [x] 初始化 `package.json`，配置 Vue 3、TypeScript、Vite 等依赖
  - [x] 配置 Vite 构建选项
  - [x] 配置启动脚本（`npm run start`，替代 `dev`）
- [x] 1.4 配置 Lerna monorepo
  - [x] 安装 Lerna 依赖（在根 package.json 中）
  - [x] 配置 `lerna.json`
  - [x] 配置根 `package.json` 的 scripts（统一启动命令）
- [x] 1.5 创建项目 README 文档
- [ ] 1.6 验证项目可以正常启动

## Phase 2: 后端开发

- [x] 2.1 搭建 Koa 应用基础结构
  - [x] 创建主应用文件 `src/app.ts`
  - [x] 配置中间件（CORS、body parser、错误处理等）
  - [x] 配置路由
  - [x] 配置 CORS，允许 `client.biz.com` 域名（包括带端口的开发环境，如 `client.biz.com:8080`）
  - [x] 配置环境变量，支持 `server.biz.com` 域名配置（生产环境默认端口，开发环境端口 4000）
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
- [ ] 2.10 添加 API 文档注释（JSDoc）
- [ ] 2.11 编写单元测试
- [ ] 2.12 验证所有 API 端点正常工作

## Phase 3: 前端开发

- [x] 3.1 搭建 Vue 3 应用基础结构
  - [x] 创建主应用文件 `src/main.ts`
  - [x] 配置 Vue Router
  - [x] 配置 API 服务（axios 或 fetch）
  - [x] 配置 API 基础地址：
    - [x] 生产环境：`https://server.biz.com`
    - [x] 开发环境：`http://server.biz.com:4000`
  - [x] 配置环境变量，支持开发/生产环境切换
  - [x] 配置 Vite 开发服务器，支持 `client.biz.com:8080` 域名访问（端口 8080）
- [x] 3.2 实现布局组件
  - [x] 创建主布局组件
  - [x] 实现导航栏
  - [x] 实现底部导航（移动端）
- [x] 3.3 实现注册页面 `/register`
  - [x] 创建注册页面组件
  - [x] 实现表单验证
  - [x] 实现 API 调用
  - [x] 实现响应式样式（移动端适配）
- [x] 3.4 实现开户页面 `/account/open`
  - [x] 创建开户页面组件
  - [x] 实现表单验证
  - [x] 实现 API 调用
  - [x] 实现响应式样式
- [x] 3.5 实现入金页面 `/account/deposit`
  - [x] 创建入金页面组件
  - [x] 实现表单验证
  - [x] 实现 API 调用
  - [x] 实现响应式样式
- [x] 3.6 实现交易页面 `/trade`
  - [x] 创建交易页面组件
  - [x] 实现买入表单
  - [x] 实现卖出表单
  - [x] 实现 API 调用
  - [x] 实现响应式样式
- [x] 3.7 实现 API 服务层
  - [x] 创建 API 客户端封装
  - [x] 实现请求拦截器（错误处理）
  - [x] 实现响应拦截器
- [x] 3.8 实现路由配置
- [ ] 3.9 实现全局状态管理（可选，使用 Pinia 或 Composition API）
- [x] 3.10 实现错误提示组件（已集成在页面中）
- [x] 3.11 实现加载状态组件（已集成在页面中）
- [x] 3.12 实现移动端适配样式
- [x] 3.13 添加页面间导航逻辑
- [ ] 3.14 编写组件单元测试
- [ ] 3.15 验证所有页面正常工作

## Phase 4: 集成测试

- [ ] 4.1 测试完整业务流程：注册 -> 开户 -> 入金 -> 交易
- [ ] 4.2 测试 API 错误处理（无效参数、业务错误等）
- [ ] 4.3 测试前端表单验证
- [ ] 4.4 测试移动端响应式布局
- [ ] 4.5 测试跨域请求（CORS）
- [ ] 4.6 编写端到端测试用例
- [ ] 4.7 性能测试（响应时间、并发等）
- [ ] 4.8 更新 README 文档，添加使用说明和 API 文档

