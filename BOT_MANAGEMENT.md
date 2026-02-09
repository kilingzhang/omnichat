# Bot 后台运行管理指南

## 🚀 快速开始

### 1. 编译项目

```bash
cd packages/examples
pnpm build
```

### 2. 后台启动 Bot

```bash
pnpm start:bg
```

输出示例：
```
🚀 Starting unified-bot in background...
✅ Bot started successfully!
   PID: 12345
   Log file: logs/bot.log

📊 Commands:
   pnpm status   - Show bot status
   pnpm logs     - View live logs
   pnpm stop     - Stop the bot

💡 View logs: tail -f logs/bot.log
```

---

## 📊 可用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `pnpm start:bg` | 后台启动 bot | `pnpm start:bg` |
| `pnpm stop` | 停止 bot | `pnpm stop` |
| `pnpm restart` | 重启 bot | `pnpm restart` |
| `pnpm status` | 查看运行状态 | `pnpm status` |
| `pnpm logs` | 查看实时日志 | `pnpm logs` |
| `pnpm logs -n 50` | 查看最近 50 行 | `pnpm logs -n 50` |
| `pnpm logs -f ERROR` | 过滤错误日志 | `pnpm logs -f ERROR` |
| `pnpm logs -s` | 静态查看日志 | `pnpm logs -s` |

---

## 📝 日志查看详解

### 基础用法

```bash
# 实时查看日志（默认最后 100 行）
pnpm logs

# 查看最后 50 行
pnpm logs -n 50

# 静态查看（不实时更新）
pnpm logs -s
```

### 高级过滤

```bash
# 只查看包含 "ERROR" 的日志
pnpm logs -f ERROR

# 只查看包含 "✅" 的日志
pnpm logs -f "✅"

# 查看帮助
pnpm logs -h
```

### 直接使用 tail

```bash
# 实时查看所有日志
tail -f logs/bot.log

# 查看最后 20 行
tail -n 20 logs/bot.log

# 查看并搜索
tail -f logs/bot.log | grep "ERROR"
```

---

## 🔍 状态查看

```bash
pnpm status
```

输出示例：
```
📊 Bot Status: RUNNING
   PID: 12345
   Uptime: 01:23:45
   Memory: 45.2MB
   CPU: 0.5%

📝 Recent logs (last 10 lines):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Initializing Omnichat Multi-Platform Bot...
✅ SDK initialized successfully!
🎯 Bot is running. Press Ctrl+C to stop.
```

---

## 🛑 停止和重启

### 停止 Bot

```bash
pnpm stop
```

输出：
```
🛑 Stopping bot (PID: 12345)...
✅ Bot stopped successfully
```

### 重启 Bot

```bash
pnpm restart
```

输出：
```
🔄 Restarting bot...

🛑 Stopping current bot...
✅ Bot stopped successfully

🚀 Starting bot...
✅ Bot started successfully!

✅ Bot restarted successfully!
   Use 'pnpm logs' to view logs
```

---

## 📂 文件说明

### 生成的文件

```
packages/examples/
├── bot.pid           # 进程 ID 文件（自动生成）
└── logs/
    └── bot.log       # 运行日志（自动生成）
```

### .gitignore

以下文件已被忽略，不会提交到 git：
- `bot.pid` - 进程 ID
- `logs/` - 日志目录
- `.env` - 环境变量
- `storage/` - 媒体存储

---

## 🐛 故障排查

### Bot 无法启动

**检查清单：**

1. **编译项目**
   ```bash
   pnpm build
   ```

2. **检查 .env 文件**
   ```bash
   ls -la .env
   cat .env | grep TELEGRAM_BOT_TOKEN
   ```

3. **查看日志**
   ```bash
   cat logs/bot.log
   ```

4. **检查端口占用**
   ```bash
   lsof -i :443  # Telegram webhook
   ```

### Bot 意外停止

**查看日志找出原因：**
```bash
# 查看错误日志
pnpm logs -f ERROR

# 或查看完整日志
tail -100 logs/bot.log
```

### 无法停止 Bot

**强制停止：**
```bash
# 读取 PID
cat bot.pid

# 强制杀死进程
kill -9 $(cat bot.pid)

# 清理 PID 文件
rm bot.pid
```

---

## 🔧 手动管理

### 不使用脚本启动

```bash
# 编译
pnpm build

# 后台运行
nohup node dist/unified-bot.js > logs/bot.log 2>&1 &

# 保存 PID
echo $! > bot.pid
```

### 不使用脚本查看日志

```bash
# 实时查看
tail -f logs/bot.log

# 查看最后 N 行
tail -n 50 logs/bot.log

# 搜索关键字
grep "ERROR" logs/bot.log

# 查看实时错误
tail -f logs/bot.log | grep "ERROR"
```

---

## 💡 最佳实践

### 1. 启动前检查

```bash
# 确保项目已编译
pnpm build

# 检查环境变量
cat .env

# 检查是否已运行
pnpm status
```

### 2. 修改代码后重启

```bash
# 1. 重新编译
pnpm build

# 2. 重启 bot
pnpm restart

# 3. 查看日志确认
pnpm logs -n 20
```

### 3. 生产环境建议

```bash
# 使用 PM2（推荐）
npm install -g pm2

# 启动
pm2 start dist/unified-bot.js --name omnichat-bot

# 查看状态
pm2 status

# 查看日志
pm2 logs omnichat-bot

# 重启
pm2 restart omnichat-bot

# 停止
pm2 stop omnichat-bot
```

---

## 📊 日志分析

### 常见日志模式

```bash
# 统计错误数量
grep -c "ERROR" logs/bot.log

# 查看所有警告
grep "WARN" logs/bot.log

# 查看最近的消息
grep "📨 New message" logs/bot.log | tail -10

# 查看命令执行
grep "📤 执行命令" logs/bot.log
```

### 日志清理

```bash
# 清空日志（保留文件）
> logs/bot.log

# 备份日志
cp logs/bot.log logs/bot.log.backup

# 删除旧日志（保留最近 1000 行）
tail -n 1000 logs/bot.log > logs/bot.log.tmp
mv logs/bot.log.tmp logs/bot.log
```

---

## 🎯 快速参考卡

```
┌─────────────────────────────────────┐
│     Bot 后台运行快速参考            │
├─────────────────────────────────────┤
│ 启动:  pnpm start:bg                │
│ 停止:  pnpm stop                     │
│ 重启:  pnpm restart                  │
│ 状态:  pnpm status                   │
│ 日志:  pnpm logs                     │
├─────────────────────────────────────┤
│ 查看最近 50 行: pnpm logs -n 50      │
│ 过滤错误:      pnpm logs -f ERROR    │
│ 静态查看:      pnpm logs -s          │
├─────────────────────────────────────┤
│ 日志位置: logs/bot.log               │
│ PID 文件: bot.pid                    │
└─────────────────────────────────────┘
```

---

## 📞 获取帮助

如果遇到问题：

1. 查看日志：`pnpm logs`
2. 检查状态：`pnpm status`
3. 查看文档：`cat README.md`
4. 查看重构总结：`cat REFACTORING_COMPLETE.md`

---

**🎉 现在你的 bot 可以在后台稳定运行了！**
