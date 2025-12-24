#!/bin/bash

# 项目环境安装脚本
# 自动检测并安装项目所需的所有依赖

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_info "检测到操作系统: macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
            log_info "检测到操作系统: $PRETTY_NAME"
        else
            OS="linux"
            log_warn "无法确定 Linux 发行版，使用通用 Linux 安装方式"
        fi
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
}

# 检测命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否需要 sudo
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if ! sudo -n true 2>/dev/null; then
            log_warn "需要 sudo 权限来安装系统包，请准备好密码"
            sudo -v
        fi
    fi
}

# 安装 Homebrew (macOS)
install_homebrew() {
    if ! command_exists brew; then
        log_info "正在安装 Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # 添加 Homebrew 到 PATH (Apple Silicon Mac)
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        log_success "Homebrew 安装完成"
    else
        log_success "Homebrew 已安装"
    fi
}

# 安装 Node.js 20
install_nodejs() {
    local required_version="20"
    local current_version=""
    
    if command_exists node; then
        current_version=$(node -v | sed 's/v//' | cut -d. -f1)
        log_info "当前 Node.js 版本: v$(node -v | sed 's/v//')"
        
        if [ "$current_version" -ge "$required_version" ]; then
            log_success "Node.js 版本满足要求 (>= $required_version)"
            return 0
        else
            log_warn "Node.js 版本过低，需要升级到 v$required_version"
        fi
    fi
    
    log_info "正在安装 Node.js $required_version..."
    
    if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        # 尝试安装 node@20，如果失败则安装最新的 node
        if ! brew install node@20 2>/dev/null; then
            log_warn "无法安装 node@20，尝试安装最新版本的 node"
            brew install node
        else
            brew link --overwrite node@20 2>/dev/null || true
        fi
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        log_error "无法自动安装 Node.js，请手动安装 Node.js $required_version"
        return 1
    fi
    
    log_success "Node.js 安装完成: $(node -v)"
    log_success "npm 版本: $(npm -v)"
}

# 安装 Go
install_go() {
    local required_version="1.24"
    local current_version=""
    
    if command_exists go; then
        # 兼容 macOS 和 Linux 的版本提取
        current_version=$(go version | sed -E 's/.*go([0-9]+\.[0-9]+).*/\1/')
        log_info "当前 Go 版本: $(go version)"
        
        # 检查版本是否满足要求
        if [ "$(printf '%s\n' "$required_version" "$current_version" | sort -V | head -n1)" == "$required_version" ]; then
            log_success "Go 版本满足要求 (>= $required_version)"
            return 0
        else
            log_warn "Go 版本过低，需要升级到 $required_version"
        fi
    fi
    
    log_info "正在安装 Go $required_version..."
    
    if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        # macOS 上直接安装最新版本的 go
        brew install go
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        # 下载并安装 Go
        local go_version="1.24.11"
        cd /tmp
        wget -q https://go.dev/dl/go${go_version}.linux-amd64.tar.gz
        sudo rm -rf /usr/local/go
        sudo tar -C /usr/local -xzf go${go_version}.linux-amd64.tar.gz
        rm go${go_version}.linux-amd64.tar.gz
        
        # 添加到 PATH
        if ! grep -q '/usr/local/go/bin' ~/.bashrc; then
            echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        fi
        if ! grep -q '/usr/local/go/bin' ~/.zshrc 2>/dev/null; then
            echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
        fi
        export PATH=$PATH:/usr/local/go/bin
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        # 下载并安装 Go
        local go_version="1.24.11"
        cd /tmp
        wget -q https://go.dev/dl/go${go_version}.linux-amd64.tar.gz
        sudo rm -rf /usr/local/go
        sudo tar -C /usr/local -xzf go${go_version}.linux-amd64.tar.gz
        rm go${go_version}.linux-amd64.tar.gz
        
        # 添加到 PATH
        if ! grep -q '/usr/local/go/bin' ~/.bashrc; then
            echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        fi
        if ! grep -q '/usr/local/go/bin' ~/.zshrc 2>/dev/null; then
            echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
        fi
        export PATH=$PATH:/usr/local/go/bin
    else
        log_error "无法自动安装 Go，请手动安装 Go $required_version"
        log_info "下载地址: https://go.dev/dl/"
        return 1
    fi
    
    log_success "Go 安装完成: $(go version)"
}

# 安装 PostgreSQL
install_postgresql() {
    if command_exists psql; then
        log_info "PostgreSQL 已安装: $(psql --version)"
        return 0
    fi
    
    log_info "正在安装 PostgreSQL..."
    
    if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        brew install postgresql@15 || brew install postgresql
        brew services start postgresql@15 || brew services start postgresql
        
        # 创建数据库（如果不存在）
        if ! psql -lqt | cut -d \| -f 1 | grep -qw lifecycle_ops 2>/dev/null; then
            log_info "创建数据库 lifecycle_ops..."
            createdb lifecycle_ops 2>/dev/null || log_warn "无法自动创建数据库，请手动创建: createdb lifecycle_ops"
        fi
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # 创建数据库
        log_info "创建数据库 lifecycle_ops..."
        sudo -u postgres psql -c "CREATE DATABASE lifecycle_ops;" 2>/dev/null || log_warn "数据库可能已存在"
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        sudo yum install -y postgresql-server postgresql
        sudo postgresql-setup initdb || sudo /usr/bin/postgresql-setup --initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # 创建数据库
        log_info "创建数据库 lifecycle_ops..."
        sudo -u postgres psql -c "CREATE DATABASE lifecycle_ops;" 2>/dev/null || log_warn "数据库可能已存在"
    else
        log_error "无法自动安装 PostgreSQL，请手动安装"
        return 1
    fi
    
    log_success "PostgreSQL 安装完成"
    log_warn "请确保 PostgreSQL 服务正在运行，并配置好数据库连接信息"
}

# 安装 tmux
install_tmux() {
    if command_exists tmux; then
        log_success "tmux 已安装: $(tmux -V)"
        return 0
    fi
    
    log_info "正在安装 tmux..."
    
    if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        brew install tmux
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        sudo apt-get update
        sudo apt-get install -y tmux
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        sudo yum install -y tmux
    else
        log_error "无法自动安装 tmux，请手动安装"
        return 1
    fi
    
    log_success "tmux 安装完成"
}

# 安装 make
install_make() {
    if command_exists make; then
        log_success "make 已安装: $(make --version | head -n1)"
        return 0
    fi
    
    log_info "正在安装 make..."
    
    if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        # macOS 通常自带 make，但如果没有则通过 Xcode Command Line Tools 安装
        xcode-select --install 2>/dev/null || log_warn "请手动安装 Xcode Command Line Tools"
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        sudo apt-get update
        sudo apt-get install -y build-essential
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        sudo yum groupinstall -y "Development Tools"
    else
        log_error "无法自动安装 make，请手动安装"
        return 1
    fi
    
    log_success "make 安装完成"
}

# 安装 git
install_git() {
    if command_exists git; then
        log_success "git 已安装: $(git --version)"
        return 0
    fi

    log_info "正在安装 git..."

    if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        brew install git
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        sudo apt-get update
        sudo apt-get install -y git
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        sudo yum install -y git
    else
        log_error "无法自动安装 git，请手动安装"
        return 1
    fi

    log_success "git 安装完成"
}

# 安装项目 npm 依赖
install_npm_dependencies() {
    if ! command_exists npm; then
        log_error "npm 未安装，无法安装项目依赖"
        return 1
    fi

    log_info "检查并安装项目 npm 依赖..."

    # 安装 client 目录依赖
    if [ -d "client" ]; then
        if [ -d "client/node_modules" ] && [ -f "client/package.json" ]; then
            log_success "client 依赖已安装"
        else
            log_info "正在安装 client 依赖..."
            cd client
            npm install
            cd ..
            log_success "client 依赖安装完成"
        fi
    else
        log_warn "client 目录不存在，跳过"
    fi

    # 安装 biz-sample 目录依赖
    if [ -d "biz-sample" ]; then
        if [ -d "biz-sample/node_modules" ] && [ -f "biz-sample/package.json" ]; then
            log_success "biz-sample 依赖已安装"
        else
            log_info "正在安装 biz-sample 依赖..."
            cd biz-sample
            npm install
            cd ..
            log_success "biz-sample 依赖安装完成"
        fi
    else
        log_warn "biz-sample 目录不存在，跳过"
    fi

    return 0
}

# 验证安装
verify_installation() {
    log_info "验证安装..."
    
    local all_ok=true
    
    # 检查 Node.js
    if command_exists node; then
        local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$node_version" -ge "20" ]; then
            log_success "✓ Node.js: $(node -v)"
        else
            log_error "✗ Node.js 版本过低: $(node -v)"
            all_ok=false
        fi
    else
        log_error "✗ Node.js 未安装"
        all_ok=false
    fi
    
    # 检查 npm
    if command_exists npm; then
        log_success "✓ npm: $(npm -v)"
    else
        log_error "✗ npm 未安装"
        all_ok=false
    fi
    
    # 检查 Go
    if command_exists go; then
        local go_ver=$(go version | sed -E 's/.*go([0-9]+\.[0-9]+).*/\1/')
        log_success "✓ Go: $go_ver"
    else
        log_error "✗ Go 未安装"
        all_ok=false
    fi
    
    # 检查 PostgreSQL
    if command_exists psql; then
        log_success "✓ PostgreSQL: $(psql --version | head -n1)"
    else
        log_warn "⚠ PostgreSQL 未安装（可选，如果使用 DB_DISABLED=true 则不需要）"
    fi
    
    # 检查 tmux
    if command_exists tmux; then
        log_success "✓ tmux: $(tmux -V)"
    else
        log_error "✗ tmux 未安装"
        all_ok=false
    fi
    
    # 检查 make
    if command_exists make; then
        log_success "✓ make: $(make --version | head -n1 | cut -d' ' -f3)"
    else
        log_error "✗ make 未安装"
        all_ok=false
    fi
    
    # 检查 git
    if command_exists git; then
        log_success "✓ git: $(git --version | cut -d' ' -f3)"
    else
        log_warn "⚠ git 未安装（可选，但推荐安装）"
    fi
    
    if [ "$all_ok" = true ]; then
        log_success "所有必需工具已安装并验证通过！"
        return 0
    else
        log_error "部分工具安装失败，请检查上述错误信息"
        return 1
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "  项目环境安装脚本"
    echo "=========================================="
    echo ""
    
    detect_os
    
    log_info "开始安装项目依赖..."
    echo ""
    
    # 安装必需工具
    install_git
    install_make
    install_nodejs
    install_go
    install_tmux
    install_postgresql

    # 安装项目依赖
    install_npm_dependencies
    
    echo ""
    log_info "安装完成，开始验证..."
    echo ""
    
    verify_installation
    
    echo ""
    log_info "下一步操作："
    echo "  1. 安装后端依赖: cd server && go mod download"
    echo "  2. 配置数据库: 参考 server/DATABASE_SETUP.md"
    echo "  3. 启动服务: ./console.sh start"
    echo ""
}

# 运行主函数
main "$@"

