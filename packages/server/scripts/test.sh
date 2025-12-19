#!/bin/bash
# 测试脚本：运行测试并生成覆盖率报告
#
# 使用方式：
#   make test-script
#   或
#   bash scripts/test.sh
#
# 与 make test-coverage 的区别：
#   - make test-coverage: 生成固定名称的报告（每次覆盖），适合快速查看
#   - make test-script: 生成带时间戳的报告（保留历史），适合追踪覆盖率变化
#
# 生成的文件：
#   reports/coverage/
#   ├── coverage_YYYYMMDD_HHMMSS.out    # 原始覆盖率数据
#   ├── coverage_YYYYMMDD_HHMMSS.txt   # 文本报告（函数级别）
#   ├── coverage_YYYYMMDD_HHMMSS.html   # HTML 报告（可视化）
#   ├── coverage.out -> coverage_*.out  # 最新报告符号链接
#   ├── coverage.txt -> coverage_*.txt
#   └── coverage.html -> coverage_*.html
#
# 使用建议：
#   - 日常开发：使用 make test-coverage（快速、简单）
#   - CI/CD 或需要历史记录：使用 make test-script（保留历史、可追溯）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/reports"
COVERAGE_DIR="${REPORTS_DIR}/coverage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 确保报告目录存在
mkdir -p "${COVERAGE_DIR}"

echo -e "${GREEN}Running tests...${NC}"

# 运行测试并生成覆盖率文件
COVERAGE_FILE="${COVERAGE_DIR}/coverage_${TIMESTAMP}.out"
go test -v -coverprofile="${COVERAGE_FILE}" ./...

if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi

# 生成函数级别的覆盖率报告
echo -e "${GREEN}Generating coverage reports...${NC}"
go tool cover -func="${COVERAGE_FILE}" > "${COVERAGE_DIR}/coverage_${TIMESTAMP}.txt"

# 生成 HTML 报告
HTML_REPORT="${COVERAGE_DIR}/coverage_${TIMESTAMP}.html"
go tool cover -html="${COVERAGE_FILE}" -o "${HTML_REPORT}"

# 创建最新的符号链接
ln -sf "coverage_${TIMESTAMP}.out" "${COVERAGE_DIR}/coverage.out"
ln -sf "coverage_${TIMESTAMP}.txt" "${COVERAGE_DIR}/coverage.txt"
ln -sf "coverage_${TIMESTAMP}.html" "${COVERAGE_DIR}/coverage.html"

# 显示覆盖率摘要
echo -e "\n${GREEN}Coverage Summary:${NC}"
echo "=================="
go tool cover -func="${COVERAGE_FILE}" | tail -1
echo ""
echo -e "${GREEN}Reports generated:${NC}"
echo "  - Coverage data: ${COVERAGE_FILE}"
echo "  - Text report:   ${COVERAGE_DIR}/coverage_${TIMESTAMP}.txt"
echo "  - HTML report:   ${HTML_REPORT}"
echo "  - Latest links:  ${COVERAGE_DIR}/coverage.{out,txt,html}"
echo ""
echo -e "${YELLOW}Open HTML report:${NC}"
echo "  file://${HTML_REPORT}"

