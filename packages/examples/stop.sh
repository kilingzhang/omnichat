#!/bin/bash
# Stop simple-bot

cd "$(dirname "$0")"

if [ ! -f bot.pid ]; then
    echo "❌ Bot is not running (no PID file found)"
    exit 1
fi

PID=$(cat bot.pid)

if ! ps -p $PID > /dev/null 2>&1; then
    echo "❌ Bot is not running (stale PID file)"
    rm -f bot.pid
    exit 1
fi

echo "🛑 Stopping bot (PID: $PID)..."
kill $PID

# Wait for process to terminate
for i in {1..10}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        echo "✅ Bot stopped successfully"
        rm -f bot.pid
        exit 0
    fi
    sleep 0.5
done

# Force kill if still running
echo "⚠️  Bot did not stop gracefully, forcing..."
kill -9 $PID
rm -f bot.pid
echo "✅ Bot force stopped"
