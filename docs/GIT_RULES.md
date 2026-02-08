# Git 快速参考 / Git Quick Reference

## ❌ 永不提交 / NEVER COMMIT

```bash
# 敏感信息
.env
*.env
packages/examples/.env

# 依赖
node_modules/
.pnpm-store/

# 编译产物
dist/
*.js
*.d.ts
*.js.map
*.d.ts.map

# 日志
*.log
logs/
bot.log

# 运行时
*.pid
storage/
packages/*/storage/
```

## ✅ 只提交源代码 / COMMIT SOURCE ONLY

```bash
# TypeScript 源文件
**/*.ts

# 测试文件
**/*.test.ts

# 配置文件
**/tsconfig.json
**/package.json
**/vitest.config.ts

# 文档
*.md
docs/

# 示例（无密钥）
.env.example
```

## 🔒 安全检查 / Security Check

提交前运行：
```bash
# 检查是否有敏感文件
git diff --cached --name-only | grep -E "\\.env$|node_modules|dist/"

# 如果有输出，立即取消暂存
git reset HEAD <file-path>
```

## 📝 Commit 规范 / Commit Convention

```bash
feat: 新功能
fix: 修复 bug
docs: 文档更新
refactor: 重构
test: 测试
chore: 构建/工具
```

---

详细规则见: [CONTRIBUTING.md](../CONTRIBUTING.md)
