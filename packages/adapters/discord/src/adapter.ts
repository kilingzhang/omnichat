import type {
  FullAdapter,
  AdapterConfig,
  SendContent,
  SendOptions,
  SendResult,
  PollInput,
  PollResult,
} from "@omnichat/core";
import type {
  Message,
  MessageContent,
  Participant,
  ReplyReference,
} from "@omnichat/core";
import type { Capabilities } from "@omnichat/core";
import { defaultCapabilities, Logger, LogLevel } from "@omnichat/core";

/**
 * Discord adapter configuration
 */
export interface DiscordConfig extends AdapterConfig {
  botToken: string;
  clientId?: string;
  intents?: number[];
  /**
   * Whether to handle interactions automatically
   * @default true
   */
  handleInteractions?: boolean;
}

/**
 * Discord-specific send content
 */
export interface DiscordSendContent {
  text?: string;
  mediaUrl?: string;
  mediaType?: import("@omnichat/core").MediaType;
  buttons?: import("@omnichat/core").Button[][];
  stickerId?: string;
  poll?: {
    question: string;
    options: string[];
    multi?: boolean;
  };
  /** Discord embed */
  embed?: DiscordEmbed;
  /** Discord components (buttons, select menus) */
  components?: any[];
}

/**
 * Application Command Types
 */
export type ApplicationCommandType = 'SlashCommand' | 'UserCommand' | 'MessageCommand';

/**
 * Application Command Option Types
 */
export type ApplicationCommandOptionType =
  | 'Subcommand'
  | 'SubcommandGroup'
  | 'String'
  | 'Integer'
  | 'Boolean'
  | 'User'
  | 'Channel'
  | 'Role'
  | 'Mentionable'
  | 'Number'
  | 'Attachment';

/**
 * Application Command Option
 */
export interface ApplicationCommandOption {
  name: string;
  description: string;
  type: ApplicationCommandOptionType;
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: ApplicationCommandOption[];
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  autocomplete?: boolean;
  channelTypes?: number[];
}

/**
 * Application Command
 */
export interface ApplicationCommand {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  options?: ApplicationCommandOption[];
  defaultPermission?: boolean;
  guildId?: string;
}

/**
 * Interaction Response Types
 */
export type InteractionResponseType =
  | 'Pong'
  | 'ChannelMessageWithSource'
  | 'DeferredChannelMessageWithSource'
  | 'DeferredUpdateMessage'
  | 'UpdateMessage'
  | 'ApplicationCommandAutocompleteResult'
  | 'Modal'
  | 'PremiumRequired'
  | 'LaunchActivity';

/**
 * Interaction Callback Data
 */
export interface InteractionCallbackData {
  content?: string;
  embeds?: any[];
  components?: any[];
  flags?: number;
  choices?: Array<{ name: string; value: string | number }>;
  custom_id?: string;
  title?: string;
}

/**
 * Interaction Response
 */
export interface InteractionResponse {
  type: InteractionResponseType;
  data?: InteractionCallbackData;
}

/**
 * Select Menu Component
 */
export interface DiscordSelectMenu {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: string;
    default?: boolean;
  }>;
  disabled?: boolean;
}

/**
 * User/Role/Channel Select Menu
 */
export interface DiscordEntitySelectMenu {
  customId: string;
  type: 'User' | 'Role' | 'Channel' | 'Mentionable';
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
}

/**
 * Text Input Component (for Modals)
 */
export interface DiscordTextInput {
  customId: string;
  label: string;
  style: 'Short' | 'Paragraph';
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  value?: string;
}

/**
 * Modal
 */
export interface DiscordModal {
  customId: string;
  title: string;
  components: DiscordTextInput[];
}

/**
 * Webhook
 */
export interface DiscordWebhook {
  id: string;
  name: string;
  url: string;
  guildId?: string;
  channelId: string;
  token?: string;
}

/**
 * Interaction
 */
export interface DiscordInteraction {
  id: string;
  applicationId: string;
  type: number;
  token: string;
  guildId?: string;
  channelId?: string;
  userId?: string;
  user?: any;
  member?: any;
  data?: any;
  message?: any;
  raw?: any; // Raw discord.js interaction object
}

/**
 * Interaction Handler
 */
export type InteractionHandler = (interaction: DiscordInteraction) => Promise<void | InteractionResponse>;

/**
 * Discord Embed structure
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: string | Date;
}

/**
 * Discord Button component
 */
export interface DiscordButton {
  label: string;
  style?: 'Primary' | 'Secondary' | 'Success' | 'Danger';
  customId?: string;
  url?: string;
  emoji?: string;
}

/**
 * Discord Action Row (contains buttons)
 */
export interface DiscordActionRow {
  type: 'ActionRow';
  components: DiscordButton[];
}

/**
 * Discord adapter
 */
export class DiscordAdapter implements FullAdapter {
  readonly platform = "discord";

  private client: any; // Discord.Client from discord.js
  private config?: DiscordConfig;
  private messageCallback?: (message: Message) => void;
  private interactionCallback?: InteractionHandler;
  private errorCallback?: (error: Error) => void;
  private interactionCache: Map<string, DiscordInteraction>;
  private capabilities: Capabilities;
  private logger: Logger;

  /** @internal Test-only property to inject mock discord.js module */
  _testDiscordModule?: any;

  constructor() {
    this.logger = new Logger("DiscordAdapter", LogLevel.INFO);
    this.interactionCache = new Map();
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: true, edit: true, delete: true, threads: true, quote: false },
      interaction: { buttons: true, polls: true, reactions: true, stickers: false, effects: false },
      discovery: {
        history: true,
        search: false,
        pins: true,
        pinMessage: true,
        unpinMessage: true,
        memberInfo: true,
        memberCount: true,
        administrators: true,
        channelInfo: true,
      },
      management: {
        kick: true,
        ban: true,
        mute: true,
        timeout: true,
        unban: true,
        channelCreate: true,
        channelEdit: true,
        channelDelete: true,
        permissions: true,
        setChatTitle: true,
        setChatDescription: true,
      },
      advanced: {
        inline: false,
        deepLinks: false,
        createInvite: true,
        getInvites: true,
        revokeInvite: true,
        miniApps: false,
        topics: false,
        batch: false,
        payments: false,
        games: false,
        videoChat: false,
        stories: false,
        customEmoji: false,
        webhooks: true,
        menuButton: false,
      },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as DiscordConfig;

    if (!this.config.botToken) {
      throw new Error("Discord bot token is required");
    }

    this.logger.info("Initializing Discord adapter...");

    try {
      // Dynamically import discord.js (or use test mock if provided)
      const Discord: any = this._testDiscordModule || await import("discord.js");

      // Use all intents to monitor all events
      const intents = this.config.intents || [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildModeration,
        Discord.GatewayIntentBits.GuildEmojisAndStickers,
        Discord.GatewayIntentBits.GuildIntegrations,
        Discord.GatewayIntentBits.GuildWebhooks,
        Discord.GatewayIntentBits.GuildInvites,
        Discord.GatewayIntentBits.GuildVoiceStates,
        Discord.GatewayIntentBits.GuildPresences,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildMessageReactions,
        Discord.GatewayIntentBits.GuildMessageTyping,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.DirectMessageReactions,
        Discord.GatewayIntentBits.DirectMessageTyping,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildScheduledEvents,
        Discord.GatewayIntentBits.AutoModerationConfiguration,
        Discord.GatewayIntentBits.AutoModerationExecution,
      ];

      this.client = new Discord.Client({
        intents: intents,
      });

      // Register message handler
      this.client.on("messageCreate", (msg: any) => {
        this.logger.info(`📨 MSG RECEIVED - Channel: ${msg.channelId}, Type: ${msg.channel?.type}, DM: ${msg.channel?.type === 1}, Author: ${msg.author?.username}, Content: ${msg.content?.substring(0, 50) || "[no content]"}`);
        this.handleDiscordMessage(msg);
      });
      this.client.on("messageReactionAdd", (reaction: any, user: any) => this.handleDiscordReaction(reaction, user));

      // Register interaction handlers
      if (this.config.handleInteractions !== false) {
        this.client.on("interactionCreate", (interaction: any) => this.handleInteraction(interaction));
      }

      this.client.on("error", (error: Error) => {
        this.logger.error("Discord client error", error);
        if (this.errorCallback) {
          this.errorCallback(error);
        }
      });

      // Log when client is ready
      this.client.once("ready", () => {
        this.logger.info(`✅ Discord client ready! Logged in as ${this.client.user?.tag} (${this.client.user?.id})`);
        this.logger.info(`📊 Guilds: ${this.client.guilds.cache.size}`);
        this.logger.info(`👥 Monitoring all message events including DMs...`);
      });

      // Login
      await this.client.login(this.config.botToken);
      this.logger.info("Discord adapter initialized successfully");
    } catch (error: any) {
      if ((error as any).code === "MODULE_NOT_FOUND") {
        this.logger.warn("discord.js not installed. Install with: npm install discord.js");
        this.logger.warn("Creating mock adapter for development...");
        this.client = null;
      } else {
        this.logger.error("Failed to initialize Discord adapter", error);
        throw error;
      }
    }
  }

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    if (!this.client) {
      throw new Error("Discord client not initialized. Install discord.js.");
    }

    if (!target) {
      throw new Error("Target (channel ID) is required");
    }

    const discordContent = content as any;
    if (!content.text && !content.mediaUrl && !discordContent.embed) {
      throw new Error("Either text, mediaUrl, or embed is required");
    }

    let channelId = target;
    if (target.startsWith("channel:")) {
      channelId = target.replace("channel:", "");
    }

    this.logger.debug(`Sending message to channel ${channelId}`);

    let result: any;

    try {
      const payload: any = {};

      // Handle text content
      if (content.text) {
        payload.content = content.text;
      }

      // Handle media
      if (content.mediaUrl) {
        payload.files = [{ attachment: content.mediaUrl, description: content.text }];
      }

      // Handle Discord embeds
      if (discordContent.embed && typeof discordContent.embed === 'object') {
        payload.embeds = [discordContent.embed];
      }

      // Handle unified buttons format (cross-platform)
      // Format: buttons: [[{ text: "Label", data: "callback_data" }, ...], ...]
      if (discordContent.buttons && Array.isArray(discordContent.buttons)) {
        const Discord: any = this._testDiscordModule || await import("discord.js");
        payload.components = discordContent.buttons.map((row: any[]) => {
          // Build all buttons for this row first
          const buttons = row.map((btn: any) => {
            const button = new Discord.ButtonBuilder()
              .setLabel(btn.text || btn.label || '')
              .setCustomId(btn.data || btn.customId || `button_${Date.now()}`)
              .setStyle(btn.style !== undefined ? btn.style : Discord.ButtonStyle.Primary);

            if (btn.emoji) {
              button.setEmoji(btn.emoji);
            }

            return button;
          });

          // Create ActionRow and add all buttons at once (per Discord.js docs pattern)
          const actionRow = new Discord.ActionRowBuilder().addComponents(...buttons);
          return actionRow;
        });
      }

      // Handle Discord buttons/action rows/select menus (native format)
      if (discordContent.components && !payload.components) {
        const Discord: any = this._testDiscordModule || await import("discord.js");
        payload.components = discordContent.components.map((row: any) => {
          if (row.components && Array.isArray(row.components)) {
            const components = row.components.map((comp: any) => {
              if (comp.type === 2) {
                // Button - style should be ButtonStyle enum
                return new Discord.ButtonBuilder()
                  .setLabel(comp.label || '')
                  .setStyle(comp.style !== undefined ? comp.style : Discord.ButtonStyle.Primary)
                  .setCustomId(comp.customId || `button_${Date.now()}`);
              } else if (comp.type === 3) {
                // String Select Menu
                const selectMenu = new Discord.StringSelectMenuBuilder()
                  .setCustomId(comp.customId || `select_${Date.now()}`)
                  .setPlaceholder(comp.placeholder || 'Select an option');

                if (comp.options && Array.isArray(comp.options)) {
                  const options = comp.options.map((opt: any) =>
                    new Discord.StringSelectMenuOptionBuilder()
                      .setLabel(opt.label)
                      .setValue(opt.value)
                  );
                  selectMenu.addOptions(...options);
                }
                return selectMenu;
              } else if (comp.type === 5) {
                // User Select Menu
                return new Discord.UserSelectMenuBuilder()
                  .setCustomId(comp.custom_id || comp.customId || `user_select_${Date.now()}`)
                  .setPlaceholder(comp.placeholder || 'Select a user')
                  .setMinValues(comp.min_values ?? comp.minValues ?? 1)
                  .setMaxValues(comp.max_values ?? comp.maxValues ?? 1)
                  .setDisabled(comp.disabled ?? false);
              } else if (comp.type === 6) {
                // Role Select Menu
                return new Discord.RoleSelectMenuBuilder()
                  .setCustomId(comp.custom_id || comp.customId || `role_select_${Date.now()}`)
                  .setPlaceholder(comp.placeholder || 'Select a role')
                  .setMinValues(comp.min_values ?? comp.minValues ?? 1)
                  .setMaxValues(comp.max_values ?? comp.maxValues ?? 1)
                  .setDisabled(comp.disabled ?? false);
              } else if (comp.type === 7) {
                // Channel Select Menu
                return new Discord.ChannelSelectMenuBuilder()
                  .setCustomId(comp.custom_id || comp.customId || `channel_select_${Date.now()}`)
                  .setPlaceholder(comp.placeholder || 'Select a channel')
                  .setMinValues(comp.min_values ?? comp.minValues ?? 1)
                  .setMaxValues(comp.max_values ?? comp.maxValues ?? 1)
                  .setDisabled(comp.disabled ?? false);
              } else if (comp.type === 8) {
                // Mentionable Select Menu
                return new Discord.MentionableSelectMenuBuilder()
                  .setCustomId(comp.custom_id || comp.customId || `mentionable_select_${Date.now()}`)
                  .setPlaceholder(comp.placeholder || 'Select a mentionable')
                  .setMinValues(comp.min_values ?? comp.minValues ?? 1)
                  .setMaxValues(comp.max_values ?? comp.maxValues ?? 1)
                  .setDisabled(comp.disabled ?? false);
              }
              return null;
            }).filter(Boolean);

            return new Discord.ActionRowBuilder().addComponents(...components);
          }

          return new Discord.ActionRowBuilder();
        });
      }

      // Fetch channel and send message
      let channel: any;

      try {
        // Try to fetch as a channel
        channel = await this.client.channels.fetch(channelId);
      } catch (error: any) {
        // If it fails, it might be a user ID - try to create DM
        if (error.code === 10003 || error.message?.includes('Unknown Channel')) {
          this.logger.debug(`Channel ${channelId} not found, trying to create DM channel...`);
          try {
            const user = await this.client.users.fetch(channelId);
            channel = await user.createDM();
            this.logger.debug(`DM channel created: ${channel.id}`);
          } catch (dmError: any) {
            this.logger.error(`Failed to create DM channel for user ${channelId}`, dmError);
            throw dmError;
          }
        } else {
          throw error;
        }
      }

      result = await channel.send(payload);

      this.logger.info(`Message sent successfully. ID: ${result.id}`);

      return {
        platform: this.platform,
        messageId: `${channelId}:${result.id}`,
        chatId: channelId,
        timestamp: result.createdTimestamp || Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to send message to channel ${channelId}`, error);
      throw error;
    }
  }

  async reply(toMessageId: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    const parts = toMessageId.split(":");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid messageId format: ${toMessageId}. Expected format: channelId:messageId`,
      );
    }

    const [channelId, msgId] = parts;

    if (!channelId || !msgId) {
      throw new Error(
        `Invalid messageId format: ${toMessageId}. Expected format: channelId:messageId`,
      );
    }

    this.logger.debug(`Replying to message ${msgId} in channel ${channelId}`);

    let result: any;

    try {
      // Fetch channel
      const channel: any = await this.client.channels.fetch(channelId);

      if (content.mediaUrl) {
        result = await channel.send({
          files: [{ attachment: content.mediaUrl, description: content.text }],
          messageReference: { messageId: msgId },
        });
      } else {
        result = await channel.send({
          content: content.text,
          messageReference: { messageId: msgId },
        });
      }

      this.logger.info(`Reply sent successfully. ID: ${result.id}`);

      return {
        platform: this.platform,
        messageId: `${channelId}:${result.id}`,
        chatId: channelId,
        timestamp: result.createdTimestamp || Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to reply to message ${msgId}`, error);
      throw error;
    }
  }

  async edit(messageId: string, newText: string, options?: SendOptions): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid messageId format: ${messageId}. Expected format: channelId:messageId`,
      );
    }

    const [channelId, msgId] = parts;

    if (!channelId || !msgId) {
      throw new Error(
        `Invalid messageId format: ${messageId}. Expected format: channelId:messageId`,
      );
    }

    if (!newText) {
      throw new Error("New text is required for editing");
    }

    this.logger.debug(`Editing message ${msgId} in channel ${channelId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(msgId);
      await message.edit({
        content: newText,
      });
      this.logger.info(`Message ${msgId} edited successfully`);
    } catch (error) {
      this.logger.error(`Failed to edit message ${msgId}`, error);
      throw error;
    }
  }

  async delete(messageId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid messageId format: ${messageId}. Expected format: channelId:messageId`,
      );
    }

    const [channelId, msgId] = parts;

    if (!channelId || !msgId) {
      throw new Error(
        `Invalid messageId format: ${messageId}. Expected format: channelId:messageId`,
      );
    }

    this.logger.debug(`Deleting message ${msgId} in channel ${channelId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(msgId);
      await message.delete();
      this.logger.info(`Message ${msgId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete message ${msgId}`, error);
      throw error;
    }
  }

  async sendPoll(target: string, poll: PollInput, options?: SendOptions): Promise<PollResult> {
    // Discord now supports polls! Let's implement it.
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const channelId = target.startsWith("channel:") ? target.replace("channel:", "") : target;

    try {
      const Discord = await import("discord.js");

      // Create poll using Discord's poll structure
      const pollData = {
        question: { text: poll.question },
        answers: poll.options.map((opt, index) => ({
          text: opt,
          pollMedia: null // Discord allows media with poll options
        })),
        duration: (poll as any).openPeriod || 24, // in hours (using openPeriod as duration)
        allowMultiselect: poll.multi || false,
      };

      // Fetch channel and send poll
      const channel: any = await this.client.channels.fetch(channelId);
      const result = await channel.send({
        polls: [pollData]
      });

      // Return PollResult format
      const resultData: PollResult = {
        pollId: `${channelId}:${result.id}`,
        messageId: `${channelId}:${result.id}`,
        channel: channelId,
      };

      return resultData;
    } catch (error) {
      this.logger.error("Failed to send poll", error);
      throw error;
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid messageId format: ${messageId}. Expected format: channelId:messageId`,
      );
    }

    const [channelId, msgId] = parts;

    this.logger.debug(`Adding reaction ${emoji} to message ${msgId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(msgId);
      await message.react(emoji);
      this.logger.info(`Reaction added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add reaction to message ${msgId}`, error);
      throw error;
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid messageId format: ${messageId}. Expected format: channelId:messageId`,
      );
    }

    const [channelId, msgId] = parts;

    this.logger.debug(`Removing reaction ${emoji} from message ${msgId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(msgId);
      await message.reactions.cache.get(emoji)?.remove();
      this.logger.info(`Reaction removed successfully`);
    } catch (error) {
      this.logger.warn(`Failed to remove reaction from message ${msgId}`, error);
      throw error;
    }
  }

  async sendSticker(target: string, stickerId: string, options?: SendOptions): Promise<SendResult> {
    throw new Error("Discord stickers are not supported in this adapter yet");
  }

  /**
   * Kick a member from a guild
   */
  async kick(guildId: string, userId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Kicking user ${userId} from guild ${guildId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);
      await guild.members.kick(userId, reason);
      this.logger.info(`User ${userId} kicked from guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Failed to kick user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Ban a member from a guild
   */
  async ban(guildId: string, userId: string, reason?: string, duration?: number): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Banning user ${userId} from guild ${guildId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);

      const banOptions: any = {
        reason: reason
      };

      // If duration is provided, calculate expiration date
      if (duration) {
        banOptions.expirationDate = Date.now() + duration;
      }

      await guild.bans.create(userId, banOptions);
      this.logger.info(`User ${userId} banned from guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Failed to ban user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Timeout (mute) a member for a specific duration
   */
  async timeout(guildId: string, userId: string, duration: number, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Timing out user ${userId} in guild ${guildId} for ${duration}ms`);

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);

      // Discord timeout is in milliseconds, max 28 days
      const maxDuration = 28 * 24 * 60 * 60 * 1000; // 28 days
      const actualDuration = Math.min(duration, maxDuration);

      await member.timeout(actualDuration, reason);
      this.logger.info(`User ${userId} timed out in guild ${guildId} for ${actualDuration}ms`);
    } catch (error) {
      this.logger.error(`Failed to timeout user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Send a Discord embed
   */
  async sendEmbed(
    target: string,
    embed: DiscordEmbed,
    text?: string,
    options?: SendOptions
  ): Promise<SendResult> {
    const content: SendContent = { text };
    (content as any).embed = embed as any;
    return this.send(target, content, options);
  }

  /**
   * Send a message with buttons
   */
  async sendWithButtons(
    target: string,
    text: string,
    buttons: DiscordButton[],
    options?: SendOptions
  ): Promise<SendResult> {
    const Discord = await import("discord.js");

    const styleMap: Record<string, number> = {
      'Primary': Discord.ButtonStyle.Primary,
      'Secondary': Discord.ButtonStyle.Secondary,
      'Success': Discord.ButtonStyle.Success,
      'Danger': Discord.ButtonStyle.Danger,
    };

    const components = [{
      type: 1, // Action Row
      components: buttons.map(btn => ({
        type: 2, // Button
        label: btn.label,
        style: btn.style ? styleMap[btn.style] : Discord.ButtonStyle.Primary,
        custom_id: btn.customId,
        url: btn.url,
        emoji: btn.emoji
      }))
    }];

    const content: SendContent = { text };
    (content as any).components = components;
    return this.send(target, content, options);
  }

  /**
   * Send an embed with buttons
   */
  async sendEmbedWithButtons(
    target: string,
    embed: DiscordEmbed,
    buttons: DiscordButton[],
    options?: SendOptions
  ): Promise<SendResult> {
    const Discord = await import("discord.js");

    const styleMap: Record<string, number> = {
      'Primary': Discord.ButtonStyle.Primary,
      'Secondary': Discord.ButtonStyle.Secondary,
      'Success': Discord.ButtonStyle.Success,
      'Danger': Discord.ButtonStyle.Danger,
    };

    const components = [{
      type: 1, // Action Row
      components: buttons.map(btn => ({
        type: 2, // Button
        label: btn.label,
        style: btn.style ? styleMap[btn.style] : Discord.ButtonStyle.Primary,
        custom_id: btn.customId,
        url: btn.url,
        emoji: btn.emoji
      }))
    }];

    const content: SendContent = {};
    (content as any).embed = embed as any;
    (content as any).components = components;
    return this.send(target, content, options);
  }

  async getHistory(channel: string, limit: number): Promise<Message[]> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching history for channel ${channel}, limit: ${limit}`);

    try {
      const messages = await this.client.channels.fetchMessages(channel, {
        limit: Math.min(limit, 100),
      });

      this.logger.info(`Fetched ${messages.size} messages from channel ${channel}`);

      return messages.map((msg: any) => this.mapDiscordMessage(msg));
    } catch (error) {
      this.logger.error(`Failed to fetch history for channel ${channel}`, error);
      throw error;
    }
  }

  async search(query: string, options?: { channel?: string; limit?: number }): Promise<Message[]> {
    throw new Error("Discord search is not implemented. Discord does not provide a search API for bots.");
  }

  async getPins(channel: string): Promise<Message[]> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching pinned messages for channel ${channel}`);

    try {
      const messages = await this.client.channels.fetchPinned(channel);

      this.logger.info(`Fetched ${messages.size} pinned messages from channel ${channel}`);

      return messages.map((msg: any) => this.mapDiscordMessage(msg));
    } catch (error) {
      this.logger.error(`Failed to fetch pinned messages for channel ${channel}`, error);
      throw error;
    }
  }

  async getMemberInfo(userId: string): Promise<{
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    roles?: string[];
  }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching member info for user ${userId}`);

    try {
      const user: any = await this.client.users.fetch(userId);

      return {
        id: user.id,
        name: user.displayName || user.username,
        username: user.username,
        avatar: user.avatarURL(),
        roles: [],
      };
    } catch (error) {
      this.logger.error(`Failed to fetch member info for user ${userId}`, error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string): Promise<{
    id: string;
    name: string;
    type: "user" | "channel" | "group";
    topic?: string;
    memberCount?: number;
  }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching channel info for ${channelId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);

      // Check channel type - isDMOnly() doesn't exist in Discord.js v14
      const isDM = channel.type === 1; // DM channel type
      const isThread = channel.isThread();

      return {
        id: channel.id,
        name: channel.name,
        type: isDM ? "user" : isThread ? "group" : "channel",
        topic: channel.topic,
        memberCount: channel.memberCount,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch channel info for ${channelId}`, error);
      throw error;
    }
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Register interaction handler
   */
  onInteraction(callback: InteractionHandler): void {
    this.interactionCallback = callback;
  }

  /**
   * Register error handler
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Generic event listener for backward compatibility
   */
  on(event: 'message' | 'error', callback: any): void {
    if (event === 'message') {
      this.messageCallback = callback;
    } else if (event === 'error') {
      this.errorCallback = callback;
    }
  }

  // =========================================================================
  // Application Commands (Slash Commands)
  // =========================================================================

  /**
   * Register a single application command
   */
  async registerCommand(command: ApplicationCommand): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    if (!this.config?.clientId) {
      throw new Error("clientId is required to register commands");
    }

    this.logger.debug(`Registering command: ${command.name}`);

    try {
      const Discord = await import("discord.js");

      // Context menu commands (UserCommand, MessageCommand) cannot have descriptions
      const isContextMenu = command.type === 'UserCommand' || command.type === 'MessageCommand';

      const commandData: any = {
        name: command.name,
        type: this.getCommandType(command.type),
        default_member_permissions: command.defaultPermission !== undefined
          ? (command.defaultPermission ? '1 << 0' : '0')
          : undefined,
      };

      // Only include description for slash commands (ChatInput)
      if (!isContextMenu) {
        commandData.description = command.description || '';
        commandData.options = command.options?.map(opt => this.mapCommandOption(opt, Discord));
      }

      if (command.guildId) {
        // Register guild-specific command
        const guild = await this.client.guilds.fetch(command.guildId);
        await guild.commands.create(commandData);
      } else {
        // Register global command
        await this.client.application.commands.create(commandData);
      }

      this.logger.info(`Command ${command.name} registered successfully`);
    } catch (error) {
      this.logger.error(`Failed to register command ${command.name}`, error);
      throw error;
    }
  }

  /**
   * Register multiple application commands
   */
  async registerCommands(commands: ApplicationCommand[], guildId?: string): Promise<void> {
    for (const command of commands) {
      await this.registerCommand({ ...command, guildId });
    }
  }

  /**
   * Delete an application command
   */
  async deleteCommand(commandId: string, guildId?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Deleting command: ${commandId}`);

    try {
      if (guildId) {
        const guild = await this.client.guilds.fetch(guildId);
        await guild.commands.delete(commandId);
      } else {
        await this.client.application.commands.delete(commandId);
      }
      this.logger.info(`Command ${commandId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete command ${commandId}`, error);
      throw error;
    }
  }

  /**
   * Get all registered commands
   */
  async getCommands(guildId?: string): Promise<any[]> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    try {
      if (guildId) {
        const guild = await this.client.guilds.fetch(guildId);
        return Array.from(guild.commands.cache.values());
      } else {
        return Array.from(this.client.application.commands.cache.values());
      }
    } catch (error) {
      this.logger.error("Failed to fetch commands", error);
      throw error;
    }
  }

  // =========================================================================
  // Interaction Responses
  // =========================================================================

  /**
   * Respond to an interaction
   */
  async respondToInteraction(
    interactionId: string,
    token: string,
    response: InteractionResponse
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const Discord = await import("discord.js");

    try {
      const callbackData = this.mapInteractionResponse(response, Discord);

      await this.client.rest.post(
        Discord.Routes.interactionCallback(this.client.user.id, token),
        { body: callbackData }
      );

      this.logger.info(`Interaction response sent: ${response.type}`);
    } catch (error) {
      this.logger.error("Failed to respond to interaction", error);
      throw error;
    }
  }

  /**
   * Defer an interaction response
   */
  async deferInteraction(
    interactionId: string,
    token: string,
    ephemeral: boolean = false
  ): Promise<void> {
    await this.respondToInteraction(interactionId, token, {
      type: 'DeferredChannelMessageWithSource',
      data: ephemeral ? { flags: 64 } : undefined, // 64 = EPHEMERAL
    });
  }

  /**
   * Send a follow-up message to an interaction
   */
  async sendFollowup(
    token: string,
    content: string,
    ephemeral: boolean = false
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const Discord = await import("discord.js");

    try {
      await this.client.rest.post(
        Discord.Routes.webhook(this.client.user.id, token),
        {
          body: {
            content,
            flags: ephemeral ? 64 : undefined,
          },
        }
      );

      this.logger.info("Followup message sent");
    } catch (error) {
      this.logger.error("Failed to send followup message", error);
      throw error;
    }
  }

  /**
   * Edit original interaction response
   */
  async editOriginalResponse(
    token: string,
    content: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const Discord = await import("discord.js");

    try {
      await this.client.rest.patch(
        Discord.Routes.webhookMessage(this.client.user.id, token, '@original'),
        { body: { content } }
      );

      this.logger.info("Original response edited");
    } catch (error) {
      this.logger.error("Failed to edit original response", error);
      throw error;
    }
  }

  /**
   * Delete original interaction response
   */
  async deleteOriginalResponse(token: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const Discord = await import("discord.js");

    try {
      await this.client.rest.delete(
        Discord.Routes.webhookMessage(this.client.user.id, token, '@original')
      );

      this.logger.info("Original response deleted");
    } catch (error) {
      this.logger.error("Failed to delete original response", error);
      throw error;
    }
  }

  // =========================================================================
  // Modals
  // =========================================================================

  /**
   * Show a modal to a user
   * Supports two call patterns:
   * 1. showModal(interaction, modal) - Pass raw discord.js interaction
   * 2. showModal(interactionId, token, modal) - Pass id and token separately
   */
  async showModal(
    interactionOrId: any,
    tokenOrModal: string | DiscordModal,
    modalOrUndefined?: DiscordModal
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const Discord = await import("discord.js");

    try {
      let actualModal: DiscordModal;
      let token: string;
      let interaction: any = null;

      // Detect which call pattern is being used
      // Check if second param is a modal object (has customId) or a string (token)
      const isSecondParamModal = typeof tokenOrModal === 'object' && tokenOrModal !== null && 'customId' in tokenOrModal;

      if (isSecondParamModal) {
        // New pattern: showModal(interaction, modal)
        interaction = interactionOrId;
        actualModal = tokenOrModal as DiscordModal;
        token = interaction.token;
      } else if (typeof tokenOrModal === 'string' && modalOrUndefined) {
        // Old pattern: showModal(interactionId, token, modal)
        token = tokenOrModal;
        actualModal = modalOrUndefined;
      } else {
        throw new Error('showModal: Invalid parameters - could not determine modal configuration');
      }

      // Validate modal has required properties
      if (!actualModal.components || !Array.isArray(actualModal.components)) {
        throw new Error('showModal: modal.components is required and must be an array');
      }

      // Use discord.js native method if we have an interaction object
      if (interaction && interaction.showModal && typeof interaction.showModal === 'function') {
        const modalBuilder = new Discord.ModalBuilder()
          .setCustomId(actualModal.customId || `modal_${Date.now()}`)
          .setTitle(actualModal.title || 'Form');

        for (const input of actualModal.components) {
          const textInput = new Discord.TextInputBuilder()
            .setCustomId(input.customId)
            .setLabel(input.label)
            .setStyle(input.style === 'Short' ? Discord.TextInputStyle.Short : Discord.TextInputStyle.Paragraph)
            .setPlaceholder(input.placeholder || '')
            .setRequired(input.required ?? false);

          if (input.minLength !== undefined) {
            textInput.setMinLength(input.minLength);
          }
          if (input.maxLength !== undefined) {
            textInput.setMaxLength(input.maxLength);
          }
          if (input.value !== undefined) {
            textInput.setValue(input.value);
          }

          const actionRow = new Discord.ActionRowBuilder<typeof textInput>().addComponents(textInput);
          modalBuilder.addComponents(actionRow);
        }

        await interaction.showModal(modalBuilder);
        this.logger.info(`Modal shown: ${actualModal.title}`);
        return;
      }

      // Fallback to REST API
      const components = actualModal.components.map((input) => ({
        type: 1, // ACTION_ROW
        components: [{
          type: 4, // TEXT_INPUT
          custom_id: input.customId,
          label: input.label,
          style: input.style === 'Short' ? 1 : 2,
          placeholder: input.placeholder,
          min_length: input.minLength,
          max_length: input.maxLength,
          required: input.required,
          value: input.value,
        }],
      }));

      await this.client.rest.post(
        Discord.Routes.interactionCallback(this.client.user.id, token),
        {
          body: {
            type: 9, // MODAL
            data: {
              custom_id: actualModal.customId,
              title: actualModal.title,
              components,
            },
          },
        }
      );

      this.logger.info(`Modal shown: ${actualModal.title}`);
    } catch (error) {
      this.logger.error("Failed to show modal", error);
      throw error;
    }
  }

  // =========================================================================
  // Select Menus
  // =========================================================================

  /**
   * Send a select menu
   * Supports two call patterns:
   * 1. sendSelectMenu(target, selectMenu, text, options?) - selectMenu before text
   * 2. sendSelectMenu(target, text, selectMenu, options?) - text before selectMenu (legacy)
   */
  async sendSelectMenu(
    target: string,
    textOrSelectMenu: string | DiscordSelectMenu,
    selectMenuOrText: string | DiscordSelectMenu,
    options?: SendOptions
  ): Promise<SendResult> {
    // Detect which call pattern is being used by checking if second param has customId
    let text: string;
    let selectMenu: DiscordSelectMenu;

    const isFirstParamMenu = typeof textOrSelectMenu === 'object' && textOrSelectMenu !== null && 'customId' in textOrSelectMenu;
    const isSecondParamMenu = typeof selectMenuOrText === 'object' && selectMenuOrText !== null && 'customId' in selectMenuOrText;

    if (isFirstParamMenu) {
      // New pattern: sendSelectMenu(target, selectMenu, text, options)
      selectMenu = textOrSelectMenu as DiscordSelectMenu;
      text = selectMenuOrText as string;
    } else if (isSecondParamMenu) {
      // Legacy pattern: sendSelectMenu(target, text, selectMenu, options)
      text = textOrSelectMenu as string;
      selectMenu = selectMenuOrText as DiscordSelectMenu;
    } else {
      throw new Error('sendSelectMenu: Could not determine which parameter is the select menu');
    }

    // Validate selectMenu has required properties
    if (!selectMenu.options || !Array.isArray(selectMenu.options)) {
      throw new Error('sendSelectMenu: selectMenu.options is required and must be an array');
    }

    const actionRow = {
      type: 1, // ACTION_ROW
      components: [{
        type: 3, // STRING_SELECT
        custom_id: selectMenu.customId || `select_${Date.now()}`,
        placeholder: selectMenu.placeholder || 'Select an option',
        min_values: selectMenu.minValues ?? 1,
        max_values: selectMenu.maxValues ?? 1,
        disabled: selectMenu.disabled ?? false,
        options: selectMenu.options.map(opt => ({
          label: opt.label,
          value: opt.value,
          description: opt.description,
          emoji: opt.emoji,
          default: opt.default,
        })),
      }],
    };

    const content: SendContent = { text };
    (content as any).components = [actionRow as any];
    return this.send(target, content, options);
  }

  /**
   * Send an entity select menu (User/Role/Channel/Mentionable)
   * Supports two call patterns:
   * 1. sendEntitySelectMenu(target, selectMenu, text, options?) - selectMenu before text
   * 2. sendEntitySelectMenu(target, text, selectMenu, options?) - text before selectMenu (legacy)
   */
  async sendEntitySelectMenu(
    target: string,
    textOrSelectMenu: string | DiscordEntitySelectMenu,
    selectMenuOrText: string | DiscordEntitySelectMenu,
    options?: SendOptions
  ): Promise<SendResult> {
    // Detect which call pattern is being used by checking if second param has customId
    let text: string;
    let selectMenu: DiscordEntitySelectMenu;

    const isFirstParamMenu = typeof textOrSelectMenu === 'object' && textOrSelectMenu !== null && 'customId' in textOrSelectMenu;
    const isSecondParamMenu = typeof selectMenuOrText === 'object' && selectMenuOrText !== null && 'customId' in selectMenuOrText;

    if (isFirstParamMenu) {
      // New pattern: sendEntitySelectMenu(target, selectMenu, text, options)
      selectMenu = textOrSelectMenu as DiscordEntitySelectMenu;
      text = selectMenuOrText as string;
    } else if (isSecondParamMenu) {
      // Legacy pattern: sendEntitySelectMenu(target, text, selectMenu, options)
      text = textOrSelectMenu as string;
      selectMenu = selectMenuOrText as DiscordEntitySelectMenu;
    } else {
      throw new Error('sendEntitySelectMenu: Could not determine which parameter is the select menu');
    }

    const typeMap: Record<string, number> = {
      'User': 5,
      'Role': 6,
      'Channel': 7,
      'Mentionable': 8,
    };

    const actionRow = {
      type: 1, // ACTION_ROW
      components: [{
        type: typeMap[selectMenu.type] || 5,
        custom_id: selectMenu.customId || `entity_select_${Date.now()}`,
        placeholder: selectMenu.placeholder || 'Select an option',
        min_values: selectMenu.minValues ?? 1,
        max_values: selectMenu.maxValues ?? 1,
        disabled: selectMenu.disabled ?? false,
      }],
    };

    const content: SendContent = { text };
    (content as any).components = [actionRow as any];
    return this.send(target, content, options);
  }

  // =========================================================================
  // Webhooks
  // =========================================================================

  /**
   * Create a webhook
   */
  async createWebhook(channelId: string, nameOrOptions: string | { name: string; avatar?: string }, avatar?: string): Promise<DiscordWebhook> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating webhook in channel ${channelId}`);

    try {
      // Handle both call signatures:
      // - createWebhook(channelId, name, avatar)
      // - createWebhook(channelId, { name, avatar })
      let name: string;
      let avatarData: string | undefined;

      if (typeof nameOrOptions === 'string') {
        name = nameOrOptions;
        avatarData = avatar;
      } else {
        name = nameOrOptions.name;
        avatarData = nameOrOptions.avatar;
      }

      const channel: any = await this.client.channels.fetch(channelId);
      const webhook = await channel.createWebhook({ name, avatar: avatarData });

      this.logger.info(`Webhook created: ${webhook.id}`);

      return {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        guildId: webhook.guildId,
        channelId: webhook.channelId,
        token: webhook.token,
      };
    } catch (error) {
      this.logger.error("Failed to create webhook", error);
      throw error;
    }
  }

  /**
   * Get webhooks for a channel
   */
  async getWebhooks(channelId: string): Promise<DiscordWebhook[]> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      const webhooks = await channel.fetchWebhooks();

      return webhooks.map((wh: any) => ({
        id: wh.id,
        name: wh.name,
        url: wh.url,
        guildId: wh.guildId,
        channelId: wh.channelId,
        token: wh.token,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch webhooks", error);
      throw error;
    }
  }

  /**
   * Execute a webhook
   */
  async executeWebhook(
    webhookId: string,
    token: string,
    content: string,
    options?: { username?: string; avatarUrl?: string; embeds?: any[] }
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const Discord = await import("discord.js");

    try {
      await this.client.rest.post(
        Discord.Routes.webhook(webhookId, token),
        {
          body: {
            content,
            username: options?.username,
            avatar_url: options?.avatarUrl,
            embeds: options?.embeds,
          },
        }
      );

      this.logger.info(`Webhook executed: ${webhookId}`);
    } catch (error) {
      this.logger.error("Failed to execute webhook", error);
      throw error;
    }
  }

  /**
   * Modify a webhook
   */
  async modifyWebhook(
    webhookId: string,
    data: Partial<DiscordWebhook>
  ): Promise<DiscordWebhook> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Modifying webhook: ${webhookId}`);

    try {
      const webhook = await this.client.fetchWebhook(webhookId);

      if (data.name) {
        await webhook.edit({ name: data.name });
      }

      const updated = await this.client.fetchWebhook(webhookId);

      return {
        id: updated.id,
        name: updated.name || webhookId,
        url: updated.url || '',
        guildId: updated.guildId || '',
        channelId: updated.channelId || '',
        token: updated.token,
      };
    } catch (error) {
      this.logger.error("Failed to modify webhook", error);
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhookById(webhookId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Deleting webhook: ${webhookId}`);

    try {
      const webhook = await this.client.fetchWebhook(webhookId);
      await webhook.delete();

      this.logger.info(`Webhook deleted: ${webhookId}`);
    } catch (error) {
      this.logger.error("Failed to delete webhook", error);
      throw error;
    }
  }

  // =========================================================================
  // Thread Management
  // =========================================================================

  /**
   * Create a thread from a message
   */
  async createThread(
    channelId: string,
    messageId: string,
    name: string,
    autoArchiveDuration?: number
  ): Promise<{ id: string; name: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating thread in channel ${channelId}`);

    try {
      // Extract message ID from messageId (could be "channelId:messageId" format)
      const actualMessageId = messageId.includes(':') ? messageId.split(':')[1] : messageId;

      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(actualMessageId);

      const thread = await message.startThread({
        name,
        autoArchiveDuration: autoArchiveDuration || 1440, // Default 1 day
      });

      this.logger.info(`Thread created: ${thread.id}`);

      return {
        id: thread.id,
        name: thread.name,
      };
    } catch (error) {
      this.logger.error("Failed to create thread", error);
      throw error;
    }
  }

  /**
   * Create a standalone thread
   */
  async createStandaloneThread(
    channelId: string,
    name: string,
    options?: {
      autoArchiveDuration?: number;
      type?: 'public' | 'private';
      invitable?: boolean;
      reason?: string;
    }
  ): Promise<{ id: string; name: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating standalone thread in channel ${channelId}`);

    try {
      const channel = await this.client.channels.fetch(channelId);

      const thread = await channel.threads.create({
        name,
        autoArchiveDuration: options?.autoArchiveDuration || 1440,
        type: options?.type === 'private' ? 12 : 11,
        invitable: options?.invitable ?? true,
        reason: options?.reason,
      });

      this.logger.info(`Standalone thread created: ${thread.id}`);

      return {
        id: thread.id,
        name: thread.name,
      };
    } catch (error) {
      this.logger.error("Failed to create standalone thread", error);
      throw error;
    }
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Archiving thread ${threadId}`);

    try {
      const thread: any = await this.client.channels.fetch(threadId);
      await thread.edit({ archived: true }, reason);
      this.logger.info(`Thread ${threadId} archived`);
    } catch (error) {
      this.logger.error("Failed to archive thread", error);
      throw error;
    }
  }

  /**
   * Unarchive a thread
   */
  async unarchiveThread(threadId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Unarchiving thread ${threadId}`);

    try {
      const thread: any = await this.client.channels.fetch(threadId);
      await thread.edit({ archived: false }, reason);
      this.logger.info(`Thread ${threadId} unarchived`);
    } catch (error) {
      this.logger.error("Failed to unarchive thread", error);
      throw error;
    }
  }

  /**
   * Add a member to a thread
   */
  async addThreadMember(threadId: string, userId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Adding user ${userId} to thread ${threadId}`);

    try {
      const thread = await this.client.channels.fetch(threadId);
      await thread.members.add(userId);
      this.logger.info(`User ${userId} added to thread ${threadId}`);
    } catch (error) {
      this.logger.error("Failed to add thread member", error);
      throw error;
    }
  }

  /**
   * Remove a member from a thread
   */
  async removeThreadMember(threadId: string, userId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Removing user ${userId} from thread ${threadId}`);

    try {
      const thread = await this.client.channels.fetch(threadId);
      await thread.members.remove(userId);
      this.logger.info(`User ${userId} removed from thread ${threadId}`);
    } catch (error) {
      this.logger.error("Failed to remove thread member", error);
      throw error;
    }
  }

  /**
   * Get active threads in a channel
   */
  async getActiveThreads(channelId: string): Promise<Array<{ id: string; name: string; messageCount: number }>> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      const threads = await channel.threads.fetchActive();

      return threads.map((thread: any) => ({
        id: thread.id,
        name: thread.name,
        messageCount: thread.messageCount,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch active threads", error);
      throw error;
    }
  }

  // =========================================================================
  // Role Management
  // =========================================================================

  /**
   * Create a role
   */
  async createRole(
    guildId: string,
    nameOrOptions: string | { name: string; color?: number; permissions?: string[] },
    options?: {
      color?: number;
      hoist?: boolean;
      mentionable?: boolean;
      permissions?: string[];
      reason?: string;
    }
  ): Promise<{ id: string; name: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating role in guild ${guildId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);

      // Handle both call signatures:
      // - createRole(guildId, name, options)
      // - createRole(guildId, { name, color, ... })
      let name: string;
      let color: number;
      let permissions: string[] | undefined;

      if (typeof nameOrOptions === 'string') {
        name = nameOrOptions;
        color = options?.color || 0;
        permissions = options?.permissions;
      } else {
        name = nameOrOptions.name;
        color = nameOrOptions.color || 0;
        permissions = nameOrOptions.permissions;
      }

      const roleData: any = {
        name,
        color,
        hoist: options?.hoist || false,
        mentionable: options?.mentionable || false,
        reason: options?.reason,
      };

      // Skip permissions for now, complex permission bitfield handling
      // if (options?.permissions) { ... }

      const role = await guild.roles.create(roleData);

      this.logger.info(`Role created: ${role.id}`);

      return {
        id: role.id,
        name: role.name,
      };
    } catch (error) {
      this.logger.error("Failed to create role", error);
      throw error;
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(guildId: string, roleId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Deleting role ${roleId} in guild ${guildId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);
      await guild.roles.delete(roleId, reason);
      this.logger.info(`Role ${roleId} deleted`);
    } catch (error) {
      this.logger.error("Failed to delete role", error);
      throw error;
    }
  }

  /**
   * Assign a role to a member
   */
  async addRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Adding role ${roleId} to user ${userId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      await member.roles.add(roleId, reason);
      this.logger.info(`Role ${roleId} added to user ${userId}`);
    } catch (error) {
      this.logger.error("Failed to add role", error);
      throw error;
    }
  }

  /**
   * Remove a role from a member
   */
  async removeRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Removing role ${roleId} from user ${userId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      await member.roles.remove(roleId, reason);
      this.logger.info(`Role ${roleId} removed from user ${userId}`);
    } catch (error) {
      this.logger.error("Failed to remove role", error);
      throw error;
    }
  }

  /**
   * Get all roles in a guild
   */
  async getRoles(guildId: string): Promise<Array<{ id: string; name: string; color?: number; position?: number }>> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    try {
      const guild = await this.client.guilds.fetch(guildId);
      return guild.roles.cache.map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch roles", error);
      throw error;
    }
  }

  // =========================================================================
  // Channel Management
  // =========================================================================

  /**
   * Create a guild channel (Discord-specific)
   */
  async createGuildChannel(
    guildId: string,
    name: string,
    type: 'text' | 'voice' | 'announcement' | 'forum' = 'text',
    options?: {
      parentId?: string;
      topic?: string;
      nsfw?: boolean;
      position?: number;
      rateLimitPerUser?: number;
      reason?: string;
    }
  ): Promise<{ id: string; name: string; type: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating channel ${name} in guild ${guildId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);

      const Discord: any = this._testDiscordModule || await import("discord.js");

      const typeMap: Record<string, number> = {
        'text': Discord.ChannelType.GuildText,
        'voice': Discord.ChannelType.GuildVoice,
        'announcement': Discord.ChannelType.GuildAnnouncement,
        'forum': Discord.ChannelType.GuildForum,
      };

      const channelData: any = {
        name,
        type: typeMap[type] || Discord.ChannelType.GuildText,
        parent: options?.parentId,
        topic: options?.topic,
        nsfw: options?.nsfw,
        position: options?.position,
        rateLimitPerUser: options?.rateLimitPerUser,
        reason: options?.reason,
      };

      const channel = await guild.channels.create(channelData);

      this.logger.info(`Channel created: ${channel.id}`);

      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
      };
    } catch (error) {
      this.logger.error("Failed to create channel", error);
      throw error;
    }
  }

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Deleting channel ${channelId}`);

    try {
      const channel = await this.client.channels.fetch(channelId);
      await channel.delete(reason);
      this.logger.info(`Channel ${channelId} deleted`);
    } catch (error) {
      this.logger.error("Failed to delete channel", error);
      throw error;
    }
  }

  /**
   * Edit a channel
   */
  async editChannel(
    channelId: string,
    data: {
      name?: string;
      topic?: string;
      nsfw?: boolean;
      position?: number;
      rateLimitPerUser?: number;
      parentId?: string | null;
    },
    reason?: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Editing channel ${channelId}`);

    try {
      const channel = await this.client.channels.fetch(channelId);
      await channel.edit({ ...data, reason });
      this.logger.info(`Channel ${channelId} edited`);
    } catch (error) {
      this.logger.error("Failed to edit channel", error);
      throw error;
    }
  }

  // =========================================================================
  // Invite Management
  // =========================================================================

  /**
   * Create an invite
   */
  async createInvite(
    channelId: string,
    options?: {
      maxAge?: number;
      maxUses?: number;
      temporary?: boolean;
      unique?: boolean;
      reason?: string;
    }
  ): Promise<{ code: string; url: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating invite for channel ${channelId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);

      // Create invite using the channel's invites manager
      const invite = await channel.createInvite({
        maxAge: options?.maxAge || 86400, // Default 24 hours
        maxUses: options?.maxUses,
        temporary: options?.temporary || false,
        unique: options?.unique,
        reason: options?.reason,
      });

      this.logger.info(`Invite created: ${invite.code}`);

      return {
        code: invite.code,
        url: invite.url,
      };
    } catch (error) {
      this.logger.error("Failed to create invite", error);
      throw error;
    }
  }

  /**
   * Get a single invite by code (uses client.fetchInvite, doesn't need channelId)
   */
  async getInvite(inviteCode: string): Promise<{
    code: string;
    url: string;
    maxUses?: number;
    uses: number;
    expiresAt?: Date;
  }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching invite ${inviteCode}`);

    try {
      const invite = await this.client.fetchInvite(inviteCode);

      return {
        code: invite.code,
        url: invite.url,
        maxUses: invite.maxUses,
        uses: invite.uses,
        expiresAt: invite.expiresAt,
      };
    } catch (error) {
      this.logger.error("Failed to fetch invite", error);
      throw error;
    }
  }

  /**
   * Get invites for a channel
   */
  async getInvites(channelId: string): Promise<Array<{
    code: string;
    url: string;
    maxUses?: number;
    uses: number;
    expiresAt?: Date;
  }>> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    try {
      const channel: any = await this.client.channels.fetch(channelId);
      const invites = await channel.invites.fetch();

      return invites.map((invite: any) => ({
        code: invite.code,
        url: invite.url,
        maxUses: invite.maxUses,
        uses: invite.uses,
        expiresAt: invite.expiresAt,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch invites", error);
      throw error;
    }
  }

  /**
   * Delete an invite
   */
  async deleteInvite(channelId: string, inviteCode: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Deleting invite ${inviteCode} from channel ${channelId}`);

    try {
      // Delete invite using the client's invites fetch
      const invite = await this.client.fetchInvite(inviteCode);
      await invite.delete(reason);
      this.logger.info(`Invite ${inviteCode} deleted`);
    } catch (error) {
      this.logger.error("Failed to delete invite", error);
      throw error;
    }
  }

  /**
   * Get a guild member
   */
  async getMember(guildId: string, userId: string): Promise<{
    user: { id: string; username: string; discriminator: string };
    roles: string[];
    joinedAt: Date;
    nickname?: string;
  }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching member ${userId} from guild ${guildId}`);

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);

      return {
        user: {
          id: member.user.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
        },
        roles: member.roles.cache.map((role: any) => role.id),
        joinedAt: member.joinedAt,
        nickname: member.nickname,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch member ${userId} from guild ${guildId}`, error);
      throw error;
    }
  }

  /**
   * Get a channel
   */
  async getChannel(channelId: string): Promise<{
    id: string;
    name: string;
    type: string;
    guildId?: string;
    parentId?: string;
  }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Fetching channel ${channelId}`);

    try {
      const channel: any = await this.client.channels.fetch(channelId);

      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        guildId: channel.guildId,
        parentId: channel.parentId,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch channel ${channelId}`, error);
      throw error;
    }
  }

  // =========================================================================
  // FullAdapter Interface Methods
  // =========================================================================

  /**
   * Create a channel (FullAdapter interface)
   */
  async createChannel(
    name: string,
    options?: { type?: "text" | "voice"; guildId?: string }
  ): Promise<{ id: string; name: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    if (!options?.guildId) {
      throw new Error("guildId is required in options");
    }

    const result = await this.createGuildChannel(
      options.guildId,
      name,
      options.type || 'text'
    );

    return {
      id: result.id,
      name: result.name,
    };
  }

  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  async destroy(): Promise<void> {
    this.logger.info("Destroying Discord adapter...");

    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }

    this.messageCallback = undefined;
    this.logger.info("Discord adapter destroyed");
  }

  /**
   * Handle incoming Discord message
   */
  private handleDiscordMessage(msg: any): void {
    try {
      // Ignore messages from bots
      if (msg.author.bot) {
        return;
      }

      this.logger.debug(`Received message from ${msg.author?.id || "unknown"}`);
      const message = this.mapDiscordMessage(msg);
      this.logger.debug(`Mapped message: ${message.messageId} (type: ${message.type})`);

      if (this.messageCallback) {
        this.messageCallback(message);
      }
    } catch (error) {
      this.logger.error("Failed to handle Discord message", error);
    }
  }

  /**
   * Handle Discord interaction
   */
  private async handleInteraction(interaction: any): Promise<void> {
    try {
      // Cache interaction for potential later use
      const interactionData: DiscordInteraction = {
        id: interaction.id,
        applicationId: interaction.applicationId,
        type: interaction.type,
        token: interaction.token,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user?.id || interaction.member?.user?.id,
        user: interaction.user || interaction.member?.user,
        member: interaction.member,
        data: interaction.data,
        message: interaction.message,
        raw: interaction, // Include raw interaction for access to discord.js methods
      };
      this.interactionCache.set(interaction.id, interactionData);

      this.logger.debug(`Received interaction ${interactionData.type} from ${interactionData.userId}`);

      // Call custom interaction handler if provided
      if (this.interactionCallback) {
        const response = await this.interactionCallback(interactionData);

        if (response) {
          await this.respondToInteraction(interactionData.id, interactionData.token, response);
        }
      } else {
        // Default handling
        await this.handleInteractionDefault(interaction, interactionData);
      }

      // Clean up old interactions from cache (keep only last 100)
      if (this.interactionCache.size > 100) {
        const firstKey = this.interactionCache.keys().next().value;
        if (firstKey) {
          this.interactionCache.delete(firstKey);
        }
      }
    } catch (error) {
      this.logger.error("Failed to handle interaction", error);
    }
  }

  /**
   * Default interaction handler
   */
  private async handleInteractionDefault(interaction: any, data: DiscordInteraction): Promise<void> {
    const Discord = await import("discord.js");

    // Auto-respond to PING interactions
    if (data.type === Discord.InteractionType.Ping) {
      await interaction.reply({ type: 1 }); // PONG
      return;
    }

    // Auto-respond with defer for application commands
    if (data.type === Discord.InteractionType.ApplicationCommand) {
      await interaction.deferReply();
      this.logger.info(`Auto-deferred command: ${data.data?.name}`);
    }

    // For autocomplete, respond with empty choices
    if (data.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
      await interaction.respond([], { choices: [] });
    }

    // For buttons, acknowledge the interaction
    if (data.type === Discord.InteractionType.MessageComponent) {
      if (interaction.isButton()) {
        await interaction.deferUpdate();
      }
    }

    // For modals, acknowledge
    if (data.type === Discord.InteractionType.ModalSubmit) {
      await interaction.deferReply();
    }
  }

  /**
   * Map command type to Discord type
   */
  private getCommandType(type?: ApplicationCommandType): number {
    if (!type) return 1; // SlashCommand
    const types: Record<ApplicationCommandType, number> = {
      'SlashCommand': 1,
      'UserCommand': 2,
      'MessageCommand': 3,
    };
    return types[type] ?? 1;
  }

  /**
   * Map command option to Discord format
   */
  private mapCommandOption(option: ApplicationCommandOption, Discord: any): any {
    const typeMap: Record<ApplicationCommandOptionType, number> = {
      'Subcommand': 1,
      'SubcommandGroup': 2,
      'String': 3,
      'Integer': 4,
      'Boolean': 5,
      'User': 6,
      'Channel': 7,
      'Role': 8,
      'Mentionable': 9,
      'Number': 10,
      'Attachment': 11,
    };

    const mapped: any = {
      name: option.name,
      description: option.description,
      type: typeMap[option.type],
      required: option.required,
      choices: option.choices,
      min_length: option.minLength,
      max_length: option.maxLength,
      min_value: option.minValue,
      max_value: option.maxValue,
      autocomplete: option.autocomplete,
      channel_types: option.channelTypes,
    };

    if (option.options) {
      mapped.options = option.options.map(opt => this.mapCommandOption(opt, Discord));
    }

    return mapped;
  }

  /**
   * Map interaction response to Discord format
   */
  private mapInteractionResponse(response: InteractionResponse, Discord: any): any {
    const typeMap: Record<InteractionResponseType, number> = {
      'Pong': 1,
      'ChannelMessageWithSource': 4,
      'DeferredChannelMessageWithSource': 5,
      'DeferredUpdateMessage': 6,
      'UpdateMessage': 7,
      'ApplicationCommandAutocompleteResult': 8,
      'Modal': 9,
      'PremiumRequired': 10,
      'LaunchActivity': 12,
    };

    const result: any = {
      type: typeMap[response.type],
    };

    if (response.data) {
      result.data = {
        content: response.data.content,
        embeds: response.data.embeds,
        components: response.data.components,
        flags: response.data.flags,
        choices: response.data.choices,
        custom_id: response.data.custom_id,
        title: response.data.title,
      };
    }

    return result;
  }

  /**
   * Handle Discord reaction
   */
  private handleDiscordReaction(reaction: any, user: any): void {
    try {
      // Ignore reactions from bots
      if (user.bot) {
        return;
      }

      this.logger.debug(`Received reaction from ${user?.id || "unknown"}`);
      const message = this.mapDiscordReaction(reaction, user);

      if (this.messageCallback) {
        this.messageCallback(message);
      }
    } catch (error) {
      this.logger.error("Failed to handle Discord reaction", error);
    }
  }

  /**
   * Map Discord message to unified format
   */
  private mapDiscordMessage(msg: any): Message {
    const from: Participant = {
      id: msg.author.id,
      name: msg.author.displayName || msg.author.username,
      username: msg.author.username,
      avatar: msg.author.avatarURL(),
    };

    // Check channel type - isDMOnly() doesn't exist in Discord.js v14
    const isDM = msg.channel.type === 1; // DM channel type
    const isThread = msg.channel.isThread();

    const to: Participant = {
      id: msg.channelId,
      type: isDM ? "user" : isThread ? "group" : "channel",
      name: msg.channel.name || msg.channel.recipient?.username,
    };

    const content: MessageContent = {};

    if (msg.content) {
      content.text = msg.content;
    }

    if (msg.attachments && msg.attachments.size > 0) {
      const attachment = msg.attachments.first();
      content.mediaUrl = attachment.url;
      content.mediaType = attachment.contentType?.split("/")[0] as any;
    }

    const replyTo: ReplyReference | undefined = msg.reference
      ? {
          messageId: `${msg.channelId}:${msg.reference.messageId}`,
          text: undefined,
        }
      : undefined;

    return {
      platform: this.platform,
      type: msg.attachments?.size > 0 ? "media" : "text",
      from,
      to,
      content,
      replyTo,
      messageId: `${msg.channelId}:${msg.id}`,
      timestamp: msg.createdTimestamp,
      raw: msg,
    };
  }

  /**
   * Map Discord reaction to unified format
   */
  private mapDiscordReaction(reaction: any, user: any): Message {
    const from: Participant = {
      id: user.id,
      name: user.displayName || user.username,
      username: user.username,
    };

    const to: Participant = {
      id: reaction.message.channelId,
      type: "channel",
      name: reaction.message.channel.name || reaction.message.channelId,
    };

    return {
      platform: this.platform,
      type: "reaction",
      from,
      to,
      content: {
        emoji: reaction.emoji.name || reaction.emoji.toString(),
      },
      replyTo: {
        messageId: `${reaction.message.channelId}:${reaction.message.id}`,
        text: reaction.message.content || '',
      },
      messageId: `${reaction.message.channelId}:${reaction.message.id}`,
      timestamp: Date.now(),
      raw: reaction,
    };
  }

  // ============================================================================
  // Unified API Methods (Standardized across platforms)
  // Note: These override/extend the native Discord methods with unified signatures
  // ============================================================================

  /**
   * Create invite with unified options
   */
  async createInvite(
    channelId: string,
    options?: import("@omnichat/core").UnifiedInviteOptions
  ): Promise<import("@omnichat/core").UnifiedInviteResult> {
    const discordOptions: {
      maxAge?: number;
      maxUses?: number;
      temporary?: boolean;
      unique?: boolean;
      reason?: string;
    } = {};

    if (options?.maxUses !== undefined) discordOptions.maxUses = options.maxUses;
    if (options?.expiresInSeconds !== undefined) discordOptions.maxAge = options.expiresInSeconds;
    if (options?.reason) discordOptions.reason = options.reason;
    if (options?.discord?.temporary !== undefined) discordOptions.temporary = options.discord.temporary;
    if (options?.discord?.unique !== undefined) discordOptions.unique = options.discord.unique;

    const result = await this._createDiscordInvite(channelId, discordOptions);

    return {
      url: result.url,
      code: result.code,
      maxUses: discordOptions.maxUses,
      raw: result,
    };
  }

  // Native Discord invite method (renamed)
  private async _createDiscordInvite(
    channelId: string,
    options?: {
      maxAge?: number;
      maxUses?: number;
      temporary?: boolean;
      unique?: boolean;
      reason?: string;
    }
  ): Promise<{ code: string; url: string }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Creating invite for channel ${channelId}`);

    const channel: any = await this.client.channels.fetch(channelId);
    const invite = await channel.createInvite({
      maxAge: options?.maxAge || 86400,
      maxUses: options?.maxUses,
      temporary: options?.temporary || false,
      unique: options?.unique,
      reason: options?.reason,
    });

    this.logger.info(`Invite created: ${invite.code}`);

    return {
      code: invite.code,
      url: `https://discord.gg/${invite.code}`,
    };
  }

  /**
   * Get invites list
   */
  async getInvites(
    channelId: string
  ): Promise<import("@omnichat/core").UnifiedInviteResult[]> {
    const invites = await this._getDiscordInvites(channelId);
    return invites.map((invite) => ({
      url: invite.url,
      code: invite.code,
      maxUses: invite.maxUses,
      useCount: invite.uses,
      expiresAt: invite.expiresAt ? Math.floor(invite.expiresAt.getTime() / 1000) : undefined,
    }));
  }

  // Native Discord get invites method (renamed)
  private async _getDiscordInvites(channelId: string): Promise<Array<{
    code: string;
    url: string;
    maxUses?: number;
    uses: number;
    expiresAt?: Date;
  }>> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const channel: any = await this.client.channels.fetch(channelId);
    const invites = await channel.invites.fetch();

    return invites.map((invite: any) => ({
      code: invite.code,
      url: `https://discord.gg/${invite.code}`,
      maxUses: invite.maxUses,
      uses: invite.uses,
      expiresAt: invite.expiresAt,
    }));
  }

  /**
   * Revoke invite
   */
  async revokeInvite(
    channelId: string,
    inviteCode: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this._deleteDiscordInvite(channelId, inviteCode);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Native Discord delete invite method (renamed)
  private async _deleteDiscordInvite(channelId: string, inviteCode: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Deleting invite ${inviteCode} from channel ${channelId}`);

    const invite = await this.client.fetchInvite(inviteCode);
    await invite.delete(reason);
    this.logger.info(`Invite ${inviteCode} deleted`);
  }

  /**
   * Export invite (gets or creates default invite)
   */
  async exportInvite(channelId: string): Promise<string> {
    const invites = await this.getInvites(channelId);
    if (invites.length > 0) {
      return invites[0].url;
    }
    const result = await this.createInvite(channelId);
    return result.url;
  }

  /**
   * Pin message
   */
  async pinMessage(
    channelId: string,
    messageId: string,
    options?: import("@omnichat/core").UnifiedPinOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      if (!this.client) {
        throw new Error("Discord client not initialized");
      }

      const channel: any = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.pin(options?.discord?.auditLogReason || options?.reason);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unpin message
   */
  async unpinMessage(
    channelId: string,
    messageId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      if (!this.client) {
        throw new Error("Discord client not initialized");
      }

      const channel: any = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.unpin();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member info
   */
  async getMemberInfo(
    guildId: string,
    userId: string
  ): Promise<import("@omnichat/core").UnifiedMemberInfo> {
    const member = await this._getDiscordMember(guildId, userId);
    return {
      id: member.user.id,
      name: member.nickname || member.user.username,
      username: member.user.username,
      roles: member.roles,
      joinedAt: member.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : undefined,
      raw: member,
    };
  }

  // Native Discord get member method (renamed)
  private async _getDiscordMember(guildId: string, userId: string): Promise<{
    user: { id: string; username: string; discriminator: string };
    roles: string[];
    joinedAt: Date;
    nickname?: string;
  }> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    return {
      user: {
        id: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
      },
      roles: [...member.roles.cache.keys()],
      joinedAt: member.joinedAt!,
      nickname: member.nickname || undefined,
    };
  }

  /**
   * Get member count
   */
  async getMemberCount(guildId: string): Promise<number> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const guild = await this.client.guilds.fetch(guildId);
    return guild.approximateMemberCount || guild.memberCount || 0;
  }

  /**
   * Get administrators
   */
  async getAdministrators(
    guildId: string
  ): Promise<import("@omnichat/core").UnifiedMemberInfo[]> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const guild = await this.client.guilds.fetch(guildId);
    await guild.members.fetch();
    const admins = guild.members.cache.filter((member: any) =>
      member.permissions.has("Administrator") || member.permissions.has("ManageGuild")
    );

    return admins.map((member: any) => ({
      id: member.user.id,
      name: member.displayName || member.user.username,
      username: member.user.username,
      roles: [...member.roles.cache.keys()],
      isAdmin: true,
      isOwner: member.user.id === guild.ownerId,
      raw: member,
    }));
  }

  /**
   * Kick user
   */
  async kick(
    guildId: string,
    userId: string,
    options?: import("@omnichat/core").UnifiedModerationOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this._kickDiscordUser(guildId, userId, options?.reason);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Native Discord kick method (renamed)
  private async _kickDiscordUser(guildId: string, userId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Kicking user ${userId} from guild ${guildId}`);

    const guild = await this.client.guilds.fetch(guildId);
    await guild.members.kick(userId, reason);
    this.logger.info(`User ${userId} kicked from guild ${guildId}`);
  }

  /**
   * Ban user
   */
  async ban(
    guildId: string,
    userId: string,
    options?: import("@omnichat/core").UnifiedModerationOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      const duration = options?.durationSeconds ? options.durationSeconds * 1000 : undefined;
      await this._banDiscordUser(guildId, userId, options?.reason, duration);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Native Discord ban method (renamed)
  private async _banDiscordUser(guildId: string, userId: string, reason?: string, duration?: number): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Banning user ${userId} from guild ${guildId}`);

    const guild = await this.client.guilds.fetch(guildId);
    const banOptions: any = { reason };

    if (duration) {
      banOptions.expirationDate = Date.now() + duration;
    }

    await guild.bans.create(userId, banOptions);
    this.logger.info(`User ${userId} banned from guild ${guildId}`);
  }

  /**
   * Unban user
   */
  async unban(
    guildId: string,
    userId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      if (!this.client) {
        throw new Error("Discord client not initialized");
      }

      const guild = await this.client.guilds.fetch(guildId);
      await guild.bans.remove(userId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mute user (Discord uses timeout)
   */
  async mute(
    guildId: string,
    userId: string,
    options: import("@omnichat/core").UnifiedMuteOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      const durationMs = options.durationSeconds * 1000;
      await this._timeoutDiscordUser(guildId, userId, durationMs, options.reason);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Native Discord timeout method (renamed)
  private async _timeoutDiscordUser(guildId: string, userId: string, duration: number, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    this.logger.debug(`Timing out user ${userId} in guild ${guildId} for ${duration}ms`);

    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    const maxDuration = 28 * 24 * 60 * 60 * 1000;
    const actualDuration = Math.min(duration, maxDuration);

    await member.timeout(actualDuration, reason);
    this.logger.info(`User ${userId} timed out in guild ${guildId} for ${actualDuration}ms`);
  }

  /**
   * Unmute user
   */
  async unmute(
    guildId: string,
    userId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      if (!this.client) {
        throw new Error("Discord client not initialized");
      }

      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      await member.timeout(null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set chat title
   */
  async setTitle(
    channelId: string,
    title: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this.editChannel(channelId, { name: title });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set chat description
   */
  async setDescription(
    channelId: string,
    description: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this.editChannel(channelId, { topic: description || undefined });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create DM channel
   */
  async createDMChannel(userId: string): Promise<string> {
    if (!this.client) {
      throw new Error("Discord client not initialized");
    }

    const user = await this.client.users.fetch(userId);
    const dmChannel = await user.createDM();
    return dmChannel.id;
  }

  /**
   * Close DM channel
   */
  async closeDMChannel(
    channelId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      if (!this.client) {
        throw new Error("Discord client not initialized");
      }

      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel.isDMBased()) {
        await channel.delete();
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
