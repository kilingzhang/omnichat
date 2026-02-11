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
BOT_SCRIPT="packages/examples/src/bots/group-assistant/index.ts"

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

# 启动 bot
start_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 启动 Omnichat Bot${NC}"
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

    # 启动 bot
    echo -e "${GREEN}启动中...${NC}"
    nohup pnpm dev > "$LOG_FILE" 2>&1 &
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

# 停止 bot
stop_bot() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🛑 停止 Omnichat Bot${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if ! is_bot_running; then
        echo -e "${YELLOW}⚠️  Bot 没有运行${NC}"
        rm -f "$PID_FILE"
        exit 0
    fi

    local pid=$(get_bot_pid)
    echo -e "${YELLOW}停止 bot (PID: $pid)...${NC}"

    # 发送 SIGTERM
    kill "$pid" 2>/dev/null || true

    # 等待进程停止
    wait_for_stop "$pid"

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

    if is_bot_running; then
        echo -e "${YELLOW}停止当前实例...${NC}"
        stop_bot
        echo ""
        sleep 2
    fi

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
        exit 1
    fi

    # 检查参数
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📋 实时日志 (Ctrl+C 退出)${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        tail -f "$LOG_FILE"
    else
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📋 Bot 日志${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        tail -n 50 "$LOG_FILE"
    fi
}

# 检查端口占用
check_ports() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔍 检查端口占用${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 检查是否有其他 node 进程在运行
    local node_procs=$(ps aux | grep -E "tsx.*index.ts|node.*index.js" | grep -v grep | grep -v "$BOT_NAME" || true)

    if [ -n "$node_procs" ]; then
        echo -e "${YELLOW}⚠️  发现其他 bot 进程:${NC}"
        echo ""
        echo "$node_procs"
        echo ""
        echo -e "${YELLOW}这些进程可能会与当前 bot 冲突！${NC}"
        echo ""
        echo -e "${YELLOW}建议操作:${NC}"
        echo -e "  查看所有进程: ps aux | grep 'tsx.*index'"
        echo -e "  停止所有进程: pkill -f 'tsx.*index'"
        echo -e "  或者手动 kill: kill <PID>"
    else
        echo -e "${GREEN}✅ 没有发现冲突的进程${NC}"
    fi

    echo ""
}

# 显示帮助
show_help() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Omnichat Bot 管理脚本${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "用法: $0 <command>"
    echo ""
    echo "命令:"
    echo "  start    - 启动 bot"
    echo "  stop     - 停止 bot"
    echo "  restart  - 重启 bot"
    echo "  status   - 查看状态"
    echo "  logs     - 查看日志 (最近 50 行)"
    echo "  logs -f  - 实时查看日志"
    echo "  check    - 检查端口占用"
    echo "  help     - 显示此帮助"
    echo ""
    echo "示例:"
    echo "  $0 start      # 启动 bot"
    echo "  $0 status     # 查看状态"
    echo "  $0 logs -f    # 实时日志"
    echo "  $0 restart    # 重启 bot"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 主函数
main() {
    case "$1" in
        start)
            start_bot
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
            logs_bot "$2"
            ;;
        check)
            check_ports
            ;;
        help|--help|-h)
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
