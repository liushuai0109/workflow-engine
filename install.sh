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

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# 读取服务端配置
SERVER_TYPE="go"  # 默认使用 Go
DB_USER=""  # 默认为空，如果未配置则使用当前用户
DB_NAME="workflow_engine"  # 默认数据库名
if [ -f "$PROJECT_ROOT/server.config" ]; then
    source "$PROJECT_ROOT/server.config"
fi

# 根据配置选择服务端目录
case "$SERVER_TYPE" in
    "nodejs")
        SERVER_DIR="server-nodejs"
        ;;
    "go"|*)
        SERVER_DIR="server-go"
        ;;
esac

# 如果 DB_USER 未配置，使用当前用户
if [ -z "$DB_USER" ]; then
    DB_USER=$(whoami)
fi

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

# 显示配置信息
show_config_info() {
    echo ""
    log_info "==================== 配置信息 ===================="
    log_info "服务端类型: $SERVER_TYPE"
    log_info "服务端目录: $SERVER_DIR"
    log_info "数据库名称: $DB_NAME"
    log_info "数据库用户: $DB_USER"
    log_info "=================================================="
    echo ""
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
    # 先检查 PATH 中是否存在
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    fi

    # 特殊处理 brew：检查常见的安装路径
    if [ "$1" = "brew" ]; then
        # Apple Silicon Mac
        if [ -f "/opt/homebrew/bin/brew" ]; then
            # 添加到 PATH
            export PATH="/opt/homebrew/bin:$PATH"
            return 0
        fi
        # Intel Mac
        if [ -f "/usr/local/bin/brew" ]; then
            export PATH="/usr/local/bin:$PATH"
            return 0
        fi
    fi

    # 特殊处理 go：检查常见的安装路径
    if [ "$1" = "go" ]; then
        # Homebrew 安装的 Go (Apple Silicon)
        if [ -f "/opt/homebrew/bin/go" ]; then
            export PATH="/opt/homebrew/bin:$PATH"
            return 0
        fi
        # Homebrew 安装的 Go (Intel)
        if [ -f "/usr/local/bin/go" ]; then
            export PATH="/usr/local/bin:$PATH"
            return 0
        fi
        # 标准 Go 安装路径
        if [ -f "/usr/local/go/bin/go" ]; then
            export PATH="/usr/local/go/bin:$PATH"
            return 0
        fi
    fi

    # 特殊处理 psql：检查常见的 PostgreSQL 安装路径
    if [ "$1" = "psql" ]; then
        # 检查常见的 Homebrew PostgreSQL 路径
        for pg_path in /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin /opt/homebrew/opt/postgresql/bin /usr/local/opt/postgresql/bin; do
            if [ -f "$pg_path/psql" ]; then
                export PATH="$pg_path:$PATH"
                return 0
            fi
        done
    fi

    # 特殊处理 migrate：检查 GOPATH/bin
    if [ "$1" = "migrate" ]; then
        # 检查 GOPATH/bin
        if command -v go >/dev/null 2>&1; then
            local gopath=$(go env GOPATH 2>/dev/null)
            if [ -n "$gopath" ] && [ -f "$gopath/bin/migrate" ]; then
                export PATH="$gopath/bin:$PATH"
                return 0
            fi
        fi
    fi

    return 1
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

        # 添加 Homebrew 到 PATH
        if [[ $(uname -m) == "arm64" ]]; then
            # Apple Silicon Mac
            export PATH="/opt/homebrew/bin:$PATH"

            # 检测当前使用的 shell
            local current_shell=$(basename "$SHELL")
            local primary_rc=""

            case "$current_shell" in
                zsh)
                    primary_rc="$HOME/.zshrc"
                    ;;
                bash)
                    primary_rc="$HOME/.bash_profile"
                    ;;
                *)
                    primary_rc="$HOME/.profile"
                    ;;
            esac

            # 确保至少主配置文件有 Homebrew 配置
            if [ ! -f "$primary_rc" ] || ! grep -q '/opt/homebrew/bin/brew' "$primary_rc" 2>/dev/null; then
                log_info "添加 Homebrew 配置到 $primary_rc"
                echo '' >> "$primary_rc"
                echo '# Homebrew' >> "$primary_rc"
                echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$primary_rc"
            fi

            # 更新其他已存在的配置文件
            for rc_file in ~/.zprofile ~/.bash_profile ~/.bashrc ~/.zshrc ~/.profile; do
                # 跳过主配置文件（已处理）
                if [ "$rc_file" = "$primary_rc" ]; then
                    continue
                fi

                if [ -f "$rc_file" ]; then
                    if ! grep -q '/opt/homebrew/bin/brew' "$rc_file" 2>/dev/null; then
                        log_info "添加 Homebrew 配置到 $rc_file"
                        echo '' >> "$rc_file"
                        echo '# Homebrew' >> "$rc_file"
                        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$rc_file"
                    fi
                fi
            done

            # 执行 brew shellenv
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            # Intel Mac
            export PATH="/usr/local/bin:$PATH"

            # 检测当前使用的 shell
            local current_shell=$(basename "$SHELL")
            local primary_rc=""

            case "$current_shell" in
                zsh)
                    primary_rc="$HOME/.zshrc"
                    ;;
                bash)
                    primary_rc="$HOME/.bash_profile"
                    ;;
                *)
                    primary_rc="$HOME/.profile"
                    ;;
            esac

            # 确保至少主配置文件有 Homebrew 配置
            if [ ! -f "$primary_rc" ] || ! grep -q '/usr/local/bin/brew' "$primary_rc" 2>/dev/null; then
                log_info "添加 Homebrew 配置到 $primary_rc"
                echo '' >> "$primary_rc"
                echo '# Homebrew' >> "$primary_rc"
                echo 'eval "$(/usr/local/bin/brew shellenv)"' >> "$primary_rc"
            fi

            # 更新其他已存在的配置文件
            for rc_file in ~/.bash_profile ~/.bashrc ~/.zshrc ~/.profile; do
                # 跳过主配置文件（已处理）
                if [ "$rc_file" = "$primary_rc" ]; then
                    continue
                fi

                if [ -f "$rc_file" ]; then
                    if ! grep -q '/usr/local/bin/brew' "$rc_file" 2>/dev/null; then
                        log_info "添加 Homebrew 配置到 $rc_file"
                        echo '' >> "$rc_file"
                        echo '# Homebrew' >> "$rc_file"
                        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> "$rc_file"
                    fi
                fi
            done

            # 执行 brew shellenv
            eval "$(/usr/local/bin/brew shellenv)"
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
    # 检查 psql 是否可用
    local psql_found=false

    if command_exists psql; then
        psql_found=true
    else
        # 检查常见的 PostgreSQL 安装路径
        if [ "$OS" == "macos" ]; then
            for pg_path in /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin /opt/homebrew/opt/postgresql/bin /usr/local/opt/postgresql/bin; do
                if [ -f "$pg_path/psql" ]; then
                    export PATH="$pg_path:$PATH"
                    psql_found=true
                    break
                fi
            done
        fi
    fi

    if [ "$psql_found" = false ]; then
        log_info "正在安装 PostgreSQL..."

        if [ "$OS" == "macos" ]; then
        if ! command_exists brew; then
            install_homebrew
        fi
        brew install postgresql@15 || brew install postgresql

        # 添加 PostgreSQL 到 PATH
        local pg_bin_path=""
        if [ -d "/opt/homebrew/opt/postgresql@15/bin" ]; then
            pg_bin_path="/opt/homebrew/opt/postgresql@15/bin"
        elif [ -d "/usr/local/opt/postgresql@15/bin" ]; then
            pg_bin_path="/usr/local/opt/postgresql@15/bin"
        elif [ -d "/opt/homebrew/opt/postgresql/bin" ]; then
            pg_bin_path="/opt/homebrew/opt/postgresql/bin"
        elif [ -d "/usr/local/opt/postgresql/bin" ]; then
            pg_bin_path="/usr/local/opt/postgresql/bin"
        fi

        if [ -n "$pg_bin_path" ]; then
            export PATH="$pg_bin_path:$PATH"

            # 检测当前使用的 shell
            local current_shell=$(basename "$SHELL")
            local primary_rc=""

            case "$current_shell" in
                zsh)
                    primary_rc="$HOME/.zshrc"
                    ;;
                bash)
                    primary_rc="$HOME/.bash_profile"
                    ;;
                *)
                    primary_rc="$HOME/.profile"
                    ;;
            esac

            # 添加到主配置文件
            if [ ! -f "$primary_rc" ] || ! grep -q "$pg_bin_path" "$primary_rc" 2>/dev/null; then
                log_info "添加 PostgreSQL 到 $primary_rc"
                echo '' >> "$primary_rc"
                echo '# PostgreSQL' >> "$primary_rc"
                echo "export PATH=\"$pg_bin_path:\$PATH\"" >> "$primary_rc"
            fi
        fi

        # 启动服务
        brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null
        sleep 2  # 等待服务启动
    elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        check_sudo
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # 创建数据库
        log_info "创建数据库 workflow_engine..."
        sudo -u postgres psql -c "CREATE DATABASE workflow_engine;" 2>/dev/null || log_warn "数据库可能已存在"
    elif [ "$OS" == "fedora" ] || [ "$OS" == "rhel" ] || [ "$OS" == "centos" ]; then
        check_sudo
        sudo yum install -y postgresql-server postgresql
        sudo postgresql-setup initdb || sudo /usr/bin/postgresql-setup --initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # 创建数据库
        log_info "创建数据库 workflow_engine..."
        sudo -u postgres psql -c "CREATE DATABASE workflow_engine;" 2>/dev/null || log_warn "数据库可能已存在"
        else
            log_error "无法自动安装 PostgreSQL，请手动安装"
            return 1
        fi
    fi

    # 创建数据库用户和数据库（所有平台通用逻辑）
    if [ "$OS" == "macos" ] && command -v psql >/dev/null 2>&1; then
        local current_user=$(whoami)

        # 检查数据库用户是否存在（如果配置的用户不是当前用户）
        if [ "$DB_USER" != "$current_user" ]; then
            if ! psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1; then
                log_info "创建数据库用户 $DB_USER..."
                if psql -d postgres -c "CREATE ROLE $DB_USER WITH LOGIN CREATEDB;" 2>/dev/null; then
                    log_success "数据库用户 $DB_USER 创建成功"
                else
                    log_warn "无法自动创建数据库用户，请手动创建: psql -d postgres -c \"CREATE ROLE $DB_USER WITH LOGIN CREATEDB;\""
                fi
            else
                log_success "数据库用户 $DB_USER 已存在"
            fi
        fi

        # 创建数据库
        if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            log_info "创建数据库 $DB_NAME..."
            if createdb -O "$DB_USER" "$DB_NAME" 2>/dev/null; then
                log_success "数据库 $DB_NAME 创建成功"

                # 确保 public schema 的所有者是配置的数据库用户（PostgreSQL 15+ 需要）
                log_info "配置数据库权限..."
                psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO $DB_USER;" 2>/dev/null || log_warn "设置 schema 所有者可能失败"

                # 确保配置的数据库用户有所有权限
                psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true
                psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
                psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
                psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null || true
                psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>/dev/null || true
            else
                log_warn "无法自动创建数据库，请手动创建: createdb -O $DB_USER $DB_NAME"
            fi
        else
            log_success "数据库 $DB_NAME 已存在"

            # 即使数据库已存在，也要确保权限正确（PostgreSQL 15+ 兼容性）
            log_info "检查并配置数据库权限..."
            psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO $DB_USER;" 2>/dev/null || log_warn "设置 schema 所有者可能失败"
            psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true
            psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
            psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
            psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null || true
            psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>/dev/null || true
        fi
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

# 安装 openspec
install_openspec() {
    # 检查 openspec 是否已经全局安装
    if command_exists openspec; then
        local current_version=$(openspec --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
        log_success "openspec 已安装: v$current_version"
        return 0
    fi

    log_info "正在全局安装 openspec..."

    # 确保 npm 已安装
    if ! command_exists npm; then
        log_error "npm 未安装，无法安装 openspec"
        return 1
    fi

    # 检查是否需要 sudo
    local npm_prefix=$(npm config get prefix)
    local use_sudo=false

    # 如果 npm 全局安装目录需要 root 权限，则使用 sudo
    if [ "$npm_prefix" = "/usr" ] || [ "$npm_prefix" = "/usr/local" ]; then
        if [ ! -w "$npm_prefix/lib/node_modules" ]; then
            use_sudo=true
            check_sudo
        fi
    fi

    # 执行全局安装
    if [ "$use_sudo" = true ]; then
        log_info "需要管理员权限安装全局 npm 包..."
        sudo npm install -g @fission-ai/openspec@latest
    else
        npm install -g @fission-ai/openspec@latest
    fi

    # 验证安装
    if command_exists openspec; then
        local installed_version=$(openspec --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
        log_success "openspec 安装完成: v$installed_version"
        return 0
    else
        log_error "openspec 安装失败，请手动安装: npm install -g @fission-ai/openspec@latest"
        return 1
    fi
}

# 安装 golang-migrate
install_migrate() {
    # 检查 migrate 是否已经安装
    if command_exists migrate; then
        log_success "golang-migrate 已安装: $(migrate -version 2>/dev/null || echo 'unknown')"
        return 0
    fi

    log_info "正在安装 golang-migrate..."

    # 确保 Go 已安装
    if ! command_exists go; then
        log_error "Go 未安装，无法安装 golang-migrate"
        return 1
    fi

    # 使用 go install 安装 migrate 工具
    log_info "使用 go install 安装 migrate 工具..."
    if go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest; then
        log_success "golang-migrate 安装完成"

        # 确保 GOPATH/bin 在 PATH 中
        local gopath=$(go env GOPATH)
        if [ -n "$gopath" ]; then
            export PATH="$gopath/bin:$PATH"

            # 检测当前使用的 shell
            local current_shell=$(basename "$SHELL")
            local primary_rc=""

            case "$current_shell" in
                zsh)
                    primary_rc="$HOME/.zshrc"
                    ;;
                bash)
                    primary_rc="$HOME/.bash_profile"
                    ;;
                *)
                    primary_rc="$HOME/.profile"
                    ;;
            esac

            # 添加 GOPATH/bin 到配置文件
            if [ ! -f "$primary_rc" ] || ! grep -q "GOPATH/bin" "$primary_rc" 2>/dev/null; then
                log_info "添加 GOPATH/bin 到 $primary_rc"
                echo '' >> "$primary_rc"
                echo '# Go binaries' >> "$primary_rc"
                echo 'export PATH="$(go env GOPATH)/bin:$PATH"' >> "$primary_rc"
            fi
        fi

        # 验证安装
        if command_exists migrate; then
            log_success "✓ migrate: $(migrate -version 2>/dev/null || echo 'installed')"
            return 0
        else
            log_warn "migrate 已安装但不在 PATH 中，请重启终端或运行: export PATH=\"\$(go env GOPATH)/bin:\$PATH\""
            return 0
        fi
    else
        log_error "golang-migrate 安装失败"
        log_info "你可以稍后手动安装: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
        return 1
    fi
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

    # 根据 SERVER_TYPE 安装对应的 npm 依赖
    if [ "$SERVER_TYPE" = "nodejs" ]; then
        if [ -d "$SERVER_DIR" ]; then
            if [ -d "$SERVER_DIR/node_modules" ] && [ -f "$SERVER_DIR/package.json" ]; then
                log_success "$SERVER_DIR 依赖已安装"
            else
                log_info "正在安装 $SERVER_DIR 依赖..."
                cd "$SERVER_DIR"
                npm install
                cd ..
                log_success "$SERVER_DIR 依赖安装完成"
            fi
        else
            log_warn "$SERVER_DIR 目录不存在，跳过"
        fi
    else
        # 非 nodejs 类型，但如果存在 server-nodejs，也给出提示
        if [ -d "server-nodejs" ]; then
            log_info "检测到 server-nodejs 目录（当前使用 $SERVER_TYPE）"
            if [ ! -d "server-nodejs/node_modules" ]; then
                log_info "可以运行: cd server-nodejs && npm install"
            fi
        fi
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

# 安装 Go 项目依赖
install_go_dependencies() {
    if ! command_exists go; then
        log_error "Go 未安装，无法安装项目依赖"
        return 1
    fi

    log_info "检查并安装 Go 项目依赖..."

    # 根据 SERVER_TYPE 决定处理哪个目录
    local target_dir=""

    if [ "$SERVER_TYPE" = "go" ]; then
        if [ -d "$SERVER_DIR" ]; then
            target_dir="$SERVER_DIR"
        elif [ -d "server-go" ]; then
            target_dir="server-go"
        elif [ -d "server" ]; then
            target_dir="server"
        fi
    else
        # 如果不是 go 类型，检查是否有 go 服务端存在（向后兼容）
        if [ -d "server-go" ]; then
            target_dir="server-go"
        elif [ -d "server" ]; then
            target_dir="server"
        fi
    fi

    if [ -z "$target_dir" ]; then
        log_warn "未找到 Go 服务端目录，跳过"
        return 0
    fi

    if [ -f "$target_dir/go.mod" ]; then
        log_info "处理 $target_dir Go 依赖..."
        cd "$target_dir"

        # 检查是否需要下载依赖
        if [ ! -f "go.sum" ] || [ ! -d "vendor" ]; then
            log_info "正在下载 $target_dir Go 依赖..."
            go mod download
            log_success "$target_dir Go 依赖下载完成"
        else
            log_success "$target_dir Go 依赖已安装"
        fi

        # 检查依赖是否需要更新
        if go mod verify >/dev/null 2>&1; then
            log_success "$target_dir Go 依赖验证通过"
        else
            log_warn "$target_dir Go 依赖需要更新，正在更新..."
            go mod download
            log_success "$target_dir Go 依赖更新完成"
        fi

        cd ..
    else
        log_warn "$target_dir/go.mod 不存在，跳过"
    fi

    return 0
}

# 安装 Playwright 浏览器
install_playwright_browsers() {
    if ! command_exists npm; then
        log_error "npm 未安装，无法安装 Playwright 浏览器"
        return 1
    fi

    log_info "检查并安装 Playwright 浏览器..."

    local playwright_installed=false

    # 检查 client 目录是否安装了 Playwright
    if [ -d "client/node_modules/@playwright" ] || [ -d "client/node_modules/playwright" ]; then
        log_info "在 client 目录中检测到 Playwright，正在安装浏览器..."
        cd client
        if npx playwright install 2>/dev/null; then
            log_success "client Playwright 浏览器安装完成"
            playwright_installed=true
        else
            log_warn "client Playwright 浏览器安装失败"
        fi
        cd ..
    fi

    # 检查 biz-sample 目录是否安装了 Playwright
    if [ -d "biz-sample/node_modules/@playwright" ] || [ -d "biz-sample/node_modules/playwright" ]; then
        log_info "在 biz-sample 目录中检测到 Playwright，正在安装浏览器..."
        cd biz-sample
        if npx playwright install 2>/dev/null; then
            log_success "biz-sample Playwright 浏览器安装完成"
            playwright_installed=true
        else
            log_warn "biz-sample Playwright 浏览器安装失败"
        fi
        cd ..
    fi

    if [ "$playwright_installed" = false ]; then
        log_info "未检测到 Playwright 安装，跳过浏览器安装"
    fi

    return 0
}

# 配置 server 环境变量
setup_server_env() {
    log_info "配置 server 环境变量..."

    # 优先处理配置的服务端目录
    if [ -d "$SERVER_DIR" ]; then
        configure_server_env_for_dir "$SERVER_DIR"
    fi

    # 如果有其他服务端目录，也进行配置（向后兼容）
    local other_dirs=()
    for dir in "server-go" "server-nodejs" "server"; do
        if [ -d "$dir" ] && [ "$dir" != "$SERVER_DIR" ]; then
            other_dirs+=("$dir")
        fi
    done

    if [ ${#other_dirs[@]} -gt 0 ]; then
        log_info "同时配置其他服务端目录的环境变量..."
        for dir in "${other_dirs[@]}"; do
            configure_server_env_for_dir "$dir"
        done
    fi

    return 0
}

# 为指定的服务端目录配置环境变量
configure_server_env_for_dir() {
    local server_dir=$1

    # 检查 .env 文件是否存在
    if [ -f "$server_dir/.env" ]; then
        log_success "$server_dir/.env 已存在"
        return 0
    fi

    # 检查 .env.example 是否存在
    if [ ! -f "$server_dir/.env.example" ]; then
        log_warn "$server_dir/.env.example 不存在，无法自动配置"
        return 0
    fi

    # 复制 .env.example 到 .env
    log_info "从 $server_dir/.env.example 创建 .env 文件..."
    cp "$server_dir/.env.example" "$server_dir/.env"

    # 根据操作系统配置数据库密码
    if [ "$OS" == "macos" ]; then
        # macOS 上 Homebrew 安装的 PostgreSQL 默认不需要密码
        # 使用配置的数据库用户名（来自 server.config 的 DB_USER）

        # 更新 .env 文件中的数据库配置
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DB_USER=postgres/DB_USER=$DB_USER/g" "$server_dir/.env"
            sed -i '' "s/DB_USER=.*/DB_USER=$DB_USER/g" "$server_dir/.env"
            sed -i '' "s/DB_PASSWORD=your_password_here/DB_PASSWORD=/g" "$server_dir/.env" 2>/dev/null || true
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=/g" "$server_dir/.env" 2>/dev/null || true
            sed -i '' "s/DB_NAME=.*/DB_NAME=$DB_NAME/g" "$server_dir/.env"
        else
            sed -i "s/DB_USER=postgres/DB_USER=$DB_USER/g" "$server_dir/.env"
            sed -i "s/DB_USER=.*/DB_USER=$DB_USER/g" "$server_dir/.env"
            sed -i "s/DB_PASSWORD=your_password_here/DB_PASSWORD=/g" "$server_dir/.env" 2>/dev/null || true
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=/g" "$server_dir/.env" 2>/dev/null || true
            sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/g" "$server_dir/.env"
        fi

        log_success "$server_dir/.env 已创建（macOS 默认配置）"
        log_info "  数据库用户: $DB_USER"
        log_info "  数据库密码: (空)"
        log_info "  数据库名称: $DB_NAME"
    else
        log_success "$server_dir/.env 已创建"
        log_warn "请手动编辑 $server_dir/.env 文件，配置数据库密码"
    fi
}

# 配置 hosts 文件
configure_hosts() {
    log_info "配置 hosts 文件..."

    local hosts_file="/etc/hosts"
    local hosts_entries=(
        "127.0.0.1 editor.workflow.com"
        "127.0.0.1 api.workflow.com"
    )

    # 检查 hosts 文件是否存在
    if [ ! -f "$hosts_file" ]; then
        log_error "hosts 文件不存在: $hosts_file"
        return 1
    fi

    # 检查是否需要添加配置
    local needs_update=false
    for entry in "${hosts_entries[@]}"; do
        local domain=$(echo "$entry" | awk '{print $2}')
        if ! grep -q "$domain" "$hosts_file" 2>/dev/null; then
            needs_update=true
            break
        fi
    done

    if [ "$needs_update" = false ]; then
        log_success "hosts 配置已存在"
        return 0
    fi

    # 需要 sudo 权限来修改 hosts 文件
    check_sudo

    # 备份 hosts 文件
    log_info "备份 hosts 文件..."
    sudo cp "$hosts_file" "${hosts_file}.backup.$(date +%Y%m%d_%H%M%S)"

    # 添加配置
    log_info "添加 hosts 配置..."
    for entry in "${hosts_entries[@]}"; do
        local domain=$(echo "$entry" | awk '{print $2}')
        if ! grep -q "$domain" "$hosts_file" 2>/dev/null; then
            echo "$entry" | sudo tee -a "$hosts_file" >/dev/null
            log_success "已添加: $entry"
        else
            log_success "已存在: $entry"
        fi
    done

    log_success "hosts 配置完成"
    return 0
}

# 配置数据库用户权限
configure_database_permissions() {
    log_info "配置数据库用户权限..."

    # 检查 $SERVER_DIR/.env 文件是否存在
    if [ ! -f "$SERVER_DIR/.env" ]; then
        log_warn "$SERVER_DIR/.env 不存在，跳过权限配置"
        return 0
    fi

    # 检查 PostgreSQL 是否可用
    if ! command_exists psql; then
        log_warn "PostgreSQL 未安装，跳过权限配置"
        return 0
    fi

    # 读取 .env 文件中的数据库配置
    local db_user=$(grep "^DB_USER=" "$SERVER_DIR/.env" | cut -d'=' -f2 | tr -d ' "')
    local db_name=$(grep "^DB_NAME=" "$SERVER_DIR/.env" | cut -d'=' -f2 | tr -d ' "')
    local db_disabled=$(grep "^DB_DISABLED=" "$SERVER_DIR/.env" | cut -d'=' -f2 | tr -d ' "' || echo "false")

    if [ "$db_disabled" = "true" ]; then
        log_info "数据库已禁用（DB_DISABLED=true），跳过权限配置"
        return 0
    fi

    if [ -z "$db_user" ] || [ -z "$db_name" ]; then
        log_warn "数据库配置不完整，跳过权限配置"
        return 0
    fi

    # 检查数据库是否存在
    if ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$db_name"; then
        log_warn "数据库 $db_name 不存在，跳过权限配置"
        return 0
    fi

    log_info "为用户 $db_user 配置数据库 $db_name 的权限..."

    # 检查数据库用户是否存在，如果不存在则创建
    local current_user=$(whoami)
    if [ "$db_user" != "$current_user" ]; then
        if ! psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$db_user'" 2>/dev/null | grep -q 1; then
            log_info "创建数据库用户 $db_user..."
            if psql -d postgres -c "CREATE ROLE $db_user WITH LOGIN CREATEDB;" 2>/dev/null; then
                log_success "数据库用户 $db_user 创建成功"
            else
                log_error "无法创建数据库用户 $db_user"
                log_info "请手动创建: psql -d postgres -c \"CREATE ROLE $db_user WITH LOGIN CREATEDB;\""
                return 1
            fi
        else
            log_success "数据库用户 $db_user 已存在"
        fi
    fi

    # 设置 public schema 的所有者为 DB_USER（PostgreSQL 15+ 需要）
    if psql -d "$db_name" -c "ALTER SCHEMA public OWNER TO $db_user;" 2>/dev/null; then
        log_success "成功设置 schema 所有者为 $db_user"
    else
        log_warn "设置 schema 所有者失败，可能权限不足"
    fi

    # 授予所有权限
    psql -d "$db_name" -c "GRANT ALL ON SCHEMA public TO $db_user;" 2>/dev/null || true
    psql -d "$db_name" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $db_user;" 2>/dev/null || true
    psql -d "$db_name" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $db_user;" 2>/dev/null || true
    psql -d "$db_name" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $db_user;" 2>/dev/null || true
    psql -d "$db_name" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $db_user;" 2>/dev/null || true

    log_success "数据库权限配置完成"
    return 0
}

# 运行数据库迁移
run_database_migration() {
    log_info "运行数据库迁移..."

    # 数据库迁移在 server-go 中，如果使用 nodejs server，也需要运行 server-go 的迁移
    local migration_dir="server-go"
    if [ ! -d "$migration_dir" ]; then
        # 向后兼容：如果没有 server-go，尝试使用 server 目录
        if [ -d "server" ]; then
            migration_dir="server"
        else
            log_warn "未找到 Go 服务端目录（server-go 或 server），跳过数据库迁移"
            return 0
        fi
    fi

    # 检查 .env 文件是否存在（从配置的 SERVER_DIR 读取）
    if [ ! -f "$SERVER_DIR/.env" ]; then
        log_warn "$SERVER_DIR/.env 不存在，跳过数据库迁移"
        log_info "请先配置 $SERVER_DIR/.env 文件后手动运行: cd $migration_dir && make migrate-up"
        return 0
    fi

    # 检查 migrations 目录是否存在
    if [ ! -d "$migration_dir/migrations" ]; then
        log_warn "$migration_dir/migrations 目录不存在，跳过数据库迁移"
        return 0
    fi

    # 读取 .env 文件中的 DB_DISABLED 配置
    local db_disabled=$(grep "^DB_DISABLED=" "$SERVER_DIR/.env" | cut -d'=' -f2 | tr -d ' "' || echo "false")
    if [ "$db_disabled" = "true" ]; then
        log_info "数据库已禁用（DB_DISABLED=true），跳过数据库迁移"
        return 0
    fi

    # 检查 Go 是否安装
    if ! command_exists go; then
        log_error "Go 未安装，无法运行数据库迁移"
        return 1
    fi

    # 检查 PostgreSQL 是否可用
    if ! command_exists psql; then
        log_warn "PostgreSQL 未安装，跳过数据库迁移"
        return 0
    fi

    # 进入迁移目录
    cd "$migration_dir"

    # 加载环境变量（从 SERVER_DIR 复制到迁移目录，如果不同的话）
    if [ "$migration_dir" != "$SERVER_DIR" ]; then
        log_info "从 $SERVER_DIR/.env 加载数据库配置..."
        export $(grep -v '^#' "../$SERVER_DIR/.env" | grep -v '^$' | xargs)
    else
        log_info "加载数据库配置..."
        export $(grep -v '^#' .env | grep -v '^$' | xargs)
    fi

    # 检查必需的环境变量
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
        log_error "数据库配置不完整，请检查 $SERVER_DIR/.env 文件"
        cd ..
        return 1
    fi

    # 检查数据库连接
    log_info "检查数据库连接..."
    if ! psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" >/dev/null 2>&1; then
        log_warn "无法连接到数据库，跳过迁移"
        log_info "请确保 PostgreSQL 服务正在运行，并且配置正确"
        cd ..
        return 0
    fi

    # 运行迁移
    log_info "正在运行数据库迁移..."
    if make migrate-up; then
        log_success "数据库迁移完成"
    else
        log_error "数据库迁移失败"
        log_info "你可以稍后手动运行: cd $migration_dir && make migrate-up"
        cd ..
        return 1
    fi

    cd ..
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

    # 检查 migrate
    if command_exists migrate; then
        log_success "✓ migrate: $(migrate -version 2>/dev/null || echo 'installed')"
    else
        log_warn "⚠ migrate 未安装（数据库迁移工具，推荐安装）"
    fi

    # 检查 openspec
    if command_exists openspec; then
        local openspec_version=$(openspec --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
        log_success "✓ openspec: v$openspec_version"
    else
        log_warn "⚠ openspec 未安装（推荐安装以管理项目规范）"
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
    show_config_info

    log_info "开始安装项目依赖..."
    echo ""
    
    # 安装必需工具
    install_git
    install_make
    install_nodejs
    install_go
    install_tmux
    install_postgresql
    install_migrate
    install_openspec

    # 安装项目依赖
    install_npm_dependencies
    install_playwright_browsers
    install_go_dependencies

    # 配置 server 环境
    setup_server_env

    # 配置数据库用户权限
    configure_database_permissions

    # 运行数据库迁移
    run_database_migration

    # 配置 hosts 文件
    configure_hosts

    echo ""
    log_info "安装完成，开始验证..."
    echo ""
    
    verify_installation
    
    echo ""
    log_info "下一步操作："
    echo "  1. 配置数据库: 参考 $SERVER_DIR/DATABASE_SETUP.md（如适用）"
    echo "  2. 启动服务: ./console.sh start"
    echo ""
}

# 运行主函数
main "$@"

