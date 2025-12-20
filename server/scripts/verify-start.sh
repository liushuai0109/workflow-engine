#!/bin/bash
# 后端服务启动验证脚本
# 验证服务器可以正常启动

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"
TIMEOUT=10
PORT=${PORT:-8080}

# 检测并设置 Go 路径
GO=$(which go 2>/dev/null || echo /data/mm64/simonsliu/go/bin/go)
if [ ! -f "${GO}" ]; then
    if [ -f "/data/mm64/simonsliu/go/bin/go" ]; then
        export PATH="/data/mm64/simonsliu/go/bin:$PATH"
        GO="/data/mm64/simonsliu/go/bin/go"
    else
        echo -e "${RED}Go not found. Please install Go or set PATH.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}后端服务启动验证${NC}"
echo -e "${GREEN}========================================${NC}"

cd "${SERVER_DIR}"

# 检查端口是否已被占用
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}端口 ${PORT} 已被占用，尝试停止现有服务...${NC}"
    lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 编译服务器
echo -e "${YELLOW}编译服务器...${NC}"
if ! "${GO}" build -o /tmp/test-server ./cmd/server/main.go; then
    echo -e "${RED}✗ 编译失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 编译成功${NC}"

# 启动服务器（后台运行）
echo -e "${YELLOW}启动服务器...${NC}"
/tmp/test-server > /tmp/server.log 2>&1 &
SERVER_PID=$!

# 清理函数
cleanup() {
    echo -e "${YELLOW}停止服务器...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    rm -f /tmp/test-server
}
trap cleanup EXIT

# 等待服务器启动
echo -e "${YELLOW}等待服务器启动（最多 ${TIMEOUT} 秒）...${NC}"
for i in $(seq 1 ${TIMEOUT}); do
    if curl -s http://localhost:${PORT}/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务器在 ${i} 秒内启动成功${NC}"
        break
    fi
    if [ $i -eq ${TIMEOUT} ]; then
        echo -e "${RED}✗ 服务器启动超时${NC}"
        echo "服务器日志："
        tail -20 /tmp/server.log
        exit 1
    fi
    sleep 1
done

# 验证健康检查接口
echo -e "${YELLOW}验证健康检查接口...${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health || echo "000")
if [ "${HEALTH_STATUS}" = "200" ]; then
    echo -e "${GREEN}✓ 健康检查接口返回 200${NC}"
else
    echo -e "${RED}✗ 健康检查接口返回 ${HEALTH_STATUS}${NC}"
    exit 1
fi

# 验证数据库连接（如果配置了数据库）
echo -e "${YELLOW}检查数据库连接...${NC}"
if grep -q "Database: connected" /tmp/server.log 2>/dev/null; then
    echo -e "${GREEN}✓ 数据库连接正常${NC}"
elif grep -q "Database: unavailable" /tmp/server.log 2>/dev/null; then
    echo -e "${YELLOW}⚠ 数据库未配置（服务器运行在无数据库模式）${NC}"
else
    echo -e "${YELLOW}⚠ 无法确定数据库状态${NC}"
fi

# 验证无启动错误
echo -e "${YELLOW}检查启动错误...${NC}"
if grep -iE "error|failed|fatal|panic" /tmp/server.log | grep -v "deprecated" > /dev/null; then
    echo -e "${RED}✗ 发现启动错误${NC}"
    echo "错误日志："
    grep -iE "error|failed|fatal|panic" /tmp/server.log | grep -v "deprecated" | head -10
    exit 1
else
    echo -e "${GREEN}✓ 无启动错误${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}后端服务启动验证通过${NC}"
echo -e "${GREEN}========================================${NC}"

