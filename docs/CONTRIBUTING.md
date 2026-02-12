# 贡献指南 / Contributing Guidelines

## Git 仓库规则 / Git Repository Rules

### ❌ 不应提交的文件 / Files NOT to Commit

以下类型的文件**绝不能**提交到 git 仓库：

#### 1. 依赖文件 / Dependencies
```
node_modules/
.pnpm-store/
.pnpm*.log
```

#### 2. 编译输出 / Build Outputs
```
dist/
build/
*.tsbuildinfo
*.tsbuildinfo.*
*.js          # TypeScript 编译输出的 JS 文件
*.d.ts        # TypeScript 编译输出的类型声明文件
*.js.map      # Source map 文件
*.d.ts.map    # Type declaration source map 文件
```
**注意**: 只提交 `.ts` 源文件，不提交编译产物

#### 3. 环境配置 / Environment Files
```
.env
.env.local
.env.*.local
*.env
packages/examples/.env
```
**警告**: 这些文件包含敏感信息（API tokens, secrets），提交会导致安全漏洞

#### 4. 日志文件 / Logs
```
logs/
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
packages/examples/logs/
bot.log
```

#### 5. 运行时文件 / Runtime Files
```
*.pid
bot.pid
storage/
packages/*/storage/
```

#### 6. IDE 配置 / IDE Configuration
```
.vscode/
.idea/
*.swp
*.swo
*~
.claude/
```

### ✅ 应该提交的文件 / Files to Commit

#### 1. 源代码 / Source Code
- 所有 `*.ts` 文件（TypeScript 源文件）
- 测试文件 `*.test.ts`
- 配置文件 `tsconfig.json`, `vitest.config.ts`

#### 2. 文档 / Documentation
- `README.md`
- `docs/*.md` （用户文档）
- `.env.example` （示例配置，不包含真实密钥）

#### 3. 项目配置 / Project Configuration
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `.gitignore`
- `tsconfig.base.json`

#### 4. 脚本 / Scripts
- `packages/examples/*.sh` （管理脚本）

#### 5. 类型定义 / Type Definitions
- `*.d.ts` （如果是手写的类型定义，非编译产物）
  - 例如: `packages/adapters/signal/src/libsignal-node.d.ts` 是第三方库的类型定义，应该提交

### 📝 提交规范 / Commit Conventions

#### Commit Message 格式
```
<type>: <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

#### Type 类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

#### 示例
```
feat: add support for Telegram polls

- Implement sendPoll method
- Update capabilities declaration
- Add tests for poll functionality

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 🔒 安全规则 / Security Rules

1. **永远不要提交包含密钥的文件**
   - API tokens
   - Bot tokens
   - Database credentials
   - Any secrets

2. **使用 `.env.example` 作为模板**
   ```bash
   # .env.example
   TELEGRAM_BOT_TOKEN=your_token_here
   DISCORD_BOT_TOKEN=your_token_here
   ```

3. **提交前检查**
   ```bash
   # 检查是否有 .env 文件被暂存
   git diff --cached --name-only | grep "\.env$"

   # 如果有输出，取消暂存
   git reset HEAD <path-to-.env-file>
   ```

### 🧪 开发流程 / Development Workflow

1. 创建功能分支
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. 编写代码和测试

3. 本地测试
   ```bash
   pnpm install
   pnpm build
   pnpm test
   ```

4. 提交代码
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. 推送并创建 PR
   ```bash
   git push origin feat/your-feature-name
   ```

### 📂 项目结构规范 / Project Structure Conventions

```
omnichat/
├── packages/
│   ├── core/              # 核心 SDK - 只提交源文件
│   │   └── src/
│   │       └── **/*.ts    # ✅ 提交
│   │       └── **/*.js    # ❌ 不提交（编译产物）
│   │       └── **/*.d.ts  # ❌ 不提交（编译产物）
│   ├── adapters/          # 平台适配器
│   └── examples/          # 示例代码
├── docs/                  # 用户文档
├── .gitignore            # Git 忽略规则
├── .env.example          # 环境变量示例（无密钥）
└── README.md             # 项目说明
```

### 🚨 常见错误 / Common Mistakes

1. **错误**: 提交 `.env` 文件
   - **后果**: 密钥泄露，安全漏洞
   - **解决**: 立即从历史记录中删除，撤销该提交

2. **错误**: 提交 `node_modules/`
   - **后果**: 仓库过大，合并冲突
   - **解决**: 删除并重新 clone

3. **错误**: 提交 `dist/` 或编译后的 `.js` 文件
   - **后果**: 与源文件不一致，混乱
   - **解决**: 只提交 `.ts` 源文件

4. **错误**: 提交 `storage/` 目录
   - **后果**: 用户上传的文件被提交
   - **解决**: 从历史中删除，确保 `.gitignore` 包含该目录

### ✅ 提交前检查清单 / Pre-commit Checklist

- [ ] 没有 `.env` 文件被暂存
- [ ] 没有 `node_modules/` 被暂存
- [ ] 没有 `dist/` 或编译产物被暂存
- [ ] 没有 `*.log` 日志文件被暂存
- [ ] 没有 `storage/` 目录被暂存
- [ ] Commit message 遵循规范
- [ ] 代码已通过本地测试

---

**最后更新**: 2026-02-09
