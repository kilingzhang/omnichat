# Omnichat Universal Bot Manager

基于 Omnichat SDK 的**统一多平台 Bot 管理器**，同时支持 Telegram 和 Discord，展示了 SDK 的跨平台能力。

## 🎯 核心特性

### 统一架构
- **一套代码，多平台运行** - 相同的业务逻辑同时支持 Telegram 和 Discord
- **动态平台适配** - 自动识别消息来源并使用正确的适配器
- **多 Bot 实例管理** - 单个进程管理多个不同平台的 bot

### 功能清单
- 📋 **基础命令** - `/start`, `/help`, `/info`, `/id`
- 🎛️ **群组管理** - `/welcome`, `/rules`, `/announce`, `/stats`
- 👥 **成员管理** - `/warn`, `/mute`, `/kick`, `/ban`
- 🗳️ **投票系统** - 创建和管理投票
- 📝 **笔记系统** - 保存和检索群组笔记
- ⏰ **定时消息** - 设置定时发送消息
- 🎨 **交互功能** - 按钮、键盘、嵌入消息
- 💬 **私聊支持** - Telegram 和 Discord 私聊
- 🏰 **服务器管理** - Discord 服务器信息查询

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件，使用 `BOTS` 变量配置（支持单个或多个 bot）：

```bash
# 单个 Telegram Bot
BOTS=[{"id":"telegram","platform":"telegram","name":"mybot","telegram":{"apiToken":"YOUR_TELEGRAM_TOKEN"}}]

# 单个 Discord Bot
BOTS=[{"id":"discord","platform":"discord","name":"mybot","discord":{"botToken":"YOUR_DISCORD_TOKEN","clientId":"YOUR_CLIENT_ID"}}]

# 多平台：同时运行 Telegram 和 Discord
BOTS=[{"id":"telegram","platform":"telegram","name":"mybot","telegram":{"apiToken":"YOUR_TELEGRAM_TOKEN"}},{"id":"discord","platform":"discord","name":"mybot","discord":{"botToken":"YOUR_DISCORD_TOKEN","clientId":"YOUR_CLIENT_ID"}}]
```

### 3. 运行 Bot

```bash
# 开发模式
pnpm dev

# 生产环境
pnpm build
pnpm start
```

## 📁 项目结构

```
src/bots/group-assistant/
├── commands/           # 命令处理器
│   ├── basic.ts       # 基础命令
│   ├── management.ts  # 群组管理
│   ├── advanced.ts    # 高级功能
│   ├── interaction.ts # 交互功能
│   └── info.ts        # 信息查询
├── handlers/          # 消息处理器
├── services/          # 业务服务
├── utils/             # 工具函数
├── types.ts           # 类型定义
└── index.ts           # 主入口
```

## 🔧 配置说明

### BOTS 环境变量格式

`BOTS` 必须是一个 JSON 数组，每个元素代表一个 bot 实例：

```json
[
  {
    "id": "bot1",
    "platform": "telegram",
    "name": "mybot",
    "enabled": true,
    "telegram": {
      "apiToken": "your_token_here",
      "polling": true
    }
  },
  {
    "id": "bot2",
    "platform": "discord",
    "name": "mybot",
    "enabled": true,
    "discord": {
      "botToken": "your_discord_token",
      "clientId": "your_client_id",
      "intents": ["Guilds", "GuildMessages", "DirectMessages", "MessageContent"]
    }
  }
]
```

### 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | Bot 唯一标识符 |
| `platform` | string | ✅ | 平台类型：`telegram` 或 `discord` |
| `name` | string | ✅ | Bot 显示名称 |
| `enabled` | boolean | ❌ | 是否启用，默认 `true` |
| `telegram` | object | ❌ | Telegram 配置（platform=telegram 时必填） |
| `discord` | object | ❌ | Discord 配置（platform=discord 时必填） |

### Telegram 配置

```typescript
{
  "apiToken": string,  // Bot API Token（必填）
  "polling": boolean   // 是否使用 polling，默认 true（可选）
}
```

### Discord 配置

```typescript
{
  "botToken": string,       // Bot Token（必填）
  "clientId": string,       // Application ID（可选）
  "intents": string[]       // Gateway Intents（可选，默认使用基础 intents）
}
```

## 📝 可用命令

### 基础命令
- `/start` - 欢迎消息
- `/help` - 查看所有命令
- `/id` - 获取 Chat ID 和 User ID

### 群组管理
- `/welcome <消息>` - 设置欢迎消息
- `/rules <规则>` - 设置群组规则
- `/announce <公告>` - 发送公告
- `/stats` - 查看统计信息

### 成员管理
- `/warn @user` - 警告成员
- `/mute @user <时长>` - 禁言成员
- `/kick @user` - 踢出成员
- `/ban @user` - 封禁成员

### 实用功能
- `/poll <问题>` - 创建投票
- `/note <内容>` - 保存笔记
- `/schedule <时间> <消息>` - 定时消息
- `/dm` - 测试私聊（Discord）

### 信息查询
- `/info [media|user|msg]` - 获取信息
- `/guild` - 查看服务器信息（Discord）
- `/invite` - 创建邀请链接（Telegram）

### 高级功能
- `/buttons` - 测试交互按钮
- `/keyboard` - 测试自定义键盘（Telegram）
- `/hide` - 隐藏键盘（Telegram）
- `/advanced` - 查看平台能力
- `/caps` - 查看大写支持
- `/inline` - 测试内联查询

## 🌐 平台特性

### Telegram 特有功能
- 自定义键盘
- 内联查询
- 邀请链接创建
- 更多消息类型支持

### Discord 特有功能
- 服务器信息查询
- 嵌入消息
- 按钮交互
- 私聊支持

## 🔑 获取 Bot Token

### Telegram
1. 找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新 bot
3. 复制获得的 token

### Discord
1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建新应用程序
3. 创建 bot 并获取 token
4. 启用以下意图：
   - Message Content Intent
   - Server Members Intent
   - Presence Intent（可选）
5. 记录 Application ID（作为 CLIENT_ID）

## 🛠️ 开发指南

### 添加新命令

在 `commands/` 目录下创建命令处理器：

```typescript
import type { CommandHandler } from "../types.js";

export const myCommand: CommandHandler = {
  description: "命令描述",
  handler: async (message, sdk) => {
    await sdk.send(message.platform, {
      text: "回复消息",
    }, { to: message.from.id });
  },
};
```

然后在 `commands/index.ts` 中注册。

### 平台检测

使用 `message.platform` 判断消息来源：

```typescript
if (message.platform === "telegram") {
  // Telegram 特定逻辑
} else if (message.platform === "discord") {
  // Discord 特定逻辑
}
```

### 获取平台适配器

```typescript
const adapter = sdk.getAdapter(message.platform);
// 或
const telegramAdapter = sdk.getAdapter("telegram") as any;
```

## 📊 系统要求

- Node.js >= 18
- pnpm >= 8

## 📄 License

MIT
