#!/bin/bash
# Show unified-bot status

cd "$(dirname "$0")"

if [ ! -f bot.pid ]; then
    echo "📊 Bot Status: STOPPED"
    echo "   No PID file found"
    exit 0
fi

PID=$(cat bot.pid)

if ! ps -p $PID > /dev/null 2>&1; then
    echo "📊 Bot Status: STOPPED (stale PID file)"
    rm -f bot.pid
    exit 0
fi

# Get process info
UPTIME=$(ps -p $PID -o etime= | tr -d ' ')
MEM=$(ps -p $PID -o rss= | awk '{print $1/1024 "MB"}')
CPU=$(ps -p $PID -o %cpu= | tr -d ' ')

echo "📊 Bot Status: RUNNING"
echo "   PID: $PID"
echo "   Uptime: $UPTIME"
echo "   Memory: $MEM"
echo "   CPU: $CPU%"
echo ""
echo "📝 Recent logs (last 10 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f logs/bot.log ]; then
    tail -10 logs/bot.log
else
    echo "   No log file found"
fi
