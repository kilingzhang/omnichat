# Omnichat

🚀 **Omnichannel messaging SDK for all platforms**

Write once, run everywhere. Send and receive messages across Telegram, Discord, WhatsApp, Slack, Signal, and more with a single, unified API.

## 🎯 Features

- **📦 Unified API**: One interface for all platforms
- **🔌 Plugin Architecture**: Easy to add new platforms
- **⚡ Capability-Driven**: Automatically detects and exposes available features
- **🛡️ Type-Safe**: Full TypeScript support
- **🎛️ Configurable**: Fine-grained control over enabled capabilities
- **🔧 Middleware**: Extensible message processing pipeline
- **📝 Logging**: Built-in logging system for debugging and monitoring

## 📦 Installation

```bash
pnpm install @omnichat/core @omnichat/telegram
```

## 🚀 Quick Start

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# 单个 Telegram Bot
BOTS=[{"id":"telegram","platform":"telegram","name":"mybot","telegram":{"apiToken":"YOUR_TELEGRAM_TOKEN"}}]

# 单个 Discord Bot
BOTS=[{"id":"discord","platform":"discord","name":"mybot","discord":{"botToken":"YOUR_DISCORD_TOKEN","clientId":"YOUR_CLIENT_ID"}}]

# 多平台：同时运行 Telegram 和 Discord
BOTS=[{"id":"telegram","platform":"telegram","name":"mybot","telegram":{"apiToken":"YOUR_TELEGRAM_TOKEN"}},{"id":"discord","platform":"discord","name":"mybot","discord":{"botToken":"YOUR_DISCORD_TOKEN","clientId":"YOUR_CLIENT_ID"}}]
```

### 3. 启动 Bot

```bash
./bot.sh start
```

### Bot 管理命令

| 命令 | 说明 |
|------|------|
| `./bot.sh start` | 开发模式启动 |
| `./bot.sh start:prod` | 生产模式启动 |
| `./bot.sh stop` | 停止 bot |
| `./bot.sh restart` | 重启 bot |
| `./bot.sh status` | 查看状态 |
| `./bot.sh logs -f` | 实时查看日志 |
| `./bot.sh logs -g ERROR` | 过滤错误日志 |

### SDK 使用示例

```typescript
import { SDK } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";

// Initialize SDK
const sdk = new SDK({
  adapters: {
    telegram: {
      class: TelegramAdapter,
      config: {
        apiToken: "YOUR_BOT_TOKEN",
      },
    },
  },
});

await sdk.init();

// Send a message
await sdk.send("telegram", {
  text: "Hello, world!",
}, {
  to: "123456789", // Chat ID
});

// Listen for messages
sdk.on(async (message) => {
  console.log(`Received: ${message.content.text}`);
});
```

## 🧩 Supported Platforms

| Platform | Adapter Package | Status | Notes |
|----------|----------------|--------|-------|
| Telegram | `@omnichat/telegram` | ✅ Production Ready | Full feature support, 50+ methods |
| Discord | `@omnichat/discord` | ✅ Production Ready | Full feature support, 40+ methods |
| Slack | `@omnichat/slack` | ✅ Production Ready | Full feature support |
| WhatsApp | `@omnichat/whatsapp` | ⚠️ Partial | Needs improvements |
| Signal | `@omnichat/signal` | 🔴 Experimental | Stub implementation |
| iMessage | `@omnichat/imessage` | 🔴 Experimental | macOS only, send-only |

> **Note**: Focus development on Telegram and Discord adapters. Other adapters are experimental or partial.

## 📨 Message Operations

### Send Messages

```typescript
// Send text
await sdk.send("telegram", { text: "Hello" }, { to: "123456789" });

// Send media
await sdk.send("telegram", {
  mediaUrl: "https://example.com/image.jpg",
  mediaType: "image",
  text: "Check this out!"
}, { to: "123456789" });
```

### Reply / Edit / Delete

```typescript
// Reply to a message
await sdk.reply("telegram", chatId, messageId, { text: "I agree!" });

// Edit a message
await sdk.edit("telegram", chatId, messageId, "Updated text");

// Delete a message
await sdk.delete("telegram", chatId, messageId);
```

### Reactions

```typescript
// Add reaction
await sdk.addReaction("telegram", chatId, messageId, "👍");

// Remove reaction
await sdk.removeReaction("telegram", chatId, messageId, "👍");
```

### Interactive Messages

```typescript
// Buttons
await sdk.sendButtons("telegram", "123456789", "Choose one:", [
  [{ text: "Option A", data: "a" }],
  [{ text: "Option B", data: "b" }],
]);

// Polls
await sdk.sendPoll("telegram", "123456789", {
  question: "What's your favorite color?",
  options: ["Red", "Blue", "Green"],
});
```

## 🎛️ Capability Detection

```typescript
// Check platform capabilities
const caps = sdk.getCapabilities("telegram");
console.log(caps.conversation.reply);  // true

// Check specific capability
const canReply = sdk.hasCapability("telegram", "conversation", "reply");  // true

// Get all platforms with a capability
const platformsWithButtons = sdk.getAdaptersByCapability("interaction", "buttons");
// ["telegram", "discord"]
```

## 🔌 Creating a Custom Adapter

```typescript
import { FullAdapter, Logger, LogLevel } from "@omnichat/core";
import { validateRequired, safeExecute } from "@omnichat/core";

class MyAdapter implements FullAdapter {
  readonly platform = "myplatform";
  private logger: Logger;

  constructor() {
    this.logger = new Logger("MyAdapter", LogLevel.INFO);
  }

  async init(config) {
    this.logger.info("Initializing adapter...");
  }

  async send(target, content, options) {
    validateRequired(target, "target");
    return safeExecute(this.logger, "send message", async () => {
      return {
        platform: this.platform,
        messageId: "123",
        chatId: target,
        timestamp: Date.now(),
      };
    });
  }

  onMessage(callback) {}

  getCapabilities() {
    return {
      base: { sendText: true, sendMedia: false, receive: true },
      conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
      interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false },
      discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
      management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
    };
  }

  async destroy() {
    this.logger.info("Destroying adapter...");
  }
}
```

## 📝 Logging

```typescript
import { Logger, LogLevel } from "@omnichat/core";

const logger = new Logger("MyBot", LogLevel.DEBUG);

logger.debug("Detailed debugging info");
logger.info("General information");
logger.warn("Warning message");
logger.error("Error occurred", error);

// Create child loggers
const childLogger = logger.child("Database");
childLogger.info("Connected to database");

// Change log level
logger.setLevel(LogLevel.ERROR);
```

## 🔑 获取 Bot Token

### Telegram
1. 找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新 bot
3. 复制获得的 token

### Discord
1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建新应用程序
3. 创建 bot 并获取 token
4. 启用 Message Content Intent
5. 记录 Application ID（作为 CLIENT_ID）

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run integration tests (requires API tokens)
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx pnpm vitest run --config vitest.integration.config.ts

# Run examples
./bot.sh start
```

## 🧪 Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

Integration tests require real API tokens:

```bash
# Telegram integration tests
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx TELEGRAM_USER_ID=xxx \
  pnpm vitest run packages/adapters/telegram/integration/ --config vitest.integration.config.ts

# Discord integration tests
DISCORD_BOT_TOKEN=xxx DISCORD_CHANNEL_ID=xxx DISCORD_GUILD_ID=xxx \
  pnpm vitest run packages/adapters/discord/integration/ --config vitest.integration.config.ts
```

## 📂 Project Structure

```
omnichat/
├── bot.sh              # Bot 管理脚本
├── packages/
│   ├── core/           # Core SDK
│   │   ├── src/
│   │   │   ├── core/          # SDK 核心逻辑
│   │   │   ├── models/        # 统一模型定义
│   │   │   ├── utils/         # 工具函数
│   │   │   └── index.ts       # 公共 API 导出
│   │   └── package.json
│   ├── adapters/       # Platform adapters
│   │   ├── telegram/          # Telegram 适配器 (50+ 方法)
│   │   │   ├── src/
│   │   │   │   ├── adapter.ts
│   │   │   │   └── adapter.test.ts
│   │   │   └── integration/   # 集成测试
│   │   ├── discord/           # Discord 适配器 (40+ 方法)
│   │   │   ├── src/
│   │   │   │   ├── adapter.ts
│   │   │   │   └── adapter.test.ts
│   │   │   └── integration/   # 集成测试
│   │   ├── slack/             # Slack 适配器
│   │   ├── whatsapp/          # WhatsApp 适配器 (部分支持)
│   │   ├── signal/            # Signal 适配器 (实验性)
│   │   └── imessage/          # iMessage 适配器 (实验性)
│   └── examples/       # Usage examples
│       └── src/
│           └── bots/
│               └── group-assistant/  # 统一 Bot 示例
├── package.json
├── pnpm-workspace.yaml
├── vitest.config.ts           # 单元测试配置
└── vitest.integration.config.ts # 集成测试配置
```

## 🎛️ Capabilities System

Each adapter exposes its capabilities through `getCapabilities()`:

```typescript
const caps = adapter.getCapabilities();
// Returns:
{
  base: { sendText, sendMedia, receive },
  conversation: { reply, edit, delete, threads, quote },
  interaction: { buttons, polls, reactions, stickers, effects },
  discovery: { history, search, pins, memberInfo, channelInfo },
  management: { kick, ban, mute, timeout, channelCreate, channelEdit, channelDelete, permissions },
  advanced: { webhooks, threads, roles, invites, ... }
}
```

Check capabilities at runtime:

```typescript
if (sdk.hasCapability("telegram", "interaction", "polls")) {
  await sdk.sendPoll("telegram", chatId, { question: "...", options: [...] });
}
```

## 📄 License

MIT

---

Made with ❤️ for the universal messaging future
