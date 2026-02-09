# 下一步工作建议

## 当前状态总结

### ✅ 已完成
1. **Core 工具模块** - 统一的缓存、重试、队列、熔断器
2. **Telegram Adapter** - 完整的实现，100% 测试覆盖
3. **架构优化** - 代码提取到 core，消除重复

### 📊 项目现状
- Telegram: ✅ 完整（9 文件，7 测试）
- Discord: ⚠️ 基本（2 文件，0 测试）
- Slack: ⚠️ 基本（2 文件，0 测试）
- WhatsApp: ❌ 不完整（2 文件，0 测试）
- Signal: ❌ Stub（3 文件，0 测试）
- iMessage: ❌ Stub（2 文件，0 测试）

---

## 🎯 建议的下一步（按优先级）

### 优先级 1: 完善 Telegram Adapter（已完成 ✅）

虽然已经很好，但还有一些可以改进的地方：

#### 1.1 添加性能监控
```typescript
// src/utils/metrics.ts
export class MetricsCollector {
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private retries = 0;

  recordCacheHit() { this.cacheHits++; }
  recordCacheMiss() { this.cacheMisses++; }
  recordAPICall() { this.apiCalls++; }
  recordRetry() { this.retries++; }

  getStats() {
    return {
      cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses),
      totalAPICalls: this.apiCalls,
      totalRetries: this.retries,
    };
  }
}
```

#### 1.2 添加批量操作支持
```typescript
// 批量发送消息
async sendBatch(targets: string[], content: SendContent): Promise<SendResult[]> {
  const results = await Promise.allSettled(
    targets.map(target => this.send(target, content))
  );
  return results.map((result, i) => ({
    target: targets[i],
    status: result.status,
    data: result.value,
  }));
}
```

#### 1.3 添加 Webhook 支持
```typescript
// 完善的 webhook 处理
async setWebhook(url: string, options?: WebhookOptions): Promise<void> {
  await this.bot.setWebHook(url, {
    max_connections: options?.maxConnections || 40,
    allowed_updates: options?.allowedUpdates,
  });
}
```

---

### 优先级 2: 选择一个 Adapter 完善（推荐 Discord 或 Slack）

**为什么？**
- Discord/Slack 有基本实现，但缺少测试
- 它们是流行的平台，用户需求高
- 可以参考 Telegram 的实现模式

#### 2.1 Discord Adapter 完善

**当前状态：**
```bash
discord/
├── src/
│   ├── adapter.ts       # 基本实现
│   └── index.ts
└── package.json
```

**需要添加：**
```
discord/
├── src/
│   ├── adapter.ts              # 主适配器
│   ├── client/
│   │   └── cached-client.ts    # 使用 core 的缓存
│   ├── utils/
│   │   ├── id-converter.ts    # Discord ID 处理
│   │   └── validator.ts       # 参数验证
│   └── types/
│       └── discord.ts         # Discord 类型定义
├── integration/
│   └── *.integration.test.ts  # 集成测试
└── src/
    └── adapter.test.ts        # 单元测试
```

**实现步骤：**
1. 参考 Telegram adapter 的结构
2. 使用 core 的工具（SimpleCache, withRetry, RequestQueue）
3. 添加完整的测试覆盖
4. 添加文档

#### 2.2 Slack Adapter 完善

类似 Discord 的改进。

---

### 优先级 3: 统一其他 Adapters 的配置和错误处理

#### 3.1 统一配置接口

**创建:** `packages/core/src/config/types.ts`

```typescript
export interface BaseAdapterConfig {
  debug?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
  retryOptions?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
}

export interface AdapterConfigWithCredentials extends BaseAdapterConfig {
  token: string;  // 统一使用 token
}

// Telegram
export interface TelegramConfig extends AdapterConfigWithCredentials {
  polling?: boolean;
  webhookUrl?: string;
  enableCache?: boolean;
  enableQueue?: boolean;
}

// Discord
export interface DiscordConfig extends AdapterConfigWithCredentials {
  clientId?: string;
  clientSecret?: string;
}

// Slack
export interface SlackConfig extends AdapterConfigWithCredentials {
  appToken?: string;
  signingSecret?: string;
}
```

#### 3.2 统一错误处理

**创建:** `packages/core/src/errors/adapter-errors.ts`

```typescript
export class AdapterError extends Error {
  constructor(
    public code: string,
    message: string,
    public platform: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

export class RateLimitError extends AdapterError {
  constructor(platform: string, retryAfter?: number) {
    super(
      'RATE_LIMITED',
      `Rate limited. Retry after ${retryAfter}s`,
      platform
    );
  }
}

export class AuthenticationError extends AdapterError {
  constructor(platform: string) {
    super(
      'AUTH_FAILED',
      'Authentication failed. Check your token.',
      platform
    );
  }
}
```

---

### 优先级 4: 添加工程化工具

#### 4.1 添加 ESLint 配置

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "no-console": "warn"
  }
}
```

#### 4.2 添加 Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

#### 4.3 添加 GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

---

### 优先级 5: 文档和示例

#### 5.1 添加使用示例

**创建:** `packages/examples/`

```typescript
// examples/discord-bot.ts
import { SDK } from '@omnichat/core';
import { DiscordAdapter } from '@omnichat/discord';

const sdk = new SDK();

await sdk.addAdapter('discord', new DiscordAdapter(), {
  token: process.env.DISCORD_TOKEN!,
});

await sdk.on('message', async (message) => {
  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

sdk.start();
```

#### 5.2 添加 README

每个 adapter 包应该有：
- 功能介绍
- 安装说明
- 配置说明
- 使用示例
- API 文档
- 贡献指南

---

## 🚀 推荐的执行顺序

### 短期（本周）

1. **选择一个 adapter 完善**（推荐 Discord）
   - 参考 Telegram 的结构
   - 添加测试
   - 使用 core 工具

2. **添加 ESLint + Prettier**
   - 统一代码风格
   - 配置 pre-commit hook

3. **更新 Discord adapter 的 README**
   - 添加使用示例
   - 添加配置说明

### 中期（本月）

4. **完善 Slack adapter**
   - 使用 Discord 的经验
   - 保持一致性

5. **统一配置接口**
   - 创建 core 的配置类型
   - 更新所有 adapters

6. **添加 CI/CD**
   - GitHub Actions
   - 自动化测试
   - 自动化发布

### 长期（下月）

7. **决定 WhatsApp/Signal/iMessage 的命运**
   - 要么实现
   - 要么标记为实验性
   - 要么移除

8. **添加性能监控**
   - Metrics 收集
   - 日志聚合
   - 告警机制

9. **添加更多示例**
   - Echo bot
   - 多平台 bot
   - 企业集成示例

---

## 💡 我的建议

**立即开始：Discord Adapter 完善**

原因：
1. Discord 是流行平台
2. 已有基本实现
3. 可以直接应用 Telegram 的经验
4. 使用 core 工具，验证架构设计

**第一步：**
```bash
# 1. 创建 Discord adapter 的目录结构
mkdir -p packages/adapters/discord/src/{client,utils,types}
mkdir -p packages/adapters/discord/integration

# 2. 参考 Telegram 的实现模式
cp packages/adapters/telegram/src/client/cached-client.ts \
   packages/adapters/discord/src/client/

# 3. 开始实现...
```

你想从哪个开始？还是有其他优先级更高的需求？
