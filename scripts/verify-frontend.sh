#!/bin/bash
# 前端验证脚本
# 执行前端类型检查、构建、单元测试和headless browser验证

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${PROJECT_ROOT}/client"
REPORTS_DIR="${PROJECT_ROOT}/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 确保报告目录存在
mkdir -p "${REPORTS_DIR}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}前端验证开始${NC}"
echo -e "${GREEN}========================================${NC}"

cd "${CLIENT_DIR}"

# 0. 自动安装依赖（如果未安装）
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}[0/4] 检测到依赖未安装，自动安装...${NC}"
    bash scripts/install-deps.sh
fi

# 1. 类型检查
echo -e "${YELLOW}[1/4] 运行类型检查...${NC}"
if npm run type-check > "${REPORTS_DIR}/frontend-type-check-${TIMESTAMP}.log" 2>&1; then
    echo -e "${GREEN}✓ 类型检查通过${NC}"
else
    echo -e "${RED}✗ 类型检查失败${NC}"
    cat "${REPORTS_DIR}/frontend-type-check-${TIMESTAMP}.log"
    exit 1
fi

# 2. 构建验证
echo -e "${YELLOW}[2/4] 运行构建验证...${NC}"
if npm run build > "${REPORTS_DIR}/frontend-build-${TIMESTAMP}.log" 2>&1; then
    echo -e "${GREEN}✓ 构建成功${NC}"
else
    echo -e "${RED}✗ 构建失败${NC}"
    cat "${REPORTS_DIR}/frontend-build-${TIMESTAMP}.log"
    exit 1
fi

# 3. 单元测试
echo -e "${YELLOW}[3/4] 运行单元测试...${NC}"
if npm run test -- --coverage > "${REPORTS_DIR}/frontend-test-${TIMESTAMP}.log" 2>&1; then
    echo -e "${GREEN}✓ 单元测试通过${NC}"
    # 显示覆盖率摘要
    if grep -q "All files" "${REPORTS_DIR}/frontend-test-${TIMESTAMP}.log"; then
        grep "All files" "${REPORTS_DIR}/frontend-test-${TIMESTAMP}.log"
    fi
else
    echo -e "${RED}✗ 单元测试失败${NC}"
    cat "${REPORTS_DIR}/frontend-test-${TIMESTAMP}.log"
    exit 1
fi

# 4. Headless browser验证（如果已配置）
if npm run test:e2e:headless > "${REPORTS_DIR}/frontend-e2e-headless-${TIMESTAMP}.log" 2>&1; then
    echo -e "${YELLOW}[4/4] 运行Headless Browser验证...${NC}"
    echo -e "${GREEN}✓ Headless Browser验证通过${NC}"
else
    echo -e "${YELLOW}[4/4] Headless Browser验证跳过（未配置）${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}前端验证完成${NC}"
echo -e "${GREEN}========================================${NC}"

