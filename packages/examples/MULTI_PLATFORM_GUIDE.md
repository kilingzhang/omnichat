# 多渠道 Bot 开发指南

## 🎯 目标

构建一个支持多个聊天平台的统一 bot，使用 Omnichat SDK 实现平台无关的核心逻辑。

## 📋 当前支持的平台

| 平台 | 状态 | Adapter | 配置 |
|------|------|---------|------|
| **Telegram** | ✅ 完成 | `@omnichat/telegram` | `TELEGRAM_BOT_TOKEN` |
| Discord | 🚧 计划中 | - | `DISCORD_BOT_TOKEN` |
| Slack | 🚧 计划中 | - | `SLACK_BOT_TOKEN` |
| WhatsApp | 🚧 计划中 | - | `WHATSUP_TOKEN` |

---

## 🚀 快速开始

### 1. 配置环境变量

创建 `.env` 文件：

```bash
# Telegram（必需）
TELEGRAM_BOT_TOKEN=your_telegram_token

# Discord（可选）
DISCORD_BOT_TOKEN=your_discord_token

# Slack（可选）
SLACK_BOT_TOKEN=your_slack_token
```

### 2. 运行 Bot

```bash
pnpm dev
```

Bot 会自动检测并初始化所有配置的平台。

---

## 🏗️ 架构设计

### 核心原则

#### 1. 平台无关的业务逻辑

```typescript
// ✅ 好的做法：平台无关
async function handleUserCommand(message: Message, sdk: SDK) {
  const userId = message.from.id;

  // 业务逻辑
  const userData = await getUserData(userId);

  // 响应（自动使用消息来源的平台）
  await sdk.send(message.platform, {
    text: `Hello ${userData.name}!`
  }, { to: message.from.id });
}

// ❌ 坏的做法：平台相关
async function handleUserCommand(message: Message, sdk: SDK) {
  if (message.platform === "telegram") {
    const telegramAdapter = sdk.getAdapter("telegram");
    // ...
  } else if (message.platform === "discord") {
    // ...
  }
}
```

#### 2. 统一的命令系统

```typescript
const commands: Record<string, Command> = {
  // 所有平台使用相同的命令
  help: { /* ... */ },
  start: { /* ... */ },
  // ...
};

// 命令处理器自动使用正确的平台发送
await sdk.send(message.platform, { text: "..." }, { to: message.from.id });
```

#### 3. 消息路由

```typescript
sdk.on(async (message) => {
  // 消息来自 message.platform
  // 处理逻辑与平台无关
  await handleMessage(message, sdk);
});
```

---

## 📂 项目结构

```
packages/examples/
├── src/
│   ├── unified-bot.ts              # 主入口（多平台）
│   ├── config.ts                   # 配置加载
│   ├── simple-bot.ts               # Telegram 专用示例
│   └── ...
├── .env.example                   # 环境变量模板
└── .env                           # 你的配置
```

---

## 🔌 添加新平台

### 步骤 1: 实现 Adapter

创建新的 adapter 包：

```bash
cd packages/adapters
mkdir discord
cd discord
pnpm init
```

### 步骤 2: 实现接口

```typescript
// packages/adapters/discord/src/adapter.ts
import { FullAdapter, type AdapterConfig } from "@omnichat/core";

export interface DiscordConfig extends AdapterConfig {
  botToken: string;
  clientId: string;
}

export class DiscordAdapter implements FullAdapter {
  readonly platform = "discord";
  // ... 实现所有必需方法
}
```

### 步骤 3: 添加到 unified-bot

在 `unified-bot.ts` 中添加配置：

```typescript
const CONFIG = {
  platforms: {
    enabled: ["telegram", "discord"],  // 添加 discord

    telegram: {
      adapter: TelegramAdapter,
      getToken: (config: any) => config.telegram?.apiToken,
      getConfig: () => ({ enableCache: true }),
    },

    // 添加 Discord 配置
    discord: {
      adapter: DiscordAdapter,
      getToken: (config: any) => config.discord?.botToken,
      getConfig: () => ({ enableCache: true }),
    },
  },
};
```

### 步骤 4: 配置环境变量

在 `.env` 中添加：

```bash
TELEGRAM_BOT_TOKEN=xxx
DISCORD_BOT_TOKEN=yyy
```

### 步骤 5. 运行

```bash
pnpm dev
```

Bot 会自动初始化所有配置的平台！

---

## 🎨 平台差异处理

### 情况 1: 统一功能（推荐）

所有平台都支持的功能，使用统一接口：

```typescript
// 发送文本 - 所有平台都支持
await sdk.send(message.platform, {
  text: "Hello!"
}, { to: message.from.id });

// 发送媒体 - 所有平台都支持
await sdk.send(message.platform, {
  mediaUrl: "https://example.com/image.jpg",
  mediaType: "image",
}, { to: message.from.id });
```

### 情况 2: 平台特定功能

某些平台有特殊功能，需要直接使用 adapter：

```typescript
const adapter = sdk.getAdapter(message.platform);

// Telegram 特有功能
if (message.platform === "telegram") {
  await adapter.sendButtons(chatId, "Title", [[
    { text: "Option A", data: "a" }
  ]]);
}

// Discord 特有功能
if (message.platform === "discord") {
  await adapter.sendEmbed(chatId, {
    title: "Title",
    description: "Description",
  });
}
```

### 情况 3: 检查平台能力

```typescript
const caps = sdk.getCapabilities(message.platform);

if (caps?.interaction.buttons) {
  // 支持按钮
  // ...
}

if (sdk.hasCapability(message.platform, "interaction", "buttons")) {
  // 另一种检查方式
}
```

---

## 📝 最佳实践

### 1. 使用统一的接口

```typescript
// ✅ 推荐：使用 SDK 的统一接口
await sdk.send(message.platform, { text: "..." }, { to: message.from.id });

// ❌ 不推荐：直接使用特定 adapter（除非必要）
const adapter = sdk.getAdapter("telegram");
await adapter.sendMessage(chatId, "...");
```

### 2. 避免平台检查

```typescript
// ❌ 不推荐：到处都是平台检查
if (message.platform === "telegram") {
  // Telegram 特定逻辑
} else if (message.platform === "discord") {
  // Discord 特定逻辑
}

// ✅ 推荐：平台无关的逻辑
const response = processCommand(message);
await sdk.send(message.platform, response, { to: message.from.id });
```

### 3. 使用能力检测

```typescript
// ✅ 推荐：检查能力
if (sdk.hasCapability(message.platform, "conversation", "edit")) {
  await sdk.editMessage(message.platform, messageId, { text: "New text" });
}

// ❌ 不推荐：假设功能存在
await sdk.editMessage(message.platform, messageId, { text: "New text" });
```

### 4. 统一错误处理

```typescript
try {
  await sdk.send(message.platform, { text: "..." }, { to: message.from.id });
} catch (error) {
  // 统一的错误处理
  console.error(`Failed to send on ${message.platform}:`, error);

  // 根据平台返回特定错误消息
  const errorMsg = getPlatformErrorMessage(message.platform, error);
  await sdk.send(message.platform, { text: errorMsg }, { to: message.from.id });
}
```

---

## 🎯 示例场景

### 场景 1: 多平台 Echo Bot

```typescript
sdk.on(async (message) => {
  console.log(`Received from ${message.platform}: ${message.content.text}`);

  // 回复到原平台
  await sdk.send(message.platform, {
    text: `Echo: ${message.content.text}`
  }, { to: message.from.id });
});
```

### 场景 2: 跨平台广播

```typescript
async function broadcastToAllPlatforms(text: string, excludePlatform?: string) {
  for (const platform of CONFIG.platforms.enabled) {
    if (platform === excludePlatform) continue;

    try {
      await sdk.send(platform, { text }, { broadcast: true });
    } catch (error) {
      console.error(`Failed to broadcast to ${platform}:`, error);
    }
  }
}
```

### 场景 3: 平台迁移

```typescript
// 用户从 Telegram 迁移到 Discord，但消息历史需要保留

sdk.on(async (message) => {
  // 保存到数据库（带平台标识）
  await database.saveMessage({
    ...message,
    sourcePlatform: message.platform,
  });

  // 业务逻辑处理
  const response = await processMessage(message);

  // 回复到原平台
  await sdk.send(message.platform, response, { to: message.from.id });
});
```

---

## 🔧 配置技巧

### 1. 条件启用平台

```typescript
const CONFIG = {
  platforms: {
    enabled: process.env.ENABLED_PLATFORMS?.split(",") || ["telegram"],
    // ...
  },
};
```

### 2. 动态配置

```typescript
const platformsConfig = {
  telegram: {
    adapter: TelegramAdapter,
    getToken: (config) => config.telegram?.apiToken,
    getConfig: () => ({
      enableCache: process.env.ENABLE_CACHE === "true",
      enableQueue: process.env.ENABLE_QUEUE === "true",
    }),
  },
};
```

### 3. 环境特定配置

```typescript
const isDev = process.env.NODE_ENV === "development";

const platformsConfig = {
  telegram: {
    getConfig: () => ({
      enableCache: isDev,
      enableQueue: !isDev,  // 生产环境启用
    }),
  },
};
```

---

## 📊 测试多平台 Bot

### 单元测试

```typescript
import { describe, it, expect } from "vitest";
import { SDK } from "@omnichat/core";
import { MockAdapter } from "./mocks/mock-adapter.js";

describe("Multi-Platform Bot", () => {
  it("should handle messages from different platforms", async () => {
    const sdk = new SDK({
      adapters: {
        telegram: { class: MockAdapter, config: {...} },
        discord: { class: MockAdapter, config: {...} },
      },
    });

    // 模拟不同平台的消息
    const telegramMessage = { platform: "telegram", content: { text: "Hello" } };
    const discordMessage = { platform: "discord", content: { text: "Hello" } };

    // 验证处理逻辑是平台无关的
    const telegramResult = await handleMessage(telegramMessage, sdk);
    const discordResult = await handleMessage(discordMessage, sdk);

    expect(telegramResult).toEqual(discordResult);
  });
});
```

### 集成测试

```bash
# 测试单个平台
TELEGRAM_BOT_TOKEN=xxx pnpm test:telegram

# 测试多个平台
TELEGRAM_BOT_TOKEN=xxx DISCORD_BOT_TOKEN=yyy pnpm test:multi
```

---

## 🚨 常见陷阱

### 陷阱 1: 硬编码平台名称

```typescript
// ❌ 不好
await sdk.send("telegram", { text: "..." });

// ✅ 好
await sdk.send(message.platform, { text: "..." });
```

### 陷阱 2: 假设所有平台功能相同

```typescript
// ❌ 不好
await sdk.send(message.platform, { buttons: [...] });

// ✅ 好
const caps = sdk.getCapabilities(message.platform);
if (caps?.interaction.buttons) {
  await sdk.send(message.platform, { buttons: [...] });
}
```

### 陷阱 3: 不处理平台差异

```typescript
// ❌ 不好
await sdk.send(message.platform, { text: "..." }, { to: message.from.id });

// ✅ 好
const targetId = normalizeTargetId(message.from.id, message.platform);
await sdk.send(message.platform, { text: "..." }, { to: targetId });
```

---

## 📚 相关资源

- [Omnichat SDK 文档](../core/README.md)
- [Adapter 开发指南](../adators/README.md)
- [配置说明](./README.md)

---

## 🎉 总结

使用 Omnichat SDK 构建多渠道 bot 的优势：

1. **统一接口** - 一套代码，多个平台
2. **易于扩展** - 添加新平台不需要修改核心逻辑
3. **能力检测** - 自动检查平台支持的功能
4. **错误恢复** - 统一的错误处理和重试
5. **性能优化** - 缓存、队列等跨平台优化

**开始构建你的多平台 bot 吧！** 🚀
