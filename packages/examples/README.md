# 🤖 Universal IM SDK - Examples

Example implementations demonstrating the Universal IM SDK capabilities.

## 📁 Files

| File | Description |
|------|-------------|
| `simple-bot.ts` | Simple Telegram echo bot with detailed logging |
| `index.ts` | Minimal example showing SDK initialization |
| `config.ts` | Configuration loader with .env support |

## 🚀 Quick Start

### 1. Build the project

```bash
cd /Users/dev/im-sdk
pnpm install
pnpm build
```

### 2. Configure environment

```bash
cp packages/examples/.env.example packages/examples/.env
```

Edit `.env` with your bot tokens:
```bash
TELEGRAM_BOT_TOKEN=your_token_here
```

### 3. Run the bot

**Development mode** (with tsx):
```bash
cd packages/examples
pnpm dev
```

**Production mode** (compiled JS):
```bash
cd packages/examples
pnpm build
pnpm start
```

## 📋 Available Scripts

### 运行模式
| Command | Description |
|---------|-------------|
| `pnpm start:bg` | Start bot in background |
| `pnpm start` | Run bot in foreground |
| `pnpm dev` | Run source with `tsx` (hot reload) |

### 管理命令
| Command | Description |
|---------|-------------|
| `pnpm status` | Show bot status and recent logs |
| `pnpm logs` | View live logs (tail -f) |
| `pnpm stop` | Stop running bot |

### 构建
| Command | Description |
|---------|-------------|
| `pnpm build` | Compile TypeScript to `dist/` |

### 快速启动示例
```bash
# 后台启动
pnpm start:bg

# 查看状态
pnpm status

# 实时查看日志
pnpm logs

# 停止
pnpm stop
```

## 🎯 Simple Bot Features

The `simple-bot.ts` demonstrates:

- **Message echo**: Repeats received messages
- **Message logging**: Detailed console output for all messages
- **Command handling**: `/start`, `/help`, `/info`
- **Graceful shutdown**: Clean exit with Ctrl+C
- **Error handling**: Comprehensive error reporting

### Commands

- `/start` or `/help` - Show welcome message
- `/info` - Show message and user info
- `/info media` - Show media attachment info
- `/info user` - Show user information
- `/info msg` - Show message details
- Any other text - Echo back the message

## 📊 Example Output

```
🚀 Starting Simple Bot...
━━━━━━━━━━━━━━━━━━━━━

📋 Bot Token: 8433215540:AAES...
🔑 Token Length: 46

📡 Initializing SDK...
  SDK instance created

📡 Connecting to Telegram API...
✅ Bot initialized successfully!

📊 Telegram Capabilities:
   Send Text: true
   Send Media: true
   Receive: true

━━━━━━━━━━━━━━━━━━━━━━
🎯 Bot is ready and listening!
━━━━━━━━━━━━━━━━━━━━━━
```

## 🔧 Configuration

The `config.ts` loader supports multiple platforms via `.env`:

```bash
# Platform selection
PLATFORM=telegram

# Telegram
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_POLLING=true

# Discord
DISCORD_BOT_TOKEN=your_token

# Slack
SLACK_BOT_TOKEN=xoxb-your_token
```

## 🛠️ Development

### Project Structure

```
packages/examples/
├── src/
│   ├── simple-bot.ts   # Main example bot
│   ├── index.ts        # Minimal example
│   └── config.ts       # Config loader
├── dist/               # Compiled JS (generated)
├── .env.example        # Example environment
└── .env                # Your actual environment (create this)
```

### Adding Features

To add custom features to the bot:

1. Edit `src/simple-bot.ts`
2. Add handlers in the message callback:
```typescript
sdk.on(async (message: Message) => {
  const text = message.content.text?.toLowerCase() || "";

  if (text === "/mycommand") {
    await sdk.send("telegram", {
      text: "Custom response!",
    }, { to: message.from.id });
  }
});
```

3. Rebuild and restart:
```bash
pnpm build && pnpm start
```

## 📚 Documentation

- [Main README](../../README.md) - Project overview
- [docs/ADAPTER_STATUS.md](../../docs/ADAPTER_STATUS.md) - Platform support status
- [docs/PROJECT_SUMMARY.md](../../docs/PROJECT_SUMMARY.md) - Detailed project summary

## 🤝 Contributing

When adding new examples:

1. Keep it simple and focused
2. Use `config.ts` for configuration
3. Follow the existing code style
4. Add comments for complex logic
5. Test thoroughly before committing

## 📝 License

MIT
