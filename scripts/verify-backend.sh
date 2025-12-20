#!/bin/bash
# 后端验证脚本
# 执行后端编译、单元测试和服务启动验证

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"
REPORTS_DIR="${PROJECT_ROOT}/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 确保报告目录存在
mkdir -p "${REPORTS_DIR}"

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
echo -e "${GREEN}后端验证开始${NC}"
echo -e "${GREEN}========================================${NC}"

cd "${SERVER_DIR}"

# 1. 编译验证
echo -e "${YELLOW}[1/3] 运行编译验证...${NC}"
if "${GO}" build ./cmd/server/main.go > "${REPORTS_DIR}/backend-build-${TIMESTAMP}.log" 2>&1; then
    echo -e "${GREEN}✓ 编译成功${NC}"
else
    echo -e "${RED}✗ 编译失败${NC}"
    cat "${REPORTS_DIR}/backend-build-${TIMESTAMP}.log"
    exit 1
fi

# 2. 单元测试
echo -e "${YELLOW}[2/3] 运行单元测试...${NC}"
if make test > "${REPORTS_DIR}/backend-test-${TIMESTAMP}.log" 2>&1; then
    echo -e "${GREEN}✓ 单元测试通过${NC}"
else
    echo -e "${RED}✗ 单元测试失败${NC}"
    cat "${REPORTS_DIR}/backend-test-${TIMESTAMP}.log"
    exit 1
fi

# 3. 服务启动验证（如果脚本存在）
if [ -f "${SERVER_DIR}/scripts/verify-start.sh" ]; then
    echo -e "${YELLOW}[3/3] 运行服务启动验证...${NC}"
    if bash "${SERVER_DIR}/scripts/verify-start.sh" > "${REPORTS_DIR}/backend-start-${TIMESTAMP}.log" 2>&1; then
        echo -e "${GREEN}✓ 服务启动验证通过${NC}"
    else
        echo -e "${RED}✗ 服务启动验证失败${NC}"
        cat "${REPORTS_DIR}/backend-start-${TIMESTAMP}.log"
        exit 1
    fi
else
    echo -e "${YELLOW}[3/3] 服务启动验证跳过（脚本未创建）${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}后端验证完成${NC}"
echo -e "${GREEN}========================================${NC}"

