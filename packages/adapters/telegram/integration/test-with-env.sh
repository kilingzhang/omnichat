#!/bin/bash

# Load environment variables from .env file
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded from .env"
    echo "   BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:10}..."
    echo "   CHAT_ID: $TELEGRAM_CHAT_ID"
    echo "   USER_ID: ${TELEGRAM_USER_ID:-"Not set"}"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Run the tests from project root
cd ../../..
echo ""
echo "🧪 Running integration tests..."
pnpm --filter @omnichat/telegram test:integration:smart
