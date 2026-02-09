# Omnichat Examples

Omnichat SDK 的完整示例代码，演示了所有核心功能。

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 Bot Token

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的 Telegram Bot Token：

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 3. 运行 Bot

```bash
# 开发模式（推荐）
pnpm dev

# 或者运行编译后的版本
pnpm build
pnpm start
```

## 📚 示例说明

### 主示例：Unified Bot ⭐ 推荐

**文件：** `src/unified-bot.ts`

这是一个完整的、功能齐全的 bot，演示了 Omnichat SDK 的所有核心功能。

#### 功能列表

| 功能 | 说明 | 命令 |
|------|------|------|
| **命令系统** | 完整的命令路由和处理 | `/help`, `/start`, `/id` |
| **交互按钮** | 演示内联按钮 | `/buttons` |
| **投票** | 创建投票 | `/poll` |
| **系统信息** | 显示统计和能力 | `/info stats`, `/info capabilities` |
| **消息回显** | 回复所有消息 | 直接发送消息 |
| **媒体处理** | 自动保存媒体文件 | 发送图片/视频等 |
| **群组支持** | 只响应被 @ 提及的消息 | 在群组中使用 |
| **Typing 状态** | 发送前显示 "typing..." | 自动 |

#### 性能优化

主示例启用了所有性能优化功能：

```typescript
{
  enableCache: true,      // 缓存 API 响应
  enableQueue: true,      // 请求队列管理
  queueConcurrency: 10,   // 最大并发请求数
}
```

---

### 其他示例

#### 1. Simple Bot

**文件：** `src/simple-bot.ts`

- 更详细的日志输出
- 适合学习基本概念

**运行：**
```bash
pnpm dev:simple
```

#### 2. Chat Management

**文件：** `src/telegram-chat-management.ts`

- 演示聊天管理功能
- 获取信息、权限管理、成员管理

**运行：**
```bash
pnpm dev:chat
```

#### 3. Smart Type Inference

**文件：** `src/smart-type-inference-example.ts`

- 演示智能类型推断
- 自动识别 user/group/channel

**运行：**
```bash
pnpm dev:smart
```

---

## 📝 可用命令

发送 `/help` 查看所有命令：

| 命令 | 功能 |
|------|------|
| `/start` | 欢迎消息和使用指南 |
| `/help` | 显示所有可用命令 |
| `/id` | 获取你的 ID 和聊天 ID |
| `/buttons` | 演示交互按钮 |
| `/poll` | 创建投票 |
| `/info stats` | 显示统计信息 |
| `/info capabilities` | 显示 SDK 能力 |

---

## 🔧 配置说明

### 环境变量

创建 `.env` 文件：

```bash
# Telegram Bot Token（必需）
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Polling 模式（可选，默认 true）
TELEGRAM_POLLING=true

# 调试模式（可选）
DEBUG=true
```

### 高级配置

在代码中配置 SDK：

```typescript
const sdk = new SDK({
  adapters: {
    telegram: {
      class: TelegramAdapter,
      config: {
        apiToken: "your_token",
        polling: true,
        enableCache: true,      // 启用缓存
        enableQueue: true,      // 启用队列
        queueConcurrency: 10,   // 并发数
      },
    },
  },
  globalConfig: {
    debug: true,  // 调试模式
  },
});
```

---

## 📂 项目结构

```
packages/examples/
├── src/
│   ├── unified-bot.ts                    # 主示例（推荐）⭐
│   ├── simple-bot.ts                     # 简单示例
│   ├── telegram-chat-management.ts       # 聊天管理示例
│   ├── smart-type-inference-example.ts   # 类型推断示例
│   ├── config.ts                         # 配置加载
│   └── index.ts                          # 基础示例
├── storage/                              # 媒体文件存储目录
├── .env.example                          # 环境变量模板
├── README.md                             # 本文件
└── package.json                          # 包配置
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

**原因：**
- Token 错误
- Bot 未启用
- 网络问题

**解决方法：**
1. 检查 `.env` 中的 token 是否正确
2. 在 BotFather 中确认 bot 已启用
3. 检查网络连接

### 无法保存媒体文件

**原因：**
- `storage` 目录不存在
- 权限问题

**解决方法：**
1. 确保 `storage` 目录存在
2. 检查目录权限

---

## 📚 相关文档

- [Omnichat SDK 文档](../core/README.md)
- [Telegram Adapter 文档](../adapters/telegram/README.md)

---

## 📝 License

MIT
