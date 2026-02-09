import { SDK, createAutoSaveMediaMiddleware, type ExtendedMessage } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";
import type { Message } from "@omnichat/core";
import { loadConfig } from "./config.js";

// ============================================================================
// Command Registry - 统一管理所有命令
// ============================================================================

interface CommandHandler {
  description: string;
  handler: (message: Message, sdk: SDK) => Promise<void>;
}

const commands: Record<string, CommandHandler> = {
  "/start": {
    description: "显示欢迎消息和使用帮助",
    handler: async (message, sdk) => {
      const helpText = generateHelpText();
      await sdk.send("telegram", { text: helpText }, { to: message.from.id });
      console.log("✅ Welcome message sent");
    },
  },

  "/help": {
    description: "显示所有可用命令",
    handler: async (message, sdk) => {
      const helpText = generateHelpText();
      await sdk.send("telegram", { text: helpText }, { to: message.from.id });
      console.log("✅ Help message sent");
    },
  },

  "/id": {
    description: "获取 Chat ID 和 User ID（用于测试）",
    handler: async (message, sdk) => {
      console.log("📤 Command: /id");
      console.log("━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🆔 IDs for testing:");

      const isPrivateChat = message.to.type === "user";

      if (isPrivateChat) {
        // Private chat: chat ID is the same as user ID
        console.log("   Chat Type: Private (Direct Message)");
        console.log("   Chat ID/User ID:", message.from.id);
        console.log("━━━━━━━━━━━━━━━━━━━━━━");

        const idInfo = [
          "🆔 Chat & User IDs (Private Chat)",
          "",
          "📝 Chat Type: Private (Direct Message)",
          `👤 Your ID: ${message.from.id}`,
          "",
          "💡 For integration tests, use:",
          `   TELEGRAM_CHAT_ID=${message.from.id}`,
          `   TELEGRAM_USER_ID=${message.from.id}`,
          "",
          "⚠️ Note: In private chats, Chat ID = User ID",
        ];

        await sdk.send("telegram", { text: idInfo.join("\n") }, { to: message.from.id });
      } else {
        // Group/Channel chat
        console.log("   Chat Type:", message.to.type);
        console.log("   Chat ID:", message.to.id);
        console.log("   User ID:", message.from.id);
        console.log("━━━━━━━━━━━━━━━━━━━━━━");

        const idInfo = [
          "🆔 Chat & User IDs",
          "",
          `👥 Chat ID: ${message.to.id}`,
          `👤 User ID: ${message.from.id}`,
          `📝 Chat Type: ${message.to.type}`,
          "",
          "💡 Copy these for integration tests:",
          `   TELEGRAM_CHAT_ID=${message.to.id}`,
          `   TELEGRAM_USER_ID=${message.from.id}`,
        ];

        await sdk.send("telegram", { text: idInfo.join("\n") }, { to: message.from.id });
      }

      console.log("✅ ID info sent");
    },
  },

  "/info": {
    description: "获取信息 /info [media|user|msg]",
    handler: async (message, sdk) => {
      const text = message.content.text ? message.content.text.trim() : "";
      const args = text.split(" ");
      const target = args[1];

      console.log("📤 Command: /info", target || "[no args]");

      if (!target) {
        // 没有参数时显示当前消息的基本信息
        const response = [
          `📊 当前消息信息:`,
          `类型: ${message.content.mediaType || "文本"}`,
          `消息ID: ${message.messageId}`,
          `发送者: ${message.from.name || message.from.id}`,
          `发送者ID: ${message.from.id}`,
        ];
        if (message.content.mediaUrl) {
          response.push(`媒体URL: ${message.content.mediaUrl}`);
        }
        if (message.content.text) {
          response.push(`文本: ${message.content.text}`);
        }

        await sdk.send("telegram", { text: response.join("\n") }, { to: message.from.id });
        console.log("✅ Message info sent");
        return;
      }

      if (target === "media") {
        const hasMedia = message.content.mediaUrl && message.content.mediaUrl.startsWith("http");
        if (!hasMedia) {
          await sdk.send("telegram", { text: "❓ This message has no media" }, { to: message.from.id });
          console.log("⚠️ No media found");
        } else {
          await sdk.send("telegram", {
            text: `📊 Media Info:\n\nType: ${message.content.mediaType}\nURL: ${message.content.mediaUrl}\nMessage ID: ${message.messageId}`,
          }, { to: message.from.id });
          console.log("✅ Media info sent");
        }
      } else if (target === "user") {
        await sdk.send("telegram", {
          text: `👤 User Info:\n\nName: ${message.from.name || "N/A"}\nID: ${message.from.id}\nType: ${message.from.type}`,
        }, { to: message.from.id });
        console.log("✅ User info sent");
      } else if (target === "msg") {
        await sdk.send("telegram", {
          text: `📨 Message Info:\n\nType: ${message.type}\nID: ${message.messageId}\nFrom: ${message.from.id}\nText: ${message.content.text || "[No text]"}`,
        }, { to: message.from.id });
        console.log("✅ Message info sent");
      } else {
        await sdk.send("telegram", { text: "❓ Unknown info type. Try: media, user, msg" }, { to: message.from.id });
        console.log("⚠️ Unknown target");
      }
    },
  },
};

// 生成帮助文本（自动从命令注册表生成）
function generateHelpText(): string {
  const lines = [
    "🤖 Welcome to Simple Bot!",
    "",
    "💬 Just send me anything and I'll echo back!",
    "",
    "💡 Available Commands:",
  ];

  for (const [cmd, info] of Object.entries(commands)) {
    lines.push(`   ${cmd} - ${info.description}`);
  }

  return lines.join("\n");
}

// ============================================================================
// Main Application
// ============================================================================

async function main() {
  console.log("🚀 Starting Simple Bot...");
  console.log("━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const config = loadConfig();

  if (!config.telegram || !config.telegram.apiToken) {
    console.error("❌ Telegram configuration is missing or incomplete!");
    console.error("💡 Please set TELEGRAM_BOT_TOKEN in your .env file");
    process.exit(1);
  }

  console.log("📋 Bot Token: " + config.telegram.apiToken.substring(0, 15) + "...");
  console.log("🔑 Token Length: " + config.telegram.apiToken.length);
  console.log("");

  console.log("📡 Initializing SDK...");
  const sdk = new SDK({
    adapters: {
      telegram: {
        class: TelegramAdapter,
        config: {
          apiToken: config.telegram.apiToken,
          polling: config.telegram.polling,
        },
      },
    },
    storage: {
      type: "local",
      basePath: "./storage",
      autoSaveMedia: true,
      namingStrategy: "timestamp",
    },
  });

  // Add auto-save media middleware
  sdk.use(createAutoSaveMediaMiddleware({
    platforms: ["telegram"],
    mediaTypes: ["image", "video", "audio", "file"],
    downloadFile: true,
  }));

  console.log("  SDK instance created");
  console.log("");

  try {
    console.log("📡 Connecting to Telegram API...");
    await sdk.init();
    console.log("");
    console.log("✅ Bot initialized successfully!");
    console.log("");

    const caps = sdk.getCapabilities("telegram");
    if (caps) {
      console.log("📊 Telegram Capabilities:");
      console.log("   Send Text: " + caps.base.sendText);
      console.log("   Send Media: " + caps.base.sendMedia);
      console.log("   Receive: " + caps.base.receive);
      console.log("");
    }
  } catch (error: any) {
    console.error("❌ Initialization failed!");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    if (error.stack) {
      console.error("Stack Trace:", error.stack);
    }
    console.error("");
    console.error("💡 Troubleshooting:");
    console.error("   1. Check if token is correct");
    console.error("   2. Check if bot is enabled in BotFather");
    console.error("   3. Check bot permissions");
    console.error("   4. Check network connection");
    process.exit(1);
  }

  let messageCount = 0;
  const startTime = Date.now();

  console.log("🎯 Setting up message handler...");
  console.log("");

  sdk.on(async (message: Message) => {
    messageCount++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📨 Incoming Message #" + messageCount);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("📥 Platform:", message.platform.toUpperCase());
    console.log("👤 From:", message.from.name || message.from.id);
    console.log("👤 From ID:", message.from.id);
    console.log("👥 To:", message.to.name || message.to.id || message.to.type);
    console.log("👥 To ID:", message.to.id);
    console.log("📄 Type:", message.type);
    console.log("📝 Content:", message.content.text || message.content.mediaUrl || message.content.stickerId || "[No content]");
    console.log("🆔 Message ID:", message.messageId);
    console.log("⏰ Time:", new Date(message.timestamp).toLocaleString());
    
    if (message.replyTo) {
      console.log("↩ Reply To:", message.replyTo.messageId);
    }

    if (message.thread) {
      console.log("🧵 Thread:", message.thread.id);
    }

    // Check if media was saved
    const msg = message as ExtendedMessage;
    if (msg.mediaSaved) {
      console.log("💾 Media Saved:", msg.storageKey);
    }

    console.log("");

    const text = message.content.text ? message.content.text.trim() : "";
    const textLower = text.toLowerCase();

    // 移除 bot 的 @mention（如果有的话）
    // 例如："@imsdkbot /id" -> "/id"
    const cleanText = textLower.replace(/^@\w+\s+/, '');

    const hasMedia = message.content.mediaUrl && message.content.mediaUrl.startsWith("http");

    // 检查 bot 是否被 @提及
    const botMentionPattern = new RegExp(`@${message.to.name}`, 'i');
    const isMentioned = textLower.match(/^@\w+/) || botMentionPattern.test(textLower);

    console.log("🔤 Original text:", text || "[no text]");
    console.log("🔤 Cleaned text:", cleanText || "[no command]");
    console.log("📦 Has Media:", hasMedia ? "Yes" : "No");
    console.log("🏷️  Bot mentioned:", isMentioned ? "Yes" : "No");
    console.log("");

    try {
      // 在群里，只响应被 @ 的消息
      if (message.to.type !== "user" && !isMentioned) {
        console.log("⏭️  Skipping message (bot not mentioned in group)");
        return;
      }

      // Send typing indicator before responding
      const telegramAdapter = sdk.getAdapter("telegram") as any;
      if (telegramAdapter && typeof telegramAdapter.sendChatAction === "function") {
        await telegramAdapter.sendChatAction(message.from.id, "typing");
        // Small delay to let the typing indicator show
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // ============================================================================
      // Command Router - 统一的命令路由
      // ============================================================================

      // 检查是否是命令
      if (cleanText.startsWith("/")) {
        // 尝试精确匹配
        if (commands[cleanText]) {
          console.log(`📤 Command: ${cleanText}`);
          await commands[cleanText].handler(message, sdk);
        }
        // 尝试前缀匹配（对于带参数的命令，如 /info media）
        else {
          const matchedCommand = Object.keys(commands).find(cmd => cleanText.startsWith(cmd + " "));
          if (matchedCommand) {
            console.log(`📤 Command: ${matchedCommand}`);
            await commands[matchedCommand].handler(message, sdk);
          } else {
            // 未知命令
            console.log(`⚠️ Unknown command: ${cleanText}`);
            await sdk.send("telegram", {
              text: `❓ 未知命令: ${cleanText}\n\n发送 /help 查看所有可用命令`,
            }, { to: message.from.id });
          }
        }
      } else {
        console.log("📤 Command: echo");

        // Check if message has media
        if (message.content.mediaUrl) {
          console.log("📎 Echoing media file...");

          // Get storage key from extended message
          const storageKey = msg.storageKey;

          let replyText = `Echo #${messageCount}`;
          if (message.content.text) {
            replyText += `: ${message.content.text}`;
          }

          if (storageKey) {
            replyText += `\n\n💾 Saved: ${storageKey}`;
          }

          // Forward media back to user
          await sdk.send("telegram", {
            mediaUrl: message.content.mediaUrl,
            mediaType: message.content.mediaType,
            text: replyText,
          }, {
            to: message.from.id,
            replyToMessageId: message.messageId,
          });

          console.log("✅ Media echo sent");
        } else {
          // Text only message
          const reply = `Echo #${messageCount}: ${message.content.text || "Got it!"}`;

          await sdk.send("telegram", {
            text: reply,
          }, {
            to: message.from.id,
            replyToMessageId: message.messageId,
          });

          console.log("✅ Echo sent");
        }
      }
    } catch (error: any) {
      console.error("");
      console.error("❌ ERROR while sending message!");
      console.error("━━━━━━━━━━━━━━━━━━━━");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      if (error.stack) {
        console.error("Stack:", error.stack);
      }
      console.error("━━━━━━━━━━━━━━━━━━━━");
    }
  });

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎯 Bot is ready and listening!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("💬 Waiting for messages from Telegram...");
  console.log("");
  console.log("💡 Send a message to test!");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━");

  const cleanup = async () => {
    console.log("");
    console.log("🛑 Shutting down bot...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    
    const finalUptime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log("📊 Final Statistics:");
    console.log("   Total Messages: " + messageCount);
    console.log("   Total Uptime: " + finalUptime + "s");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    
    try {
      await sdk.destroy();
      console.log("✅ Bot destroyed successfully");
    } catch (error) {
      console.error("❌ Error destroying bot:", error);
    }
    
    console.log("👋 Goodbye!");
    console.log("");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((error) => {
  console.error("");
  console.error("💥 Fatal error during initialization!");
  console.error("━━━━━━━━━━━━━━━━━━━━━━");
  console.error("Error:", error);
  if (error instanceof Error) {
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }
  console.error("━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  process.exit(1);
});
