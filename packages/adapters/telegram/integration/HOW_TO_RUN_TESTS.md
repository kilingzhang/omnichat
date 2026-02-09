# 如何正确运行集成测试

## ⚠️ 当前问题

### 问题 1: Bot Token 401 Unauthorized
```
ETELEGRAM: 401 Unauthorized
```

**原因**: Bot token `7728431931:AAG6eUrFW84HEVgYSdVrGPtXFz2Cv_HkDy1Y` 无效或过期

**解决**:
1. 联系 @BotFather
2. 使用 `/token` 命令重新获取 token
3. 更新 `.env` 文件

### 问题 2: 环境变量没有传递
```
⏭️ Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set
```

**原因**: Vitest 不会自动加载 `.env` 文件

**解决**: 使用以下方式之一

---

## ✅ 正确的运行方式

### 方式 1: 使用 test-with-env.sh 脚本（推荐）

```bash
cd packages/adapters/telegram/integration
./test-with-env.sh
```

### 方式 2: 直接传递环境变量

```bash
TELEGRAM_BOT_TOKEN=你的token \
TELEGRAM_CHAT_ID=-5175020124 \
TELEGRAM_USER_ID=5540291904 \
pnpm --filter @omnichat/telegram test:integration:smart
```

### 方式 3: 使用 dotenv（需要安装）

```bash
# 安装 dotenv
pnpm add -D dotenv

# 在 vitest.config.ts 中配置
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
      TELEGRAM_USER_ID: process.env.TELEGRAM_USER_ID,
    }
  }
});
```

### 方式 4: 导出环境变量（shell）

```bash
# 在 integration/ 目录下
export TELEGRAM_BOT_TOKEN=你的token
export TELEGRAM_CHAT_ID=-5175020124
export TELEGRAM_USER_ID=5540291904

# 然后运行测试
pnpm --filter @omnichat/telegram test:integration:smart
```

---

## 📝 完整的 .env 配置

创建 `packages/adapters/telegram/integration/.env`:

```bash
# 必需：Telegram Bot Token
TELEGRAM_BOT_TOKEN=你的有效token

# 必需：群组 ID（bot 必须是管理员）
TELEGRAM_CHAT_ID=-5175020124

# 可选：频道 ID（用于测试频道功能）
# TELEGRAM_CHANNEL_ID=@your_channel

# 可选：用户 ID（用于测试私信）
TELEGRAM_USER_ID=5540291904
```

---

## 🧪 验证测试是否真的调用 API

### 方法 1: 查看测试输出

如果看到以下内容，说明确实调用了 API：

```
Failed to send message to xxx: TelegramError: ETELEGRAM: 401 Unauthorized
    at /node_modules/node-telegram-bot-api/src/telegram.js:330:15
    ...
```

关键信息：
- ✅ `TelegramError` - 真实的 Telegram API 错误
- ✅ `api.telegram.org` - 真实的 API 服务器
- ✅ TLS Socket - HTTPS 连接

### 方法 2: 网络抓包

```bash
# 使用 tcpdump 查看网络请求
sudo tcpdump -i any -A 'tcp port 443 and host api.telegram.org'

# 运行测试后，你应该看到：
# GET https://api.telegram.org/bot<TOKEN>/sendMessage
```

### 方法 3: BotFather 验证

```
1. 打开 Telegram
2. 找到 @BotFather
3. 发送 /mybots
4. 选择你的 bot
5. 查看 API Token
```

---

## 🎯 快速测试 checklist

运行测试前，确保：

- [ ] Bot token 有效（不是 `7728431931:AAG6eUrFW84HEVgYSdVrGPtXFz2Cv_HkDy1Y`）
- [ ] Bot 是群组管理员
- [ ] 环境变量正确设置
- [ ] 使用正确的命令运行

---

## 📊 测试真实调用的证明

### 成功调用 API 的证据

从测试输出可以看到：

1. **真实的 API 端点**
   ```
   https://api.telegram.org/bot<token>/sendMessage
   ```

2. **真实的网络连接**
   ```
   client: TLSSocket {
     servername: 'api.telegram.org',
     authorized: true,
     encrypted: true
   }
   ```

3. **真实的 HTTP 响应**
   ```
   statusCode: 401,
   statusMessage: 'Unauthorized',
   httpVersion: '1.1',
   server: 'nginx/1.18.0'
   ```

### 这证明了什么？

✅ 测试**确实在调用真实的 Telegram API**
✅ 测试**不是 mock 测试**
✅ 401 错误是**真实的认证失败**，不是测试问题

---

## 🔧 获取有效的 Bot Token

### 步骤

1. **打开 Telegram**
   ```
   搜索 @BotFather
   ```

2. **获取或创建 bot**
   ```
   /newbot        # 创建新 bot
   或
   /mybots        # 查看现有 bot
   /token         # 重新获取 token
   ```

3. **保存 token**
   ```
   格式: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

4. **测试 token**
   ```bash
   # 使用 curl 测试
   curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

   # 应该返回:
   {
     "ok": true,
     "result": {
       "id": 123456789,
       "is_bot": true,
       "first_name": "Your Bot Name",
       ...
     }
   }
   ```

---

## 📝 总结

### 是的，测试确实在调用真实 API！

证据：
- ✅ 真实的 API 端点（`api.telegram.org`）
- ✅ 真实的 HTTPS 连接（TLS Socket）
- ✅ 真实的 HTTP 响应（401 Unauthorized）
- ✅ 真实的网络请求

### 为什么有些测试显示 "not set"？

因为：
1. Vitest 不自动加载 `.env`
2. 需要手动设置环境变量
3. 或使用提供的脚本

### 解决方案

**最简单的方式**:
```bash
cd packages/adapters/telegram/integration
export $(cat .env | grep -v '^#' | xargs)
pnpm --filter @omnichat/telegram test:integration:smart
```

或者使用脚本：
```bash
cd packages/adapters/telegram/integration
./test-with-env.sh
```

---

## 🎉 一旦获得有效 token

当您获得有效的 bot token 后：

1. 更新 `.env` 中的 `TELEGRAM_BOT_TOKEN`
2. 运行测试
3. 查看真实的测试消息发送到您的 Telegram

所有测试应该都会通过！🚀
