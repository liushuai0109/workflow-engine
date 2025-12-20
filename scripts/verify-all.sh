#!/bin/bash
# 完整验证脚本
# 执行前端和后端的所有验证，并生成验证报告

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="${PROJECT_ROOT}/scripts"
REPORTS_DIR="${PROJECT_ROOT}/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 确保报告目录存在
mkdir -p "${REPORTS_DIR}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}完整验证开始${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 验证结果
FRONTEND_PASSED=false
BACKEND_PASSED=false

# 1. 前端验证
echo -e "${YELLOW}----------------------------------------${NC}"
echo -e "${YELLOW}前端验证${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"
if bash "${SCRIPTS_DIR}/verify-frontend.sh"; then
    FRONTEND_PASSED=true
    echo -e "${GREEN}✓ 前端验证通过${NC}"
else
    echo -e "${RED}✗ 前端验证失败${NC}"
fi
echo ""

# 2. 后端验证
echo -e "${YELLOW}----------------------------------------${NC}"
echo -e "${YELLOW}后端验证${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"
if bash "${SCRIPTS_DIR}/verify-backend.sh"; then
    BACKEND_PASSED=true
    echo -e "${GREEN}✓ 后端验证通过${NC}"
else
    echo -e "${RED}✗ 后端验证失败${NC}"
fi
echo ""

# 3. 生成验证报告
REPORT_FILE="${REPORTS_DIR}/verification-report-${TIMESTAMP}.txt"
{
    echo "验证报告"
    echo "生成时间: $(date)"
    echo ""
    echo "前端验证: $([ "$FRONTEND_PASSED" = true ] && echo "通过" || echo "失败")"
    echo "后端验证: $([ "$BACKEND_PASSED" = true ] && echo "通过" || echo "失败")"
    echo ""
    echo "详细日志请查看 ${REPORTS_DIR}/ 目录"
} > "${REPORT_FILE}"

# 4. 总结
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}验证总结${NC}"
echo -e "${GREEN}========================================${NC}"
echo "前端验证: $([ "$FRONTEND_PASSED" = true ] && echo -e "${GREEN}通过${NC}" || echo -e "${RED}失败${NC}")"
echo "后端验证: $([ "$BACKEND_PASSED" = true ] && echo -e "${GREEN}通过${NC}" || echo -e "${RED}失败${NC}")"
echo ""
echo "验证报告: ${REPORT_FILE}"

# 如果任何验证失败，返回非零退出码
if [ "$FRONTEND_PASSED" = false ] || [ "$BACKEND_PASSED" = false ]; then
    echo -e "${RED}验证失败，请检查上述错误${NC}"
    exit 1
fi

echo -e "${GREEN}所有验证通过！${NC}"

