#!/bin/bash

# Smart Type Inference Integration Test Runner
# This script runs the integration tests for the smart target type inference feature

set -e

echo "🚀 Smart Type Inference Integration Test Runner"
echo "=============================================="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Found .env file"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found"
    echo ""
    echo "Please create a .env file with the following variables:"
    echo "  - TELEGRAM_BOT_TOKEN (required)"
    echo "  - TELEGRAM_CHAT_ID (required)"
    echo "  - TELEGRAM_CHANNEL_ID (optional)"
    echo "  - TELEGRAM_USER_ID (optional)"
    echo ""
    echo "You can copy .env.example to .env and fill in the values:"
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Check required variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN is not set"
    exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "❌ TELEGRAM_CHAT_ID is not set"
    exit 1
fi

echo "Configuration:"
echo "  Bot Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "  Chat ID: $TELEGRAM_CHAT_ID"
echo "  Channel ID: ${TELEGRAM_CHANNEL_ID:-"Not set (channel tests will be skipped)"}"
echo "  User ID: ${TELEGRAM_USER_ID:-"Not set (DM tests will be skipped)"}"
echo ""

# Run the tests
echo "🧪 Running smart type inference integration tests..."
echo ""

pnpm --filter @omnichat/telegram test:integration:smart

echo ""
echo "✅ Integration tests completed!"
