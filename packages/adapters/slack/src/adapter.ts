import type {
  FullAdapter,
  AdapterConfig,
  SendContent,
  SendOptions,
  SendResult,
  PollInput,
  PollResult,
} from "@omnichat/core";
import type { Message, MessageContent, Participant, ReplyReference } from "@omnichat/core";
import type { Capabilities } from "@omnichat/core";
import { defaultCapabilities, Logger, LogLevel } from "@omnichat/core";
import { parseMessageId, validateRequired } from "@omnichat/core";

/**
 * Slack adapter configuration
 */
export interface SlackConfig extends AdapterConfig {
  botToken: string;
  signingSecret?: string;
  appLevelToken?: string; // For socket mode
  socketMode?: boolean;
}

/**
 * Slack adapter
 */
export class SlackAdapter implements FullAdapter {
  readonly platform = "slack";

  private client: any; // WebClient from @slack/web-api
  private app?: any; // App from @slack/bolt
  private config?: SlackConfig;
  private messageCallback?: (message: Message) => void;
  private capabilities: Capabilities;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("SlackAdapter", LogLevel.INFO);
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: true, edit: true, delete: true, threads: true, quote: false },
      interaction: { buttons: true, polls: false, reactions: true, stickers: false, effects: false },
      discovery: { history: true, search: true, pins: true, memberInfo: true, channelInfo: true },
      management: { kick: true, ban: false, timeout: false, channelCreate: true, channelEdit: true, channelDelete: true, permissions: false },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as SlackConfig;

    if (!this.config.botToken) {
      throw new Error("Slack bot token is required");
    }

    this.logger.info("Initializing Slack adapter...");

    try {
      // Dynamically import @slack/web-api
      const { WebClient } = await import("@slack/web-api");
      this.client = new WebClient(this.config.botToken);

      // Test connection
      const auth = await this.client.auth.test();
      this.logger.info(`Connected to Slack workspace: ${auth.team}`);

      // If socket mode is enabled, initialize the app
      if (this.config.socketMode && this.config.appLevelToken && this.config.signingSecret) {
        const { App } = await import("@slack/bolt");
        this.app = new App({
          token: this.config.botToken,
          appToken: this.config.appLevelToken,
          socketMode: true,
        });

        this.app.message(async ({ message, say }) => {
          const mapped = this.mapSlackMessage(message, message.channel);
          if (this.messageCallback) {
            this.messageCallback(mapped);
          }
        });

        await this.app.start();
        this.logger.info("Slack app started in socket mode");
      }

      this.logger.info("Slack adapter initialized successfully");
    } catch (error: any) {
      if ((error as any).code === "MODULE_NOT_FOUND") {
        this.logger.warn("@slack/web-api not installed. Install with: npm install @slack/web-api");
        this.logger.warn("Creating mock adapter for development...");
        this.client = null;
      } else {
        this.logger.error("Failed to initialize Slack adapter", error);
        throw error;
      }
    }
  }

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    if (!this.client) {
      throw new Error("Slack client not initialized. Install @slack/web-api.");
    }

    validateRequired(target, "target");

    if (!content.text && !content.mediaUrl) {
      throw new Error("Either text or mediaUrl is required");
    }

    this.logger.debug(`Sending message to channel ${target}`);

    try {
      const slackOpts: any = {};

      if (content.text) {
        slackOpts.text = content.text;
      }

      if (content.mediaUrl) {
        // For media, upload as file
        const result: any = await this.client.files.upload({
          channels: target,
          file: content.mediaUrl,
          initial_comment: content.text,
          thread_ts: options?.threadId,
        });

        this.logger.info(`File sent successfully. ID: ${result.file.id}`);

        return {
          platform: this.platform,
          messageId: `${target}:${result.file.id}`,
          chatId: target,
          timestamp: result.file.created * 1000,
        };
      }

      // Add thread ID if specified
      if (options?.threadId) {
        slackOpts.thread_ts = options.threadId;
      }

      // Add reply broadcast if in thread
      if (options?.replyBroadcast) {
        slackOpts.reply_broadcast = true;
      }

      const result: any = await this.client.chat.postMessage({
        channel: target,
        ...slackOpts,
      });

      this.logger.info(`Message sent successfully. TS: ${result.ts}`);

      return {
        platform: this.platform,
        messageId: `${target}:${result.ts}`,
        chatId: target,
        timestamp: Number(result.ts) * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to send message to channel ${target}`, error);
      throw error;
    }
  }

  async reply(toMessageId: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    const { chatId: channelId, msgId: threadTs } = parseMessageId(toMessageId);

    this.logger.debug(`Replying to message ${threadTs} in channel ${channelId}`);

    try {
      const result: any = await this.client.chat.postMessage({
        channel: channelId,
        text: content.text || "",
        thread_ts: threadTs,
        files: content.mediaUrl ? [{ external_url: content.mediaUrl, title: content.text }] : undefined,
      });

      this.logger.info(`Reply sent successfully. TS: ${result.ts}`);

      return {
        platform: this.platform,
        messageId: `${channelId}:${result.ts}`,
        chatId: channelId,
        timestamp: Number(result.ts) * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to reply to message ${threadTs}`, error);
      throw error;
    }
  }

  async edit(messageId: string, newText: string, options?: SendOptions): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    if (!newText) {
      throw new Error("New text is required for editing");
    }

    const { chatId: channelId, msgId: threadTs } = parseMessageId(messageId);

    this.logger.debug(`Editing message ${threadTs} in channel ${channelId}`);

    try {
      await this.client.chat.update({
        channel: channelId,
        ts: threadTs,
        text: newText,
      });
      this.logger.info(`Message ${threadTs} edited successfully`);
    } catch (error) {
      this.logger.error(`Failed to edit message ${threadTs}`, error);
      throw error;
    }
  }

  async delete(messageId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    const { chatId: channelId, msgId: threadTs } = parseMessageId(messageId);

    this.logger.debug(`Deleting message ${threadTs} in channel ${channelId}`);

    try {
      await this.client.chat.delete({
        channel: channelId,
        ts: threadTs,
      });
      this.logger.info(`Message ${threadTs} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete message ${threadTs}`, error);
      throw error;
    }
  }

  async sendButtons(
    target: string,
    text: string,
    buttons: Array<Array<{ text: string; data: string }>>,
    options?: SendOptions,
  ): Promise<SendResult> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    validateRequired(target, "target");
    validateRequired(text, "text");

    this.logger.debug(`Sending buttons to channel ${target}`);

    try {
      // Convert buttons to Slack's Block Kit format
      const blocks: any[] = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text,
          },
        },
      ];

      const buttonBlocks = buttons.map((row) => ({
        type: "actions",
        elements: row.map((btn) => ({
          type: "button",
          text: {
            type: "plain_text",
            text: btn.text,
          },
          value: btn.data,
          action_id: btn.data,
        })),
      }));

      blocks.push(...buttonBlocks);

      const result: any = await this.client.chat.postMessage({
        channel: target,
        blocks: blocks,
        text: text, // Fallback text
      });

      this.logger.info(`Buttons sent successfully. TS: ${result.ts}`);

      return {
        platform: this.platform,
        messageId: `${target}:${result.ts}`,
        chatId: target,
        timestamp: Number(result.ts) * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to send buttons to channel ${target}`, error);
      throw error;
    }
  }

  async sendPoll(_target: string, _poll: PollInput, _options?: SendOptions): Promise<PollResult> {
    throw new Error("Slack does not have native polls. Consider using a workflow app or external polling service.");
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    const { chatId: channelId, msgId: threadTs } = parseMessageId(messageId);

    this.logger.debug(`Adding reaction ${emoji} to message ${threadTs}`);

    try {
      await this.client.reactions.add({
        channel: channelId,
        timestamp: threadTs,
        name: emoji.replace(/:/g, ""), // Remove colons if present
      });
      this.logger.info(`Reaction added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add reaction to message ${threadTs}`, error);
      throw error;
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    const { chatId: channelId, msgId: threadTs } = parseMessageId(messageId);

    this.logger.debug(`Removing reaction ${emoji} from message ${threadTs}`);

    try {
      await this.client.reactions.remove({
        channel: channelId,
        timestamp: threadTs,
        name: emoji.replace(/:/g, ""),
      });
      this.logger.info(`Reaction removed successfully`);
    } catch (error) {
      this.logger.warn(`Failed to remove reaction from message ${threadTs}`, error);
      throw error;
    }
  }

  async getHistory(channel: string, limit: number): Promise<Message[]> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Fetching history for channel ${channel}, limit: ${limit}`);

    try {
      const result: any = await this.client.conversations.history({
        channel: channel,
        limit: Math.min(limit, 100),
      });

      this.logger.info(`Fetched ${result.messages?.length || 0} messages from channel ${channel}`);

      return (result.messages || []).map((msg: any) => this.mapSlackMessage(msg, channel));
    } catch (error) {
      this.logger.error(`Failed to fetch history for channel ${channel}`, error);
      throw error;
    }
  }

  async search(query: string, options?: { channel?: string; limit?: number }): Promise<Message[]> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Searching for: ${query}`);

    try {
      const searchOpts: any = {
        query: query,
        count: Math.min(options?.limit || 100, 100),
      };

      if (options?.channel) {
        // Search in specific channel requires different approach
        // This is a simplified implementation
        searchOpts.sort = "timestamp";
        searchOpts.sort_dir = "desc";
      }

      const result: any = await this.client.search.messages(searchOpts);

      const messages = result.messages?.matches || [];
      this.logger.info(`Found ${messages.length} messages matching query`);

      return messages.map((msg: any) => this.mapSlackMessage(msg, msg.channel));
    } catch (error) {
      this.logger.error(`Failed to search for query: ${query}`, error);
      throw error;
    }
  }

  async getPins(channel: string): Promise<Message[]> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Fetching pinned messages for channel ${channel}`);

    try {
      const result: any = await this.client.pins.list({
        channel: channel,
      });

      this.logger.info(`Fetched ${result.items?.length || 0} pinned messages from channel ${channel}`);

      return (result.items || []).map((item: any) => this.mapSlackMessage(item.message, channel));
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
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Fetching member info for user ${userId}`);

    try {
      const user: any = await this.client.users.info({ user: userId });

      return {
        id: user.user.id,
        name: user.user.real_name || user.user.name,
        username: user.user.name,
        avatar: user.user.profile?.image_512,
        roles: user.user.is_admin ? ["admin"] : [],
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
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Fetching channel info for ${channelId}`);

    try {
      const info: any = await this.client.conversations.info({
        channel: channelId,
      });

      const channel = info.channel;

      return {
        id: channel.id,
        name: channel.name,
        type: channel.is_im ? "user" : channel.is_mpim ? "group" : "channel",
        topic: channel.topic?.value,
        memberCount: channel.num_members,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch channel info for ${channelId}`, error);
      throw error;
    }
  }

  async kick(channelId: string, userId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Kicking user ${userId} from channel ${channelId}`);

    try {
      await this.client.conversations.kick({
        channel: channelId,
        user: userId,
      });
      this.logger.info(`User ${userId} kicked from channel ${channelId}`);
    } catch (error) {
      this.logger.error(`Failed to kick user ${userId} from channel ${channelId}`, error);
      throw error;
    }
  }

  async createChannel(name: string, options?: { type?: "public" | "private" }): Promise<{
    id: string;
    name: string;
  }> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Creating channel ${name}`);

    try {
      const result: any = options?.type === "private"
        ? await this.client.conversations.create({ name: name, is_private: true })
        : await this.client.conversations.create({ name: name });

      this.logger.info(`Channel ${name} created successfully. ID: ${result.channel.id}`);

      return {
        id: result.channel.id,
        name: result.channel.name,
      };
    } catch (error) {
      this.logger.error(`Failed to create channel ${name}`, error);
      throw error;
    }
  }

  async editChannel(channelId: string, updates: { name?: string; topic?: string }): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Editing channel ${channelId}`);

    try {
      const opts: any = { channel: channelId };

      if (updates.name) {
        opts.name = updates.name;
      }

      if (updates.topic !== undefined) {
        opts.topic = updates.topic;
      }

      await this.client.conversations.update(opts);
      this.logger.info(`Channel ${channelId} edited successfully`);
    } catch (error) {
      this.logger.error(`Failed to edit channel ${channelId}`, error);
      throw error;
    }
  }

  async deleteChannel(channelId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Slack client not initialized");
    }

    this.logger.debug(`Deleting channel ${channelId}`);

    try {
      await this.client.conversations.archive({ channel: channelId });
      this.logger.info(`Channel ${channelId} archived successfully`);
    } catch (error) {
      this.logger.error(`Failed to archive channel ${channelId}`, error);
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
    this.logger.info("Destroying Slack adapter...");

    if (this.app) {
      await this.app.stop();
      this.app = undefined;
    }

    this.client = null;
    this.messageCallback = undefined;
    this.logger.info("Slack adapter destroyed");
  }

  private mapSlackMessage(msg: any, channelId: string): Message {
    const from: Participant = {
      id: msg.user || "unknown",
      name: msg.user_profile?.real_name || msg.username || msg.user || "Unknown",
      username: msg.username,
      avatar: msg.user_profile?.image_512,
    };

    const to: Participant = {
      id: channelId,
      type: "channel",
      name: channelId,
    };

    const content: MessageContent = {};

    if (msg.text) {
      content.text = msg.text;
    }

    if (msg.files && msg.files.length > 0) {
      content.mediaUrl = msg.files[0].url_private || msg.files[0].url;
      content.mediaType = msg.files[0].mimetype?.split("/")[0] as any;
    }

    if (msg.attachments && msg.attachments.length > 0) {
      if (!content.text) {
        content.text = msg.attachments.map((a: any) => a.text || a.fallback).join("\n");
      }
    }

    const replyTo: ReplyReference | undefined = msg.thread_ts
      ? {
          messageId: `${channelId}:${msg.thread_ts}`,
        }
      : undefined;

    return {
      platform: this.platform,
      type: msg.files?.length > 0 ? "media" : "text",
      from,
      to,
      content,
      replyTo,
      messageId: `${channelId}:${msg.ts}`,
      timestamp: Number(msg.ts) * 1000,
      raw: msg,
    };
  }
}
