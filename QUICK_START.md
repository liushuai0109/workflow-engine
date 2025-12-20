# 🚀 快速参考

## 常用命令

```bash
# 启动所有服务
./console.sh start

# 停止所有服务
./console.sh stop

# 重启所有服务
./console.sh restart

# 查看状态
./console.sh status

# 只操作前端
./console.sh start client
./console.sh stop client
./console.sh restart client

# 只操作后端
./console.sh start server
./console.sh stop server
./console.sh restart server

# 查看帮助
./console.sh help
```

## 访问地址

- 前端: http://21.91.238.173:8000
- 后端: http://21.91.238.173:3000

## 查看日志

```bash
# 实时查看日志
tail -f .pids/client.log
tail -f .pids/server.log

# 查看全部日志
cat .pids/client.log
cat .pids/server.log
```

## 服务说明

| 服务 | 技术栈 | 端口 | 日志文件 |
|------|--------|------|----------|
| Client | Vue + Vite | 8000 | .pids/client.log |
| Server | Go | 3000 | .pids/server.log |

详细文档: [CONSOLE_USAGE.md](./CONSOLE_USAGE.md)
