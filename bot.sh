#!/bin/bash

# Omnichat Bot Manager Script
# 用于管理 bot 的启动、停止、重启、状态查看和日志

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BOT_NAME="omnichat-bot"
PID_FILE=".bot.pid"
LOG_FILE=".bot.log"
EXAMPLES_DIR="packages/examples"

# 设置 PATH 以找到 pnpm
export PATH="/usr/local/bin:$PATH"
PNPM="/usr/local/bin/pnpm"

# 获取 bot 进程 PID
get_bot_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    fi
}

# 检查 bot 是否运行
is_bot_running() {
    local pid=$(get_bot_pid)
    if [ -z "$pid" ]; then
        return 1
    fi

    if ps -p "$pid" > /dev/null 2>&1; then
        return 0
    else
        # PID 文件存在但进程不存在，清理 PID 文件
        rm -f "$PID_FILE"
        return 1
    fi
}

# 等待 bot 停止
wait_for_stop() {
    local pid=$1
    local timeout=30
    local elapsed=0

    echo -n "${YELLOW}等待 bot 停止${NC}"
    while kill -0 "$pid" 2>/dev/null; do
        if [ $elapsed -ge $timeout ]; then
            echo -e "\n${RED}超时，强制终止${NC}"
            kill -9 "$pid" 2>/dev/null || true
            break
        fi
        echo -n "."
        sleep 1
        elapsed=$((elapsed + 1))
    done
    echo ""
}

# 启动 bot (开发模式)
start_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 启动 Omnichat Bot (开发模式)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if is_bot_running; then
        local pid=$(get_bot_pid)
        echo -e "${YELLOW}⚠️  Bot 已经在运行中 (PID: $pid)${NC}"
        echo ""
        echo -e "${YELLOW}使用 '$0 status' 查看状态${NC}"
        echo -e "${YELLOW}使用 '$0 restart' 重启 bot${NC}"
        exit 1
    fi

    # 清理旧的日志文件
    if [ -f "$LOG_FILE" ]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
    fi

    # 启动 bot (开发模式使用 tsx)
    echo -e "${GREEN}启动中...${NC}"
    nohup "$PNPM" --filter @omnichat/example dev > "$LOG_FILE" 2>&1 &
    local pid=$!

    # 保存 PID
    echo $pid > "$PID_FILE"

    # 等待几秒确认启动成功
    sleep 3

    if is_bot_running; then
        echo -e "${GREEN}✅ Bot 启动成功！${NC}"
        echo ""
        echo -e "${GREEN}PID: $pid${NC}"
        echo -e "${GREEN}日志: $LOG_FILE${NC}"
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}使用 '$0 logs' 查看日志${NC}"
        echo -e "${YELLOW}使用 '$0 status' 查看状态${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        echo -e "${RED}❌ Bot 启动失败！${NC}"
        echo ""
        echo -e "${YELLOW}查看日志: cat $LOG_FILE${NC}"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# 启动 bot (生产模式)
start_bot_prod() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 启动 Omnichat Bot (生产模式)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if is_bot_running; then
        local pid=$(get_bot_pid)
        echo -e "${YELLOW}⚠️  Bot 已经在运行中 (PID: $pid)${NC}"
        exit 1
    fi

    # 检查是否已构建
    if [ ! -f "$EXAMPLES_DIR/dist/bots/group-assistant/index.js" ]; then
        echo -e "${YELLOW}⚠️  未找到编译产物，正在构建...${NC}"
        "$PNPM" --filter @omnichat/example build
    fi

    # 清理旧的日志文件
    if [ -f "$LOG_FILE" ]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
    fi

    # 启动 bot (生产模式)
    echo -e "${GREEN}启动中...${NC}"
    nohup node "$EXAMPLES_DIR/dist/bots/group-assistant/index.js" > "$LOG_FILE" 2>&1 &
    local pid=$!

    # 保存 PID
    echo $pid > "$PID_FILE"

    # 等待几秒确认启动成功
    sleep 2

    if is_bot_running; then
        echo -e "${GREEN}✅ Bot 启动成功！${NC}"
        echo ""
        echo -e "${GREEN}PID: $pid${NC}"
        echo -e "${GREEN}日志: $LOG_FILE${NC}"
    else
        echo -e "${RED}❌ Bot 启动失败！${NC}"
        echo -e "${YELLOW}查看日志: cat $LOG_FILE${NC}"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# 停止 bot
stop_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🛑 停止 Omnichat Bot${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 先尝试按 PID 文件停止
    if is_bot_running; then
        local pid=$(get_bot_pid)
        echo -e "${YELLOW}停止 bot (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        wait_for_stop "$pid"
    fi

    # 清理所有可能残留的相关进程
    echo -e "${YELLOW}清理残留进程...${NC}"
    pkill -9 -f "tsx.*group-assistant" 2>/dev/null || true
    pkill -9 -f "node.*examples.*index" 2>/dev/null || true

    # 等待进程完全退出
    sleep 1

    # 清理 PID 文件
    rm -f "$PID_FILE"

    echo -e "${GREEN}✅ Bot 已停止${NC}"
}

# 重启 bot
restart_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔄 重启 Omnichat Bot${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 强制停止所有相关进程
    echo -e "${YELLOW}停止所有 bot 进程...${NC}"

    # 先尝试优雅停止
    if is_bot_running; then
        local pid=$(get_bot_pid)
        kill "$pid" 2>/dev/null || true
        sleep 2
    fi

    # 强制清理所有残留进程
    pkill -9 -f "tsx.*group-assistant" 2>/dev/null || true
    pkill -9 -f "node.*examples.*index" 2>/dev/null || true

    # 清理 PID 文件
    rm -f "$PID_FILE"

    echo -e "${GREEN}✅ 旧进程已清理${NC}"
    echo ""

    # 等待端口释放
    sleep 2

    start_bot
}

# 查看状态
status_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Bot 状态${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if is_bot_running; then
        local pid=$(get_bot_pid)
        echo -e "${GREEN}● Bot 运行中${NC}"
        echo ""
        echo -e "${GREEN}PID: $pid${NC}"

        # 显示进程信息
        echo -e "${GREEN}命令: $(ps -p $pid -o command=)${NC}"

        # 显示内存使用
        local memory=$(ps -p $pid -o rss= | awk '{printf "%.1f MB", $1/1024}')
        echo -e "${GREEN}内存: $memory${NC}"

        # 显示 CPU 使用
        local cpu=$(ps -p $pid -o %cpu= | tr -d ' ')
        echo -e "${GREEN}CPU: ${cpu}%${NC}"

        # 显示运行时间
        local elapsed=$(ps -p $pid -o etime= | tr -d ' ')
        echo -e "${GREEN}运行时间: $elapsed${NC}"

        # 检查日志文件
        if [ -f "$LOG_FILE" ]; then
            echo -e "${GREEN}日志: $LOG_FILE${NC}"
            local log_size=$(du -h "$LOG_FILE" | cut -f1)
            echo -e "${GREEN}日志大小: $log_size${NC}"
        fi

        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"

        # 显示最近的日志
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo -e "${YELLOW}最近的日志:${NC}"
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
            tail -n 10 "$LOG_FILE"
        fi
    else
        echo -e "${RED}○ Bot 未运行${NC}"
        echo ""
        echo -e "${YELLOW}使用 '$0 start' 启动 bot${NC}"
    fi

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 查看日志
logs_bot() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${RED}❌ 日志文件不存在: $LOG_FILE${NC}"
        echo -e "${YELLOW}请先启动 bot: $0 start${NC}"
        exit 1
    fi

    local lines=50
    local follow=false
    local filter=""

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow=true
                shift
                ;;
            -n|--lines)
                lines="$2"
                shift 2
                ;;
            -g|--grep)
                filter="$2"
                shift 2
                ;;
            -h|--help)
                echo -e "${BLUE}日志查看选项:${NC}"
                echo ""
                echo "用法: $0 logs [选项]"
                echo ""
                echo "选项:"
                echo "  -f, --follow       实时查看日志"
                echo "  -n, --lines <N>    显示最近 N 行 (默认: 50)"
                echo "  -g, --grep <模式>  过滤包含模式的日志"
                echo "  -h, --help         显示此帮助"
                echo ""
                echo "示例:"
                echo "  $0 logs           # 查看最近 50 行"
                echo "  $0 logs -f        # 实时查看"
                echo "  $0 logs -n 100    # 查看最近 100 行"
                echo "  $0 logs -g ERROR  # 过滤 ERROR 日志"
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 Bot 日志${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ -n "$filter" ]; then
        echo -e "${YELLOW}🔍 过滤: $filter${NC}"
        echo ""
    fi

    if [ "$follow" = true ]; then
        echo -e "${YELLOW}实时日志 (Ctrl+C 退出)${NC}"
        echo ""
        if [ -n "$filter" ]; then
            tail -f "$LOG_FILE" 2>/dev/null | grep --line-buffered -E "$filter"
        else
            tail -f "$LOG_FILE"
        fi
    else
        if [ -n "$filter" ]; then
            tail -n "$lines" "$LOG_FILE" | grep -E "$filter"
        else
            tail -n "$lines" "$LOG_FILE"
        fi
    fi
}

# 构建项目
build_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔨 构建 Omnichat Bot${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${YELLOW}构建所有包...${NC}"
    "$PNPM" build

    echo ""
    echo -e "${GREEN}✅ 构建完成！${NC}"
    echo -e "${YELLOW}使用 '$0 start:prod' 启动生产模式${NC}"
}

# 检查进程
check_procs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔍 检查相关进程${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 检查是否有其他 node 进程在运行
    local node_procs=$(ps aux | grep -E "tsx|node.*omnichat|node.*examples" | grep -v grep || true)

    if [ -n "$node_procs" ]; then
        echo -e "${YELLOW}⚠️  发现相关进程:${NC}"
        echo ""
        echo "$node_procs"
        echo ""
        echo -e "${YELLOW}提示:${NC}"
        echo "  停止所有: pkill -f 'tsx|node.*examples'"
        echo "  停止某个: kill <PID>"
    else
        echo -e "${GREEN}✅ 没有发现相关进程${NC}"
    fi

    echo ""
}

# 显示帮助
show_help() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Omnichat Bot 管理脚本${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "用法: $0 <command> [options]"
    echo ""
    echo "命令:"
    echo "  start        启动 bot (开发模式)"
    echo "  start:prod   启动 bot (生产模式)"
    echo "  stop         停止 bot"
    echo "  restart      重启 bot"
    echo "  status       查看状态"
    echo "  logs [opts]  查看日志"
    echo "  build        构建项目"
    echo "  check        检查相关进程"
    echo "  help         显示此帮助"
    echo ""
    echo "日志选项:"
    echo "  -f, --follow       实时查看"
    echo "  -n, --lines <N>    显示行数 (默认 50)"
    echo "  -g, --grep <模式>  过滤日志"
    echo ""
    echo "示例:"
    echo "  $0 start           # 开发模式启动"
    echo "  $0 start:prod      # 生产模式启动"
    echo "  $0 logs -f         # 实时日志"
    echo "  $0 logs -g ERROR   # 过滤错误日志"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 主函数
main() {
    case "$1" in
        start)
            start_bot
            ;;
        start:prod)
            start_bot_prod
            ;;
        stop)
            stop_bot
            ;;
        restart)
            restart_bot
            ;;
        status)
            status_bot
            ;;
        logs)
            shift
            logs_bot "$@"
            ;;
        build)
            build_bot
            ;;
        check)
            check_procs
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
