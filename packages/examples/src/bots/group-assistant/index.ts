/**
 * Universal Bot Manager
 * A multi-platform bot supporting Telegram, Discord, and more
 * Always uses multi-bot architecture (single bot is just an array of 1)
 */

import { SDK, createAutoSaveMediaMiddleware, type ExtendedMessage } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";
import { DiscordAdapter } from "@omnichat/discord";
import type { Message, Adapter } from "@omnichat/core";
import { loadConfig } from "../../config.js";
import { getCommands } from "./commands/index.js";
import { cleanCommandText, shouldProcessInGroup, hasMedia, setBotConfig } from "./utils/validators.js";
import { handleCallbackQuery } from "./handlers/callback-handler.js";
import { handleKeyboardButtonClick } from "./handlers/keyboard-handler.js";

// ============================================================================
// Types
// ============================================================================

interface BotInstance {
  id: string;
  name: string;
  sdk: SDK;
  adapter: Adapter;
  config: any;
}

// ============================================================================
// Bot Manager
// ============================================================================

class UniversalBotManager {
  private bots: Map<string, BotInstance> = new Map();
  private messageCount = 0;
  private startTime = Date.now();
  private commands = getCommands();

  /**
   * Initialize multiple bots from config
   */
  async initMultiBots(botsConfig: any[]): Promise<void> {
    for (const botConfig of botsConfig) {
      if (botConfig.enabled === false) {
        console.log(`⏭️  Bot ${botConfig.id} is disabled, skipping`);
        continue;
      }

      const platform = botConfig.platform || "telegram";

      if (platform === "telegram") {
        await this.addBot({
          id: botConfig.id,
          name: botConfig.name,
          platform: "telegram",
          token: botConfig.telegram?.apiToken,
          polling: botConfig.telegram?.polling,
        });
      } else if (platform === "discord") {
        await this.addBot({
          id: botConfig.id,
          name: botConfig.name,
          platform: "discord",
          token: botConfig.discord?.botToken,
          clientId: botConfig.discord?.clientId,
          intents: botConfig.discord?.intents,
        });
      } else {
        console.warn(`⚠️  Unsupported platform: ${platform}, skipping bot ${botConfig.id}`);
      }
    }
  }

  /**
   * Add a bot instance
   */
  async addBot(config: any): Promise<void> {
    console.log(`🤖 Adding bot: ${config.id} (${config.platform})`);

    let sdk: SDK;
    let adapter: Adapter;
    let botName = config.name;

    if (config.platform === "telegram") {
      sdk = new SDK({
        adapters: {
          telegram: {
            class: TelegramAdapter,
            config: {
              apiToken: config.token,
              polling: config.polling !== false,
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

      // Add auto-save media middleware (only for Telegram)
      sdk.use(createAutoSaveMediaMiddleware({
        platforms: ["telegram"],
        mediaTypes: ["image", "video", "audio", "file"],
        downloadFile: true,
      }));

      await sdk.init();

      // Get bot info and set username
      const telegramAdapter = sdk.getAdapter("telegram") as any;
      adapter = telegramAdapter;

      if (telegramAdapter && telegramAdapter.bot) {
        try {
          const botInfo = await telegramAdapter.bot.getMe();
          if (botInfo && botInfo.username) {
            botName = botInfo.username;
          }
        } catch (error) {
          console.warn(`⚠️  Could not fetch bot info for ${config.id}`);
        }
      }
    } else if (config.platform === "discord") {
      sdk = new SDK({
        adapters: {
          discord: {
            class: DiscordAdapter,
            config: {
              botToken: config.token,
              clientId: config.clientId,
              intents: config.intents || ['Guilds', 'GuildMessages', 'DirectMessages', 'MessageContent'],
            },
          },
        },
      });

      await sdk.init();

      adapter = sdk.getAdapter("discord") as DiscordAdapter;

      // Get bot username and ID from Discord
      const discordAdapter = adapter as any;
      if (discordAdapter && discordAdapter.client && discordAdapter.client.user) {
        botName = discordAdapter.client.user.username;
      }
    } else {
      throw new Error(`Unsupported platform: ${config.platform}`);
    }

    const botInstance: BotInstance = {
      id: config.id,
      name: botName,
      sdk,
      adapter,
      config,
    };

    // Set bot configuration for mention detection
    const discordBotId = config.platform === "discord"
      ? (adapter as any).client?.user?.id
      : undefined;
    setBotConfig(config.id, botName, discordBotId);

    // Set up message handler
    sdk.on(async (message: Message) => {
      await this.handleMessage(message, botInstance);
    });

    this.bots.set(config.id, botInstance);

    const platformIcon = config.platform === "discord" ? "🎮" : "🤖";
    const nameDisplay = config.platform === "discord" ? botName : `@${botName}`;
    console.log(`${platformIcon} Bot ${config.id} (${nameDisplay}) added`);
    console.log("");
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: Message, botInstance: BotInstance): Promise<void> {
    this.messageCount++;

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📨 [${botInstance.id}] Message #${this.messageCount}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("📥 Platform:", message.platform.toUpperCase());
    console.log("🤖 Bot:", botInstance.name);
    console.log("🤖 Bot ID:", botInstance.id);
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
    const cleanText = cleanCommandText(message, botInstance.id);

    console.log("🔤 Original text:", text || "[no text]");
    console.log("🔤 Cleaned text:", cleanText || "[no command]");
    console.log("📦 Has Media:", hasMedia(message) ? "Yes" : "No");
    console.log("");

    // Handle callback queries (button clicks)
    if (await handleCallbackQuery(message, botInstance.sdk)) {
      return;
    }

    try {
      // In groups, only respond to messages where bot is mentioned
      if (!shouldProcessInGroup(message, botInstance.id)) {
        console.log("⏭️  Skipping message (bot not mentioned in group)");
        return;
      }

      // Send typing indicator before responding (Telegram only)
      if (message.platform === "telegram") {
        const telegramAdapter = botInstance.sdk.getAdapter("telegram") as any;
        if (telegramAdapter && typeof telegramAdapter.sendChatAction === "function") {
          await telegramAdapter.sendChatAction(message.from.id, "typing");
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Handle custom keyboard buttons
      if (await handleKeyboardButtonClick(message, botInstance.sdk)) {
        return;
      }

      // Command routing
      if (cleanText.startsWith("/")) {
        if (this.commands[cleanText]) {
          console.log(`📤 Command: ${cleanText}`);
          await this.commands[cleanText].handler(message, botInstance.sdk);
        } else {
          const matchedCommand = Object.keys(this.commands).find(cmd => cleanText.startsWith(cmd + " "));
          if (matchedCommand) {
            console.log(`📤 Command: ${matchedCommand}`);
            await this.commands[matchedCommand].handler(message, botInstance.sdk);
          } else {
            console.log(`⚠️ Unknown command: ${cleanText}`);
            await botInstance.sdk.send(message.platform, {
              text: `❓ 未知命令: ${cleanText}\n\n发送 /help 查看所有可用命令`,
            }, { to: message.from.id });
          }
        }
      } else {
        console.log("📤 Command: echo");

        // Echo the message back
        if (message.content.mediaUrl) {
          console.log("📎 Echoing media file...");

          const storageKey = msg.storageKey;
          let replyText = `Echo #${this.messageCount}`;
          if (message.content.text) {
            replyText += `: ${message.content.text}`;
          }

          if (storageKey) {
            replyText += `\n\n💾 Saved: ${storageKey}`;
          }

          await botInstance.sdk.send(message.platform, {
            mediaUrl: message.content.mediaUrl,
            mediaType: message.content.mediaType,
            text: replyText,
          }, {
            to: message.from.id,
            replyToMessageId: message.messageId,
          });

          console.log("✅ Media echo sent");
        } else {
          const reply = `[@${botInstance.name}] Echo #${this.messageCount}: ${message.content.text || "Got it!"}`;

          await botInstance.sdk.send(message.platform, {
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
      console.error("━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      if (error.stack) {
        console.error("Stack:", error.stack);
      }
      console.error("━━━━━━━━━━━━━━━━━━━━━━");
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    messages: number;
    uptime: number;
    bots: Array<{ id: string; name: string }>;
  } {
    return {
      total: this.bots.size,
      messages: this.messageCount,
      uptime: Date.now() - this.startTime,
      bots: Array.from(this.bots.values()).map(b => ({
        id: b.id,
        name: b.name,
      })),
    };
  }

  /**
   * Shutdown all bots
   */
  async shutdown(): Promise<void> {
    console.log("");
    console.log("🛑 Shutting down all bots...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

    const stats = this.getStats();
    console.log("📊 Final Statistics:");
    console.log(`   Total Bots: ${stats.total}`);
    console.log(`   Total Messages: ${stats.messages}`);
    console.log(`   Total Uptime: ${(stats.uptime / 1000).toFixed(1)}s`);
    console.log("");

    for (const [id, bot] of this.bots.entries()) {
      try {
        await bot.sdk.destroy();
        console.log(`✅ Bot ${id} stopped`);
      } catch (error) {
        console.error(`❌ Error stopping ${id}:`, error);
      }
    }

    this.bots.clear();

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👋 All bots stopped. Goodbye!");
    console.log("");
  }
}

// ============================================================================
// Main Application
// ============================================================================

async function main() {
  console.log("🚀 Starting Universal Bot Manager...");
  console.log("━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const config = loadConfig();
  const manager = new UniversalBotManager();

  try {
    // Only support multi-bot configuration
    if (!config.bots || config.bots.length === 0) {
      console.error("❌ No bot configuration found!");
      console.error("");
      console.error("💡 Please set BOTS environment variable:");
      console.error("   BOTS=[{\"id\":\"telegram\",\"platform\":\"telegram\",\"name\":\"bot\",\"telegram\":{\"apiToken\":\"YOUR_TOKEN\"}}]");
      console.error("");
      console.error("💡 Example with multiple bots:");
      console.error("   BOTS=[{\"id\":\"bot1\",\"platform\":\"telegram\",\"name\":\"bot1\",\"telegram\":{\"apiToken\":\"TOKEN1\"}},{\"id\":\"bot2\",\"platform\":\"discord\",\"name\":\"bot2\",\"discord\":{\"botToken\":\"TOKEN2\",\"clientId\":\"ID\"}}]");
      console.error("");
      process.exit(1);
    }

    const bots = config.bots;
    console.log(`📦 Bot Configuration: ${bots.length} bot(s)`);
    console.log("");

    await manager.initMultiBots(bots);

    // Display capabilities
    const stats = manager.getStats();
    if (stats.total > 0) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 All bots are ready!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
      console.log(`📊 Active Bots: ${stats.total}`);
      stats.bots.forEach(bot => {
        console.log(`   • ${bot.id} (@${bot.name})`);
      });
      console.log("");
      console.log("💬 Waiting for messages...");
      console.log("");
      console.log("💡 Send a message to test!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━");
    }
  } catch (error: any) {
    console.error("");
    console.error("❌ Initialization failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    if (error.stack) {
      console.error("Stack Trace:", error.stack);
    }
    console.error("");
    console.error("💡 Troubleshooting:");
    console.error("   1. Make sure BOTS environment variable is set correctly");
    console.error("   2. Check if token(s) are correct");
    console.error("   3. Check if bot(s) are enabled in platform developer portal");
    console.error("   4. Check bot permissions");
    console.error("   5. Check network connection");
    console.error("━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }

  // Graceful shutdown
  const cleanup = async () => {
    await manager.shutdown();
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
