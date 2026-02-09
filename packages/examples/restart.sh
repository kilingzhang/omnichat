#!/bin/bash
# Restart unified-bot

cd "$(dirname "$0")"

echo "🔄 Restarting bot..."
echo ""

# Stop the bot
if [ -f bot.pid ]; then
    echo "🛑 Stopping current bot..."
    ./stop.sh
    sleep 2
fi

# Start the bot
echo ""
echo "🚀 Starting bot..."
./start-bg.sh

echo ""
echo "✅ Bot restarted successfully!"
echo "   Use 'pnpm logs' to view logs"
