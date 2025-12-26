#!/bin/bash

# 工作流引擎启动脚本
# 用于启动 Dify 和 n8n 服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        echo "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}错误: Docker 未运行${NC}"
        echo "请启动 Docker Desktop"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 已安装并运行${NC}"
}

# 启动 Dify
start_dify() {
    echo -e "\n${YELLOW}启动 Dify...${NC}"
    cd "$SCRIPT_DIR/dify"
    
    # 检查 .env 文件
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            echo "创建 .env 文件..."
            cp .env.example .env
            echo -e "${GREEN}✓ .env 文件已创建${NC}"
        else
            echo -e "${RED}错误: .env.example 文件不存在${NC}"
            return 1
        fi
    fi
    
    # 启动服务
    docker compose up -d
    echo -e "${GREEN}✓ Dify 服务已启动${NC}"
    echo "访问地址: http://localhost/install"
}

# 启动 n8n
start_n8n() {
    echo -e "\n${YELLOW}启动 n8n...${NC}"
    cd "$SCRIPT_DIR/n8n"
    
    docker compose up -d
    echo -e "${GREEN}✓ n8n 服务已启动${NC}"
    echo "访问地址: http://localhost:5678"
}

# 停止所有服务
stop_all() {
    echo -e "\n${YELLOW}停止所有服务...${NC}"
    
    cd "$SCRIPT_DIR/dify"
    docker compose down 2>/dev/null || true
    
    cd "$SCRIPT_DIR/n8n"
    docker compose down 2>/dev/null || true
    
    echo -e "${GREEN}✓ 所有服务已停止${NC}"
}

# 显示状态
show_status() {
    echo -e "\n${YELLOW}服务状态:${NC}"
    
    echo -e "\n${YELLOW}Dify:${NC}"
    cd "$SCRIPT_DIR/dify"
    docker compose ps 2>/dev/null || echo "  未运行"
    
    echo -e "\n${YELLOW}n8n:${NC}"
    cd "$SCRIPT_DIR/n8n"
    docker compose ps 2>/dev/null || echo "  未运行"
}

# 显示日志
show_logs() {
    case "$1" in
        dify)
            cd "$SCRIPT_DIR/dify"
            docker compose logs -f
            ;;
        n8n)
            cd "$SCRIPT_DIR/n8n"
            docker compose logs -f n8n
            ;;
        *)
            echo "用法: $0 logs [dify|n8n]"
            exit 1
            ;;
    esac
}

# 主函数
main() {
    case "${1:-start}" in
        start)
            check_docker
            start_dify
            start_n8n
            echo -e "\n${GREEN}所有服务已启动完成！${NC}"
            echo -e "\n访问地址:"
            echo "  - Dify: http://localhost/install"
            echo "  - n8n:  http://localhost:5678"
            ;;
        stop)
            stop_all
            ;;
        restart)
            stop_all
            sleep 2
            check_docker
            start_dify
            start_n8n
            echo -e "\n${GREEN}所有服务已重启完成！${NC}"
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        dify)
            check_docker
            start_dify
            ;;
        n8n)
            check_docker
            start_n8n
            ;;
        *)
            echo "工作流引擎管理脚本"
            echo ""
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  start     启动所有服务 (默认)"
            echo "  stop      停止所有服务"
            echo "  restart   重启所有服务"
            echo "  status    显示服务状态"
            echo "  logs      查看服务日志 (需要指定: dify 或 n8n)"
            echo "  dify      仅启动 Dify"
            echo "  n8n       仅启动 n8n"
            echo ""
            echo "示例:"
            echo "  $0 start          # 启动所有服务"
            echo "  $0 logs dify      # 查看 Dify 日志"
            echo "  $0 logs n8n       # 查看 n8n 日志"
            exit 1
            ;;
    esac
}

main "$@"

