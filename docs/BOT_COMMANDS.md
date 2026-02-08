# 🤖 Simple Bot 管理命令

## 📋 快速参考

```bash
# 后台启动
pnpm start:bg
# 或直接运行
bash start-bg.sh

# 查看状态
pnpm status
# 或直接运行
bash status.sh

# 实时查看日志
pnpm logs
# 或直接运行
bash logs.sh

# 停止 bot
pnpm stop
# 或直接运行
bash stop.sh
```

## 📊 状态信息

运行 `pnpm status` 会显示：
- **PID**: 进程 ID
- **Uptime**: 运行时长
- **Memory**: 内存使用
- **CPU**: CPU 使用率
- **Recent logs**: 最近 10 条日志

## 📝 日志管理

- 日志文件位置: `logs/bot.log`
- 实时查看: `pnpm logs` (按 Ctrl+C 退出)
- 查看完整日志: `cat logs/bot.log`
- 查看最近 N 行: `tail -N logs/bot.log`

## 🛑 停止 Bot

优雅停止:
```bash
pnpm stop
```

如果进程无响应，会自动强制终止。

## 🔄 重启 Bot

```bash
pnpm stop && pnpm start:bg
```

## 📂 文件说明

| 文件 | 说明 |
|------|------|
| `start-bg.sh` | 后台启动脚本 |
| `stop.sh` | 停止脚本 |
| `status.sh` | 状态查看脚本 |
| `logs.sh` | 日志查看脚本 |
| `bot.pid` | 进程 ID 文件 (自动生成) |
| `logs/bot.log` | 日志文件 (自动生成) |
