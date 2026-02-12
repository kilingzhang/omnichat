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
- **🔬 Validation**: Comprehensive input validation and error handling

## 📦 Installation

```bash
pnpm install @omnichat/core @omnichat/telegram
```

## 🚀 Quick Start

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
  to: "user:123",
});

// Listen for messages
sdk.on(async (message) => {
  console.log(`Received: ${message.content.text}`);
});
```

## 🧩 Supported Platforms

| Platform | Adapter Package | Status | Notes |
|----------|----------------|--------|-------|
| Telegram | `@omnichat/telegram` | ✅ Production Ready | Full feature support |
| Discord | `@omnichat/discord` | ✅ Production Ready | Full feature support |
| Slack | `@omnichat/slack` | ✅ Production Ready | Full feature support |
| WhatsApp | `@omnichat/whatsapp` | ⚠️ Partial | Needs improvements - see [ADAPTER_STATUS.md](./docs/ADAPTER_STATUS.md) |
| Signal | `@omnichat/signal` | 🔴 Stub | Requires external setup |
| iMessage | `@omnichat/imessage` | 🔴 Stub | macOS only, send-only |


## 📋 Capabilities

### Core (All Platforms)
- ✅ Send text
- ✅ Send media
- ✅ Receive messages

### Conversation
- ✅ Reply to messages
- ✅ Edit messages
- ✅ Delete messages
- ✅ Threads/topics (some platforms)

### Interaction
- ✅ Inline buttons
- ✅ Reactions
- ✅ Stickers
- ✅ Polls (some platforms)

### Discovery
- 📜 Message history (some platforms)
- 🔍 Search (some platforms)
- 📌 Pins (some platforms)
- 👤 Member info (some platforms)

### Management
- 👮 Kick users (Discord)
- 🔨 Ban users (Discord)
- 📢 Channel management (Discord)

## 🎛️ Capability Detection

```typescript
// Check platform capabilities
const caps = sdk.getCapabilities("telegram");
console.log(caps.conversation.reply);  // true
console.log(caps.interaction.polls);   // false

// Check specific capability
const canReply = sdk.hasCapability("telegram", "conversation", "reply");  // true
const canPoll = sdk.hasCapability("telegram", "interaction", "polls");   // false

// Get all platforms with a capability
const platformsWithButtons = sdk.getAdaptersByCapability("interaction", "buttons");
// ["telegram", "discord"]
```

## 📨 Message Types

```typescript
// Send text
await sdk.send("telegram", { text: "Hello" }, { to: "user:123" });

// Send media
await sdk.send("telegram", {
  mediaUrl: "https://example.com/image.jpg",
  mediaType: "image",
  text: "Check this out!"
}, { to: "user:123" });

// Reply to message
await sdk.reply("telegram", "789", { text: "I agree!" });

// Edit message
await sdk.edit("telegram", "789", "Updated text");

// Delete message
await sdk.delete("telegram", "789");
```

## 🎯 Interactive Messages

### Buttons
```typescript
await sdk.sendButtons("telegram", "user:123", "Choose one:", [
  [{ text: "Option A", data: "a" }],
  [{ text: "Option B", data: "b" }],
]);
```

### Reactions
```typescript
await sdk.addReaction("telegram", "user:123:456", "👍");
await sdk.removeReaction("telegram", "user:123:456", "👍");
```

### Polls
```typescript
await sdk.sendPoll("telegram", "channel:123", {
  question: "What's your favorite color?",
  options: ["Red", "Blue", "Green"],
});
```

## 🔌 Creating a Custom Adapter

```typescript
import { FullAdapter, Logger, LogLevel } from "@omnichat/core";
import { parseMessageId, validateRequired, safeExecute } from "@omnichat/core";

class MyAdapter implements FullAdapter {
  readonly platform = "myplatform";
  private logger: Logger;

  constructor() {
    this.logger = new Logger("MyAdapter", LogLevel.INFO);
  }

  async init(config) {
    this.logger.info("Initializing adapter...");
    // Initialize your platform
  }

  async send(target, content, options) {
    // Validate inputs
    validateRequired(target, "target");

    // Send with error handling
    return safeExecute(this.logger, "send message", async () => {
      // Your send logic here
      return {
        platform: this.platform,
        messageId: "123",
        chatId: target,
        timestamp: Date.now(),
      };
    });
  }

  onMessage(callback) {
    // Register message handler
  }

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
    // Cleanup
  }
}
```

## 📝 Logging

The SDK includes a built-in logging system with multiple levels:

```typescript
import { Logger, LogLevel } from "@omnichat/core";

// Create a logger
const logger = new Logger("MyBot", LogLevel.DEBUG);

// Log at different levels
logger.debug("Detailed debugging info");
logger.info("General information");
logger.warn("Warning message");
logger.error("Error occurred", error);

// Create child loggers
const childLogger = logger.child("Database");
childLogger.info("Connected to database");

// Change log level
logger.setLevel(LogLevel.ERROR); // Only show errors
```

## 🛠️ Utility Functions

The SDK provides utility functions for common adapter operations:

```typescript
import {
  parseMessageId,
  validateRequired,
  validateAtLeastOne,
  safeExecute,
  withRetry,
  truncateText,
  formatError,
} from "@omnichat/core";

// Parse compound messageId
const { chatId, msgId } = parseMessageId("channel:123:456");

// Validate required fields
validateRequired(token, "apiToken");

// Validate at least one field is present
validateAtLeastOne(content, ["text", "mediaUrl", "stickerId"]);

// Execute with error handling
await safeExecute(logger, "send message", async () => {
  // Your code here
});

// Retry with exponential backoff
await withRetry(
  async () => await api.call(),
  3, // max retries
  1000 // initial delay
);

// Truncate text for logging
const short = truncateText(longText, 50);

// Format error with context
throw formatError("Failed to send message", { userId, channelId });
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run example
cd packages/examples
pnpm dev
```

## 📖 Documentation

- [Quick Start](./docs/QUICK_START.md) - Get started quickly
- [Contributing](./docs/CONTRIBUTING.md) - Contribution guidelines
- [Adapter Status](./docs/ADAPTER_STATUS.md) - Platform support status
- [Security](./docs/SECURITY.md) - Security guidelines
- [Changelog](./docs/CHANGELOG.md) - Version history

## 📂 Project Structure

```
omnichat/
├── packages/
│   ├── core/              # Core SDK
│   ├── adapters/          # Platform adapters
│   │   ├── telegram/
│   │   ├── discord/
│   │   ├── slack/
│   │   └── ...
│   └── examples/          # Usage examples
├── docs/                  # Documentation
├── package.json
└── pnpm-workspace.yaml
```

## 🤝 Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details.

To add a new platform:

1. Create a new adapter package under `packages/adapters/`
2. Implement the `FullAdapter` interface
3. Declare capabilities in `getCapabilities()`
4. Test thoroughly

## 📄 License

MIT

---

Made with ❤️ for the universal messaging future
