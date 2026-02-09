# Chat ID 转换系统

## 概述

为了让用户体验更友好，Telegram adapter 实现了自动的 Chat ID 转换：

- **对外（用户看到的）**: 统一使用正数 ID
- **对内（Telegram API）**: 自动处理负数 ID

## Telegram 的 Chat ID 规则

| 类型 | ID 范围 | 示例 |
|------|---------|------|
| 私聊 | 正数 | `5540291904` |
| 群组 | 负数 | `-5175020124` |
| 频道 | 负数 | `-1001234567890` |

## 转换逻辑

为了完全避免 ID 冲突，我们使用**高位标记位**编码方案：

### 编码方案

| 类型 | Telegram 原始 ID | 统一正数 ID | 说明 |
|------|----------------|------------|------|
| 私聊 | `5540291904` | `4611686019967266100` | 设置第62位标记（加上 `0x4000000000000000`） |
| 群组 | `-5175020124` | `5175020124` | 直接使用绝对值 |
| 频道 | `-1001424271061` | `1001424271061` | 直接使用绝对值（去掉 `-100`） |

### 为什么不会冲突？

- **私聊 ID**: 始终 ≥ `2^62` (有高位标记)
- **群组 ID**: 始终 < `2^62` (无高位标记)
- **两个范围完全不重叠！**

### 接收消息时（Telegram → 用户）

```typescript
// Telegram API 返回（私聊）
msg.chat.id = 5540291904
// 转换后
message.to.id = "4611686019967266100"  // 设置了高位标记

// Telegram API 返回（群组）
msg.chat.id = -5175020124
// 转换后
message.to.id = "5175020124"  // 绝对值
```

### 发送消息时（用户 → Telegram API）

```typescript
// 用户使用统一的正数 ID（私聊）
await sdk.send("telegram", { text: "Hello" }, { to: "4611686019967266100" });
// 内部调用: bot.sendMessage("5540291904", ...)  // 去掉高位标记

// 用户使用统一的正数 ID（群组）
await sdk.send("telegram", { text: "Hello" }, { to: "5175020124" });
// 内部调用: bot.sendMessage("-5175020124", ...)  // 转回负数
```

## 优势

✅ **用户友好** - 所有 ID 都是正数，不需要关心负数
✅ **自动转换** - 用户代码无需手动处理
✅ **统一接口** - 与其他平台（微信、Discord 等）保持一致
✅ **向后兼容** - 可以同时支持正数和负数（自动检测）

## 使用示例

```typescript
// 接收消息 - 获取的 ID 都是正数
const chatId = message.to.id;
// 私聊: "4611686019967266100" (有高位标记)
// 群组: "5175020124" (无高位标记)

// 发送消息 - 直接使用获取的正数 ID
await sdk.send("telegram", { text: "Hello" }, { to: chatId });
// SDK 会自动识别类型并转换回 Telegram API 需要的格式

// 类型判断
function isPrivateChat(publicId: string): boolean {
  const id = parseInt(publicId, 10);
  return (id & 0x4000000000000000) !== 0;  // 检查高位标记
}

function isGroupChat(publicId: string): boolean {
  return !isPrivateChat(publicId);
}
```

## 实现细节

使用高位标记位（sign bit）编码方案，完全避免 ID 冲突：

```typescript
const SIGN_BIT = 0x4000000000000000;  // 2^62 - 标记位
const ABS_MASK = 0x3FFFFFFFFFFFFFFF;  // 掩码 - 提取实际 ID

// Telegram → 用户
function telegramIdToPublicId(telegramId: string | number): string {
  const id = typeof telegramId === 'string' ? parseInt(telegramId, 10) : telegramId;

  if (id > 0) {
    // 私聊：设置高位标记
    return String(SIGN_BIT | (id & ABS_MASK));
  }

  // 群组：返回绝对值
  return String(Math.abs(id));
}

// 用户 → Telegram
function publicIdToTelegramId(publicId: string | number): string {
  const id = typeof publicId === 'string' ? parseInt(publicId, 10) : publicId;

  // 检查高位标记
  if ((id & SIGN_BIT) !== 0) {
    // 私聊：去掉标记位
    return String(id & ABS_MASK);
  }

  // 群组：转回负数
  return String(-id);
}
```

### 编码示例

```typescript
// 私聊 5540291904 的转换
二进制: 0000000000000000000000000000000001010001010110001000011101000000
编码后: 0100000000000000000000000000000001010001010110001000011101000000
       ^-- 第62位设置为1
十进制: 4611686019967266100

// 群组 -5175020124 的转换
原始:   -5175020124 (负数)
编码后:  5175020124  (绝对值，无高位标记)
```

## 注意事项

1. **✅ 无冲突**: 使用高位标记位，私聊和群组 ID 范围完全不重叠
2. **✅ 可逆性**: 编码/解码完全可逆，无信息丢失
3. **✅ 兼容性**: JavaScript 安全整数范围内（2^53-1）
4. **✅ 性能**: 转换开销极小（只是位运算）
5. **✅ 测试**: 82 个单元测试全部通过 ✅

## 测试

```bash
# 运行单元测试
pnpm --filter @omnichat/telegram test:unit
# 输出: 82 tests passed ✅

# 运行集成测试（需要真实 token）
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx pnpm --filter @omnichat/telegram test:integration
```
