# Omnichat 快速参考指南

> 开发者速查手册 - 最常用的 API 和命令

---

## 📚 目录
- [快速开始](#快速开始)
- [核心 API](#核心-api)
- [常用命令](#常用命令)
- [代码示例](#代码示例)
- [调试技巧](#调试技巧)
- [常见问题](#常见问题)

---

## 快速开始

### 5 分钟启动 Bot

```bash
# 1. 克隆项目
git clone https://github.com/kilingzhang/omnichat.git
cd omnichat

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cd packages/examples
cp .env.example .env
# 编辑 .env 添加 TELEGRAM_BOT_TOKEN=your_token_here

# 4. 构建并运行
pnpm build
pnpm dev
```

### 最小示例代码

```typescript
import { SDK } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";

// 初始化
const sdk = new SDK({
  adapters: {
    telegram: {
      class: TelegramAdapter,
      config: { apiToken: "YOUR_TOKEN" },
    },
  },
});

await sdk.init();

// 监听消息
sdk.on(async (message) => {
  console.log(message.content.text);
});

// 发送消息
await sdk.send("telegram", 
  { text: "Hello!" }, 
  { to: "user:123" }
);
```

---

## 核心 API

### SDK 初始化

```typescript
// 基础初始化
const sdk = new SDK({ adapters: { ... } });
await sdk.init();

// 多平台初始化
const sdk = new SDK({
  adapters: {
    telegram: { class: TelegramAdapter, config: { ... } },
    discord: { class: DiscordAdapter, config: { ... } },
    slack: { class: SlackAdapter, config: { ... } },
  },
});
```

### 消息操作

#### 发送消息

```typescript
// 文本消息
await sdk.send("telegram", 
  { text: "Hello, World!" }, 
  { to: "user:123" }
);

// 媒体消息
await sdk.send("telegram", {
  text: "Check this out!",
  mediaUrl: "https://example.com/image.jpg",
  mediaType: "image",
}, { to: "chat:456" });

// 贴纸
await sdk.send("telegram", {
  stickerId: "CAACAgIAAxkBAAED...",
}, { to: "user:123" });
```

#### 回复消息

```typescript
await sdk.reply("telegram", "messageId:123", {
  text: "This is a reply",
});
```

#### 编辑消息

```typescript
await sdk.edit("telegram", "messageId:123", 
  "Updated text"
);
```

#### 删除消息

```typescript
await sdk.delete("telegram", "messageId:123");
```

### 交互功能

#### 发送按钮

```typescript
await sdk.sendButtons("telegram", "user:123", 
  "Choose an option:", 
  [
    [{ text: "Option A", data: "a" }],
    [{ text: "Option B", data: "b" }],
  ]
);
```

#### 发送投票

```typescript
await sdk.sendPoll("telegram", "chat:123", {
  question: "Your favorite color?",
  options: ["Red", "Blue", "Green"],
});
```

#### 添加表情回应

```typescript
await sdk.addReaction("telegram", "chat:123:456", "👍");
```

### 能力检测

```typescript
// 检查单个能力
if (sdk.hasCapability("telegram", "interaction", "buttons")) {
  await sdk.sendButtons(...);
}

// 获取所有能力
const caps = sdk.getCapabilities("telegram");
console.log(caps.interaction.buttons); // true/false

// 查找支持某功能的平台
const platforms = sdk.getAdaptersByCapability("interaction", "polls");
// ["telegram", "discord"]
```

### 事件监听

```typescript
// 监听所有消息
sdk.on(async (message) => {
  console.log("Received:", message);
});

// 监听特定平台
sdk.on(async (message) => {
  if (message.platform === "telegram") {
    // 处理 Telegram 消息
  }
});

// 使用中间件
sdk.use(async (message, next) => {
  console.log("Before:", message);
  await next();
  console.log("After:", message);
});
```

---

## 常用命令

### 开发命令

```bash
# 构建所有包
pnpm build

# 构建单个包
pnpm --filter @omnichat/core build
pnpm --filter @omnichat/telegram build

# 运行测试
pnpm test
pnpm --filter @omnichat/telegram test

# 监听模式开发
pnpm --filter @omnichat/example dev
```

### Bot 管理命令

```bash
cd packages/examples

# 后台启动
pnpm start:bg

# 查看状态
pnpm status

# 查看日志
pnpm logs
pnpm logs -n 50              # 最后 50 行
pnpm logs -f ERROR           # 只看错误
pnpm logs -s                 # 静态查看

# 重启
pnpm restart

# 停止
pnpm stop
```

### Git 操作

```bash
# 检查状态
git status

# 查看变更
git diff

# 提交变更
git add .
git commit -m "your message"
git push
```

---

## 代码示例

### 完整的 Bot 示例

```typescript
import { SDK } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";

async function main() {
  // 1. 初始化 SDK
  const sdk = new SDK({
    adapters: {
      telegram: {
        class: TelegramAdapter,
        config: {
          apiToken: process.env.TELEGRAM_BOT_TOKEN!,
          enableCache: true,
          enableQueue: true,
        },
      },
    },
  });

  await sdk.init();
  console.log("✅ Bot started!");

  // 2. 监听消息
  sdk.on(async (message) => {
    const { platform, from, content } = message;
    
    // 命令处理
    if (content.text?.startsWith("/")) {
      await handleCommand(sdk, platform, from.id, content.text);
      return;
    }

    // 普通消息回复
    await sdk.send(platform, {
      text: `You said: ${content.text}`,
    }, { to: from.id });
  });

  // 3. 优雅关闭
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down...");
    await sdk.destroy();
    process.exit(0);
  });
}

async function handleCommand(
  sdk: SDK,
  platform: string,
  userId: string,
  command: string
) {
  switch (command) {
    case "/start":
      await sdk.send(platform, {
        text: "Welcome! Use /help for commands.",
      }, { to: userId });
      break;

    case "/help":
      await sdk.send(platform, {
        text: "Commands:\n/start - Welcome\n/help - This message",
      }, { to: userId });
      break;

    default:
      await sdk.send(platform, {
        text: "Unknown command. Use /help.",
      }, { to: userId });
  }
}

main().catch(console.error);
```

### 多平台支持示例

```typescript
const CONFIG = {
  platforms: {
    enabled: ["telegram", "discord"],
    
    telegram: {
      adapter: TelegramAdapter,
      getToken: (env) => env.TELEGRAM_BOT_TOKEN,
    },
    
    discord: {
      adapter: DiscordAdapter,
      getToken: (env) => env.DISCORD_BOT_TOKEN,
    },
  },
};

// 动态初始化
const adaptersConfig: Record<string, any> = {};

for (const platform of CONFIG.platforms.enabled) {
  const config = CONFIG.platforms[platform];
  const token = config.getToken(process.env);
  
  if (token) {
    adaptersConfig[platform] = {
      class: config.adapter,
      config: { apiToken: token },
    };
  }
}

const sdk = new SDK({ adapters: adaptersConfig });
```

### 中间件示例

```typescript
// 日志中间件
sdk.use(async (message, next) => {
  console.log(`📨 [${message.platform}] ${message.from.name}: ${message.content.text}`);
  await next();
});

// 过滤中间件
sdk.use(async (message, next) => {
  if (message.content.text?.includes("spam")) {
    console.log("🚫 Blocked spam message");
    return; // 不调用 next()，阻止传递
  }
  await next();
});

// 统计中间件
let messageCount = 0;
sdk.use(async (message, next) => {
  messageCount++;
  console.log(`Total messages: ${messageCount}`);
  await next();
});
```

### 错误处理示例

```typescript
import { SDKError, APICallError } from "@omnichat/core";

sdk.on(async (message) => {
  try {
    await sdk.send(message.platform, {
      text: "Response",
    }, { to: message.from.id });
  } catch (error) {
    if (error instanceof APICallError) {
      console.error("API call failed:", error.message);
      // 重试或降级处理
    } else if (error instanceof SDKError) {
      console.error("SDK error:", error.message);
    } else {
      console.error("Unknown error:", error);
    }
  }
});
```

---

## 调试技巧

### 启用详细日志

```typescript
import { Logger, LogLevel } from "@omnichat/core";

// 设置日志级别
const logger = new Logger("MyBot", LogLevel.DEBUG);

// 在 SDK 中使用
const sdk = new SDK({
  adapters: {
    telegram: {
      class: TelegramAdapter,
      config: {
        apiToken: token,
        logLevel: LogLevel.DEBUG, // 详细日志
      },
    },
  },
});
```

### 使用 Node.js 调试器

```bash
# 启动调试模式
node --inspect dist/unified-bot.js

# 或使用 VSCode
# .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Bot",
  "program": "${workspaceFolder}/packages/examples/dist/unified-bot.js",
  "outFiles": ["${workspaceFolder}/**/*.js"]
}
```

### 查看网络请求

```typescript
// 在适配器中添加请求日志
class TelegramAdapter {
  async send(target: string, content: SendContent) {
    console.log("→ Sending:", { target, content });
    const result = await this.bot.sendMessage(...);
    console.log("← Response:", result);
    return result;
  }
}
```

### 使用性能分析

```typescript
// 测量执行时间
async function measureTime(fn: () => Promise<void>, label: string) {
  const start = Date.now();
  await fn();
  const duration = Date.now() - start;
  console.log(`⏱️ ${label}: ${duration}ms`);
}

// 使用
await measureTime(
  () => sdk.send("telegram", { text: "test" }),
  "Send message"
);
```

---

## 常见问题

### Q: 如何获取 Telegram Bot Token?

```bash
1. 在 Telegram 中找到 @BotFather
2. 发送 /newbot 创建新 bot
3. 按提示设置名称和用户名
4. 复制提供的 token
5. 添加到 .env: TELEGRAM_BOT_TOKEN=your_token
```

### Q: 消息发送失败怎么办?

```typescript
// 1. 检查 token 是否正确
console.log(process.env.TELEGRAM_BOT_TOKEN);

// 2. 检查目标 ID 是否正确
console.log("Sending to:", userId);

// 3. 启用调试日志
const sdk = new SDK({
  adapters: {
    telegram: {
      config: {
        logLevel: LogLevel.DEBUG,
      },
    },
  },
});

// 4. 捕获错误详情
try {
  await sdk.send(...);
} catch (error) {
  console.error("Full error:", error);
}
```

### Q: 如何处理速率限制?

```typescript
// SDK 自动处理，但可以配置
const sdk = new SDK({
  adapters: {
    telegram: {
      config: {
        enableQueue: true,        // 启用队列
        queueConcurrency: 10,     // 并发数
        enableRateLimit: true,    // 启用限流
      },
    },
  },
});

// 手动重试
import { withRetry } from "@omnichat/core";

await withRetry(
  () => sdk.send(...),
  { maxRetries: 3, initialDelay: 1000 }
);
```

### Q: 如何支持多个 Bot?

```typescript
// 方案 1: 多个 SDK 实例
const bot1 = new SDK({
  adapters: {
    telegram: { config: { apiToken: TOKEN1 } },
  },
});

const bot2 = new SDK({
  adapters: {
    telegram: { config: { apiToken: TOKEN2 } },
  },
});

// 方案 2: 多个适配器（不同平台）
const sdk = new SDK({
  adapters: {
    telegram: { config: { apiToken: TELEGRAM_TOKEN } },
    discord: { config: { apiToken: DISCORD_TOKEN } },
  },
});
```

### Q: 如何保存用户数据?

```typescript
// 简单内存存储
const userStore = new Map<string, any>();

sdk.on(async (message) => {
  const userId = message.from.id;
  
  // 保存
  userStore.set(userId, {
    name: message.from.name,
    lastMessage: message.content.text,
    timestamp: Date.now(),
  });
  
  // 读取
  const userData = userStore.get(userId);
});

// 持久化存储（推荐）
import { writeFileSync, readFileSync } from "fs";

// 保存
writeFileSync("users.json", 
  JSON.stringify(Object.fromEntries(userStore))
);

// 加载
const data = JSON.parse(readFileSync("users.json", "utf-8"));
const userStore = new Map(Object.entries(data));
```

### Q: 如何处理媒体文件?

```typescript
// 发送媒体
await sdk.send("telegram", {
  mediaUrl: "https://example.com/photo.jpg",
  mediaType: "image",
  text: "Photo caption",
}, { to: userId });

// 接收媒体
sdk.on(async (message) => {
  if (message.content.mediaUrl) {
    console.log("Media type:", message.content.mediaType);
    console.log("Media URL:", message.content.mediaUrl);
    
    // 下载媒体
    const response = await fetch(message.content.mediaUrl);
    const buffer = await response.arrayBuffer();
    // 保存文件...
  }
});
```

---

## 性能优化建议

### 1. 启用缓存

```typescript
const sdk = new SDK({
  adapters: {
    telegram: {
      config: {
        enableCache: true,      // ✅ 启用
        cacheTTL: 60000,        // 60 秒
      },
    },
  },
});
```

### 2. 使用队列

```typescript
const sdk = new SDK({
  adapters: {
    telegram: {
      config: {
        enableQueue: true,         // ✅ 启用
        queueConcurrency: 10,      // 并发数
      },
    },
  },
});
```

### 3. 批量操作

```typescript
// ❌ 不好
for (const userId of userIds) {
  await sdk.send("telegram", { text: "Hi" }, { to: userId });
}

// ✅ 更好
await Promise.all(
  userIds.map(userId =>
    sdk.send("telegram", { text: "Hi" }, { to: userId })
  )
);
```

### 4. 避免频繁查询

```typescript
// ❌ 不好
sdk.on(async (message) => {
  const chat = await sdk.getChat("telegram", message.chat.id);
  // 每次都查询
});

// ✅ 更好
const chatCache = new Map();

sdk.on(async (message) => {
  let chat = chatCache.get(message.chat.id);
  if (!chat) {
    chat = await sdk.getChat("telegram", message.chat.id);
    chatCache.set(message.chat.id, chat);
  }
});
```

---

## 最佳实践

### ✅ 推荐

```typescript
// 1. 使用环境变量
const token = process.env.TELEGRAM_BOT_TOKEN;

// 2. 错误处理
try {
  await sdk.send(...);
} catch (error) {
  console.error(error);
}

// 3. 优雅关闭
process.on("SIGINT", async () => {
  await sdk.destroy();
  process.exit(0);
});

// 4. 类型检查
const message: Message = { ... };

// 5. 能力检测
if (sdk.hasCapability(...)) {
  // 使用功能
}
```

### ❌ 避免

```typescript
// 1. 硬编码凭据
const token = "123456:ABC..."; // ❌

// 2. 忽略错误
sdk.send(...); // ❌ 没有 await 或 catch

// 3. 同步操作
for (const user of users) {
  await sdk.send(...); // ❌ 串行，很慢
}

// 4. 直接访问内部
sdk['adapters'].get(...); // ❌ 使用私有属性

// 5. 假设功能存在
await sdk.sendPoll(...); // ❌ 没有检查能力
```

---

## 资源链接

### 文档
- [README.md](./README.md) - 项目概览
- [PROJECT_DEEP_UNDERSTANDING.md](./PROJECT_DEEP_UNDERSTANDING.md) - 深度分析
- [ARCHITECTURE_VISUAL_GUIDE.md](./ARCHITECTURE_VISUAL_GUIDE.md) - 架构指南
- [QUICK_START.md](./QUICK_START.md) - 快速开始
- [BOT_MANAGEMENT.md](./BOT_MANAGEMENT.md) - Bot 管理

### 示例
- [unified-bot.ts](./packages/examples/src/unified-bot.ts) - 多平台 Bot
- [simple-bot.ts](./packages/examples/src/simple-bot.ts) - 简单示例
- [telegram-chat-management.ts](./packages/examples/src/telegram-chat-management.ts) - 聊天管理

### 外部资源
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Discord.js Guide](https://discordjs.guide/)
- [Slack API](https://api.slack.com/)

---

## 速查表

### 消息操作

| 操作 | 方法 | 示例 |
|-----|------|------|
| 发送 | `sdk.send()` | `sdk.send("telegram", {text: "Hi"}, {to: "123"})` |
| 回复 | `sdk.reply()` | `sdk.reply("telegram", "msgId", {text: "Reply"})` |
| 编辑 | `sdk.edit()` | `sdk.edit("telegram", "msgId", "New text")` |
| 删除 | `sdk.delete()` | `sdk.delete("telegram", "msgId")` |

### 交互功能

| 功能 | 方法 | 示例 |
|-----|------|------|
| 按钮 | `sdk.sendButtons()` | `sdk.sendButtons("telegram", "123", "Text", buttons)` |
| 投票 | `sdk.sendPoll()` | `sdk.sendPoll("telegram", "123", pollData)` |
| 表情 | `sdk.addReaction()` | `sdk.addReaction("telegram", "123:456", "👍")` |

### 能力检测

| 操作 | 方法 | 示例 |
|-----|------|------|
| 检查 | `hasCapability()` | `sdk.hasCapability("telegram", "interaction", "buttons")` |
| 获取 | `getCapabilities()` | `sdk.getCapabilities("telegram")` |
| 查找 | `getAdaptersByCapability()` | `sdk.getAdaptersByCapability("interaction", "polls")` |

---

**最后更新**: 2026-02-11  
**版本**: v1.0  
**维护者**: Omnichat Team
