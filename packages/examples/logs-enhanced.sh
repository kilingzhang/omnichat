#!/bin/bash
# Enhanced log viewer with options

cd "$(dirname "$0")"

# Check if log file exists
if [ ! -f logs/bot.log ]; then
    echo "❌ No log file found (logs/bot.log)"
    echo "   Make sure the bot is running first"
    echo "   Run: pnpm start:bg"
    exit 1
fi

# Parse arguments
FOLLOW=true
LINES=100
FILTER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -f|--filter)
            FILTER="$2"
            shift 2
            ;;
        -s|--static)
            FOLLOW=false
            shift
            ;;
        -h|--help)
            echo "📝 Log Viewer Options:"
            echo ""
            echo "Usage: pnpm logs [options]"
            echo ""
            echo "Options:"
            echo "  -n, --lines <number>   Number of lines to show (default: 100)"
            echo "  -f, --filter <pattern> Filter logs by pattern"
            echo "  -s, --static           Show static logs (don't follow)"
            echo "  -h, --help             Show this help"
            echo ""
            echo "Examples:"
            echo "  pnpm logs              # View live logs (last 100 lines)"
            echo "  pnpm logs -n 50        # View last 50 lines"
            echo "  pnpm logs -f ERROR     # Filter logs containing 'ERROR'"
            echo "  pnpm logs -s           # Show static logs only"
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "   Use -h or --help for usage"
            exit 1
            ;;
    esac
done

echo "📝 Viewing logs (Ctrl+C to exit)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build tail command
TAIL_CMD="tail -n $LINES logs/bot.log"

# Apply filter if specified
if [ -n "$FILTER" ]; then
    echo "🔍 Filtering by: $FILTER"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ "$FOLLOW" = true ]; then
        # Follow with filter
        eval "$TAIL_CMD | grep --line-buffered -E '$FILTER' &"
        TAIL_PID=$!

        # Handle Ctrl+C
        trap "kill $TAIL_PID 2>/dev/null; exit 0" INT TERM

        # Wait for tail process
        wait $TAIL_PID 2>/dev/null
    else
        # Static view with filter
        eval "$TAIL_CMD | grep -E '$FILTER'"
    fi
else
    if [ "$FOLLOW" = true ]; then
        # Follow without filter
        tail -f -n $LINES logs/bot.log &
        TAIL_PID=$!

        # Handle Ctrl+C
        trap "kill $TAIL_PID 2>/dev/null; exit 0" INT TERM

        # Wait for tail process
        wait $TAIL_PID 2>/dev/null
    else
        # Static view without filter
        tail -n $LINES logs/bot.log
    fi
fi
