#!/bin/bash

# Smart Type Inference Integration Test Runner
# This script loads environment variables from .env and runs the tests

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Smart Type Inference Integration Test Runner"
echo "=============================================="
echo ""

# Check if .env file exists
ENV_FILE="$SCRIPT_DIR/integration/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: $ENV_FILE file not found${NC}"
    echo ""
    echo "Please create integration/.env with your Telegram bot credentials:"
    echo "  TELEGRAM_BOT_TOKEN=your_bot_token_here"
    echo "  TELEGRAM_CHAT_ID=-5175020124"
    echo "  TELEGRAM_USER_ID=5540291904"
    echo ""
    echo "You can copy the template:"
    echo "  cp integration/.env.example integration/.env"
    exit 1
fi

# Load environment variables from .env
echo -e "${YELLOW}📝 Loading environment variables from $ENV_FILE...${NC}"
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

# Verify required variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ Error: TELEGRAM_BOT_TOKEN is not set in integration/.env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded:${NC}"
echo "   BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "   CHAT_ID: $TELEGRAM_CHAT_ID"
echo "   USER_ID: ${TELEGRAM_USER_ID:-"Not set"}"
echo ""

# Check if CHANNEL_ID is set (optional)
if [ -n "$TELEGRAM_CHANNEL_ID" ]; then
    echo -e "${GREEN}   CHANNEL_ID: $TELEGRAM_CHANNEL_ID${NC}"
else
    echo -e "${YELLOW}   CHANNEL_ID: Not set (channel tests will be skipped)${NC}"
fi

echo ""
echo -e "${YELLOW}🧪 Running smart type inference integration tests...${NC}"
echo ""

# Change to script directory to run pnpm
cd "$SCRIPT_DIR"
pnpm test:integration:smart

echo ""
echo -e "${GREEN}✅ Integration tests completed!${NC}"
