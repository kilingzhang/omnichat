#!/bin/bash
# View simple-bot logs in real-time

cd "$(dirname "$0")"

if [ ! -f logs/bot.log ]; then
    echo "❌ No log file found (logs/bot.log)"
    echo "   Make sure the bot is running first"
    exit 1
fi

echo "📝 Viewing logs (Ctrl+C to exit)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -f logs/bot.log
