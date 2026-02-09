# 🚀 快速开始 - 后台运行 Bot

## 第一次使用

### 1. 编译项目

```bash
pnpm --filter @omnichat/example build
```

### 2. 配置环境变量

```bash
cd packages/examples
cp .env.example .env
# 编辑 .env 添加 TELEGRAM_BOT_TOKEN
```

### 3. 后台启动

```bash
pnpm start:bg
```

看到这个就成功了：
```
✅ Bot started successfully!
   PID: 12345
   Log file: logs/bot.log
```

---

## 日常使用

### 启动 Bot
```bash
pnpm start:bg
```

### 查看状态
```bash
pnpm status
```

### 查看实时日志
```bash
pnpm logs
```

### 重启 Bot（代码更新后）
```bash
# 1. 重新编译
pnpm --filter @omnichat/example build

# 2. 重启
pnpm restart
```

### 停止 Bot
```bash
pnpm stop
```

---

## 📝 日志高级用法

```bash
# 查看最近 50 行
pnpm logs -n 50

# 只看错误
pnpm logs -f ERROR

# 静态查看（不实时）
pnpm logs -s

# 查看帮助
pnpm logs -h
```

---

## 🔧 脚本命令对照表

| pnpm 命令 | 实际执行的脚本 | 说明 |
|-----------|---------------|------|
| `pnpm start:bg` | `bash start-bg.sh` | 后台启动 |
| `pnpm stop` | `bash stop.sh` | 停止 |
| `pnpm restart` | `bash restart.sh` | 重启 |
| `pnpm status` | `bash status.sh` | 状态 |
| `pnpm logs` | `bash logs-enhanced.sh` | 日志 |

---

## 文件位置

```
packages/examples/
├── bot.pid          # 进程 ID（自动生成）
├── logs/
│   └── bot.log      # 日志文件（自动生成）
├── start-bg.sh      # 启动脚本
├── stop.sh          # 停止脚本
├── restart.sh       # 重启脚本
├── status.sh        # 状态脚本
└── logs-enhanced.sh # 日志脚本
```

---

## 💡 提示

1. **修改代码后**：必须先 `pnpm build` 再 `pnpm restart`
2. **查看日志**：使用 `pnpm logs` 实时查看
3. **检查状态**：使用 `pnpm status` 查看 CPU/内存
4. **过滤日志**：使用 `pnpm logs -f ERROR` 只看错误

---

**完整文档**: 查看 `BOT_MANAGEMENT.md`
