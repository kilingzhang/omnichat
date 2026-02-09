# Unified Bot - 快速参考

## 🚀 快速开始

### 1. 配置环境变量

```bash
cd packages/examples
cp .env.example .env
```

编辑 `.env` 文件：
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 2. 运行 Bot

```bash
# 从项目根目录
pnpm --filter @omnichat/example dev

# 或进入 examples 目录
cd packages/examples
pnpm dev
```

---

## 📝 可用命令

发送 `/help` 到 bot 查看所有命令：

| 命令 | 功能 | 示例 |
|------|------|------|
| `/start` | 欢迎消息 | `/start` |
| `/help` | 显示所有命令 | `/help` |
| `/id` | 获取你的 ID 和聊天 ID | `/id` |
| `/info stats` | 显示统计信息 | `/info stats` |
| `/info capabilities` | 显示 SDK 能力 | `/info capabilities` |
| `/buttons` | 显示按钮示例代码 | `/buttons` |
| `/poll` | 显示投票示例代码 | `/poll` |

---

## 🎯 核心特性

### 1. 平台无关的消息处理

```typescript
// 自动使用消息来源的平台
await sdk.send(message.platform, {
  text: "回复消息"
}, {
  to: message.from.id
});
```

### 2. 命令系统

```typescript
const commands: Record<string, Command> = {
  mycommand: {
    description: "我的命令描述",
    handler: async (message, sdk, args) => {
      await sdk.send(message.platform, {
        text: "响应"
      }, { to: message.from.id });
    },
  },
};
```

### 3. 媒体处理

自动保存所有接收到的媒体文件到 `./storage/` 目录。

### 4. 群组支持

在群组中只响应被 @ 提及的消息。

### 5. Typing 状态

发送消息前自动显示 "typing..." 状态。

### 6. 统计信息

实时统计：
- 总消息数
- 唯一用户数
- 消息/秒
- 运行时间

---

## 🔧 配置选项

在 `unified-bot.ts` 中修改 `CONFIG` 对象：

```typescript
const CONFIG = {
  botName: "Omnichat Multi-Platform Bot",

  features: {
    commands: true,        // 启用/禁用命令系统
    mediaHandling: true,   // 启用/禁用媒体处理
    autoSave: true,        // 启用/禁用自动保存
    debug: true,           // 启用/禁用调试
    typing: true,          // 启用/禁用 typing 状态
  },

  routes: {
    groupOnlyMentioned: true,  // 群组中只响应 @ 提及
  },

  platforms: {
    enabled: ["telegram"],  // 启用的平台列表

    telegram: {
      adapter: TelegramAdapter,
      getToken: (config: any) => config.telegram?.apiToken,
      getConfig: () => ({
        enableCache: true,      // API 响应缓存
        enableQueue: true,      // 请求队列
        queueConcurrency: 10,   // 并发数
      }),
    },
  },
};
```

---

## 🔌 添加新平台

### 步骤 1: 实现 Adapter

```typescript
// packages/adapters/discord/src/adapter.ts
export class DiscordAdapter implements FullAdapter {
  readonly platform = "discord";
  // ... 实现接口
}
```

### 步骤 2: 更新配置

在 `unified-bot.ts` 中添加：

```typescript
import { DiscordAdapter } from "@omnichat/discord";

// 在 CONFIG.platforms 中添加：
platforms: {
  enabled: ["telegram", "discord"],  // 添加 discord

  telegram: { /* ... */ },

  discord: {
    adapter: DiscordAdapter,
    getToken: (config: any) => config.discord?.botToken,
    getConfig: () => ({
      enableCache: true,
      enableQueue: true,
      queueConcurrency: 10,
    }),
  },
},
```

### 步骤 3: 添加环境变量

```bash
# .env
TELEGRAM_BOT_TOKEN=xxx
DISCORD_BOT_TOKEN=yyy
```

**就这么简单！** 🎉

---

## 📂 文件结构

```
packages/examples/
├── src/
│   ├── unified-bot.ts              # 主入口 ⭐
│   ├── simple-bot.ts               # 简单示例（详细日志）
│   ├── telegram-chat-management.ts # 聊天管理示例
│   └── smart-type-inference-example.ts # 类型推断示例
├── storage/                         # 媒体文件存储
├── .env.example                     # 环境变量模板
├── README.md                        # 详细说明
└── package.json                     # 包配置
```

---

## 🛠️ 开发脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 运行主示例（推荐）⭐ |
| `pnpm dev:simple` | 运行简单示例 |
| `pnpm dev:chat` | 运行聊天管理示例 |
| `pnpm dev:smart` | 运行类型推断示例 |
| `pnpm build` | 编译 TypeScript |
| `pnpm start` | 运行编译后的代码 |

---

## 💡 使用提示

### 1. 获取 Bot Token

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新 bot
3. 按提示设置 bot 名称
4. 获取 token，格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyZ`

### 2. 启用 Bot

1. 创建完 bot 后，BotFather 会给你 token
2. 将 token 添加到 `.env` 文件
3. 运行 `pnpm dev`
4. 在 Telegram 中搜索你的 bot，开始对话！

### 3. 群组设置

1. 将 bot 添加到群组
2. 确保 bot 有权限发送消息
3. 在群组中 `@bot /help` 测试

---

## 🐛 常见问题

### Bot 不响应消息

**检查清单：**
- ✅ `.env` 中的 token 是否正确
- ✅ 在 BotFather 中确认 bot 已启用
- ✅ 网络连接正常
- ✅ 检查控制台错误信息

### 无法保存媒体文件

**检查清单：**
- ✅ `storage` 目录是否存在
- ✅ 目录权限是否正确
- ✅ 磁盘空间是否充足

### TypeScript 编译错误

**解决方法：**
```bash
# 清理并重新构建
pnpm --filter @omnichat/example build
rm -rf dist
pnpm build
```

---

## 📚 更多文档

- [完整 README](./packages/examples/README.md)
- [多平台开发指南](./packages/examples/MULTI_PLATFORM_GUIDE.md)
- [设计说明](./packages/examples/UNIFIED_ENTRY_SUMMARY.md)
- [重构总结](./REFACTORING_COMPLETE.md)

---

## 🎯 推荐学习路径

### 1. 初学者

**从 `unified-bot.ts` 开始**：
- 功能最全面
- 代码组织最好
- 注释详细
- 易于理解

### 2. 深入学习

- **聊天管理**: `telegram-chat-management.ts`
- **类型推断**: `smart-type-inference-example.ts`
- **详细日志**: `simple-bot.ts`

### 3. 开发自己的 Bot

1. 复制 `unified-bot.ts` 作为起点
2. 根据需求修改配置
3. 添加自定义命令
4. 在 `.env` 中配置 tokens
5. 运行 `pnpm dev` 开始使用

---

**🎉 享受多平台 bot 开发！**
