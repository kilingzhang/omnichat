# Omnichat Roadmap

## 当前版本: v0.1.x

### 状态：Adapter 层完善中

当前重点是提供稳定、功能完整的平台适配器。

---

## Phase 1: Adapter 层 ✅ 进行中

**目标**: 提供统一的底层 API 抽象

### 已完成
- [x] 统一 Adapter 接口定义
- [x] Capabilities 能力系统
- [x] Telegram 适配器 (50+ 方法)
- [x] Discord 适配器 (40+ 方法)
- [x] Slack 适配器
- [x] 单元测试覆盖 (1114 tests)
- [x] 集成测试框架

### 进行中
- [ ] 完善错误处理
- [ ] 优化类型定义
- [ ] 文档完善

### 计划中
- [ ] WebSocket 支持优化
- [ ] 文件上传/下载统一接口
- [ ] 缓存层设计

---

## Phase 2: Context 层 🔮 未来

**目标**: 提供统一的消息上下文抽象

### 设计草案
```typescript
interface OmnichatContext {
  // 通用属性
  readonly platform: string;
  readonly message?: Message;
  readonly chatId?: string;
  readonly text?: string;

  // 通用方法
  reply(content: SendContent): Promise<SendResult>;
  edit(newContent: SendContent): Promise<SendResult>;
  delete(): Promise<void>;

  // 平台扩展
  readonly telegram?: TelegramContext;
  readonly discord?: DiscordContext;
}
```

### 优势
- 用户不再关心平台差异
- 快捷方法自动适配
- 更简洁的 API

---

## Phase 3: Middleware 层 🔮 未来

**目标**: 提供可组合的中间件系统

### 设计草案
```typescript
sdk
  .use(loggingMiddleware())
  .use(rateLimitMiddleware())
  .use(sessionMiddleware())
  .on('message:text', handler);
```

### 内置中间件
- logging - 日志记录
- rateLimit - 速率限制
- session - 会话管理
- i18n - 国际化
- permissions - 权限控制

---

## Phase 4: Filter Query 🔮 未来

**目标**: 类型安全的事件过滤

### 设计草案
```typescript
// 通用事件
sdk.on('message:text', ctx => { /* ctx.text 自动非空 */ });
sdk.on('message:media', ctx => { /* ctx.media 存在 */ });

// 平台私有事件
sdk.on('telegram:inline_query', ctx => { /* Telegram 专属 */ });
sdk.on('discord:slash_command', ctx => { /* Discord 专属 */ });
```

---

## Phase 5: 生态系统 🔮 未来

### 计划
- [ ] CLI 工具
- [ ] 项目模板
- [ ] 更多适配器 (微信、钉钉、飞书)
- [ ] Dashboard 监控面板
- [ ] 云函数部署支持

---

## 贡献指南

如果你对某个功能感兴趣，欢迎：
1. 在 Issues 中讨论
2. 提交 PR
3. 分享使用场景

---

## 版本策略

- **0.x.x**: 开发版本，API 可能变化
- **1.x.x**: 稳定版本，遵循语义化版本
