# 证券业务示例应用（biz-sample）

## 项目简介

这是一个模拟证券手机 App 核心业务流程的示例应用，用于演示和测试 BPMN 工作流在实际业务场景中的应用。应用包含用户注册、开户、入金和交易等完整业务流程。

本项目使用 **Lerna** 管理 monorepo 结构，包含前端和后端两个子包。

## 技术栈

### 后端
- **运行时**: Node.js
- **语言**: TypeScript
- **框架**: Koa
- **端口**: 4000（开发环境）

### 前端
- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **路由**: Vue Router
- **HTTP 客户端**: Axios
- **端口**: 8080（开发环境）

### Monorepo 管理
- **工具**: Lerna
- **包管理**: npm workspaces

## 项目结构

```
biz-sample/
├── packages/
│   ├── client/          # Vue 3 前端应用
│   │   ├── src/
│   │   │   ├── pages/   # 页面组件
│   │   │   ├── services/ # API 服务
│   │   │   ├── router/  # 路由配置
│   │   │   └── ...
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/          # Node.js + Koa 后端
│       ├── src/
│       │   ├── routes/  # 路由定义
│       │   ├── controllers/ # 控制器
│       │   ├── services/ # 业务逻辑
│       │   └── ...
│       ├── package.json
│       └── tsconfig.json
├── lerna.json           # Lerna 配置
├── package.json         # 根 package.json
└── README.md            # 使用说明
```

## 安装和运行

### 初始化项目

```bash
# 安装根依赖和所有子包依赖
npm install

# 或者使用 Lerna bootstrap（推荐）
npm run bootstrap
```

### 启动服务

#### 方式一：同时启动前后端（推荐）

```bash
# 在根目录执行，同时启动前后端
npm run start
```

#### 方式二：分别启动

```bash
# 启动后端服务
npm run start:server

# 启动前端应用
npm run start:client
```

#### 方式三：在子包目录启动

```bash
# 启动后端
cd packages/server
npm run start

# 启动前端
cd packages/client
npm run start
```

### 构建

```bash
# 构建所有包
npm run build
```

## 域名配置

### 生产环境
- 前端：`client.biz.com`（默认端口 80/443）
- 后端：`server.biz.com`（默认端口 80/443）

### 开发环境
- 前端：`client.biz.com:8080`
- 后端：`server.biz.com:4000`

**注意**：开发环境需要在 `/etc/hosts` 文件中配置域名解析：
```
127.0.0.1 client.biz.com
127.0.0.1 server.biz.com
```

## API 文档

### 健康检查
- **GET** `/api/health`
- 响应：`{ status: "ok", timestamp: "2024-01-01T00:00:00Z" }`

### 用户注册
- **POST** `/api/auth/register`
- 请求体：
  ```json
  {
    "phone": "13800138000",
    "password": "password123",
    "verifyCode": "123456"
  }
  ```
- 响应：
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

### 开户
- **POST** `/api/account/open`
- 请求体：
  ```json
  {
    "userId": "uuid",
    "realName": "张三",
    "idCard": "110101199001011234",
    "bankCard": "6222021234567890",
    "bankName": "工商银行"
  }
  ```

### 入金
- **POST** `/api/account/deposit`
- 请求体：
  ```json
  {
    "accountId": "ACC001",
    "amount": 10000,
    "bankCard": "6222021234567890"
  }
  ```

### 买入交易
- **POST** `/api/trade/buy`
- 请求体：
  ```json
  {
    "accountId": "ACC001",
    "stockCode": "000001",
    "stockName": "平安银行",
    "quantity": 100,
    "price": 10.5
  }
  ```

### 卖出交易
- **POST** `/api/trade/sell`
- 请求体：
  ```json
  {
    "accountId": "ACC001",
    "stockCode": "000001",
    "quantity": 50,
    "price": 11.0
  }
  ```

## 业务流程

1. **注册**：用户填写手机号、密码等信息完成注册
2. **开户**：用户提交身份信息、银行卡信息等完成证券账户开户
3. **入金**：用户从银行卡转入资金到证券账户
4. **交易**：用户进行股票买卖交易操作

## 开发指南

### Lerna 命令

```bash
# 安装所有依赖
npm run bootstrap

# 清理所有 node_modules
npm run clean

# 运行所有包的 start 脚本
npm run start

# 运行特定包的脚本
lerna run start --scope=@biz-sample/server
lerna run start --scope=@biz-sample/client
```

### 环境变量

后端服务支持以下环境变量：
- `PORT`: 服务端口（默认 4000）
- `HOST`: 服务主机（默认 0.0.0.0）
- `NODE_ENV`: 运行环境（development/production）

### 数据存储

当前使用内存存储，服务重启后数据会丢失。生产环境建议使用数据库。

### CORS 配置

后端已配置 CORS，允许 `client.biz.com` 域名的跨域请求（包括带端口的开发环境）。

## 注意事项

1. 这是一个示例应用，不包含真实的支付和交易接口
2. 数据使用内存存储，重启后数据会丢失
3. 不包含用户认证和授权机制
4. 密码未加密存储（仅用于示例）

## 许可证

ISC
