#!/bin/bash

# 在工作目录的 git 历史中查找指定匹配内容

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 显示使用说明
usage() {
    echo "用法: $0 <匹配内容>"
    echo ""
    echo "示例:"
    echo "  $0 \"some_api_key\""
    echo "  $0 \"password123\""
    echo ""
    exit 1
}

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 缺少匹配内容参数${NC}"
    echo ""
    usage
fi

SEARCH_PATTERN="$1"

# 检查当前目录是否为 git 仓库
if [ ! -d ".git" ]; then
    echo -e "${RED}错误: 当前目录不是 git 仓库${NC}"
    echo "请切换到 git 仓库目录后运行此脚本"
    exit 1
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          在 Git 历史中查找匹配内容                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}搜索内容: ${SEARCH_PATTERN}${NC}"
echo -e "${YELLOW}工作目录: $(pwd)${NC}"
echo ""

# 步骤 1: 检查 Git 历史
echo -e "${YELLOW}步骤 1: 检查 Git 历史...${NC}"

# 使用 git log -S 查找包含该内容的提交
GIT_HISTORY_RESULT=$(git log --all --full-history -S "$SEARCH_PATTERN" 2>/dev/null || true)

if echo "$GIT_HISTORY_RESULT" | grep -q "commit"; then
    echo -e "${RED}✗ 在 Git 历史中找到匹配内容${NC}"
    echo ""
    echo "包含该内容的 commits:"
    echo "────────────────────────────────────────────────────────────"
    git log --all --oneline --full-history -S "$SEARCH_PATTERN" | head -20
    echo ""
    
    # 显示详细信息
    echo "详细信息（最近 5 个提交）:"
    echo "────────────────────────────────────────────────────────────"
    git log --all --full-history -S "$SEARCH_PATTERN" --format="%h - %an, %ar : %s" | head -5
    echo ""
    
    # 显示具体文件位置
    echo "涉及的文件:"
    echo "────────────────────────────────────────────────────────────"
    git log --all --full-history -S "$SEARCH_PATTERN" --name-only --pretty=format: | sort -u | grep -v "^$" | head -10
    echo ""
else
    echo -e "${GREEN}✓ Git 历史中未找到匹配内容${NC}"
fi

# 步骤 2: 检查工作目录
echo ""
echo -e "${YELLOW}步骤 2: 检查工作目录...${NC}"

WORK_DIR_RESULT=$(grep -r "$SEARCH_PATTERN" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=build 2>/dev/null || true)

if [ -n "$WORK_DIR_RESULT" ]; then
    echo -e "${RED}✗ 工作目录中找到匹配内容${NC}"
    echo ""
    echo "匹配的文件和位置:"
    echo "────────────────────────────────────────────────────────────"
    echo "$WORK_DIR_RESULT" | head -10
    echo ""
    if echo "$WORK_DIR_RESULT" | wc -l | xargs -I {} [ {} -gt 10 ] && echo "true" || echo "false" | grep -q "true"; then
        echo -e "${YELLOW}（仅显示前 10 个匹配，共有更多结果）${NC}"
    fi
else
    echo -e "${GREEN}✓ 工作目录中未找到匹配内容${NC}"
fi

# 总结
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      查找完成                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
