# Omnichat 项目 - 问题清单（锐评版）

## 🔴 严重问题（必须立即修复）

### 1. 测试覆盖率严重不足
- **问题**: 只有 Telegram adapter 有测试（157 个）
- **其他 adapters**: Discord/Slack/WhatsApp/Signal/iMessage - **0 个测试**
- **覆盖率**: 仅 17% (1/6 adapters)
- **风险**: 任何重构都可能破坏功能

### 2. WhatsApp Adapter 声称不支持但实际支持的功能
```typescript
// packages/adapters/whatsapp/src/adapter.ts:85-90
async reply() { throw new Error("reply not supported") }  // ❌ 错误！
async delete() { throw new Error("delete not supported") } // ❌ 错误！
```
- **事实**: WhatsApp Baileys 完全支持这些功能
- **影响**: 用户无法使用可用功能

### 3. Signal/iMessage 无法使用但列为支持平台
- **README 声称**: 支持 Signal 和 iMessage
- **实际情况**: 只有 stub 实现，抛出 "not implemented"
- **问题**: 误导用户，浪费时间

### 4. Core 包过度使用 any 类型
```typescript
// packages/core/src/core/sdk.ts
private bot: any;  // ❌ 31 处使用 any
private client: any;  // ❌
```
- **影响**: 失去 TypeScript 的类型安全优势

### 5. 没有 CI/CD
- **问题**: 完全没有自动化测试、发布流程
- **风险**: 发布新版本容易出错

---

## 🟡 中等问题（强烈建议修复）

### 6. 日志系统不一致
- **Telegram/Discord/Slack**: 使用 Logger
- **WhatsApp/Signal/iMessage**: 使用 `console.log`
- **问题**: 无法统一管理日志

### 7. 参数验证不一致
- **Telegram/Discord/Slack**: 有 `validateRequired`, `parseMessageId`
- **WhatsApp/Signal/iMessage**: **没有任何验证**
- **问题**: 容易出现运行时错误

### 8. 错误处理不完善
- **问题**: 定义了完善的错误类但很少使用
- **影响**: 错误信息不清晰，难以调试

### 9. Storage 实现不完整
```typescript
// packages/core/src/storage/
export class S3Storage implements Storage { ... }  // ❌ 未实现
export class MemoryStorage implements Storage { ... }  // ❌ 未实现
```

### 10. 缺少 API 文档
- **问题**: 没有 TypeDoc 或其他 API 文档
- **影响**: 用户难以使用

---

## 🟢 低优先级问题（建议改进）

### 11. Message ID 格式不统一
- **问题**: 各平台格式不同，没有统一处理
- **影响**: 用户需要了解每个平台的格式

### 12. 性能问题
- **问题**: 没有缓存、没有并发控制、没有速率限制
- **影响**: 高并发场景性能差

### 13. 安全问题
- **问题**: 没有输入验证、没有敏感信息过滤
- **影响**: 可能的安全漏洞

### 14. 示例代码不足
- **问题**: 只有 Telegram 示例
- **影响**: 难以快速上手

### 15. 代码质量工具缺失
- **问题**: 没有 ESLint、Prettier、Commitlint
- **影响**: 代码风格不统一

---

## 📊 代码质量统计

| Adapter | 代码行数 | 测试 | 质量 | 可用性 |
|---------|---------|------|------|--------|
| Telegram | 2,145 | ✅ 157 | ⭐⭐⭐⭐⭐ | ✅ 生产就绪 |
| Discord | 570 | ❌ 0 | ⭐⭐⭐⭐ | ⚠️ 建议测试后使用 |
| Slack | 649 | ❌ 0 | ⭐⭐⭐⭐ | ⚠️ 建议测试后使用 |
| WhatsApp | 309 | ❌ 0 | ⭐⭐ | ❌ 需要改进 |
| Signal | 98 | ❌ 0 | ⭐ | ❌ 不可用 |
| iMessage | 85 | ❌ 0 | ⭐ | ❌ 不可用 |

---

## 🎯 立即行动建议

### 短期（1-2 周）
1. ❌ 删除或明确标注 Signal/iMessage 为"实验性"
2. ✅ 修复 WhatsApp adapter 的 reply/delete
3. ✅ 为 Discord/Slack 添加基本测试
4. ✅ 添加 GitHub Actions CI/CD

### 中期（1-2 月）
5. ✅ 为所有 adapters 添加测试（至少 60% 覆盖）
6. ✅ 减少 core 包的 any 类型使用
7. ✅ 统一日志和参数验证
8. ✅ 添加 TypeDoc 文档

### 长期（3-6 月）
9. ✅ 性能优化（缓存、速率限制）
10. ✅ 安全加固（输入验证、敏感信息过滤）
11. ✅ 完善工程化（ESLint、Prettier、自动化）

---

## 💀 直白总结

**优点**:
- ✅ 架构设计合理
- ✅ 接口定义清晰
- ✅ Telegram adapter 优秀

**缺点**:
- ❌ 测试覆盖严重不足（17%）
- ❌ 代码质量不一致（差异巨大）
- ❌ 缺少基本工程化（CI/CD、文档）
- ❌ 过度使用 any 类型（31 处）
- ❌ 声称支持但实际不可用（Signal/iMessage）

**结论**:
- 如果只是想玩玩：**可以使用 Telegram adapter**
- 如果要生产使用：**需要大量改进**
- 整体评分：**6/10** - 有潜力但需要努力

---

**报告时间**: 2025-02-09
**审查范围**: 整个 omnichat 项目
**态度**: 锐评，不夸大，不留情面
