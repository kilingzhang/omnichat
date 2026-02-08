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
}

/**
 * Discord adapter
 */
export class DiscordAdapter implements FullAdapter {
  readonly platform = "discord";

  private client: any; // Discord.Client from discord.js
  private config?: DiscordConfig;
  private messageCallback?: (message: Message) => void;
  private capabilities: Capabilities;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("DiscordAdapter", LogLevel.INFO);
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: true, edit: true, delete: true, threads: true, quote: false },
      interaction: { buttons: false, polls: false, reactions: true, stickers: false, effects: false },
      discovery: { history: true, search: false, pins: true, memberInfo: true, channelInfo: true },
      management: { kick: true, ban: true, timeout: true, channelCreate: true, channelEdit: true, channelDelete: true, permissions: false },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as DiscordConfig;

    if (!this.config.botToken) {
      throw new Error("Discord bot token is required");
    }

    this.logger.info("Initializing Discord adapter...");

    try {
      // Dynamically import discord.js
      const Discord: any = await import("discord.js");

      const intents = this.config.intents || [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
      ];

      this.client = new Discord.Client({
        intents: intents,
      });

      // Register message handler
      this.client.on("messageCreate", (msg: any) => this.handleDiscordMessage(msg));
      this.client.on("messageReactionAdd", (reaction: any, user: any) => this.handleDiscordReaction(reaction, user));

      this.client.on("error", (error: Error) => {
        this.logger.error("Discord client error", error);
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

    if (!content.text && !content.mediaUrl) {
      throw new Error("Either text or mediaUrl is required");
    }

    let channelId = target;
    if (target.startsWith("channel:")) {
      channelId = target.replace("channel:", "");
    }

    this.logger.debug(`Sending message to channel ${channelId}`);

    let result: any;

    try {
      if (content.mediaUrl) {
        this.logger.debug(`Sending media to channel ${channelId}`);
        result = await this.client.channels.send(channelId, {
          files: [{ attachment: content.mediaUrl, description: content.text }],
        });
      } else if (content.text) {
        this.logger.debug(`Sending text to channel ${channelId}: ${content.text.substring(0, 50)}...`);
        result = await this.client.channels.send(channelId, {
          content: content.text,
        });
      } else {
        throw new Error("Either text or mediaUrl is required");
      }

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
      if (content.mediaUrl) {
        result = await this.client.channels.send(channelId, {
          files: [{ attachment: content.mediaUrl, description: content.text }],
          messageReference: { messageId: msgId },
        });
      } else {
        result = await this.client.channels.send(channelId, {
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
      await this.client.channels.editMessage(channelId, msgId, {
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
      await this.client.channels.deleteMessage(channelId, msgId);
      this.logger.info(`Message ${msgId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete message ${msgId}`, error);
      throw error;
    }
  }

  async sendPoll(target: string, poll: PollInput, options?: SendOptions): Promise<PollResult> {
    throw new Error("Discord polls are not supported. Discord does not have a native poll feature.");
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
      await this.client.channels.react(channelId, msgId, emoji);
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
      await this.client.channels.deleteReaction(channelId, msgId, emoji);
      this.logger.info(`Reaction removed successfully`);
    } catch (error) {
      this.logger.warn(`Failed to remove reaction from message ${msgId}`, error);
      throw error;
    }
  }

  async sendSticker(target: string, stickerId: string, options?: SendOptions): Promise<SendResult> {
    throw new Error("Discord stickers are not supported in this adapter yet");
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

      return {
        id: channel.id,
        name: channel.name,
        type: channel.isDMOnly() ? "user" : channel.isThread() ? "group" : "channel",
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

    const to: Participant = {
      id: msg.channelId,
      type: msg.channel.isDMOnly() ? "user" : msg.channel.isThread() ? "group" : "channel",
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
      name: reaction.message.channel.name,
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
        text: reaction.message.content,
      },
      messageId: `${reaction.message.channelId}:${reaction.message.id}`,
      timestamp: Date.now(),
      raw: reaction,
    };
  }
}
