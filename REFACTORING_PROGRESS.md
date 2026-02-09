# Telegram Adapter 重构计划 - 执行进度

## ✅ 已完成

### 1. 工具模块创建
```
src/utils/
├── id-converter.ts       ✅ Telegram ID 转换器
├── validator.ts          ✅ 参数验证工具
├── logger.ts            ✅ 日志工具
├── cache.ts             ✅ 缓存工具
└── index.ts             ✅ 导出
```

### 2. 客户端模块创建
```
src/client/
├── cached-client.ts      ✅ 带缓存的客户端包装器
└── index.ts             ✅ 导出
```

### 3. 类型定义创建
```
src/types/
└── telegram.ts          ✅ Telegram 类型定义
```

## 🎯 下一步：集成到 adapter.ts

由于 adapter.ts 有 1,943 行，直接修改风险很大。

建议的两种方案：

### 方案 A：渐进式重构（推荐）

**不删除旧代码，逐步添加新功能**

1. **在 adapter.ts 顶部添加新导入**：
```typescript
import {
  TelegramIdConverter,
  validateRequired,
  parseMessageId,
  formatMessageId,
  createLogger,
} from './utils/index.js';

import { CachedTelegramClient } from './client/index.js';
```

2. **在 adapter 类中添加新字段**：
```typescript
export class TelegramAdapter implements FullAdapter {
  private bot: any;  // 保留
  private cachedClient?: CachedTelegramClient;  // 新增
  private logger = createLogger('TelegramAdapter');  // 新增
  // ...
}
```

3. **在 init() 中初始化缓存客户端**：
```typescript
async init(config: AdapterConfig): Promise<void> {
  // ... 现有代码 ...

  // 初始化缓存客户端（新增）
  this.cachedClient = new CachedTelegramClient(this.bot);
  this.logger.info('Cached client initialized');
}
```

4. **逐步替换方法实现**：
```typescript
// 旧方法（保留）
async getChat(chatId: string): Promise<any> {
  // 现有实现
}

// 新方法（在文件末尾添加）
async getChatWithCache(chatId: string): Promise<any> {
  if (this.cachedClient) {
    return this.cachedClient.getChat(chatId);
  }
  // 降级到原始方法
  return this.getChat(chatId);
}
```

### 方案 B：创建新的 RefactoredAdapter

**创建新文件，不修改旧代码**

1. 创建 `src/refactored-adapter.ts`
2. 复制 adapter.ts 的类结构
3. 使用新的工具重写方法
4. 测试验证
5. 逐步迁移

## 📋 需要修改的具体位置

### 使用 ID 转换器

**旧代码**（第 83-97 行）:
```typescript
function publicIdToTelegramId(publicId: string | number): string {
  const id = typeof publicId === 'string' ? parseInt(publicId, 10) : publicId;
  if ((id & SIGN_BIT) !== 0) {
    return String(id & ABS_MASK);
  }
  return String(id);
}
```

**新代码**:
```typescript
// 使用 TelegramIdConverter
const telegramId = TelegramIdConverter.toTelegramId(publicId);
```

### 使用参数验证

**旧代码**（没有验证）
```typescript
async send(target: string, content: SendContent, options?: SendOptions) {
  if (!target) {
    throw new Error("Target (chat ID) is required");
  }
  // ...
}
```

**新代码**:
```typescript
async send(target: string, content: SendContent, options?: SendOptions) {
  validateRequired({ target }, ['target']);
  validateChatId(target);
  // ...
}
```

### 使用缓存

**旧代码**:
```typescript
async getChat(chatId: string): Promise<any> {
  const chat = await this.bot.getChat(chatId);
  return this.formatChat(chat);
}
```

**新代码**:
```typescript
async getChat(chatId: string): Promise<any> {
  if (this.cachedClient) {
    const chat = await this.cachedClient.getChat(chatId);
    return this.formatChat(chat);
  }
  // 降级
  const chat = await this.bot.getChat(chatId);
  return this.formatChat(chat);
}
```

## 🎯 建议的实施步骤

由于 adapter.ts 太大，建议：

1. **先创建新文件展示模式**
   - 创建 `src/examples/refactored-snippets.ts`
   - 展示如何使用新工具
   - 验证工具的正确性

2. **编写迁移指南**
   - 记录旧代码到新代码的映射
   - 提供详细的迁移步骤

3. **分批重构**
   - 每次重构 1-2 个功能
   - 每次重构后运行测试
   - 确保没有破坏

## 💡 当前建议

**不要直接修改 adapter.ts**，因为：
- 文件太大（1,943 行）
- 风险太高
- 难以验证

**建议**：
1. 先完成其他工具（缓存、队列）
2. 创建示例展示用法
3. 编写详细的迁移指南
4. 再逐步重构

需要我继续创建其他工具（RequestQueue 等），还是先讨论这个方案？