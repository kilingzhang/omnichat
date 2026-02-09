# Examples 包现状分析

## 📦 当前 Examples

### 源文件列表

| 文件 | 大小 | 功能 | 状态 |
|------|------|------|------|
| `simple-bot.ts` | 16KB | 完整的 Telegram Echo Bot | ✅ 完整 |
| `smart-type-inference-example.ts` | 8KB | 智能类型推断示例 | ✅ 完整 |
| `telegram-chat-management.ts` | 7KB | 聊天管理功能示例 | ✅ 完整 |
| `index.ts` | 3KB | 主入口 | ✅ 完整 |
| `config.ts` | 3KB | 配置加载 | ✅ 完整 |

---

## 🔍 详细分析

### 1. simple-bot.ts - 主要示例

**功能：**
- ✅ 命令系统 (`/start`, `/help`, `/id`, `/info`)
- ✅ 消息回显（echo）
- ✅ 媒体处理（图片、视频、文件等）
- ✅ 自动保存媒体到本地存储
- ✅ 详细的日志输出
- ✅ 优雅的错误处理
- ✅ 信号处理（SIGINT, SIGTERM）

**使用的 SDK 功能：**
```typescript
- SDK 初始化
- 多 adapter 支持
- 消息监听 (sdk.on)
- 消息发送 (sdk.send)
- 中间件 (createAutoSaveMediaMiddleware)
- 存储 (本地文件存储)
- 能力查询 (getCapabilities)
- 优雅关闭 (sdk.destroy)
```

**命令系统：**
```
/start  - 显示欢迎消息和使用帮助
/help   - 显示所有可用命令
/id     - 获取 Chat ID 和 User ID（用于测试）
/info   - 获取信息 /info [media|user|msg]
```

**特性：**
- 在群组中只响应被 @ 提及的消息
- 显示 typing 指示器
- 回复消息
- 统计信息（消息数、运行时间）
- 自动保存媒体文件

---

### 2. smart-type-inference-example.ts

**功能：**
- ✅ 演示智能目标类型推断
- ✅ 自动识别用户、群组、频道
- ✅ 缓存推断的类型
- ✅ 手动覆盖类型

**示例：**
```typescript
// 自动推断
await adapter.send('@username', { text: 'Hello' });  // 自动识别为 channel

// 手动指定
await adapter.send(chatId, { text: 'Hello' }, { targetType: 'user' });
```

---

### 3. telegram-chat-management.ts

**功能：**
- ✅ 获取聊天信息
- ✅ 获取成员列表
- ✅ 设置聊天权限
- ✅ 踢出/封禁成员
- ✅ 设置聊天标题和描述

**使用的 API：**
```typescript
- getChat()
- getChatMemberCount()
- getChatAdministrators()
- setChatPermissions()
- banChatMember()
- setChatTitle()
```

---

## 📊 测试覆盖情况

### ❌ 当前问题

**1. 没有自动化测试**
- Examples 没有单元测试
- 没有集成测试
- 只能手动运行测试

**2. 缺少多平台示例**
- 只有 Telegram 示例
- 没有 Discord、Slack 等其他平台的示例

**3. 缺少高级场景示例**
- 没有多平台同时使用的示例
- 没有 Webhook 示例
- 没有批量操作示例
- 没有错误恢复示例

---

## 💡 建议改进

### 优先级 1: 添加测试

**创建:** `packages/examples/src/simple-bot.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SDK } from '@omnichat/core';
import { TelegramAdapter } from '@omnichat/telegram';

describe('Simple Bot', () => {
  it('should initialize SDK', async () => {
    const sdk = new SDK({
      adapters: {
        telegram: {
          class: TelegramAdapter,
          config: { apiToken: 'test-token' },
        },
      },
    });

    expect(sdk).toBeDefined();
  });

  // 更多测试...
});
```

### 优先级 2: 添加 Discord 示例

**创建:** `packages/examples/src/discord-bot.ts`

```typescript
import { SDK } from '@omnichat/core';
import { DiscordAdapter } from '@omnichat/discord';

const sdk = new SDK({
  adapters: {
    discord: {
      class: DiscordAdapter,
      config: { token: process.env.DISCORD_TOKEN! },
    },
  },
});

// 类似 simple-bot 的实现
```

### 优先级 3: 添加多平台示例

**创建:** `packages/examples/src/multi-platform-bot.ts`

```typescript
// 同时支持 Telegram 和 Discord
const sdk = new SDK({
  adapters: {
    telegram: { class: TelegramAdapter, config: {...} },
    discord: { class: DiscordAdapter, config: {...} },
  },
});

// 统一处理所有平台的消息
sdk.on(async (message) => {
  console.log(`Received from ${message.platform}:`, message.content.text);

  // 回复到原平台
  await sdk.send(message.platform, {
    text: `Echo: ${message.content.text}`
  }, { to: message.from.id });
});
```

### 优先级 4: 添加高级功能示例

**1. Webhook 示例**
```typescript
// examples/telegram-webhook-bot.ts
// 使用 webhook 而不是 polling
```

**2. 批量操作示例**
```typescript
// examples/broadcast-bot.ts
// 批量发送消息到多个用户
```

**3. 错误恢复示例**
```typescript
// examples/resilient-bot.ts
// 演示重试、熔断器等功能
```

**4. 性能优化示例**
```typescript
// examples/performance-bot.ts
// 演示缓存、队列等优化功能
```

---

## 📝 文档建议

### 1. 添加 README

**创建:** `packages/examples/README.md`

```markdown
# Omnichat Examples

这个包包含了如何使用 Omnichat SDK 的示例代码。

## 示例列表

### 1. Simple Bot
最完整的示例，演示了 SDK 的主要功能。

运行:
\`\`\`bash
pnpm dev
\`\`\`

功能:
- 命令系统
- 消息回显
- 媒体处理
- 自动保存
- 详细日志

### 2. Smart Type Inference
演示智能目标类型推断功能。

### 3. Chat Management
演示聊天管理功能。

## 如何运行

1. 复制环境变量:
\`\`\`bash
cp .env.example .env
\`\`\`

2. 编辑 .env 文件，添加你的 bot token

3. 运行示例:
\`\`\`bash
pnpm dev
\`\`\`
```

### 2. 添加注释文档

在每个示例文件顶部添加：
- 功能说明
- 运行方法
- 配置说明
- 主要功能点

---

## 🎯 总结

### 当前状态
- ✅ 有 3 个完整的示例
- ✅ 覆盖了基本功能
- ❌ 缺少测试
- ❌ 缺少多平台示例
- ❌ 缺少高级场景示例

### 优先级建议
1. **添加测试** - 确保示例代码正确性
2. **添加 Discord 示例** - 验证多平台支持
3. **添加多平台示例** - 演示统一 API
4. **添加高级功能示例** - 演示性能优化、错误恢复等
5. **完善文档** - README、注释、使用指南

### 立即可做

**最简单且最有价值的改进：**

1. **为 simple-bot.ts 添加注释**
   - 在每个主要部分添加说明
   - 解释关键代码的作用

2. **创建 README.md**
   - 说明如何运行示例
   - 列出所有示例及其功能

3. **创建 .env.example**
   - 提供配置模板
   - 说明每个配置项的用途
