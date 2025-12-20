# 设置说明

## 问题修复

### 1. 前端 Vite 配置
- 已将 `host` 从 `'client.biz.com'` 改为 `'0.0.0.0'`
- 现在 Vite 会监听所有网络接口，可以通过 hosts 文件映射域名

### 2. 后端 Koa 兼容性
- 更新了 Koa 版本到 2.16.0
- 添加了 `is-generator-function` 依赖
- 调整了中间件顺序

## 配置 hosts 文件

为了使用 `client.biz.com` 和 `server.biz.com` 域名，需要在 `/etc/hosts` 文件中添加：

```bash
sudo vim /etc/hosts
```

添加以下内容：
```
127.0.0.1 client.biz.com
127.0.0.1 server.biz.com
```

保存后，就可以通过以下地址访问：
- 前端：http://client.biz.com:8080
- 后端：http://server.biz.com:4000

## 启动服务

```bash
# 在 biz-sample 根目录
npm install
npm run start
```

或者分别启动：
```bash
npm run start:server  # 仅启动后端
npm run start:client  # 仅启动前端
```

