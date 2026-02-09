#!/bin/bash
# Start unified-bot in background

cd "$(dirname "$0")"

# Check if already running
if [ -f bot.pid ]; then
    PID=$(cat bot.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "❌ Bot is already running (PID: $PID)"
        echo "   Use 'pnpm stop' or ./stop.sh to stop it first"
        exit 1
    else
        echo "🧹 Cleaning up stale PID file..."
        rm -f bot.pid
    fi
fi

# Create logs directory if not exists
mkdir -p logs

# Start bot in background
echo "🚀 Starting unified-bot in background..."
nohup node dist/unified-bot.js > logs/bot.log 2>&1 &
PID=$!

# Save PID
echo $PID > bot.pid

echo "✅ Bot started successfully!"
echo "   PID: $PID"
echo "   Log file: logs/bot.log"
echo ""
echo "📊 Commands:"
echo "   pnpm status   - Show bot status"
echo "   pnpm logs     - View live logs"
echo "   pnpm stop     - Stop the bot"
echo ""
echo "💡 View logs: tail -f logs/bot.log"
