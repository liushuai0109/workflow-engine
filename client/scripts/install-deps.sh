#!/bin/bash
# 自动安装前端依赖和Playwright浏览器
# 用于自动化安装npm依赖和Playwright浏览器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}前端依赖安装${NC}"
echo -e "${GREEN}========================================${NC}"

cd "${CLIENT_DIR}"

# 1. 检查node_modules是否存在
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}[1/2] 安装npm依赖...${NC}"
    npm install
    echo -e "${GREEN}✓ npm依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ npm依赖已存在，跳过安装${NC}"
fi

# 2. 检查Playwright浏览器是否已安装
PLAYWRIGHT_BROWSERS_DIR="${HOME}/.cache/ms-playwright"
if [ ! -d "${PLAYWRIGHT_BROWSERS_DIR}" ] || [ -z "$(ls -A ${PLAYWRIGHT_BROWSERS_DIR} 2>/dev/null)" ]; then
    echo -e "${YELLOW}[2/2] 安装Playwright浏览器...${NC}"
    npx playwright install --with-deps chromium
    echo -e "${GREEN}✓ Playwright浏览器安装完成${NC}"
else
    echo -e "${GREEN}✓ Playwright浏览器已存在，跳过安装${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}前端依赖安装完成${NC}"
echo -e "${GREEN}========================================${NC}"

