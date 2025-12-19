#!/bin/bash
# Go 环境检查脚本

if ! command -v go &> /dev/null; then
    echo "❌ Go 未安装或不在 PATH 中"
    echo ""
    echo "请安装 Go 1.21 或更高版本："
    echo "  - Ubuntu/Debian: sudo apt-get install golang-go"
    echo "  - macOS: brew install go"
    echo "  - 或从官网下载: https://go.dev/dl/"
    echo ""
    echo "安装后验证: go version"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
REQUIRED_VERSION="1.21"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$GO_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Go 版本过低: $GO_VERSION (需要 >= $REQUIRED_VERSION)"
    exit 1
fi

echo "✅ Go 环境检查通过: $(go version)"
exit 0
