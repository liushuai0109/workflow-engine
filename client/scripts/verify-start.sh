#!/bin/bash
# 前端服务启动验证脚本
# 验证开发服务器可以正常启动

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${PROJECT_ROOT}/client"
TIMEOUT=5
PORT=8000

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}前端服务启动验证${NC}"
echo -e "${GREEN}========================================${NC}"

cd "${CLIENT_DIR}"

# 检查端口是否已被占用
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}端口 ${PORT} 已被占用，尝试停止现有服务...${NC}"
    lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 启动服务器（后台运行）
echo -e "${YELLOW}启动开发服务器...${NC}"
npm run start > /tmp/vite-server.log 2>&1 &
SERVER_PID=$!

# 清理函数
cleanup() {
    echo -e "${YELLOW}停止服务器...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# 等待服务器启动
echo -e "${YELLOW}等待服务器启动（最多 ${TIMEOUT} 秒）...${NC}"
for i in $(seq 1 ${TIMEOUT}); do
    if curl -s http://localhost:${PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 服务器在 ${i} 秒内启动成功${NC}"
        break
    fi
    if [ $i -eq ${TIMEOUT} ]; then
        echo -e "${RED}✗ 服务器启动超时${NC}"
        echo "服务器日志："
        cat /tmp/vite-server.log
        exit 1
    fi
    sleep 1
done

# 验证根路径访问
echo -e "${YELLOW}验证根路径访问...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/ | grep -q "200"; then
    echo -e "${GREEN}✓ 根路径访问成功${NC}"
else
    echo -e "${RED}✗ 根路径访问失败${NC}"
    exit 1
fi

# 验证主要路由（如果存在）
echo -e "${YELLOW}验证主要路由...${NC}"
ROUTES=("/" "/editor")
for route in "${ROUTES[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}${route}" | grep -qE "(200|404)"; then
        echo -e "${GREEN}✓ 路由 ${route} 可访问${NC}"
    else
        echo -e "${YELLOW}⚠ 路由 ${route} 访问异常（可能不存在）${NC}"
    fi
done

# 验证无启动错误
echo -e "${YELLOW}检查启动错误...${NC}"
if grep -i "error\|failed\|fatal" /tmp/vite-server.log | grep -v "deprecated" > /dev/null; then
    echo -e "${RED}✗ 发现启动错误${NC}"
    echo "错误日志："
    grep -i "error\|failed\|fatal" /tmp/vite-server.log | grep -v "deprecated"
    exit 1
else
    echo -e "${GREEN}✓ 无启动错误${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}前端服务启动验证通过${NC}"
echo -e "${GREEN}========================================${NC}"

