## ADDED Requirements

### Requirement: 项目结构

系统 SHALL 在项目根目录下创建独立的 `biz-sample/` 目录，使用 Lerna 管理 monorepo 结构，包含前端和后端两个子包。

#### Scenario: 目录结构

- **当** 查看项目结构时
- **则** 应存在以下目录：
  - `biz-sample/packages/client/` - Vue 3 前端应用
  - `biz-sample/packages/server/` - Node.js + Koa 后端应用
- **并且** 应使用 Lerna 管理 monorepo 结构
- **并且** 根目录应包含 `lerna.json` 配置文件
- **并且** 每个子包应包含独立的 `package.json` 和配置文件
- **并且** 应包含 `biz-sample/README.md` 说明文档

### Requirement: 后端服务实现

系统 SHALL 提供基于 Node.js + TypeScript + Koa 的后端 API 服务。

#### Scenario: 后端技术栈

- **当** 查看后端实现时
- **则** 应使用以下技术：
  - Node.js 运行时
  - TypeScript 语言
  - Koa 框架
- **并且** 应支持 ES6+ 语法和 TypeScript 类型检查
- **并且** 应通过 `npm run start` 启动服务

#### Scenario: 健康检查端点

- **当** 客户端请求 `GET /api/health` 时
- **则** 响应应包含以下字段：
  - `status`: "ok" 或 "error"
  - `timestamp`: ISO 8601 格式的时间戳
- **并且** HTTP 状态码应为 200（成功）或 503（服务不可用）

### Requirement: 用户注册 API

系统 SHALL 提供用户注册接口。

#### Scenario: 用户注册成功

- **当** 客户端发送 `POST /api/auth/register` 请求时
- **则** 请求体应包含：
  - `phone`: 手机号（必填）
  - `password`: 密码（必填）
  - `verifyCode`: 验证码（必填，可选，示例应用可简化）
- **并且** 系统应：
  - 验证必填字段
  - 生成用户ID（UUID 或自增ID）
  - 存储用户信息（内存存储或文件存储）
  - 返回201状态码和用户数据
- **并且** 响应格式：
  ```json
  {
    "success": true,
    "data": {
      "userId": "uuid",
      "phone": "13800138000",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### Scenario: 用户注册失败

- **当** 客户端发送无效的注册请求时
- **则** 系统应返回400状态码和错误信息
- **并且** 错误响应格式：
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_REQUEST",
      "message": "手机号不能为空"
    }
  }
  ```

### Requirement: 开户 API

系统 SHALL 提供证券账户开户接口。

#### Scenario: 开户成功

- **当** 客户端发送 `POST /api/account/open` 请求时
- **则** 请求体应包含：
  - `userId`: 用户ID（必填）
  - `realName`: 真实姓名（必填）
  - `idCard`: 身份证号（必填）
  - `bankCard`: 银行卡号（必填）
  - `bankName`: 银行名称（必填）
- **并且** 系统应：
  - 验证必填字段
  - 验证用户是否存在
  - 生成证券账户号
  - 存储账户信息
  - 返回201状态码和账户数据
- **并且** 响应格式：
  ```json
  {
    "success": true,
    "data": {
      "accountId": "ACC001",
      "userId": "uuid",
      "realName": "张三",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### Scenario: 开户失败

- **当** 用户不存在或信息不完整时
- **则** 系统应返回相应的错误状态码和错误信息
- **并且** 错误码包括：
  - `USER_NOT_FOUND`: 用户不存在
  - `INVALID_REQUEST`: 请求参数无效

### Requirement: 入金 API

系统 SHALL 提供账户入金接口。

#### Scenario: 入金成功

- **当** 客户端发送 `POST /api/account/deposit` 请求时
- **则** 请求体应包含：
  - `accountId`: 账户ID（必填）
  - `amount`: 入金金额（必填，大于0）
  - `bankCard`: 银行卡号（必填）
- **并且** 系统应：
  - 验证必填字段
  - 验证账户是否存在
  - 验证金额大于0
  - 更新账户余额
  - 记录入金流水
  - 返回200状态码和入金结果
- **并且** 响应格式：
  ```json
  {
    "success": true,
    "data": {
      "transactionId": "TXN001",
      "accountId": "ACC001",
      "amount": 10000,
      "balance": 10000,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### Scenario: 入金失败

- **当** 账户不存在或金额无效时
- **则** 系统应返回相应的错误状态码和错误信息
- **并且** 错误码包括：
  - `ACCOUNT_NOT_FOUND`: 账户不存在
  - `INVALID_AMOUNT`: 金额无效

### Requirement: 交易 API

系统 SHALL 提供股票交易接口，包括买入和卖出。

#### Scenario: 买入交易成功

- **当** 客户端发送 `POST /api/trade/buy` 请求时
- **则** 请求体应包含：
  - `accountId`: 账户ID（必填）
  - `stockCode`: 股票代码（必填）
  - `stockName`: 股票名称（必填）
  - `quantity`: 买入数量（必填，大于0）
  - `price`: 买入价格（必填，大于0）
- **并且** 系统应：
  - 验证必填字段
  - 验证账户是否存在
  - 验证账户余额是否足够（金额 = quantity * price）
  - 创建买入订单
  - 更新账户余额
  - 记录持仓信息
  - 返回200状态码和交易结果
- **并且** 响应格式：
  ```json
  {
    "success": true,
    "data": {
      "orderId": "ORD001",
      "accountId": "ACC001",
      "stockCode": "000001",
      "stockName": "平安银行",
      "quantity": 100,
      "price": 10.5,
      "amount": 1050,
      "balance": 8950,
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### Scenario: 卖出交易成功

- **当** 客户端发送 `POST /api/trade/sell` 请求时
- **则** 请求体应包含：
  - `accountId`: 账户ID（必填）
  - `stockCode`: 股票代码（必填）
  - `quantity`: 卖出数量（必填，大于0）
  - `price`: 卖出价格（必填，大于0）
- **并且** 系统应：
  - 验证必填字段
  - 验证账户是否存在
  - 验证持仓数量是否足够
  - 创建卖出订单
  - 更新账户余额
  - 更新持仓信息
  - 返回200状态码和交易结果
- **并且** 响应格式：
  ```json
  {
    "success": true,
    "data": {
      "orderId": "ORD002",
      "accountId": "ACC001",
      "stockCode": "000001",
      "stockName": "平安银行",
      "quantity": 50,
      "price": 11.0,
      "amount": 550,
      "balance": 9500,
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

#### Scenario: 交易失败

- **当** 余额不足、持仓不足或参数无效时
- **则** 系统应返回相应的错误状态码和错误信息
- **并且** 错误码包括：
  - `ACCOUNT_NOT_FOUND`: 账户不存在
  - `INSUFFICIENT_BALANCE`: 余额不足
  - `INSUFFICIENT_POSITION`: 持仓不足
  - `INVALID_REQUEST`: 请求参数无效

### Requirement: 统一错误处理

系统 SHALL 提供统一的错误处理和响应格式。

#### Scenario: 错误响应格式

- **当** API 调用失败时
- **则** 响应体应包含：
  - `success`: false
  - `error.code`: 错误码（大写蛇形命名）
  - `error.message`: 人类可读的错误消息
- **并且** HTTP 状态码应根据错误类型设置：
  - 400: 请求参数错误
  - 404: 资源不存在
  - 409: 资源冲突
  - 500: 服务器内部错误

### Requirement: CORS 配置

系统 SHALL 支持跨域资源共享（CORS）。

#### Scenario: CORS 配置

- **当** 前端从不同源发送请求时
- **则** 后端应设置适当的 CORS headers
- **并且** 应支持预检请求（OPTIONS 方法）
- **并且** 应允许 `client.biz.com` 域名的跨域请求（包括带端口的开发环境，如 `client.biz.com:8080`）

### Requirement: 域名配置

系统 SHALL 支持生产和开发环境使用相同的域名，开发环境通过端口区分。

#### Scenario: 前端域名配置

- **当** 部署前端应用时
- **则** 生产环境前端服务应部署在 `client.biz.com`（默认端口 80/443）
- **并且** 开发环境前端服务应部署在 `client.biz.com:8080`
- **并且** 前端 API 客户端应配置后端服务地址：
  - 生产环境：`https://server.biz.com`
  - 开发环境：`http://server.biz.com:4000`

#### Scenario: 后端域名配置

- **当** 部署后端服务时
- **则** 生产环境后端服务应部署在 `server.biz.com`（默认端口 80/443）
- **并且** 开发环境后端服务应部署在 `server.biz.com:4000`（可配置）
- **并且** API 基础路径：
  - 生产环境：`https://server.biz.com/api`
  - 开发环境：`http://server.biz.com:4000/api`

### Requirement: 前端应用实现

系统 SHALL 提供基于 Vue 3 + TypeScript 的前端应用。

#### Scenario: 前端技术栈

- **当** 查看前端实现时
- **则** 应使用以下技术：
  - Vue 3（Composition API）
  - TypeScript
  - Vite 构建工具
  - Vue Router 路由
- **并且** 应通过 `npm run start` 启动开发服务器
- **并且** 应通过 `npm run build` 构建生产版本

#### Scenario: 注册页面

- **当** 用户访问 `/register` 路由时
- **则** 应显示注册表单
- **并且** 表单应包含：
  - 手机号输入框
  - 密码输入框
  - 验证码输入框（可选）
  - 提交按钮
- **并且** 应实现表单验证
- **并且** 提交成功后应跳转到登录页或首页

#### Scenario: 开户页面

- **当** 用户访问 `/account/open` 路由时
- **则** 应显示开户表单
- **并且** 表单应包含：
  - 真实姓名输入框
  - 身份证号输入框
  - 银行卡号输入框
  - 银行名称选择/输入框
  - 提交按钮
- **并且** 应实现表单验证
- **并且** 提交成功后应显示开户成功信息

#### Scenario: 入金页面

- **当** 用户访问 `/account/deposit` 路由时
- **则** 应显示入金表单
- **并且** 表单应包含：
  - 入金金额输入框
  - 银行卡号输入框
  - 提交按钮
- **并且** 应显示当前账户余额
- **并且** 应实现表单验证
- **并且** 提交成功后应更新余额显示

#### Scenario: 交易页面

- **当** 用户访问 `/trade` 路由时
- **则** 应显示交易界面
- **并且** 界面应包含：
  - 股票代码输入框
  - 股票名称显示
  - 买入/卖出数量输入框
  - 价格输入框
  - 买入按钮
  - 卖出按钮
- **并且** 应显示当前账户余额和持仓信息
- **并且** 应实现表单验证
- **并且** 交易成功后应更新余额和持仓显示

#### Scenario: 移动端适配

- **当** 在移动设备上访问应用时
- **则** 界面应适配移动端屏幕尺寸
- **并且** 应使用响应式设计
- **并且** 表单输入应易于在移动设备上操作
- **并且** 按钮和交互元素应足够大，便于触摸操作

#### Scenario: API 调用服务

- **当** 前端需要调用后端 API 时
- **则** 应使用统一的 API 服务封装
- **并且** 应实现请求拦截器（添加认证信息等）
- **并且** 应实现响应拦截器（统一错误处理）
- **并且** 应显示加载状态
- **并且** 应显示错误提示信息

### Requirement: 项目文档

系统 SHALL 提供完整的项目文档。

#### Scenario: README 文档

- **当** 查看 `biz-sample/README.md` 时
- **则** 应包含以下内容：
  - 项目简介
  - 技术栈说明
  - 安装和运行说明
  - API 文档链接或说明
  - 使用示例
  - 开发指南
