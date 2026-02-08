# 安全策略 / Security Policy

## 安全漏洞报告 / Security Vulnerabilities

### ✅ 已修复的漏洞 / Fixed Vulnerabilities (5/6)

截至 2026-02-09，我们已修复 5 个依赖漏洞：

| 严重性 | 包 | 漏洞 | 状态 |
|--------|-----|------|------|
| **Critical** | form-data | 不安全的随机函数 | ✅ 已修复 |
| **High** | qs | DoS 攻击 | ✅ 已修复 |
| **Moderate** | tough-cookie | Cookie 处理问题 | ✅ 已修复 |
| **Moderate** | esbuild | 开发服务器安全问题 | ✅ 已修复 |
| **Moderate** | undici | 资源耗尽攻击 | ✅ 已修复 |

### ⚠️ 已知问题 / Known Issues (1/6)

| 严重性 | 包 | 漏洞 | 状态 |
|--------|-----|------|------|
| **Moderate** | request | SSRF 漏洞 | ⚠️ 无法修复 |

#### 关于 request 包的说明

`request@2.88.2` 是一个**已废弃**的包，没有可用的补丁。这个问题来自：

```
node-telegram-bot-api@0.67.0
  └─ @cypress/request-promise@5.0.0
      └─ request-promise-core@1.1.3
          └─ request@2.88.2 [DEPRECATED]
```

**影响范围**：
- 仅影响 Telegram adapter
- request 包仅在 Telegram bot API 调用时使用
- 不影响其他 adapter（Discord、Slack、WhatsApp 等）

**风险评估**：
- **低风险**：request 的 SSRF 漏洞主要用于向 Telegram API 发送请求
- Telegram API 是可信端点，SSRF 风险有限
- 用户输入已经过验证和清理

**解决方案**：
1. 短期：使用 pnpm overrides 强制使用安全的间接依赖版本
2. 长期：等待 `node-telegram-bot-api` 迁移到原生 fetch 或 axios
3. 备选：考虑切换到现代 Telegram bot 框架（如 grammY）

## 安全最佳实践 / Security Best Practices

### 1. 环境变量管理

✅ **正确做法**：
```bash
# 使用 .env.example 作为模板
cp .env.example .env
# 编辑 .env 文件，填入真实的密钥
```

❌ **错误做法**：
```bash
# 永远不要提交 .env 文件到 git
git add .env  # ❌ 危险！
```

### 2. API 密钥保护

- ✅ 使用环境变量存储所有 API tokens
- ✅ 在 .gitignore 中排除 .env 文件
- ✅ 使用 .env.example 提供模板（不含真实密钥）
- ❌ 不要在代码中硬编码密钥
- ❌ 不要在日志中输出密钥

### 3. 依赖管理

#### 定期更新依赖
```bash
# 检查过时的包
pnpm outdated

# 交互式更新
pnpm update -i

# 更新所有依赖
pnpm update
```

#### 安全审计
```bash
# 运行安全审计
pnpm audit

# 自动修复可修复的漏洞
pnpm audit fix
```

### 4. 输入验证

所有 adapter 都实现了输入验证：

```typescript
// 验证必填字段
validateRequired(target, "target");

// 验证至少一个字段
validateAtLeastOne(content, ["text", "mediaUrl"]);
```

### 5. 错误处理

使用 `safeExecute` 包装所有外部调用：

```typescript
return safeExecute(logger, "send message", async () => {
  // 可能失败的操作
  return await api.send(data);
});
```

## 安全更新流程 / Security Update Process

### 发现漏洞时

1. **立即评估风险**
   - 严重性（Critical/High/Moderate/Low）
   - 影响范围（哪些 adapter 受影响）
   - 利用难度

2. **分类处理**
   - **Critical/High**：立即修复，发布补丁版本
   - **Moderate**：在下一个小版本中修复
   - **Low**：在计划的功能更新中修复

3. **修复步骤**
   ```bash
   # 1. 更新受影响的依赖
   pnpm update <package-name>

   # 2. 运行测试
   pnpm test

   # 3. 验证修复
   pnpm audit

   # 4. 提交修复
   git commit -m "security: fix vulnerability in <package>"

   # 5. 发布更新
   pnpm publish
   ```

## 依赖版本策略 / Dependency Version Strategy

### 生产依赖

- 严格遵循语义化版本（SemVer）
- 主包（如 `discord.js`, `node-telegram-bot-api`）使用 Caret range（`^`）
- 间接漏洞通过 pnpm overrides 修复

### 开发依赖

- 定期更新到最新稳定版本
- vitest, typescript 等工具链保持较新版本

### pnpm Overrides

在根 `package.json` 中配置 overrides：

```json
"pnpm": {
  "overrides": {
    "form-data": "^2.5.4",
    "qs": "^6.14.1",
    "tough-cookie": "^4.1.4",
    "undici": "^6.23.0",
    "esbuild": "^0.25.0"
  }
}
```

## 报告安全漏洞 / Reporting Vulnerabilities

如果你发现安全漏洞，请：

1. **不要**公开创建 issue
2. **发送邮件**到项目维护者
3. 包含以下信息：
   - 漏洞描述
   - 复现步骤
   - 潜在影响
   - 建议的修复方案

我们将：
- 在 48 小时内确认收到
- 在 7 天内评估风险
- 根据严重性及时发布修复

## 安全日志 / Security Changelog

### 2026-02-09

- ✅ 修复 5 个依赖漏洞（Critical: 1, High: 1, Moderate: 3）
- ✅ 更新 vitest 从 1.2.0 到 4.0.0
- ✅ 更新 node-telegram-bot-api 从 0.65.0 到 0.67.0
- ✅ 添加 pnpm overrides 强制使用安全版本
- ⚠️ 记录 1 个无法修复的漏洞（request@2.88.2）

---

**最后更新**: 2026-02-09
**安全负责人**: 项目维护团队
