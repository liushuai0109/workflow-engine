#!/bin/bash

# BPMN Explorer 服务控制台脚本
# 用法:
#   ./console.sh start [client|server|database]   - 启动服务并进入日志监控模式
#   ./console.sh stop [client|server|database]    - 停止服务
#   ./console.sh restart [client|server|database] - 重启服务并进入日志监控模式
#   ./console.sh status                            - 查看服务状态

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"

# PID 文件
PID_DIR="$PROJECT_ROOT/.pids"
CLIENT_PID_FILE="$PID_DIR/client.pid"
SERVER_PID_FILE="$PID_DIR/server.pid"

# 日志文件
CLIENT_LOG_FILE="$PID_DIR/client.log"
SERVER_LOG_FILE="$PID_DIR/server.log"

# TMUX 会话名称
TMUX_SESSION="bpmn-explorer"

# 创建 PID 目录
mkdir -p "$PID_DIR"

# 获取本机 IP 地址
get_local_ip() {
    local ip=""

    # 方法 1: 使用 hostname -I (Linux)
    if command -v hostname &> /dev/null; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    # 方法 2: 使用 ip 命令 (Linux)
    if [ -z "$ip" ] && command -v ip &> /dev/null; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
    fi

    # 方法 3: 使用 ifconfig (macOS/BSD)
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    fi

    # 如果都失败了，使用 localhost
    if [ -z "$ip" ]; then
        ip="localhost"
    fi

    echo "$ip"
}

# 获取本机 IP
LOCAL_IP=$(get_local_ip)

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  $1"
    echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
}

# 检查服务是否运行
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# 获取占用端口的进程 PID
get_port_pid() {
    local port=$1
    local pid=""

    # 方法 1: 使用 lsof (Linux/macOS)
    if command -v lsof &> /dev/null; then
        pid=$(lsof -ti:$port 2>/dev/null | head -n 1)
    fi

    # 方法 2: 使用 ss (Linux)
    if [ -z "$pid" ] && command -v ss &> /dev/null; then
        pid=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K\d+' | head -n 1)
    fi

    # 方法 3: 使用 netstat (Linux/macOS)
    if [ -z "$pid" ] && command -v netstat &> /dev/null; then
        pid=$(netstat -tlnp 2>/dev/null | grep ":$port " | grep -oP '\d+/\w+' | cut -d'/' -f1 | head -n 1)
        # macOS 的 netstat 格式不同
        if [ -z "$pid" ]; then
            pid=$(netstat -anv 2>/dev/null | grep ":$port " | grep LISTEN | awk '{print $9}' | head -n 1)
        fi
    fi

    # 方法 4: 使用 fuser (Linux)
    if [ -z "$pid" ] && command -v fuser &> /dev/null; then
        pid=$(fuser $port/tcp 2>/dev/null | awk '{print $1}' | head -n 1)
    fi

    echo "$pid"
}

# 检查端口是否被占用
is_port_in_use() {
    local port=$1
    local pid=$(get_port_pid "$port")
    if [ -n "$pid" ]; then
        return 0
    fi
    return 1
}

# 杀死占用端口的进程
kill_port_process() {
    local port=$1
    local service_name=$2

    if is_port_in_use "$port"; then
        local pid=$(get_port_pid "$port")
        if [ -n "$pid" ]; then
            log_warning "端口 $port 被进程占用 (PID: $pid)，正在终止..."
            
            # 尝试优雅停止
            kill "$pid" 2>/dev/null || true
            
            # 等待最多 3 秒
            for i in {1..3}; do
                if ! ps -p "$pid" > /dev/null 2>&1; then
                    log_success "已终止占用端口 $port 的进程 (PID: $pid)"
                    return 0
                fi
                sleep 1
            done
            
            # 强制停止
            log_warning "强制终止占用端口 $port 的进程 (PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
            sleep 1
            
            if ! ps -p "$pid" > /dev/null 2>&1; then
                log_success "已强制终止占用端口 $port 的进程 (PID: $pid)"
            else
                log_error "无法终止占用端口 $port 的进程 (PID: $pid)"
                return 1
            fi
        fi
    fi
    return 0
}

# 启动 Client
start_client() {
    if is_running "$CLIENT_PID_FILE"; then
        log_warning "Client 已经在运行中 (PID: $(cat $CLIENT_PID_FILE))"
        return
    fi

    log_info "正在启动 Client (Vue + Vite)..."

    # 检查并 kill 占用端口的进程
    kill_port_process 8000 "Client"

    if [ ! -d "$CLIENT_DIR" ]; then
        log_error "Client 目录不存在: $CLIENT_DIR"
        exit 1
    fi

    cd "$CLIENT_DIR"

    # 检查 node_modules
    if [ ! -d "node_modules" ]; then
        log_warning "Client 依赖未安装，正在安装..."
        npm install
    fi

    # 启动 client 并获取 PID
    nohup npm start > "$CLIENT_LOG_FILE" 2>&1 &
    echo $! > "$CLIENT_PID_FILE"

    log_success "Client 已启动 (PID: $(cat $CLIENT_PID_FILE))"
    log_info "Client 访问地址: http://$LOCAL_IP:8000"
    log_info "Client 日志: $CLIENT_LOG_FILE"
}

# 检查 PostgreSQL 是否运行
is_database_running() {
    # 检查端口 5432 是否被占用
    if is_port_in_use 5432; then
        return 0
    fi
    
    # 检查 systemd 服务状态 (Linux)
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet postgresql 2>/dev/null; then
            return 0
        fi
    fi
    
    # 检查 Homebrew 服务状态 (macOS)
    if command -v brew &> /dev/null; then
        if brew services list 2>/dev/null | grep -q "postgresql.*started"; then
            return 0
        fi
    fi
    
    return 1
}

# 启动数据库
start_database() {
    if is_database_running; then
        log_warning "PostgreSQL 已经在运行中"
        return
    fi

    log_info "正在启动 PostgreSQL 数据库..."

    # 检测操作系统并启动
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - 使用 Homebrew
        if command -v brew &> /dev/null; then
            # 尝试启动 postgresql@15，如果不存在则尝试 postgresql
            if brew services list 2>/dev/null | grep -q "postgresql@15"; then
                brew services start postgresql@15 2>/dev/null || log_error "无法启动 PostgreSQL (postgresql@15)"
            elif brew services list 2>/dev/null | grep -q "postgresql"; then
                brew services start postgresql 2>/dev/null || log_error "无法启动 PostgreSQL"
            else
                log_error "未找到 PostgreSQL 服务，请先安装: brew install postgresql@15"
                return 1
            fi
            sleep 2  # 等待服务启动
        else
            log_error "Homebrew 未安装，无法自动启动 PostgreSQL"
            log_info "请手动启动: brew services start postgresql@15"
            return 1
        fi
    else
        # Linux - 使用 systemd
        if command -v systemctl &> /dev/null; then
            if sudo systemctl start postgresql 2>/dev/null; then
                sleep 2  # 等待服务启动
            else
                log_error "无法启动 PostgreSQL，可能需要 sudo 权限"
                log_info "请手动启动: sudo systemctl start postgresql"
                return 1
            fi
        else
            log_error "systemctl 未找到，无法自动启动 PostgreSQL"
            log_info "请手动启动 PostgreSQL 服务"
            return 1
        fi
    fi

    # 验证是否启动成功
    if is_database_running; then
        log_success "PostgreSQL 已启动"
        log_info "数据库端口: 5432"
    else
        log_error "PostgreSQL 启动失败，请检查日志"
        return 1
    fi
}

# 停止数据库
stop_database() {
    if ! is_database_running; then
        log_info "PostgreSQL 未运行"
        return
    fi

    log_info "正在停止 PostgreSQL 数据库..."

    # 检测操作系统并停止
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - 使用 Homebrew
        if command -v brew &> /dev/null; then
            if brew services list 2>/dev/null | grep -q "postgresql@15.*started"; then
                brew services stop postgresql@15 2>/dev/null || log_warning "无法停止 PostgreSQL (postgresql@15)"
            elif brew services list 2>/dev/null | grep -q "postgresql.*started"; then
                brew services stop postgresql 2>/dev/null || log_warning "无法停止 PostgreSQL"
            fi
        fi
    else
        # Linux - 使用 systemd
        if command -v systemctl &> /dev/null; then
            if sudo systemctl stop postgresql 2>/dev/null; then
                log_success "PostgreSQL 已停止"
            else
                log_warning "无法停止 PostgreSQL，可能需要 sudo 权限"
            fi
        fi
    fi
}

# 启动 Server（支持热重载）
start_server() {
    local watch_mode="${1:-false}"

    if is_running "$SERVER_PID_FILE"; then
        log_warning "Server 已经在运行中 (PID: $(cat $SERVER_PID_FILE))"
        return
    fi

    log_info "正在启动 Server (Go)..."

    # 检查并 kill 占用端口的进程
    kill_port_process 3000 "Server"

    if [ ! -d "$SERVER_DIR" ]; then
        log_error "Server 目录不存在: $SERVER_DIR"
        exit 1
    fi

    cd "$SERVER_DIR"

    # 检查 Go 是否安装
    if ! command -v go &> /dev/null; then
        # 尝试使用已知的 Go 路径
        if [ -f "/data/mm64/simonsliu/go/bin/go" ]; then
            export PATH="/data/mm64/simonsliu/go/bin:$PATH"
            log_info "使用 Go: /data/mm64/simonsliu/go/bin/go"
        else
            log_error "Go 未安装，请先安装 Go"
            exit 1
        fi
    fi

    # 检查是否需要安装依赖
    if [ ! -f "go.sum" ] || [ ! -d "vendor" ]; then
        log_warning "Server 依赖未安装，正在安装..."
        go mod download
    fi

    # 如果启用了 watch 模式，启动文件监听
    if [ "$watch_mode" = "true" ]; then
        start_server_with_watch
    else
        # 启动 server 并获取 PID
        nohup make run > "$SERVER_LOG_FILE" 2>&1 &
        echo $! > "$SERVER_PID_FILE"

        log_success "Server 已启动 (PID: $(cat $SERVER_PID_FILE))"
        log_info "Server 访问地址: http://$LOCAL_IP:3000"
        log_info "Server 日志: $SERVER_LOG_FILE"
    fi
}

# 启动 Server 并监听文件变化（热重载）
start_server_with_watch() {
    local watcher_pid_file="$PID_DIR/server-watcher.pid"

    log_info "启用文件监听模式（热重载）..."

    # 检查文件监听工具
    local watch_cmd=""
    if command -v fswatch &> /dev/null; then
        watch_cmd="fswatch"
        log_info "使用 fswatch 进行文件监听"
    elif command -v inotifywait &> /dev/null; then
        watch_cmd="inotifywait"
        log_info "使用 inotifywait 进行文件监听"
    else
        log_warning "未找到文件监听工具 (fswatch 或 inotifywait)"
        log_info "将使用普通模式启动（无热重载）"
        log_info ""
        log_info "安装文件监听工具:"
        log_info "  macOS:   brew install fswatch"
        log_info "  Ubuntu:  sudo apt-get install inotify-tools"
        log_info "  CentOS:  sudo yum install inotify-tools"

        # 回退到普通模式
        nohup make run > "$SERVER_LOG_FILE" 2>&1 &
        echo $! > "$SERVER_PID_FILE"
        log_success "Server 已启动（普通模式，无热重载）(PID: $(cat $SERVER_PID_FILE))"
        return
    fi

    # 创建监听脚本
    local watch_script="$PID_DIR/server-watch.sh"
    cat > "$watch_script" << 'WATCH_EOF'
#!/bin/bash
set -e

SERVER_DIR="SERVER_DIR_PLACEHOLDER"
SERVER_PID_FILE="SERVER_PID_FILE_PLACEHOLDER"
SERVER_LOG_FILE="SERVER_LOG_FILE_PLACEHOLDER"
WATCH_CMD="WATCH_CMD_PLACEHOLDER"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1" >> "$SERVER_LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1" >> "$SERVER_LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1" >> "$SERVER_LOG_FILE"
}

# 重启 Server
restart_server() {
    log_info "检测到文件变化，正在重新编译..."

    # 停止当前服务
    if [ -f "$SERVER_PID_FILE" ]; then
        local pid=$(cat "$SERVER_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null || true
            sleep 1
            # 如果还在运行，强制杀死
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    fi

    # 重新编译和启动
    cd "$SERVER_DIR"
    log_info "正在编译..."

    if go build -o ./server-new ./cmd/server/main.go >> "$SERVER_LOG_FILE" 2>&1; then
        log_success "编译成功"

        # 启动新服务
        nohup ./server-new >> "$SERVER_LOG_FILE" 2>&1 &
        echo $! > "$SERVER_PID_FILE"

        log_success "Server 已重启 (PID: $(cat $SERVER_PID_FILE))"
    else
        log_warning "编译失败，保持原服务运行"
    fi
}

# 初始启动
log_info "===== Server 启动 (热重载模式) ====="
cd "$SERVER_DIR"

log_info "正在编译..."
if go build -o ./server-new ./cmd/server/main.go >> "$SERVER_LOG_FILE" 2>&1; then
    log_success "编译成功"

    # 启动服务
    nohup ./server-new >> "$SERVER_LOG_FILE" 2>&1 &
    echo $! > "$SERVER_PID_FILE"

    log_success "Server 已启动 (PID: $(cat $SERVER_PID_FILE))"
    log_info "文件监听已启用，修改 .go 文件将自动重新编译和重启"
else
    log_warning "初始编译失败"
    exit 1
fi

# 开始监听文件变化
log_info "开始监听文件变化..."

if [ "$WATCH_CMD" = "fswatch" ]; then
    # macOS fswatch
    fswatch -r \
        -e ".*" \
        -i "\\.go$" \
        --exclude="vendor/" \
        --exclude="node_modules/" \
        --exclude="\\.git/" \
        --exclude="server-new$" \
        --latency=1 \
        "$SERVER_DIR" | while read -r file; do
            log_info "文件变化: $file"
            restart_server
        done
else
    # Linux inotifywait
    inotifywait -m -r -e modify,create,delete \
        --exclude '(vendor|node_modules|\.git|server-new)' \
        --format '%w%f' \
        "$SERVER_DIR" | grep '\.go$' | while read -r file; do
            log_info "文件变化: $file"
            restart_server
        done
fi
WATCH_EOF

    # 替换占位符
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|SERVER_DIR_PLACEHOLDER|$SERVER_DIR|g" "$watch_script"
        sed -i '' "s|SERVER_PID_FILE_PLACEHOLDER|$SERVER_PID_FILE|g" "$watch_script"
        sed -i '' "s|SERVER_LOG_FILE_PLACEHOLDER|$SERVER_LOG_FILE|g" "$watch_script"
        sed -i '' "s|WATCH_CMD_PLACEHOLDER|$watch_cmd|g" "$watch_script"
    else
        sed -i "s|SERVER_DIR_PLACEHOLDER|$SERVER_DIR|g" "$watch_script"
        sed -i "s|SERVER_PID_FILE_PLACEHOLDER|$SERVER_PID_FILE|g" "$watch_script"
        sed -i "s|SERVER_LOG_FILE_PLACEHOLDER|$SERVER_LOG_FILE|g" "$watch_script"
        sed -i "s|WATCH_CMD_PLACEHOLDER|$watch_cmd|g" "$watch_script"
    fi

    chmod +x "$watch_script"

    # 启动监听脚本
    nohup "$watch_script" > /dev/null 2>&1 &
    echo $! > "$watcher_pid_file"

    # 等待服务启动
    sleep 3

    log_success "Server 已启动（热重载模式）"
    log_info "Server 访问地址: http://$LOCAL_IP:3000"
    log_info "Server 日志: $SERVER_LOG_FILE"
    log_info "文件监听器 PID: $(cat $watcher_pid_file)"
    log_info ""
    log_info "${YELLOW}提示:${NC} 修改 .go 文件后将自动重新编译和重启 Server"
}

# 停止服务
stop_service() {
    local service_name=$1
    local pid_file=$2

    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        log_info "正在停止 $service_name (PID: $pid)..."

        # 尝试优雅停止
        kill "$pid" 2>/dev/null || true

        # 等待最多 5 秒
        for i in {1..5}; do
            if ! ps -p "$pid" > /dev/null 2>&1; then
                rm -f "$pid_file"
                log_success "$service_name 已停止"
                return
            fi
            sleep 1
        done

        # 强制停止
        log_warning "强制停止 $service_name..."
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$pid_file"
        log_success "$service_name 已强制停止"
    else
        log_info "$service_name 未运行"
    fi
}

# 停止 Client
stop_client() {
    stop_service "Client" "$CLIENT_PID_FILE"
}

# 停止 Server
stop_server() {
    stop_service "Server" "$SERVER_PID_FILE"

    # 同时停止文件监听器
    local watcher_pid_file="$PID_DIR/server-watcher.pid"
    if [ -f "$watcher_pid_file" ]; then
        local watcher_pid=$(cat "$watcher_pid_file")
        if ps -p "$watcher_pid" > /dev/null 2>&1; then
            log_info "正在停止文件监听器 (PID: $watcher_pid)..."
            kill "$watcher_pid" 2>/dev/null || true
            sleep 1
            if ps -p "$watcher_pid" > /dev/null 2>&1; then
                kill -9 "$watcher_pid" 2>/dev/null || true
            fi
            log_success "文件监听器已停止"
        fi
        rm -f "$watcher_pid_file"
    fi
}

# 停止所有服务
stop_all() {
    log_header "正在停止所有服务"
    stop_client
    stop_server
    # 注意：默认不停止数据库，因为可能被其他应用使用
    # 如需停止数据库，请使用: ./console.sh stop database
}

# 启动所有服务
start_all() {
    log_header "正在启动所有服务"
    # 先启动数据库（如果未运行）
    if ! is_database_running; then
        log_info "检测到数据库未运行，正在启动..."
        start_database
        sleep 2  # 等待数据库启动
    else
        log_info "数据库已在运行"
    fi
    # 启动 server，默认启用热重载
    start_server "true"
    sleep 2  # 等待 server 启动
    start_client
    sleep 1  # 等待 client 启动
    # 进入 watch 模式
    watch_logs "all"
}

# 重启服务
restart_service() {
    local target=$1

    case "$target" in
        client)
            log_header "正在重启 Client"
            stop_client
            sleep 1
            start_client
            sleep 1
            # 进入 watch 模式
            watch_logs "client"
            ;;
        server)
            log_header "正在重启 Server"
            stop_server
            sleep 1
            start_server "true"
            sleep 1
            # 进入 watch 模式
            watch_logs "server"
            ;;
        database)
            log_header "正在重启 Database"
            stop_database
            sleep 2
            start_database
            log_success "数据库已重启"
            ;;
        *)
            log_header "正在重启所有服务"
            stop_all
            sleep 2
            start_all
            ;;
    esac
}

# 显示服务状态
show_status() {
    echo ""
    log_header "服务状态"
    echo ""

    # 数据库状态
    if is_database_running; then
        local db_pid=$(get_port_pid 5432)
        if [ -n "$db_pid" ]; then
            echo -e "${GREEN}  ✓${NC} Database 运行中 (PID: $db_pid)"
        else
            echo -e "${GREEN}  ✓${NC} Database 运行中"
        fi
        echo -e "    ${CYAN}→${NC} 端口: 5432"
    else
        echo -e "${RED}  ✗${NC} Database 未运行"
    fi

    echo ""

    if is_running "$CLIENT_PID_FILE"; then
        echo -e "${GREEN}  ✓${NC} Client 运行中 (PID: $(cat $CLIENT_PID_FILE))"
        echo -e "    ${CYAN}→${NC} http://$LOCAL_IP:8000"
        echo -e "    ${CYAN}→${NC} 日志: $CLIENT_LOG_FILE"
    else
        echo -e "${RED}  ✗${NC} Client 未运行"
    fi

    echo ""

    if is_running "$SERVER_PID_FILE"; then
        echo -e "${GREEN}  ✓${NC} Server 运行中 (PID: $(cat $SERVER_PID_FILE))"
        echo -e "    ${CYAN}→${NC} http://$LOCAL_IP:3000"
        echo -e "    ${CYAN}→${NC} 日志: $SERVER_LOG_FILE"
    else
        echo -e "${RED}  ✗${NC} Server 未运行"
    fi

    echo ""
}

# 检查 tmux 是否安装
check_tmux() {
    if ! command -v tmux &> /dev/null; then
        log_error "tmux 未安装，请先安装 tmux"
        log_info "安装方法:"
        log_info "  Ubuntu/Debian: sudo apt-get install tmux"
        log_info "  CentOS/RHEL:   sudo yum install tmux"
        log_info "  macOS:          brew install tmux"
        exit 1
    fi
}

# Watch 模式：分屏显示前后端日志
# 参数: target (client|server|all)，默认为 all
watch_logs() {
    local target="${1:-all}"
    
    check_tmux

    # 确保日志文件存在
    touch "$CLIENT_LOG_FILE"
    touch "$SERVER_LOG_FILE"

    log_header "启动日志监控模式 (tmux 分屏)"

    # 检查是否已有 tmux 会话，如果有则先关闭
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        log_info "关闭现有 tmux 会话..."
        tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
        sleep 1
    fi

    # 创建临时脚本用于显示标题和日志
    local client_script=$(mktemp)
    local server_script=$(mktemp)
    
    cat > "$client_script" << 'CLIENT_EOF'
#!/bin/bash
# 将 stdin 重定向到 /dev/null，防止键盘输入被处理
exec < /dev/null
# 禁用终端回显，防止键盘输入显示为乱码
stty -echo -icanon 2>/dev/null || true

echo "╔════════════════════════════════════════════╗"
echo "║  Client 日志监控 (Vue + Vite, 端口 8000)"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "访问地址: http://LOCAL_IP_PLACEHOLDER:8000"
echo "日志文件: CLIENT_LOG_PLACEHOLDER"
echo "PID: CLIENT_PID_PLACEHOLDER"
echo ""
echo "按 Ctrl+B 然后按 D 退出 tmux（不要按 Ctrl+C）"
echo ""
# tail -f 会自动从重定向的 stdin 读取（但不会读取到任何内容）
tail -f CLIENT_LOG_PLACEHOLDER
CLIENT_EOF

    cat > "$server_script" << 'SERVER_EOF'
#!/bin/bash
# 将 stdin 重定向到 /dev/null，防止键盘输入被处理
exec < /dev/null
# 禁用终端回显，防止键盘输入显示为乱码
stty -echo -icanon 2>/dev/null || true

echo "╔════════════════════════════════════════════╗"
echo "║  Server 日志监控 (Go, 端口 3000)"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "访问地址: http://LOCAL_IP_PLACEHOLDER:3000"
echo "日志文件: SERVER_LOG_PLACEHOLDER"
echo "PID: SERVER_PID_PLACEHOLDER"
echo ""
echo "按 Ctrl+B 然后按 D 退出 tmux（不要按 Ctrl+C）"
echo ""
# tail -f 会自动从重定向的 stdin 读取（但不会读取到任何内容）
tail -f SERVER_LOG_PLACEHOLDER
SERVER_EOF

    # 替换占位符
    # macOS 的 sed 需要 -i '' 参数，Linux 的 sed 需要 -i 参数
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|LOCAL_IP_PLACEHOLDER|$LOCAL_IP|g" "$client_script" "$server_script"
        sed -i '' "s|CLIENT_LOG_PLACEHOLDER|$CLIENT_LOG_FILE|g" "$client_script"
        sed -i '' "s|SERVER_LOG_PLACEHOLDER|$SERVER_LOG_FILE|g" "$server_script"
        local client_pid=$(cat "$CLIENT_PID_FILE" 2>/dev/null || echo "N/A")
        local server_pid=$(cat "$SERVER_PID_FILE" 2>/dev/null || echo "N/A")
        sed -i '' "s|CLIENT_PID_PLACEHOLDER|$client_pid|g" "$client_script"
        sed -i '' "s|SERVER_PID_PLACEHOLDER|$server_pid|g" "$server_script"
    else
        # Linux
        sed -i "s|LOCAL_IP_PLACEHOLDER|$LOCAL_IP|g" "$client_script" "$server_script"
        sed -i "s|CLIENT_LOG_PLACEHOLDER|$CLIENT_LOG_FILE|g" "$client_script"
        sed -i "s|SERVER_LOG_PLACEHOLDER|$SERVER_LOG_FILE|g" "$server_script"
        local client_pid=$(cat "$CLIENT_PID_FILE" 2>/dev/null || echo "N/A")
        local server_pid=$(cat "$SERVER_PID_FILE" 2>/dev/null || echo "N/A")
        sed -i "s|CLIENT_PID_PLACEHOLDER|$client_pid|g" "$client_script"
        sed -i "s|SERVER_PID_PLACEHOLDER|$server_pid|g" "$server_script"
    fi
    
    chmod +x "$client_script" "$server_script"

    # 根据 target 创建不同的会话布局
    case "$target" in
        client)
            # 只显示 Client 日志
            tmux new-session -d -s "$TMUX_SESSION" "$client_script"
            ;;
        server)
            # 只显示 Server 日志
            tmux new-session -d -s "$TMUX_SESSION" "$server_script"
            ;;
        all|*)
            # 创建会话，左侧显示 Client 日志
            tmux new-session -d -s "$TMUX_SESSION" "$client_script"
            # 垂直分屏，右侧显示 Server 日志
            tmux split-window -h -t "$TMUX_SESSION:0" "$server_script"
            # 设置两个窗格等宽
            tmux select-layout -t "$TMUX_SESSION" even-horizontal
            ;;
    esac

    # 清理临时脚本（延迟删除，确保脚本已执行）
    (sleep 5 && rm -f "$client_script" "$server_script") &

    log_success "tmux 会话已创建"
    log_info ""
    log_info "tmux 快捷键:"
    log_info "  Ctrl+B 然后按 D  - 退出会话（不关闭服务）"
    log_info "  Ctrl+B 然后按 [  - 进入滚动模式"
    log_info "  Ctrl+B 然后按 ]  - 退出滚动模式"
    log_info "  Ctrl+B 然后按 %  - 垂直分屏"
    log_info "  Ctrl+B 然后按 \"  - 水平分屏"
    log_info ""

    # 连接到会话
    tmux attach-session -t "$TMUX_SESSION"
}

# 显示帮助信息
show_help() {
    cat << EOF
${CYAN}╔════════════════════════════════════════════╗${NC}
${CYAN}║${NC}  BPMN Explorer 服务控制台
${CYAN}╚════════════════════════════════════════════╝${NC}

${GREEN}用法:${NC}
    $0 ${YELLOW}<command>${NC} [${BLUE}target${NC}]

${GREEN}命令 (command):${NC}
    ${YELLOW}start${NC}    - 启动服务并进入日志监控模式（需要 tmux）
    ${YELLOW}stop${NC}     - 停止服务
    ${YELLOW}restart${NC}  - 重启服务并进入日志监控模式（需要 tmux）
    ${YELLOW}status${NC}   - 显示服务状态
    ${YELLOW}help${NC}     - 显示此帮助信息

${GREEN}目标 (target):${NC}
    ${BLUE}client${NC}   - 仅操作前端服务 (Vue + Vite, 端口 8000)
    ${BLUE}server${NC}   - 仅操作后端服务 (Go, 端口 3000)
    ${BLUE}database${NC} - 仅操作数据库服务 (PostgreSQL, 端口 5432)
    ${BLUE}(空)${NC}     - 操作所有服务 (默认，启动时会自动启动数据库)

${GREEN}示例:${NC}
    $0 start              # 启动所有服务（包括数据库）并进入日志监控模式
    $0 start client       # 只启动前端并进入日志监控模式
    $0 start server       # 只启动后端并进入日志监控模式
    $0 start database     # 只启动数据库

    $0 stop               # 停止所有服务（不包括数据库）
    $0 stop client        # 只停止前端
    $0 stop server        # 只停止后端
    $0 stop database      # 只停止数据库

    $0 restart            # 重启所有服务并进入日志监控模式
    $0 restart client     # 只重启前端并进入日志监控模式
    $0 restart server     # 只重启后端并进入日志监控模式
    $0 restart database   # 只重启数据库

    $0 status             # 查看服务状态（包括数据库）

${GREEN}日志文件:${NC}
    Client: $PROJECT_ROOT/.pids/client.log
    Server: $PROJECT_ROOT/.pids/server.log

${GREEN}访问地址:${NC}
    Client: http://$LOCAL_IP:8000
    Server: http://$LOCAL_IP:3000

${GREEN}日志监控模式说明:${NC}
    start 和 restart 命令会自动创建一个 tmux 会话显示服务日志
    - 启动所有服务时：左右分屏显示前后端日志
    - 启动单个服务时：只显示该服务的日志
    退出监控模式不会停止服务，只是退出监控界面（按 Ctrl+B 然后按 D）

${GREEN}Server 热重载说明:${NC}
    Server 启动时会自动启用文件监听（热重载）功能
    - 修改 .go 文件后会自动重新编译和重启 Server
    - 无需手动停止和重启服务，提高开发效率
    - 需要安装 fswatch (macOS) 或 inotify-tools (Linux)
    - 如果未安装监听工具，Server 会以普通模式启动（无热重载）

EOF
}

# 主逻辑
main() {
    local command="${1:-help}"
    local target="${2:-all}"

    case "$command" in
        start)
            case "$target" in
                client)
                    log_header "启动 Client"
                    start_client
                    sleep 1
                    # 进入 watch 模式
                    watch_logs "client"
                    ;;
                server)
                    log_header "启动 Server"
                    # 检查数据库是否运行，如果没有则启动
                    if ! is_database_running; then
                        log_info "检测到数据库未运行，正在启动..."
                        start_database
                        sleep 2
                    fi
                    # 默认启用热重载
                    start_server "true"
                    sleep 1
                    # 进入 watch 模式
                    watch_logs "server"
                    ;;
                database)
                    log_header "启动 Database"
                    start_database
                    ;;
                all|*)
                    start_all
                    ;;
            esac
            ;;

        stop)
            case "$target" in
                client)
                    log_header "停止 Client"
                    stop_client
                    ;;
                server)
                    log_header "停止 Server"
                    stop_server
                    ;;
                database)
                    log_header "停止 Database"
                    stop_database
                    ;;
                all|*)
                    stop_all
                    ;;
            esac
            echo ""
            show_status
            ;;

        restart)
            restart_service "$target"
            ;;

        status)
            show_status
            ;;

        help|--help|-h)
            show_help
            ;;

        *)
            log_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 清理函数（Ctrl+C 时调用）
cleanup() {
    echo ""
    log_info "收到中断信号，正在停止服务..."
    stop_all
    exit 0
}

# 注册信号处理
trap cleanup SIGINT SIGTERM

# 执行主函数
main "$@"
