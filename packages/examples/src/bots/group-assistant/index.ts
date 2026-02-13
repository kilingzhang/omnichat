/**
 * Universal Bot Manager
 * A multi-platform bot supporting Telegram, Discord, and more
 * Always uses multi-bot architecture (single bot is just an array of 1)
 */

import { SDK, createAutoSaveMediaMiddleware, type ExtendedMessage, PLATFORMS, PLATFORM_NAMES, PLATFORM_ICONS, BOT_LIMITS } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";
import { DiscordAdapter } from "@omnichat/discord";
import type { Message, Adapter } from "@omnichat/core";
import { loadConfig } from "../../config.js";
import { getCommands } from "./commands/index.js";
import { cleanCommandText, shouldProcessInGroup, hasMedia, setBotConfig, isCommand } from "./utils/validators.js";
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
  private dmChannelsEstablished = new Set<string>(); // Track users with established DM channels

  /**
   * Initialize multiple bots from config
   */
  async initMultiBots(botsConfig: any[]): Promise<void> {
    for (const botConfig of botsConfig) {
      if (botConfig.enabled === false) {
        console.log(`⏭️  Bot ${botConfig.id} is disabled, skipping`);
        continue;
      }

      const platform = botConfig.platform || PLATFORMS.TELEGRAM;

      if (platform === PLATFORMS.TELEGRAM) {
        await this.addBot({
          id: botConfig.id,
          name: botConfig.name,
          platform: PLATFORMS.TELEGRAM,
          token: botConfig.telegram?.apiToken,
          polling: botConfig.telegram?.polling,
        });
      } else if (platform === PLATFORMS.DISCORD) {
        await this.addBot({
          id: botConfig.id,
          name: botConfig.name,
          platform: PLATFORMS.DISCORD,
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

    if (config.platform === PLATFORMS.TELEGRAM) {
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
        platforms: [PLATFORMS.TELEGRAM],
        mediaTypes: ["image", "video", "audio", "file"],
        downloadFile: true,
      }));

      await sdk.init();

      // Get bot info and set username
      const telegramAdapter = sdk.getAdapter(PLATFORMS.TELEGRAM) as any;
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
    } else if (config.platform === PLATFORMS.DISCORD) {
      sdk = new SDK({
        adapters: {
          discord: {
            class: DiscordAdapter,
            config: {
              botToken: config.token,
              clientId: config.clientId,
              intents: config.intents || ['Guilds', 'GuildMembers', 'GuildMessages', 'DirectMessages', 'MessageContent'],
              handleInteractions: true,
            },
          },
        },
      });

      await sdk.init();

      adapter = sdk.getAdapter(PLATFORMS.DISCORD) as DiscordAdapter;

      // Get bot username and ID from Discord
      const discordAdapter = adapter as any;
      if (discordAdapter && discordAdapter.client && discordAdapter.client.user) {
        botName = discordAdapter.client.user.username;
      }

      // Create bot instance early so interaction handler can reference it
      const botInstance: BotInstance = {
        id: config.id,
        name: botName,
        sdk,
        adapter,
        config,
      };

      // Register interaction handler BEFORE registering commands
      // This ensures we can respond to interactions during command registration
      if (discordAdapter && typeof discordAdapter.onInteraction === "function") {
        discordAdapter.onInteraction(async (interaction: any) => {
          await this.handleDiscordInteraction(interaction, botInstance);
        });
        console.log("✅ Discord interaction handler registered");
      }

      // Auto-register slash commands on startup
      await this.registerDiscordCommands(discordAdapter);

      // Store bot instance
      this.bots.set(config.id, botInstance);
    } else {
      throw new Error(`Unsupported platform: ${config.platform}`);
    }

    // For non-discord platforms, create bot instance here
    if (config.platform !== PLATFORMS.DISCORD) {
      const botInstance: BotInstance = {
        id: config.id,
        name: botName,
        sdk,
        adapter,
        config,
      };
      this.bots.set(config.id, botInstance);
    }

    // Get bot instance for further setup
    const botInstance = this.bots.get(config.id)!;

    // Set bot configuration for mention detection
    const discordBotId = config.platform === PLATFORMS.DISCORD
      ? (adapter as any).client?.user?.id
      : undefined;
    setBotConfig(config.id, botName, discordBotId);

    // Set up message handler
    sdk.on(async (message: Message) => {
      await this.handleMessage(message, botInstance);
    });

    const platformIcon = config.platform === PLATFORMS.DISCORD ? PLATFORM_ICONS[PLATFORMS.DISCORD] : PLATFORM_ICONS[PLATFORMS.TELEGRAM];
    const nameDisplay = config.platform === PLATFORMS.DISCORD ? botName : `@${botName}`;
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
    console.log("👥 To Type:", message.to.type);
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
      // Debug: log message type and shouldProcessInGroup result
      const shouldProcess = shouldProcessInGroup(message, botInstance.id);
      console.log(`🔍 shouldProcessInGroup: ${shouldProcess} (to.type=${message.to.type}, isCommand=${isCommand(message)})`);

      // In groups: commands always processed, non-commands need @ mention
      if (!shouldProcess) {
        console.log("⏭️  Skipping message (non-command without @ mention in group)");
        return;
      }

      // Auto-establish DM channel for Discord users on first interaction (on-demand)
      // This ensures the user can send DMs to the bot later without needing /dm first
      if (message.platform === PLATFORMS.DISCORD && message.to.type !== "user") {
        await this.ensureDMChannel(message.from.id, botInstance);
      }

      // Send typing indicator before responding (Telegram only)
      if (message.platform === PLATFORMS.TELEGRAM) {
        try {
          await botInstance.sdk.sendChatAction(message.platform, message.from.id, "typing");
          await new Promise(resolve => setTimeout(resolve, BOT_LIMITS.TYPING_INDICATOR_DELAY_MS));
        } catch {
          // Ignore typing indicator errors
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
            }, { to: message.to.id });
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
            to: message.to.id,
            replyToMessageId: message.messageId,
          });

          console.log("✅ Media echo sent");
        } else {
          const reply = `[@${botInstance.name}] Echo #${this.messageCount}: ${message.content.text || "Got it!"}`;

          await botInstance.sdk.send(message.platform, {
            text: reply,
          }, {
            to: message.to.id,
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
   * Handle Discord interactions (slash commands, buttons, menus, etc.)
   */
  private async handleDiscordInteraction(interaction: any, botInstance: BotInstance): Promise<void> {
    const Discord = await import("discord.js");

    console.log("🎮 Discord Interaction:");
    console.log("   Type:", interaction.type);

    // Get the raw discord.js interaction object
    const rawInteraction = interaction.raw;
    if (!rawInteraction) {
      console.error("❌ No raw interaction available");
      return;
    }

    // Handle slash commands
    if (interaction.type === Discord.InteractionType.ApplicationCommand) {
      const commandName = rawInteraction.commandName;
      console.log("   Command:", commandName);

      // Map slash commands to bot commands
      const commandMap: Record<string, string> = {
        "start": "/start",
        "help": "/help",
        "id": "/id",
        "info": "/info",
        "welcome": "/welcome",
        "rules": "/rules",
        "announce": "/announce",
        "stats": "/stats",
        "warn": "/warn",
        "mute": "/mute",
        "kick": "/kick",
        "ban": "/ban",
        "poll": "/poll",
        "note": "/note",
        "dm": "/dm",
        "buttons": "/buttons",
        "selectmenu": "/selectmenu",
        "modal": "/modal",
        "embed": "/embed",
        "caps": "/caps",
      };

      // User context menu commands
      if (rawInteraction.isUserContextMenuCommand?.()) {
        const targetUser = rawInteraction.targetUser;
        if (commandName === "查看用户信息") {
          await rawInteraction.deferReply();
          await rawInteraction.editReply({
            content: [
              `👤 用户信息`,
              "",
              `📛 用户名: ${targetUser.username}`,
              `🆔 ID: ${targetUser.id}`,
              `🤖 Bot: ${targetUser.bot ? "是" : "否"}`,
              `📅 创建时间: ${targetUser.createdAt.toISOString().split("T")[0]}`,
            ].join("\n"),
          });
          return;
        }
      }

      // Message context menu commands
      if (rawInteraction.isMessageContextMenuCommand?.()) {
        const targetMessage = rawInteraction.targetMessage;
        if (commandName === "引用消息") {
          await rawInteraction.deferReply();
          await rawInteraction.editReply({
            content: [
              `💬 引用消息`,
              "",
              `👤 作者: ${targetMessage.author.username}`,
              `📝 内容: ${targetMessage.content?.substring(0, 100) || "[媒体/嵌入]"}`,
              `📅 时间: ${targetMessage.createdAt.toLocaleString()}`,
            ].join("\n"),
          });
          return;
        }
        if (commandName === "翻译消息") {
          await rawInteraction.deferReply();
          await rawInteraction.editReply({
            content: `🌐 翻译功能开发中...\n\n原文: ${targetMessage.content?.substring(0, 200) || "[无文本]"}`,
          });
          return;
        }
      }

      // Regular slash commands
      const botCommand = commandMap[commandName];
      if (botCommand && this.commands[botCommand]) {
        // Defer the reply first
        await rawInteraction.deferReply();

        // Extract slash command options and build full command text
        let fullCommandText = botCommand;
        if (rawInteraction.options && typeof rawInteraction.options.data !== 'undefined') {
          const optionsData = rawInteraction.options.data;
          if (Array.isArray(optionsData) && optionsData.length > 0) {
            // For poll and other multi-arg commands, concatenate all option values
            const optionValues = optionsData.map((opt: any) => {
              // Handle different option types
              if (opt.value !== undefined) return String(opt.value);
              return '';
            }).filter(Boolean).join(' ');
            if (optionValues) {
              fullCommandText = `${botCommand} ${optionValues}`;
            }
          }
          // Handle subcommands
          if (rawInteraction.options.getSubcommand) {
            try {
              const subcommand = rawInteraction.options.getSubcommand(false);
              if (subcommand) {
                fullCommandText = `${botCommand} ${subcommand}`;
              }
            } catch {
              // No subcommand, ignore
            }
          }
        }

        console.log("   Full command text:", fullCommandText);

        // Create a synthetic message for the command handler
        const syntheticMessage: Message = {
          platform: PLATFORMS.DISCORD,
          type: "text",
          from: {
            id: interaction.user.id,
            name: interaction.user.username,
            type: "user",
          },
          to: {
            id: interaction.channelId || interaction.user.id,
            type: interaction.guildId ? "channel" : "user",
          },
          content: {
            text: fullCommandText,
          },
          messageId: interaction.id,
          timestamp: Date.now(),
          raw: rawInteraction,
        };

        try {
          await this.commands[botCommand].handler(syntheticMessage, botInstance.sdk);

          // Check if the command handler has responded via interaction
          // If not, we need to use editReply since we already deferred
          // Note: sdk.send sends a new message, not a reply to the interaction
          // So we should mark the interaction as handled by sending a confirmation
          if (!rawInteraction.replied) {
            // The command used sdk.send which creates a new message
            // We still need to complete the deferred reply
            await rawInteraction.editReply({ content: "✅ 命令已执行" });
          }
        } catch (error: any) {
          console.error(`❌ Error executing slash command ${commandName}:`, error);
          if (rawInteraction.deferred && !rawInteraction.replied) {
            await rawInteraction.editReply({ content: `❌ 执行命令时出错: ${error.message}` });
          } else if (!rawInteraction.replied) {
            await rawInteraction.reply({ content: `❌ 执行命令时出错: ${error.message}`, ephemeral: true });
          }
        }
      } else {
        // Unknown command
        await rawInteraction.deferReply();
        await rawInteraction.editReply({
          content: `❓ 未知命令: /${commandName}\n\n使用 /help 查看所有可用命令`,
        });
      }
    }

    // Handle button clicks (MessageComponent interactions)
    if (interaction.type === Discord.InteractionType.MessageComponent) {
      const customId = rawInteraction.customId;
      console.log("   Custom ID:", customId);
      console.log("   Component Type:", rawInteraction.componentType);

      // Handle button clicks
      if (rawInteraction.isButton()) {
        console.log("   🔘 Button clicked:", customId);

        // Handle open_modal directly to avoid interaction timeout
        if (customId === "open_modal") {
          try {
            const modalBuilder = new Discord.ModalBuilder()
              .setCustomId("feedback_modal")
              .setTitle("📝 反馈表单");

            const nameInput = new Discord.TextInputBuilder()
              .setCustomId("feedback_name")
              .setLabel("你的名字")
              .setStyle(Discord.TextInputStyle.Short)
              .setPlaceholder("请输入你的名字")
              .setRequired(true);

            const emailInput = new Discord.TextInputBuilder()
              .setCustomId("feedback_email")
              .setLabel("邮箱地址")
              .setStyle(Discord.TextInputStyle.Short)
              .setPlaceholder("example@email.com")
              .setRequired(false);

            const messageInput = new Discord.TextInputBuilder()
              .setCustomId("feedback_message")
              .setLabel("反馈内容")
              .setStyle(Discord.TextInputStyle.Paragraph)
              .setPlaceholder("请详细描述你的反馈...")
              .setRequired(true)
              .setMinLength(10)
              .setMaxLength(500);

            const firstActionRow = new Discord.ActionRowBuilder<typeof nameInput>().addComponents(nameInput);
            const secondActionRow = new Discord.ActionRowBuilder<typeof emailInput>().addComponents(emailInput);
            const thirdActionRow = new Discord.ActionRowBuilder<typeof messageInput>().addComponents(messageInput);

            modalBuilder.addComponents(firstActionRow, secondActionRow, thirdActionRow);

            await rawInteraction.showModal(modalBuilder);
            console.log("✅ Modal shown");
          } catch (error: any) {
            console.error("❌ Failed to show modal:", error);
            await rawInteraction.reply({
              content: `❌ 无法打开模态框: ${error.message}`,
              ephemeral: true,
            });
          }
        } else {
          // Create a synthetic callback message for the callback handler
          const syntheticMessage: Message = {
            platform: PLATFORMS.DISCORD,
            type: "callback",
            from: {
              id: interaction.user.id,
              name: interaction.user.username,
              type: "user",
            },
            to: {
              id: interaction.channelId || interaction.user.id,
              type: interaction.guildId ? "channel" : "user",
            },
            content: {
              text: customId,
            },
            messageId: interaction.id,
            timestamp: Date.now(),
            raw: rawInteraction,
          };

          // Process through callback handler
          try {
            await this.handleMessage(syntheticMessage, botInstance);
          } catch (error: any) {
            console.error(`❌ Error handling button click:`, error);
            await rawInteraction.reply({
              content: `❌ 处理按钮点击时出错: ${error.message}`,
              ephemeral: true,
            });
          }
        }
      }

      // Handle select menu selections
      if (rawInteraction.isStringSelectMenu()) {
        const selectedValues = rawInteraction.values;
        console.log("   📋 Select menu values:", selectedValues);

        await rawInteraction.reply({
          content: `✅ 你选择了: ${selectedValues.join(", ")}`,
          ephemeral: true,
        });
      }

      // Handle user/role/channel select menus
      if (rawInteraction.isUserSelectMenu()) {
        const selectedUsers = rawInteraction.users;
        console.log("   👥 Users selected:", selectedUsers.map((u: any) => u.username));

        await rawInteraction.reply({
          content: `✅ 你选择了用户: ${selectedUsers.map((u: any) => u.username).join(", ")}`,
          ephemeral: true,
        });
      }

      if (rawInteraction.isRoleSelectMenu()) {
        const selectedRoles = rawInteraction.roles;
        console.log("   🏷️ Roles selected:", selectedRoles.map((r: any) => r.name));

        await rawInteraction.reply({
          content: `✅ 你选择了角色: ${selectedRoles.map((r: any) => r.name).join(", ")}`,
          ephemeral: true,
        });
      }

      if (rawInteraction.isChannelSelectMenu()) {
        const selectedChannels = rawInteraction.channels;
        console.log("   📺 Channels selected:", selectedChannels.map((c: any) => c.name));

        await rawInteraction.reply({
          content: `✅ 你选择了频道: ${selectedChannels.map((c: any) => c.name).join(", ")}`,
          ephemeral: true,
        });
      }

      if (rawInteraction.isMentionableSelectMenu()) {
        const selectedMentionables = rawInteraction.values;
        console.log("   📌 Mentionables selected:", selectedMentionables);

        await rawInteraction.reply({
          content: `✅ 你选择了: ${selectedMentionables.join(", ")}`,
          ephemeral: true,
        });
      }
    }

    // Handle modal submissions
    if (interaction.type === Discord.InteractionType.ModalSubmit) {
      const modalCustomId = rawInteraction.customId;
      console.log("   📝 Modal submitted:", modalCustomId);

      // Extract form data
      const fields: Record<string, string> = {};
      rawInteraction.fields.fields.forEach((field: any) => {
        fields[field.customId] = field.value;
      });

      console.log("   📋 Form data:", fields);

      if (modalCustomId === "feedback_modal") {
        const response = [
          "📝 反馈已收到！",
          "",
          `👤 姓名: ${fields["feedback_name"] || "未填写"}`,
          `📧 邮箱: ${fields["feedback_email"] || "未填写"}`,
          `💬 内容: ${fields["feedback_message"] || "未填写"}`,
        ].join("\n");

        await rawInteraction.reply({ content: response, ephemeral: true });
      } else {
        await rawInteraction.reply({
          content: `✅ 模态框已提交\n\n数据: ${JSON.stringify(fields, null, 2)}`,
          ephemeral: true,
        });
      }
    }
  }

  /**
   * Register Discord slash commands automatically on startup
   */
  private async registerDiscordCommands(discordAdapter: any): Promise<void> {
    if (!discordAdapter || typeof discordAdapter.registerCommands !== "function") {
      console.log("⚠️  Discord adapter does not support command registration");
      return;
    }

    console.log("⚡ Registering Discord slash commands...");

    const commands = [
      // Basic commands
      { name: "start", description: "欢迎消息和使用指南", type: "ChatInput" },
      { name: "help", description: "显示所有可用命令", type: "ChatInput" },
      { name: "id", description: "获取 Chat ID 和 User ID", type: "ChatInput" },
      { name: "info", description: "查看消息和平台信息", type: "ChatInput" },

      // Group management
      { name: "welcome", description: "设置欢迎消息 [管理员]", type: "ChatInput" },
      { name: "rules", description: "设置群组规则 [管理员]", type: "ChatInput" },
      { name: "announce", description: "发送群组公告 [管理员]", type: "ChatInput" },
      { name: "stats", description: "查看群组统计", type: "ChatInput" },

      // Moderation
      { name: "warn", description: "警告成员 [管理员]", type: "ChatInput" },
      { name: "mute", description: "禁言成员 [管理员]", type: "ChatInput" },
      { name: "kick", description: "踢出成员 [管理员]", type: "ChatInput" },
      { name: "ban", description: "封禁成员 [管理员]", type: "ChatInput" },

      // Features - with options
      {
        name: "poll",
        description: "创建投票",
        type: "ChatInput",
        options: [
          {
            name: "content",
            description: "投票内容和选项（每行一个选项，第一行是问题）",
            type: "String",
            required: true,
          },
        ],
      },
      {
        name: "note",
        description: "保存笔记",
        type: "ChatInput",
        options: [
          {
            name: "content",
            description: "笔记内容",
            type: "String",
            required: false,
          },
        ],
      },
      { name: "dm", description: "发起私聊测试", type: "ChatInput" },

      // Interactive
      { name: "buttons", description: "测试交互按钮", type: "ChatInput" },
      { name: "selectmenu", description: "测试下拉菜单", type: "ChatInput" },
      { name: "modal", description: "测试模态框表单", type: "ChatInput" },
      { name: "embed", description: "测试嵌入消息", type: "ChatInput" },
      { name: "caps", description: "显示平台能力矩阵", type: "ChatInput" },

      // User context menu (right-click on user) - NO description for context menus!
      { name: "查看用户信息", type: "UserCommand" },

      // Message context menu (right-click on message) - NO description for context menus!
      { name: "引用消息", type: "MessageCommand" },
      { name: "翻译消息", type: "MessageCommand" },
    ];

    try {
      await discordAdapter.registerCommands(commands);
      console.log(`✅ Registered ${commands.length} Discord commands`);
    } catch (error: any) {
      console.error("❌ Failed to register Discord commands:", error.message);
    }
  }

  /**
   * Ensure DM channel is established for a user (on-demand)
   * This allows the user to send DMs to the bot later
   */
  private async ensureDMChannel(userId: string, botInstance: BotInstance): Promise<void> {
    // Skip if already established
    const key = `${botInstance.id}:${userId}`;
    if (this.dmChannelsEstablished.has(key)) {
      return;
    }

    const discordAdapter = botInstance.adapter as any;
    if (!discordAdapter || !discordAdapter.client) {
      return;
    }

    try {
      // Try to find the user in any shared guild and create DM channel
      for (const [guildId, guild] of discordAdapter.client.guilds.cache) {
        const member = guild.members.cache.get(userId);
        if (member && !member.user.bot) {
          await member.user.createDM();
          this.dmChannelsEstablished.add(key);
          console.log(`📬 DM channel established for user ${userId}`);
          return;
        }
      }
    } catch (error: any) {
      // User may have DMs disabled, that's okay
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
