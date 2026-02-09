/**
 * Omnichat SDK - 多渠道统一 Bot 示例
 *
 * 这个文件演示了如何使用 Omnichat SDK 构建一个支持多个平台的消息 bot。
 * 设计原则：
 * 1. 平台无关 - 核心逻辑不依赖特定平台
 * 2. 易于扩展 - 添加新平台只需配置，不需要修改核心逻辑
 * 3. 统一体验 - 所有平台使用相同的命令和功能
 *
 * 支持的平台：
 * - Telegram ✅ 当前实现
 * - Discord 🚧 待添加
 * - Slack 🚧 待添加
 *
 * 运行方法：
 *   cp .env.example .env
 *   # 编辑 .env 添加你的 bot tokens
 *   pnpm dev
 */

import { SDK, createAutoSaveMediaMiddleware, type ExtendedMessage } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";
import { loadConfig } from "./config.js";

// ============================================================================
// 配置
// ============================================================================

const CONFIG = {
  // Bot 配置
  botName: "Omnichat Multi-Platform Bot",

  // 功能开关
  features: {
    commands: true,        // 启用命令系统
    mediaHandling: true,   // 启用媒体处理
    autoSave: true,        // 自动保存媒体文件
    debug: true,           // 调试模式
    typing: true,          // 发送前显示 "typing..." 状态
  },

  // 消息路由
  routes: {
    // 在群组中是否只响应被 @ 提及的消息
    groupOnlyMentioned: true,
  },

  // 平台配置（易于扩展）
  platforms: {
    // 当前支持的平台
    enabled: ["telegram"],

    // 平台特定配置（使用 any 以支持不同平台的配置）
    telegram: {
      adapter: TelegramAdapter,
      getToken: (config: any) => config.telegram?.apiToken,
      getConfig: () => ({
        enableCache: true,
        enableQueue: true,
        queueConcurrency: 10,
      }),
    },

    // 未来添加平台示例：
    // discord: {
    //   adapter: DiscordAdapter,
    //   getToken: (config) => config.discord?.token,
    //   getConfig: () => ({...}),
    // },
  },
};

// ============================================================================
// 命令系统
// ============================================================================

interface Command {
  description: string;
  handler: (message: any, sdk: SDK, args: string[]) => Promise<void>;
}

const commands: Record<string, Command> = {
  // 基础命令
  help: {
    description: "显示所有可用命令",
    handler: async (message, sdk) => {
      const helpText = generateHelpText();
      await sdk.send(message.platform, { text: helpText }, { to: message.from.id });
    },
  },

  start: {
    description: "欢迎消息和使用指南",
    handler: async (message, sdk) => {
      const supportedPlatforms = CONFIG.platforms.enabled.join(", ").toUpperCase();
      const welcomeText = [
        `👋 欢迎使用 ${CONFIG.botName}！`,
        "",
        `🌍 支持平台: ${supportedPlatforms}`,
        "",
        "🤖 我是一个演示 bot，展示 Omnichat SDK 的多平台功能。",
        "",
        "💡 发送 /help 查看所有可用命令",
        "💡 直接发送任何消息，我会回复你",
        "",
        "📊 主要功能：",
        "  • 多平台统一接口",
        "  • 消息收发",
        "  • 命令系统",
        "  • 媒体处理",
        "  • 自动保存",
        "  • 错误恢复",
      ].join("\n");

      await sdk.send(message.platform, { text: welcomeText }, { to: message.from.id });
    },
  },

  id: {
    description: "获取你的 ID 和聊天 ID",
    handler: async (message, sdk) => {
      const info = [
        `🆔 你的 ID 信息 (${message.platform.toUpperCase()})`,
        "",
        `👤 用户 ID: ${message.from.id}`,
        `👤 用户名: ${message.from.username || "未设置"}`,
        `👥 聊天 ID: ${message.to.id}`,
        `📝 聊天类型: ${message.to.type}`,
        "",
        `🌍 平台: ${message.platform.toUpperCase()}`,
      ].join("\n");

      await sdk.send(message.platform, { text: info }, { to: message.from.id });
    },
  },

  // 演示功能
  buttons: {
    description: "演示交互按钮（需要 adapter 支持）",
    handler: async (message, sdk) => {
      // 注意：按钮功能需要特定 adapter 实现
      // 这里只做演示，实际使用请参考各 adapter 的文档
      await sdk.send(message.platform, {
        text: "⚠️ 按钮功能需要直接使用 adapter 的方法\n\n示例代码：\nconst adapter = sdk.getAdapter('telegram');\nawait adapter.sendButtons(chatId, 'Title', [[{text: 'A', data: 'a'}]]);",
      }, { to: message.from.id });
    },
  },

  poll: {
    description: "创建投票（需要 adapter 支持）",
    handler: async (message, sdk) => {
      // 注意：投票功能需要特定 adapter 实现
      // 这里只做演示，实际使用请参考各 adapter 的文档
      await sdk.send(message.platform, {
        text: "⚠️ 投票功能需要直接使用 adapter 的方法\n\n示例代码：\nconst adapter = sdk.getAdapter('telegram');\nawait adapter.sendPoll(chatId, 'Question?', ['A', 'B']);",
      }, { to: message.from.id });
    },
  },

  info: {
    description: "显示系统信息",
    handler: async (message, sdk, args) => {
      const target = args[0];

      if (target === "stats") {
        // 显示统计信息
        const stats = messageStore.getStats();
        await sdk.send("telegram", {
          text: [
            "📊 统计信息",
            "",
            `💬 总消息数: ${stats.totalMessages}`,
            `👥 唯一用户: ${stats.uniqueUsers}`,
            `📈 消息/秒: ${stats.messagesPerSecond}`,
            `⏱️  运行时间: ${stats.uptime}`,
          ].join("\n"),
        }, { to: message.from.id });
      } else if (target === "capabilities") {
        // 显示能力
        const caps = sdk.getCapabilities("telegram");
        await sdk.send("telegram", {
          text: [
            "🔋 SDK 能力",
            "",
            "📤 发送:",
            `  文本: ${caps?.base.sendText}`,
            `  媒体: ${caps?.base.sendMedia}`,
            "",
            "💬 会话:",
            `  回复: ${caps?.conversation.reply}`,
            `  编辑: ${caps?.conversation.edit}`,
            `  删除: ${caps?.conversation.delete}`,
            "",
            "🎮 交互:",
            `  按钮: ${caps?.interaction.buttons}`,
            `  投票: ${caps?.interaction.polls}`,
            `  反应: ${caps?.interaction.reactions}`,
          ].join("\n"),
        }, { to: message.from.id });
      } else {
        await sdk.send("telegram", {
          text: "📊 可用信息：stats, capabilities\n用法: /info [stats|capabilities]",
        }, { to: message.from.id });
      }
    },
  },

  // 聊天管理（管理员）
  kick: {
    description: "踢出用户（仅管理员）",
    handler: async (message, sdk, args) => {
      // 这个功能需要额外的参数验证和权限检查
      await sdk.send("telegram", {
        text: "⚠️  此功能需要管理员权限\n\n用法: /kick @username 或 /kick user_id",
      }, { to: message.from.id });
    },
  },
};

// 生成帮助文本
function generateHelpText(): string {
  const lines = [
    "📚 命令列表",
    "",
  ];

  for (const [cmd, info] of Object.entries(commands)) {
    lines.push(`/${cmd.padEnd(12)} - ${info.description}`);
  }

  lines.push("", "💡 提示: 可以直接发送消息，我会回复你");

  return lines.join("\n");
}

// ============================================================================
// 消息存储和统计
// ============================================================================

class MessageStore {
  private messages: Map<string, any[]> = new Map();
  private startTime: number = Date.now();

  add(message: any) {
    const platform = message.platform;
    if (!this.messages.has(platform)) {
      this.messages.set(platform, []);
    }
    this.messages.get(platform)!.push(message);
  }

  getStats() {
    const totalMessages = Array.from(this.messages.values()).flat().length;
    const uniqueUsers = new Set(
      Array.from(this.messages.values()).flat().map(m => m.from.id)
    ).size;
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const messagesPerSecond = (totalMessages / uptime).toFixed(2);

    return {
      totalMessages,
      uniqueUsers,
      messagesPerSecond,
      uptime: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
    };
  }
}

const messageStore = new MessageStore();

// ============================================================================
// 按钮处理器
// ============================================================================

async function handleButtonPress(buttonData: string, message: any, sdk: SDK) {
  console.log(`🔘 Button pressed: ${buttonData}`);

  const responses: Record<string, string> = {
    "option_a": "✅ 你选择了：选项 A",
    "option_b": "❌ 你选择了：选项 B",
    "option_c": "⚠️  你选择了：选项 C",
  };

  const response = responses[buttonData] || `❓ 未知选项: ${buttonData}`;

  await sdk.send("telegram", { text: response }, { to: message.from.id });
}

// ============================================================================
// 消息处理器
// ============================================================================

async function handleMessage(message: any, sdk: SDK) {
  // 存储消息
  messageStore.add(message);

  // 扩展消息以获取额外信息
  const extendedMsg = message as ExtendedMessage;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📨 新消息");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`平台: ${message.platform.toUpperCase()}`);
  console.log(`发送者: ${message.from.name} (${message.from.id})`);
  console.log(`聊天: ${message.to.name || message.to.id} (${message.to.type})`);
  console.log(`类型: ${message.type}`);
  console.log(`内容: ${message.content.text || message.content.mediaUrl || "[其他]"}`);

  if (extendedMsg.mediaSaved) {
    console.log(`💾 媒体已保存: ${extendedMsg.storageKey}`);
  }

  if (message.replyTo) {
    console.log(`↩ 回复: ${message.replyTo.messageId}`);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const text = message.content.text?.trim() || "";
  const cleanText = text.replace(/^@\w+\s+/, '').toLowerCase();

  // 检查是否在群组中被 @ 提及
  const isMentioned = text.match(/^@\w+/) ||
                    text.toLowerCase().includes(`@${message.to.name?.toLowerCase()}`);

  // 在群组中，只响应被 @ 提及的消息
  if (message.to.type !== "user" && !isMentioned && CONFIG.routes.groupOnlyMentioned) {
    console.log("⏭️  群组消息，bot 未被 @ 提及，跳过");
    return;
  }

  // 显示 typing 状态
  if (CONFIG.features.typing) {
    try {
      const adapter = sdk.getAdapter(message.platform) as any;
      if (adapter?.sendChatAction) {
        await adapter.sendChatAction(message.from.id, "typing");
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      // 忽略 typing 状态错误，不影响主流程
      console.debug("⚠️  发送 typing 状态失败（已忽略）:", error);
    }
  }

  try {
    // 处理命令
    if (cleanText.startsWith("/")) {
      const parts = cleanText.split(" ");
      const cmd = parts[0].substring(1); // 移除 /
      const args = parts.slice(1);

      if (commands[cmd]) {
        console.log(`📤 执行命令: /${cmd}`);
        await commands[cmd].handler(message, sdk, args);
        console.log("✅ 命令执行完成");
      } else {
        console.log(`⚠️  未知命令: /${cmd}`);
        await sdk.send(message.platform, {
          text: `❓ 未知命令: /${cmd}\n\n发送 /help 查看所有命令`,
        }, { to: message.from.id });
      }
      return;
    }

    // 处理按钮回调
    if (message.callbackQuery) {
      await handleButtonPress(message.callbackQuery.data, message, sdk);
      return;
    }

    // 默认：回显消息
    console.log("📤 回显消息");

    let replyText = `Echo #${messageStore.getStats().totalMessages}`;
    if (text) {
      replyText += `: ${text}`;
    }

    const sendOptions: any = { to: message.from.id };

    // 如果是回复，引用原消息
    if (message.messageId) {
      sendOptions.replyToMessageId = message.messageId;
    }

    // 处理媒体
    if (message.content.mediaUrl) {
      await sdk.send(message.platform, {
        mediaUrl: message.content.mediaUrl,
        mediaType: message.content.mediaType,
        text: replyText,
      }, sendOptions);

      if (extendedMsg.storageKey) {
        await sdk.send(message.platform, {
          text: `💾 已保存: ${extendedMsg.storageKey}`,
        }, { to: message.from.id });
      }
    } else {
      // 纯文本
      await sdk.send(message.platform, { text: replyText }, sendOptions);
    }

    console.log("✅ 回复已发送");

  } catch (error: any) {
    console.error("❌ 处理消息时出错:");
    console.error(`   错误: ${error.message}`);
    if (error.stack) {
      console.error(`   堆栈: ${error.stack}`);
    }

    // 尝试发送错误消息
    try {
      await sdk.send(message.platform, {
        text: `❌ 处理消息时出错: ${error.message}`,
      }, { to: message.from.id });
    } catch (sendError) {
      console.error("❌ 无法发送错误消息:", sendError);
    }
  }
}

// ============================================================================
// 主程序
// ============================================================================

async function main() {
  // 全局未捕获异常处理
  process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error.message);
    console.error('   错误将不会导致 bot 崩溃');
    // 不退出进程，让 bot 继续运行
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    console.error('   错误将不会导致 bot 崩溃');
    // 不退出进程，让 bot 继续运行
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🚀 ${CONFIG.botName}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // 加载配置
  const config = loadConfig();

  if (!config.telegram?.apiToken) {
    console.error("❌ 错误: 未找到 Telegram Bot Token");
    console.error("");
    console.error("💡 解决方法:");
    console.error("   1. 复制 .env.example 到 .env");
    console.error("   2. 在 .env 中添加 TELEGRAM_BOT_TOKEN=your_token");
    console.error("");
    process.exit(1);
  }

  console.log("📋 配置信息:");
  console.log(`   Bot Token: ${config.telegram.apiToken.substring(0, 15)}...`);
  console.log(`   Polling: ${config.telegram.polling ? "✅" : "❌"}`);
  console.log("");

  // 初始化 SDK
  console.log("🔧 初始化 SDK...");

  // 动态构建 adapters 配置
  const adaptersConfig: Record<string, any> = {};

  // 遍历启用的平台
  for (const platform of CONFIG.platforms.enabled) {
    const platformConfig = (CONFIG.platforms as any)[platform];

    if (!platformConfig) {
      console.warn(`⚠️  跳过未配置的平台: ${platform}`);
      continue;
    }

    const token = platformConfig.getToken(config);
    if (!token) {
      console.warn(`⚠️  跳过未配置 token 的平台: ${platform}`);
      console.warn(`   请在 .env 中配置该平台的 token`);
      continue;
    }

    adaptersConfig[platform] = {
      class: platformConfig.adapter,
      config: {
        apiToken: token,
        ...platformConfig.getConfig(),
      },
    };

    console.log(`   ✅ ${platform.toUpperCase()}: 已配置`);
  }

  if (Object.keys(adaptersConfig).length === 0) {
    console.error("❌ 错误: 没有可用的平台配置");
    console.error("");
    console.error("💡 解决方法:");
    console.error("   1. 复制 .env.example 到 .env");
    console.error("   2. 在 .env 中添加至少一个平台的 bot token");
    console.error("");
    process.exit(1);
  }

  const sdk = new SDK({
    adapters: adaptersConfig,
    globalConfig: {
      debug: CONFIG.features.debug,
    },
  });

  // 添加媒体自动保存中间件
  if (CONFIG.features.autoSave) {
    console.log("💾 添加媒体自动保存中间件...");
    sdk.use(createAutoSaveMediaMiddleware({
      platforms: CONFIG.platforms.enabled,
      mediaTypes: ["image", "video", "audio", "file", "sticker"],
      downloadFile: true,
    }));
  }

  try {
    await sdk.init();
    console.log("✅ SDK 初始化成功");
    console.log("");

    // 显示每个平台的能力
    for (const platform of CONFIG.platforms.enabled) {
      const caps = sdk.getCapabilities(platform);
      if (caps) {
        console.log(`📊 ${platform.toUpperCase()} 能力:`);
        console.log(`   基础: 发送文本=${caps?.base.sendText}, 发送媒体=${caps?.base.sendMedia}, 接收=${caps?.base.receive}`);
        console.log(`   会话: 回复=${caps?.conversation.reply}, 编辑=${caps?.conversation.edit}, 删除=${caps?.conversation.delete}`);
        console.log(`   交互: 按钮=${caps?.interaction.buttons}, 投票=${caps?.interaction.polls}, 反应=${caps?.interaction.reactions}`);
        console.log("");
      }
    }

  } catch (error: any) {
    console.error("❌ SDK 初始化失败!");
    console.error(`   错误: ${error.message}`);
    if (error.stack) {
      console.error(`   堆栈: ${error.stack}`);
    }
    console.error("");
    console.error("💡 故障排查:");
    console.error("   1. 检查 bot token 是否正确");
    console.error("   2. 检查网络连接");
    console.error("   3. 检查 bot 是否在 BotFather 中启用");
    console.error("");
    process.exit(1);
  }

  // 注册消息处理器
  console.log("🎯 注册消息处理器...");
  sdk.on((message) => handleMessage(message, sdk));

  // 显示功能状态
  console.log("");
  console.log("🔧 功能状态:");
  console.log(`   命令系统: ${CONFIG.features.commands ? "✅" : "❌"}`);
  console.log(`   媒体处理: ${CONFIG.features.mediaHandling ? "✅" : "❌"}`);
  console.log(`   自动保存: ${CONFIG.features.autoSave ? "✅" : "❌"}`);
  console.log(`   Typing 状态: ${CONFIG.features.typing ? "✅" : "❌"}`);
  console.log(`   调试模式: ${CONFIG.features.debug ? "✅" : "❌"}`);
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Bot 已就绪，正在监听消息");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("💡 发送 /help 查看所有命令");
  console.log("💡 发送 /start 开始使用");
  console.log("💡 直接发送任何消息，我会回复你");
  console.log("");
  console.log("按 Ctrl+C 停止");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // 优雅关闭
  const cleanup = async () => {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🛑 正在关闭...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    const stats = messageStore.getStats();
    console.log("📊 最终统计:");
    console.log(`   总消息数: ${stats.totalMessages}`);
    console.log(`   唯一用户: ${stats.uniqueUsers}`);
    console.log(`   运行时间: ${stats.uptime}`);
    console.log("");

    try {
      await sdk.destroy();
      console.log("✅ SDK 已销毁");
    } catch (error) {
      console.error("❌ 销毁 SDK 时出错:", error);
    }

    console.log("");
    console.log("👋 再见！");
    console.log("");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

// 运行主程序
main().catch((error) => {
  console.error("");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("💥 致命错误!");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error(error);
  if (error instanceof Error) {
    console.error(`消息: ${error.message}`);
    console.error(`堆栈: ${error.stack}`);
  }
  console.error("");
  process.exit(1);
});
