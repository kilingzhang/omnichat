# 命令注册系统使用指南

## Bot 行为说明

### 隐私保护
- ✅ **私聊**: Bot 会响应所有消息
- 🔒 **群组**: Bot **只响应被 @ 提及的消息**
  - 例如：`@imsdkbot /id` ✅
  - 例如：`/id` ❌（会被忽略）

这样保护了群组的隐私，bot 不会读取所有群组消息。

## 如何添加新命令

所有的命令都在 `simple-bot.ts` 文件的 `commands` 对象中统一注册和管理。

### 步骤：

1. **在 `commands` 对象中添加新命令**

```typescript
const commands: Record<string, CommandHandler> = {
  // ... 现有命令 ...

  "/mycommand": {
    description: "这是我的新命令描述",
    handler: async (message, sdk) => {
      console.log("📤 Command: /mycommand");

      // 你的命令逻辑
      await sdk.send("telegram", {
        text: "执行了我的命令！",
      }, {
        to: message.from.id,
      });

      console.log("✅ Command executed");
    },
  },
};
```

2. **就这样！** 新命令会自动：
   - 在 `/start` 和 `/help` 中显示
   - 可以被命令路由识别和处理
   - 显示在帮助文本中

### 示例：添加一个带参数的命令

```typescript
"/weather": {
  description: "查询天气 /weather [city]",
  handler: async (message, sdk) => {
    const text = message.content.text || "";
    const args = text.split(" ");
    const city = args[1] || "北京";

    console.log("📤 Command: /weather", city);

    await sdk.send("telegram", {
      text: `🌤️ ${city}的天气：晴天 25°C`,
    }, {
      to: message.from.id,
    });

    console.log("✅ Weather info sent");
  },
},
```

### 当前可用命令：

- `/start` - 显示欢迎消息和使用帮助
- `/help` - 显示所有可用命令
- `/id` - 获取 Chat ID 和 User ID（用于测试）
- `/info` - 获取信息 `/info [media|user|msg]`

### 优点：

✅ **统一管理** - 所有命令在一个地方定义
✅ **自动同步** - `/help` 自动包含所有命令
✅ **易于维护** - 添加/修改命令只需要改一个地方
✅ **不会遗漏** - 新命令自动出现在帮助中
