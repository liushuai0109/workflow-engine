# 数据库设置指南

## 问题诊断

如果遇到 `database not available` 或 `connection refused` 错误，说明 PostgreSQL 服务未运行或未安装。

## 安装 PostgreSQL（TencentOS/RHEL/CentOS）

### 1. 安装 PostgreSQL

```bash
# 安装 PostgreSQL 服务器和客户端
sudo yum install -y postgresql-server postgresql

# 或者使用 dnf（较新版本）
sudo dnf install -y postgresql-server postgresql
```

### 2. 初始化数据库

```bash
# 初始化 PostgreSQL 数据目录
sudo postgresql-setup initdb

# 或者（如果上面的命令不存在）
sudo /usr/bin/postgresql-setup --initdb
```

### 3. 启动 PostgreSQL 服务

```bash
# 启动服务
sudo systemctl start postgresql

# 设置开机自启
sudo systemctl enable postgresql

# 检查服务状态
sudo systemctl status postgresql
```

### 4. 创建数据库和用户

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 中执行以下命令：
CREATE DATABASE workflow_engine;
CREATE USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE workflow_engine TO postgres;
\q
```

### 5. 配置 PostgreSQL 允许本地连接

编辑 PostgreSQL 配置文件：

```bash
# 编辑 pg_hba.conf（允许本地连接）
sudo vi /var/lib/pgsql/data/pg_hba.conf

# 确保有以下行（如果没有则添加）：
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 6. 更新 .env 文件

编辑 `server/.env` 文件：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password  # 使用上面设置的密码
DB_NAME=workflow_engine
DB_DISABLED=false
```

### 7. 运行数据库迁移

```bash
cd server

# 确保环境变量已设置（从 .env 文件加载）
export $(cat .env | grep -v '^#' | xargs)

# 运行迁移
make migrate-up
```

### 8. 验证数据库连接

```bash
# 测试连接
psql -h localhost -U postgres -d workflow_engine -c "\dt"

# 应该能看到表列表，包括 chat_conversations 和 chat_messages
```

## 使用远程数据库

如果使用远程 PostgreSQL 数据库，修改 `server/.env`：

```env
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=workflow_engine
DB_DISABLED=false
```

## 故障排查

### 检查 PostgreSQL 是否运行

```bash
# 检查服务状态
sudo systemctl status postgresql

# 检查端口是否监听
netstat -tlnp | grep 5432
# 或
ss -tlnp | grep 5432
```

### 查看 PostgreSQL 日志

```bash
# 查看服务日志
sudo journalctl -u postgresql -f

# 或查看 PostgreSQL 日志文件
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

### 常见错误

1. **connection refused**: PostgreSQL 服务未运行
   - 解决：`sudo systemctl start postgresql`

2. **authentication failed**: 用户名或密码错误
   - 解决：检查 `.env` 文件中的 `DB_USER` 和 `DB_PASSWORD`

3. **database does not exist**: 数据库不存在
   - 解决：运行 `CREATE DATABASE workflow_engine;`

4. **relation does not exist**: 表不存在
   - 解决：运行 `make migrate-up` 创建表结构

## 快速测试

安装完成后，重启服务器并测试：

```bash
# 重启服务器
cd /data/mm64/simonsliu/xflow/bpmn-explorer
./console.sh restart server

# 测试 API
curl -X POST http://localhost:3000/api/chat/conversations \
  -H "Content-Type: application/json" \
  -d '{"title":"测试"}'
```

应该返回成功响应，而不是 500 错误。

