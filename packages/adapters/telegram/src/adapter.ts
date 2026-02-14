import type {
  FullAdapter,
  AdapterConfig,
  SendContent,
  SendOptions,
  SendResult,
  PollInput,
  PollResult,
  ChatAction,
  Capabilities,
  Message,
  MessageContent,
  Participant,
  ReplyReference,
  ThreadInfo,
  TargetType,
} from "@omnichat/core";
import { Logger, LogLevel } from "@omnichat/core";

// Import function - can be mocked in tests
let importTelegramBot: () => Promise<any> = async () => {
  const { default: TelegramBot } = await import("node-telegram-bot-api");
  return TelegramBot;
};

// Expose mock function only in test environment (not part of public API)
if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
  (globalThis as any).__setImportTelegramBot = (fn: () => Promise<any>) => {
    importTelegramBot = fn;
  };
}

/**
 * 智能推断目标类型（从 ID 格式）
 * 直接使用 Telegram 原始 ID，无需转换
 */
function inferTargetType(id: string): TargetType | null {
  // @username 公开用户名/频道/群组
  if (id.startsWith('@')) {
    return 'channel';
  }

  // 纯数字 ID - 根据正负号判断
  try {
    const num = BigInt(id);
    // 正数 = 用户/私聊
    if (num > 0n) {
      return 'user';
    }
    // 负数 = 群组/频道
    return 'group';
  } catch {
    return null;
  }
}

/**
 * Telegram adapter configuration
 */
export interface TelegramConfig extends AdapterConfig {
  apiToken: string;
  webhookUrl?: string;
  polling?: boolean;
  // Performance optimization options
  enableCache?: boolean;  // Enable API response caching (default: false for backward compatibility)
  enableQueue?: boolean;  // Enable request queue (default: false for backward compatibility)
  queueConcurrency?: number;  // Max concurrent requests in queue (default: 5)
}

/**
 * Telegram adapter
 */
export class TelegramAdapter implements FullAdapter {
  readonly platform = "telegram";

  private bot: any; // TelegramBot from node-telegram-bot-api
  private config?: TelegramConfig;
  private messageCallback?: (message: Message) => void;
  private capabilities: Capabilities;
  private logger: Logger;
  // Cache for inferred target types to avoid repeated lookups
  private targetTypeCache = new Map<string, TargetType>();
  // Optional performance optimization features (lazy loaded)
  private cachedClient: any = null;  // CachedTelegramClient
  private requestQueue: any = null;  // RequestQueue

  // Bound event handlers for proper cleanup
  private boundMessageHandler?: (msg: any) => void;
  private boundCallbackHandler?: (query: any) => void;
  private boundPollingHandler?: () => void;
  private boundPollingErrorHandler?: (error: Error) => void;

  constructor() {
    this.logger = new Logger("TelegramAdapter", LogLevel.INFO);
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: true, edit: true, delete: true, threads: true, quote: true },
      interaction: { buttons: true, polls: true, reactions: true, stickers: true, effects: true },
      discovery: {
        history: false,
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
        timeout: false,
        unban: true,
        channelCreate: false,
        channelEdit: true,
        channelDelete: false,
        permissions: true,
        setChatTitle: true,
        setChatDescription: true,
      },
      advanced: {
        inline: false,  // TODO: Implement onInlineQuery and answerInlineQuery
        deepLinks: true,
        createInvite: true,
        getInvites: true,
        revokeInvite: true,
        miniApps: false,
        topics: true,
        batch: false,
        payments: false,
        games: false,  // TODO: Implement sendGame, setGameScore, getGameHighScores
        videoChat: false,
        stories: false,
        customEmoji: true,
        webhooks: true,
        menuButton: true,
      },
    };
  }

  /**
   * Get the bot client (with optional caching wrapper)
   */
  private getBot(): any {
    return this.cachedClient || this.bot;
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as TelegramConfig;

    if (!this.config.apiToken) {
      throw new Error("Telegram API token is required");
    }

    try {
      // Import using the import function (can be mocked in tests)
      const TelegramBot = await importTelegramBot();

      this.bot = new TelegramBot(this.config.apiToken, {
        polling: this.config.polling !== false,
      });

      // Initialize optional performance features
      if (this.config.enableCache) {
        const { CachedTelegramClient } = await import('./client/cached-client.js');
        this.cachedClient = new CachedTelegramClient(this.bot);
      }

      if (this.config.enableQueue) {
        const { createQueue } = await import('@omnichat/core');
        this.requestQueue = createQueue(
          this.config.queueConcurrency || 5,
          30  // Telegram rate limit: 30 requests per second
        );
      }

      if (this.config.webhookUrl) {
        await this.bot.setWebHook(this.config.webhookUrl);
      }

      // Create bound handlers for proper cleanup
      this.boundMessageHandler = (msg: any) => this.handleTelegramMessage(msg);
      this.boundCallbackHandler = (query: any) => this.handleCallbackQuery(query);
      this.boundPollingHandler = () => {
        this.logger.info("📨 Telegram polling started");
      };
      this.boundPollingErrorHandler = (error: Error) => {
        this.logger.error("Telegram polling error:", error);
      };

      // Register message handlers with bound references
      this.bot.on("message", this.boundMessageHandler);
      this.bot.on("callback_query", this.boundCallbackHandler);

      // Handle polling events
      this.bot.on("polling", this.boundPollingHandler);
      this.bot.on("polling_error", this.boundPollingErrorHandler);

      this.logger.info("✅ Telegram bot initialized with polling:", this.config.polling !== false);
    } catch (error: any) {
      if ((error as any).code === "MODULE_NOT_FOUND") {
        this.logger.warn("node-telegram-bot-api not installed. Install with: npm install node-telegram-bot-api");
        this.logger.warn("Creating mock adapter for development...");
        this.bot = null;
      } else {
        throw error;
      }
    }
  }

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized. Install node-telegram-bot-api.");
    }

    if (!target) {
      throw new Error("Target (chat ID) is required");
    }

    if (!content.text && !content.mediaUrl && !content.stickerId && !content.buttons && !content.poll) {
      throw new Error("Either text, mediaUrl, stickerId, buttons, or poll is required");
    }

    // 直接使用原始 Telegram ID
    const opts: any = {
      parse_mode: options?.parseMode === "markdown" ? "Markdown" : options?.parseMode === "html" ? "HTML" : undefined,
    };

    // Handle reply to message
    if (options?.replyToMessageId) {
      // Handle compound messageId format (chatId:messageId) or plain messageId
      const messageId = options.replyToMessageId.includes(":")
        ? options.replyToMessageId.split(":")[1]
        : options.replyToMessageId;
      opts.reply_to_message_id = parseInt(messageId, 10);
    }

    // Handle thread (for forum topics)
    if (options?.threadId) {
      opts.message_thread_id = typeof options.threadId === "string" ? parseInt(options.threadId, 10) : options.threadId;
    }

    // Silent sending
    if (options?.silent) {
      opts.disable_notification = true;
    }

    let result: any;

    try {
      // Send poll
      if (content.poll) {
        const pollOptions = {
          question: content.poll.question,
          options: content.poll.options.map((opt) => ({ text: opt })),
          is_anonymous: !content.poll.multi,
          allows_multiple_answers: content.poll.multi || false,
        };

        result = await this.bot.sendPoll(target, pollOptions.question, pollOptions.options, {
          is_anonymous: pollOptions.is_anonymous,
          allows_multiple_answers: pollOptions.allows_multiple_answers,
          ...opts,
        });

        return {
          platform: this.platform,
          messageId: `${target}:${result.message_id}`,
          chatId: target,
          timestamp: result.date * 1000,
        };
      }

      // Send buttons
      if (content.buttons && content.buttons.length > 0) {
        opts.reply_markup = {
          inline_keyboard: content.buttons.map((row) =>
            row.map((btn) => ({
              text: btn.text,
              callback_data: btn.data,
            }))
          ),
        };
      }

      // Send sticker
      if (content.stickerId) {
        result = await this.bot.sendSticker(target, content.stickerId, opts);
      }
      // Send media
      else if (content.mediaUrl) {
        // Determine media type and use appropriate method
        const mediaType = content.mediaType || "image";

        if (mediaType === "video") {
          result = await this.bot.sendVideo(target, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        } else if (mediaType === "audio") {
          result = await this.bot.sendAudio(target, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        } else if (mediaType === "file") {
          result = await this.bot.sendDocument(target, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        } else {
          // Default to photo for images
          result = await this.bot.sendPhoto(target, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        }
      }
      // Send text
      else if (content.text) {
        result = await this.bot.sendMessage(target, content.text, opts);
      } else {
        throw new Error("Either text, mediaUrl, stickerId, buttons, or poll is required");
      }

      return {
        platform: this.platform,
        messageId: `${target}:${result.message_id}`,
        chatId: target,
        timestamp: result.date * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to send message to ${target}:`, error);
      throw error;
    }
  }

  async reply(toMessageId: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    const parts = toMessageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${toMessageId}. Expected format: chatId:messageId`);
    }

    const [chatId, messageId] = parts;

    if (!chatId || !messageId) {
      throw new Error(`Invalid messageId format: ${toMessageId}. Expected format: chatId:messageId`);
    }

    return this.send(chatId, content, {
      ...options,
      replyToMessageId: messageId,
    });
  }

  async edit(messageId: string, newText: string, options?: SendOptions): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    if (!chatId || !msgId) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    if (!newText) {
      throw new Error("New text is required for editing");
    }

    const opts: any = {
      parse_mode: options?.parseMode === "markdown" ? "Markdown" : options?.parseMode === "html" ? "HTML" : undefined,
    };

    try {
      const result: any = await this.bot.editMessageText(chatId, parseInt(msgId, 10), newText, opts);
      return {
        platform: this.platform,
        messageId: `${chatId}:${result.message_id}`,
        chatId: chatId,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to edit message ${msgId}:`, error);
      throw error;
    }
  }

  async delete(messageId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    if (!chatId || !msgId) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    try {
      await this.bot.deleteMessage(chatId, parseInt(msgId, 10));
    } catch (error) {
      this.logger.error(`Failed to delete message ${msgId}:`, error);
      throw error;
    }
  }

  async sendButtons(
    target: string,
    text: string,
    buttons: Array<Array<{ text: string; data: string }>>,
    options?: SendOptions,
  ): Promise<SendResult> {
    return this.send(target, { text, buttons }, options);
  }

  async sendPoll(target: string, poll: PollInput, options?: SendOptions): Promise<PollResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    if (!poll.question || !poll.options || poll.options.length < 2) {
      throw new Error("Poll must have a question and at least 2 options");
    }

    if (poll.options.length > 10) {
      throw new Error("Telegram polls can have at most 10 options");
    }

    const pollOptions = {
      question: poll.question,
      options: poll.options.map((opt) => ({ text: opt })),
      is_anonymous: !poll.multi,
      allows_multiple_answers: poll.multi || false,
    };

    try {
      const result = await this.bot.sendPoll(target, pollOptions.question, pollOptions.options, {
        is_anonymous: pollOptions.is_anonymous,
        allows_multiple_answers: pollOptions.allows_multiple_answers,
      });

      return {
        pollId: result.poll.id,
        messageId: `${target}:${result.message_id}`,
        channel: target,
      };
    } catch (error) {
      this.logger.error(`Failed to send poll to ${target}:`, error);
      throw error;
    }
  }

  /**
   * Answer a callback query (remove loading state from button)
   * @param callbackQueryId - The ID of the callback query to answer
   * @param options - Optional parameters (text, showAlert)
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    options?: { text?: string; showAlert?: boolean }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: options?.text,
        show_alert: options?.showAlert || false,
      });
    } catch (error) {
      this.logger.error(`Failed to answer callback query ${callbackQueryId}:`, error);
      throw error;
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    try {
      await this.bot.setMessageReaction(chatId, parseInt(msgId, 10), [
        { type: "emoji", emoji },
      ]);
    } catch (error: any) {
      // If setMessageReaction is not available (older bot API version), log warning
      if (error.response?.statusCode !== 400) {
        this.logger.warn(`Failed to add reaction to message ${msgId}:`, error);
      }
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    try {
      // Send empty reaction array to remove all reactions, or specific reaction type
      // To remove a specific reaction, we need to use the new reaction API
      await this.bot.setMessageReaction(chatId, parseInt(msgId, 10), []);
    } catch (error: any) {
      // Silently fail - reaction removal might not be critical
      if (error.response?.statusCode !== 400) {
        this.logger.warn(`Failed to remove reactions from message ${msgId}:`, error);
      }
    }
  }

  async sendSticker(target: string, stickerId: string, options?: SendOptions): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const result = await this.bot.sendSticker(target, stickerId);
      return {
        platform: this.platform,
        messageId: `${target}:${result.message_id}`,
        chatId: target,
        timestamp: result.date * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to send sticker to ${target}:`, error);
      throw error;
    }
  }

  async sendWithEffect(target: string, text: string, effect: string, options?: SendOptions): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const result = await this.bot.sendMessage(target, {
        text: text,
        effect_id: effect,
      });

      return {
        platform: this.platform,
        messageId: `${target}:${result.message_id}`,
        chatId: target,
        timestamp: result.date * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to send message with effect to ${target}:`, error);
      throw error;
    }
  }

  async setCommands(commands: Array<{ command: string; description: string }>): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const botCommands = commands.map((cmd) => ({
        command: cmd.command,
        description: cmd.description,
      }));

      await this.bot.setMyCommands(botCommands);
    } catch (error) {
      this.logger.error("Failed to set bot commands:", error);
      throw error;
    }
  }

  async sendChatAction(target: string, action: ChatAction): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    if (!target) {
      throw new Error("Target (chat ID) is required");
    }

    try {
      await this.bot.sendChatAction(target, action);
    } catch (error) {
      this.logger.error(`Failed to send chat action ${action} to ${target}:`, error);
      throw error;
    }
  }

  /**
   * Send message with custom keyboard (ReplyKeyboardMarkup)
   */
  async sendWithKeyboard(
    target: string,
    text: string,
    options: {
      keyboard: Array<Array<{ text: string; callback_data?: string }>>;
      resize?: boolean;
      oneTime?: boolean;
      selective?: boolean;
    }
  ): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const result = await this.bot.sendMessage(target, text, {
        reply_markup: {
          keyboard: options.keyboard.map((row) =>
            row.map((btn) => ({ text: btn.text }))
          ),
          resize_keyboard: options.resize ?? true,
          one_time_keyboard: options.oneTime ?? false,
          selective: options.selective ?? false,
        },
      });

      return {
        platform: "telegram",
        messageId: `${result.chat.id}:${result.message_id}`,
        chatId: String(result.chat.id),
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to send keyboard to ${target}:`, error);
      throw error;
    }
  }

  /**
   * Hide custom keyboard
   */
  async hideKeyboard(target: string, text?: string): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const result = await this.bot.sendMessage(target, text || "键盘已隐藏", {
        reply_markup: {
          remove_keyboard: true,
          selective: false,
        },
      });

      return {
        platform: "telegram",
        messageId: `${result.chat.id}:${result.message_id}`,
        chatId: String(result.chat.id),
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to hide keyboard for ${target}:`, error);
      throw error;
    }
  }

  async downloadFile(messageId: string, path: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    try {
      const fileLink = await this.bot.getFileLink(msgId);

      if (!fileLink) {
        throw new Error("Failed to get file link");
      }

      const fs = await import("fs");
      const https = await import("https");
      const file = fs.createWriteStream(path);

      return new Promise((resolve, reject) => {
        https.get(fileLink, (response: any) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: ${response.statusCode}`));
            return;
          }
          response.pipe(file)
            .on("finish", () => resolve())
            .on("error", reject);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to download file ${msgId}:`, error);
      throw error;
    }
  }

  /**
   * Download media file as buffer
   * @param fileId - Telegram file ID
   * @returns Promise resolving to file buffer
   */
  async downloadFileAsBuffer(fileId: string): Promise<Buffer> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      this.logger.info(`📥 Getting file info for: ${fileId.substring(0, 20)}...`);

      const fileLink = await this.bot.getFileLink(fileId);

      if (!fileLink) {
        throw new Error("Failed to get file link");
      }

      this.logger.info(`📥 File link: ${fileLink}`);

      const https = await import("https");

      return new Promise((resolve, reject) => {
        https.get(fileLink, (response: any) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: ${response.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const buffer = Buffer.concat(chunks);
            this.logger.info(`📥 Downloaded ${buffer.length} bytes`);
            resolve(buffer);
          });
          response.on("error", reject);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}:`, error);
      throw error;
    }
  }

  async forwardMessage(to: string, fromChatId: string, options?: SendOptions): Promise<SendResult> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    // Parse fromChatId which should be in format "chatId:messageId"
    const parts = fromChatId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${fromChatId}. Expected format: chatId:messageId`);
    }

    const [fromChat, messageId] = parts;

    try {
      // forwardMessage(chatId, fromChatId, messageId)
      const result = await this.bot.forwardMessage(to, fromChat, parseInt(messageId, 10));

      return {
        platform: this.platform,
        messageId: `${to}:${result.message_id}`,
        chatId: to,
        timestamp: result.date * 1000,
      };
    } catch (error) {
      this.logger.error(`Failed to forward message from ${fromChat} to ${to}:`, error);
      throw error;
    }
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
  }

  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  /**
   * Get chat information
   * @param chatId - Chat ID or username (e.g., @channelusername)
   * @returns Promise resolving to chat information
   */
  async getChat(chatId: string): Promise<{
    id: string;
    name: string;
    type: "user" | "channel" | "group";
    topic?: string;
    memberCount?: number;
    username?: string;
    description?: string;
    inviteLink?: string;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const chatInfo = await this.bot.getChat(chatId);

      return {
        id: chatInfo.id.toString(),
        name: chatInfo.title || chatInfo.username || chatInfo.first_name || chatId,
        type: chatInfo.type === "supergroup" || chatInfo.type === "group" ? "group" :
              chatInfo.type === "channel" ? "channel" : "user",
        username: chatInfo.username,
        description: chatInfo.description,
        inviteLink: chatInfo.invite_link,
      };
    } catch (error) {
      this.logger.error(`Failed to get chat info for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get chat member count
   * @param chatId - Chat ID or username
   * @returns Promise resolving to member count
   */
  async getChatMemberCount(chatId: string): Promise<number> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const count = await this.bot.getChatMemberCount(chatId);
      return count;
    } catch (error) {
      this.logger.error(`Failed to get chat member count for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get information about a chat member
   * @param chatId - Chat ID or username
   * @param userId - User ID
   * @returns Promise resolving to member information
   */
  async getChatMember(chatId: string, userId: string): Promise<{
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    roles?: string[];
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const memberInfo = await this.bot.getChatMember(chatId, parseInt(userId, 10));
      const user = memberInfo.user;

      // Extract roles from status
      const roles: string[] = [];
      if (memberInfo.status === "creator") {
        roles.push("owner");
      } else if (memberInfo.status === "administrator") {
        roles.push("administrator");
      } else if (memberInfo.status === "restricted") {
        roles.push("restricted");
      } else if (memberInfo.status === "left" || memberInfo.status === "kicked") {
        roles.push(memberInfo.status);
      }

      return {
        id: user.id.toString(),
        name: `${user.first_name || ""}${user.last_name ? ` ${user.last_name}` : ""}`.trim() || user.username || userId,
        username: user.username,
        avatar: user.photo?.small_file_id || undefined,
        roles,
      };
    } catch (error) {
      this.logger.error(`Failed to get chat member ${userId} from ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get chat administrators
   * @param chatId - Chat ID or username
   * @returns Promise resolving to array of administrators
   */
  async getChatAdministrators(chatId: string): Promise<Array<{
    id: string;
    name: string;
    username?: string;
    roles?: string[];
  }>> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const administrators = await this.bot.getChatAdministrators(chatId);

      return administrators.map((admin: any) => {
        const user = admin.user;
        const roles: string[] = [];

        if (admin.status === "creator") {
          roles.push("owner");
        } else if (admin.status === "administrator") {
          roles.push("administrator");

          // Add specific admin rights as roles
          if (admin.can_manage_chat) roles.push("can_manage_chat");
          if (admin.can_delete_messages) roles.push("can_delete_messages");
          if (admin.can_manage_video_chats) roles.push("can_manage_video_chats");
          if (admin.can_restrict_members) roles.push("can_restrict_members");
          if (admin.can_promote_members) roles.push("can_promote_members");
          if (admin.can_change_info) roles.push("can_change_info");
          if (admin.can_invite_users) roles.push("can_invite_users");
          if (admin.can_post_stories) roles.push("can_post_stories");
          if (admin.can_edit_stories) roles.push("can_edit_stories");
          if (admin.can_delete_stories) roles.push("can_delete_stories");
          if (admin.can_post_messages) roles.push("can_post_messages");
          if (admin.can_edit_messages) roles.push("can_edit_messages");
          if (admin.can_pin_messages) roles.push("can_pin_messages");
          if (admin.can_manage_topics) roles.push("can_manage_topics");
          if (admin.can_manage_direct_messages) roles.push("can_manage_direct_messages");
        }

        return {
          id: user.id.toString(),
          name: `${user.first_name || ""}${user.last_name ? ` ${user.last_name}` : ""}`.trim() || user.username,
          username: user.username,
          roles,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get chat administrators for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Pin a message in the chat
   * @param messageId - Message ID in format "chatId:messageId"
   * @param options - Optional parameters
   */
  async pinChatMessage(messageId: string, options?: { disableNotification?: boolean }): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    try {
      await this.bot.pinChatMessage(chatId, parseInt(msgId, 10), {
        disable_notification: options?.disableNotification,
      });
    } catch (error) {
      this.logger.error(`Failed to pin message ${msgId}:`, error);
      throw error;
    }
  }

  /**
   * Unpin a message in the chat
   * @param messageId - Message ID in format "chatId:messageId"
   */
  async unpinChatMessage(messageId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    const parts = messageId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid messageId format: ${messageId}. Expected format: chatId:messageId`);
    }

    const [chatId, msgId] = parts;

    try {
      await this.bot.unpinChatMessage(chatId, parseInt(msgId, 10));
    } catch (error) {
      this.logger.error(`Failed to unpin message ${msgId}:`, error);
      throw error;
    }
  }

  /**
   * Unpin all messages in the chat
   * @param chatId - Chat ID or username
   */
  async unpinAllChatMessages(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.unpinAllChatMessages(chatId);
    } catch (error) {
      this.logger.error(`Failed to unpin all messages in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Set chat permissions
   * @param chatId - Chat ID or username
   * @param permissions - Permission object
   */
  async setChatPermissions(
    chatId: string,
    permissions: {
      canSendMessages?: boolean;
      canSendAudios?: boolean;
      canSendDocuments?: boolean;
      canSendPhotos?: boolean;
      canSendVideos?: boolean;
      canSendVideoNotes?: boolean;
      canSendVoiceNotes?: boolean;
      canSendPolls?: boolean;
      canSendOtherMessages?: boolean;
      canAddWebPagePreviews?: boolean;
      canChangeInfo?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
      canManageTopics?: boolean;
    }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const telegramPermissions: any = {};

      if (permissions.canSendMessages !== undefined) telegramPermissions.can_send_messages = permissions.canSendMessages;
      if (permissions.canSendAudios !== undefined) telegramPermissions.can_send_audios = permissions.canSendAudios;
      if (permissions.canSendDocuments !== undefined) telegramPermissions.can_send_documents = permissions.canSendDocuments;
      if (permissions.canSendPhotos !== undefined) telegramPermissions.can_send_photos = permissions.canSendPhotos;
      if (permissions.canSendVideos !== undefined) telegramPermissions.can_send_videos = permissions.canSendVideos;
      if (permissions.canSendVideoNotes !== undefined) telegramPermissions.can_send_video_notes = permissions.canSendVideoNotes;
      if (permissions.canSendVoiceNotes !== undefined) telegramPermissions.can_send_voice_notes = permissions.canSendVoiceNotes;
      if (permissions.canSendPolls !== undefined) telegramPermissions.can_send_polls = permissions.canSendPolls;
      if (permissions.canSendOtherMessages !== undefined) telegramPermissions.can_send_other_messages = permissions.canSendOtherMessages;
      if (permissions.canAddWebPagePreviews !== undefined) telegramPermissions.can_add_web_page_previews = permissions.canAddWebPagePreviews;
      if (permissions.canChangeInfo !== undefined) telegramPermissions.can_change_info = permissions.canChangeInfo;
      if (permissions.canInviteUsers !== undefined) telegramPermissions.can_invite_users = permissions.canInviteUsers;
      if (permissions.canPinMessages !== undefined) telegramPermissions.can_pin_messages = permissions.canPinMessages;
      if (permissions.canManageTopics !== undefined) telegramPermissions.can_manage_topics = permissions.canManageTopics;

      await this.bot.setChatPermissions(chatId, telegramPermissions);
    } catch (error) {
      this.logger.error(`Failed to set chat permissions for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Ban a chat member
   * @param chatId - Chat ID or username
   * @param userId - User ID to ban
   * @param options - Optional parameters
   */
  async banChatMember(
    chatId: string,
    userId: string,
    options?: {
      untilDate?: number; // Unix timestamp, 0 for permanent
      revokeMessages?: boolean; // Delete all messages from the user
    }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.banChatMember(chatId, parseInt(userId, 10), {
        until_date: options?.untilDate,
        revoke_messages: options?.revokeMessages,
      });
    } catch (error) {
      this.logger.error(`Failed to ban user ${userId} from ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Unban a chat member
   * @param chatId - Chat ID or username
   * @param userId - User ID to unban
   * @param onlyIfBanned - Only do nothing if the user is not banned
   */
  async unbanChatMember(chatId: string, userId: string, onlyIfBanned?: boolean): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.unbanChatMember(chatId, parseInt(userId, 10), {
        only_if_banned: onlyIfBanned,
      });
    } catch (error) {
      this.logger.error(`Failed to unban user ${userId} from ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Restrict a chat member
   * @param chatId - Chat ID or username
   * @param userId - User ID to restrict
   * @param permissions - Permission object
   * @param options - Optional parameters
   */
  async restrictChatMember(
    chatId: string,
    userId: string,
    permissions: {
      canSendMessages?: boolean;
      canSendAudios?: boolean;
      canSendDocuments?: boolean;
      canSendPhotos?: boolean;
      canSendVideos?: boolean;
      canSendVideoNotes?: boolean;
      canSendVoiceNotes?: boolean;
      canSendPolls?: boolean;
      canSendOtherMessages?: boolean;
      canAddWebPagePreviews?: boolean;
      canChangeInfo?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
      canManageTopics?: boolean;
    },
    options?: {
      untilDate?: number; // Unix timestamp, 0 for permanent
      useIndependentChatPermissions?: boolean;
    }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const telegramPermissions: any = {};

      if (permissions.canSendMessages !== undefined) telegramPermissions.can_send_messages = permissions.canSendMessages;
      if (permissions.canSendAudios !== undefined) telegramPermissions.can_send_audios = permissions.canSendAudios;
      if (permissions.canSendDocuments !== undefined) telegramPermissions.can_send_documents = permissions.canSendDocuments;
      if (permissions.canSendPhotos !== undefined) telegramPermissions.can_send_photos = permissions.canSendPhotos;
      if (permissions.canSendVideos !== undefined) telegramPermissions.can_send_videos = permissions.canSendVideos;
      if (permissions.canSendVideoNotes !== undefined) telegramPermissions.can_send_video_notes = permissions.canSendVideoNotes;
      if (permissions.canSendVoiceNotes !== undefined) telegramPermissions.can_send_voice_notes = permissions.canSendVoiceNotes;
      if (permissions.canSendPolls !== undefined) telegramPermissions.can_send_polls = permissions.canSendPolls;
      if (permissions.canSendOtherMessages !== undefined) telegramPermissions.can_send_other_messages = permissions.canSendOtherMessages;
      if (permissions.canAddWebPagePreviews !== undefined) telegramPermissions.can_add_web_page_previews = permissions.canAddWebPagePreviews;
      if (permissions.canChangeInfo !== undefined) telegramPermissions.can_change_info = permissions.canChangeInfo;
      if (permissions.canInviteUsers !== undefined) telegramPermissions.can_invite_users = permissions.canInviteUsers;
      if (permissions.canPinMessages !== undefined) telegramPermissions.can_pin_messages = permissions.canPinMessages;
      if (permissions.canManageTopics !== undefined) telegramPermissions.can_manage_topics = permissions.canManageTopics;

      await this.bot.restrictChatMember(chatId, parseInt(userId, 10), telegramPermissions, {
        until_date: options?.untilDate,
        use_independent_chat_permissions: options?.useIndependentChatPermissions,
      });
    } catch (error) {
      this.logger.error(`Failed to restrict user ${userId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Promote a chat member to administrator
   * @param chatId - Chat ID or username
   * @param userId - User ID to promote
   * @param rights - Administrator rights
   */
  async promoteChatMember(
    chatId: string,
    userId: string,
    rights?: {
      isAnonymous?: boolean;
      canManageChat?: boolean;
      canDeleteMessages?: boolean;
      canManageVideoChats?: boolean;
      canRestrictMembers?: boolean;
      canPromoteMembers?: boolean;
      canChangeInfo?: boolean;
      canInviteUsers?: boolean;
      canPostStories?: boolean;
      canEditStories?: boolean;
      canDeleteStories?: boolean;
      canPostMessages?: boolean;
      canEditMessages?: boolean;
      canPinMessages?: boolean;
      canManageTopics?: boolean;
      canManageDirectMessages?: boolean;
      customTitle?: string;
    }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const telegramRights: any = {};

      if (rights?.isAnonymous !== undefined) telegramRights.is_anonymous = rights.isAnonymous;
      if (rights?.canManageChat !== undefined) telegramRights.can_manage_chat = rights.canManageChat;
      if (rights?.canDeleteMessages !== undefined) telegramRights.can_delete_messages = rights.canDeleteMessages;
      if (rights?.canManageVideoChats !== undefined) telegramRights.can_manage_video_chats = rights.canManageVideoChats;
      if (rights?.canRestrictMembers !== undefined) telegramRights.can_restrict_members = rights.canRestrictMembers;
      if (rights?.canPromoteMembers !== undefined) telegramRights.can_promote_members = rights.canPromoteMembers;
      if (rights?.canChangeInfo !== undefined) telegramRights.can_change_info = rights.canChangeInfo;
      if (rights?.canInviteUsers !== undefined) telegramRights.can_invite_users = rights.canInviteUsers;
      if (rights?.canPostStories !== undefined) telegramRights.can_post_stories = rights.canPostStories;
      if (rights?.canEditStories !== undefined) telegramRights.can_edit_stories = rights.canEditStories;
      if (rights?.canDeleteStories !== undefined) telegramRights.can_delete_stories = rights.canDeleteStories;
      if (rights?.canPostMessages !== undefined) telegramRights.can_post_messages = rights.canPostMessages;
      if (rights?.canEditMessages !== undefined) telegramRights.can_edit_messages = rights.canEditMessages;
      if (rights?.canPinMessages !== undefined) telegramRights.can_pin_messages = rights.canPinMessages;
      if (rights?.canManageTopics !== undefined) telegramRights.can_manage_topics = rights.canManageTopics;
      if (rights?.canManageDirectMessages !== undefined) telegramRights.can_manage_direct_messages = rights.canManageDirectMessages;
      if (rights?.customTitle !== undefined) telegramRights.custom_title = rights.customTitle;

      await this.bot.promoteChatMember(chatId, parseInt(userId, 10), telegramRights);
    } catch (error) {
      this.logger.error(`Failed to promote user ${userId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Set chat title
   * @param chatId - Chat ID or username
   * @param title - New chat title (1-128 characters)
   */
  async setChatTitle(chatId: string, title: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    if (!title || title.length < 1 || title.length > 128) {
      throw new Error("Title must be between 1 and 128 characters");
    }

    try {
      await this.bot.setChatTitle(chatId, title);
    } catch (error) {
      this.logger.error(`Failed to set chat title for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Set chat description
   * @param chatId - Chat ID or username
   * @param description - New chat description (0-255 characters)
   */
  async setChatDescription(chatId: string, description?: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    if (description && description.length > 255) {
      throw new Error("Description must not exceed 255 characters");
    }

    try {
      await this.bot.setChatDescription(chatId, description || "");
    } catch (error) {
      this.logger.error(`Failed to set chat description for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Set chat photo
   * @param chatId - Chat ID or username
   * @param photo - Photo file path, Buffer, or file URL
   */
  async setChatPhoto(chatId: string, photo: string | Buffer): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.setChatPhoto(chatId, photo);
    } catch (error) {
      this.logger.error(`Failed to set chat photo for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Delete chat photo
   * @param chatId - Chat ID or username
   */
  async deleteChatPhoto(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.deleteChatPhoto(chatId);
    } catch (error) {
      this.logger.error(`Failed to delete chat photo for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Export chat invite link
   * @param chatId - Chat ID or username
   * @returns Promise resolving to invite link
   */
  async exportChatInviteLink(chatId: string): Promise<string> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const link = await this.bot.exportChatInviteLink(chatId);
      return link;
    } catch (error) {
      this.logger.error(`Failed to export invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Create chat invite link
   * @param chatId - Chat ID or username
   * @param options - Optional parameters
   * @returns Promise resolving to invite link info (snake_case from Telegram API)
   */
  async createChatInviteLink(
    chatId: string,
    options?: {
      name?: string;
      expireDate?: number;
      memberLimit?: number;
      createsJoinRequest?: boolean;
    }
  ): Promise<{
    invite_link: string;
    creator: any;
    creates_join_request: boolean;
    is_primary: boolean;
    name?: string;
    expire_date?: number;
    member_limit?: number;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const linkOptions: any = {};
      if (options?.name !== undefined) linkOptions.name = options.name;
      if (options?.expireDate !== undefined) linkOptions.expire_date = options.expireDate;
      if (options?.memberLimit !== undefined) linkOptions.member_limit = options.memberLimit;
      if (options?.createsJoinRequest !== undefined) linkOptions.creates_join_request = options.createsJoinRequest;

      const linkInfo = await this.bot.createChatInviteLink(chatId, linkOptions);
      return linkInfo;
    } catch (error) {
      this.logger.error(`Failed to create invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Edit chat invite link
   * @param chatId - Chat ID or username
   * @param inviteLink - Invite link to edit
   * @param options - Optional parameters
   * @returns Promise resolving to edited invite link info (snake_case from Telegram API)
   */
  async editChatInviteLink(
    chatId: string,
    inviteLink: string,
    options?: {
      name?: string;
      expireDate?: number;
      memberLimit?: number;
      createsJoinRequest?: boolean;
    }
  ): Promise<{
    invite_link: string;
    creator: any;
    creates_join_request: boolean;
    is_primary: boolean;
    name?: string;
    expire_date?: number;
    member_limit?: number;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const linkOptions: any = {};
      if (options?.name !== undefined) linkOptions.name = options.name;
      if (options?.expireDate !== undefined) linkOptions.expire_date = options.expireDate;
      if (options?.memberLimit !== undefined) linkOptions.member_limit = options.memberLimit;
      if (options?.createsJoinRequest !== undefined) linkOptions.creates_join_request = options.createsJoinRequest;

      const linkInfo = await this.bot.editChatInviteLink(chatId, inviteLink, linkOptions);
      return linkInfo;
    } catch (error) {
      this.logger.error(`Failed to edit invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke chat invite link
   * @param chatId - Chat ID or username
   * @param inviteLink - Invite link to revoke
   * @returns Promise resolving to revoked invite link info (snake_case from Telegram API)
   */
  async revokeChatInviteLink(chatId: string, inviteLink: string): Promise<{
    invite_link: string;
    creator: any;
    creates_join_request: boolean;
    is_primary: boolean;
    is_revoked: true;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const linkInfo = await this.bot.revokeChatInviteLink(chatId, inviteLink);
      return linkInfo;
    } catch (error) {
      this.logger.error(`Failed to revoke invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Approve chat join request
   * @param chatId - Chat ID or username
   * @param userId - User ID to approve
   */
  async approveChatJoinRequest(chatId: string, userId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.approveChatJoinRequest(chatId, parseInt(userId, 10));
    } catch (error) {
      this.logger.error(`Failed to approve join request for user ${userId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Decline chat join request
   * @param chatId - Chat ID or username
   * @param userId - User ID to decline
   */
  async declineChatJoinRequest(chatId: string, userId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.declineChatJoinRequest(chatId, parseInt(userId, 10));
    } catch (error) {
      this.logger.error(`Failed to decline join request for user ${userId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile photos
   * @param userId - User ID
   * @param options - Optional parameters
   * @returns Promise resolving to user profile photos
   */
  async getUserProfilePhotos(
    userId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<{
    totalCount: number;
    photos: Array<Array<{ fileId: string; fileUniqueId: string; width: number; height: number; fileSize?: number }>>;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const photosInfo = await this.bot.getUserProfilePhotos(parseInt(userId, 10), {
        offset: options?.offset || 0,
        limit: options?.limit || 100,
      });

      return {
        totalCount: photosInfo.total_count,
        photos: photosInfo.photos.map((photoArray: any[]) =>
          photoArray.map((photo: any) => ({
            fileId: photo.file_id,
            fileUniqueId: photo.file_unique_id,
            width: photo.width,
            height: photo.height,
            fileSize: photo.file_size,
          }))
        ),
      };
    } catch (error) {
      this.logger.error(`Failed to get user profile photos for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get forum topic icon stickers
   * @returns Promise resolving to array of sticker objects
   */
  async getForumTopicIconStickers(): Promise<Array<{ fileId: string; fileUniqueId: string; width: number; height: number; isAnimated: boolean; isVideo: boolean }>> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const stickers = await this.bot.getForumTopicIconStickers();

      return stickers.map((sticker: any) => ({
        fileId: sticker.file_id,
        fileUniqueId: sticker.file_unique_id,
        width: sticker.width,
        height: sticker.height,
        isAnimated: sticker.is_animated,
        isVideo: sticker.is_video,
      }));
    } catch (error) {
      this.logger.error("Failed to get forum topic icon stickers:", error);
      throw error;
    }
  }

  /**
   * Create a forum topic
   * @param chatId - Chat ID or username (must be a supergroup)
   * @param options - Topic options including name
   * @returns Promise resolving to created topic info
   */
  async createForumTopic(
    chatId: string,
    options: { name: string; iconColor?: number; iconCustomEmojiId?: string }
  ): Promise<{
    messageId: number;
    name: string;
    iconColor: number;
    iconCustomEmojiId?: string;
    threadId: number;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const topicOptions: any = {};
      if (options?.iconColor !== undefined) topicOptions.icon_color = options.iconColor;
      if (options?.iconCustomEmojiId !== undefined) topicOptions.icon_custom_emoji_id = options.iconCustomEmojiId;

      const topic = await this.bot.createForumTopic(chatId, options.name, topicOptions);

      return {
        messageId: topic.message_id || topic.message_thread_id,
        name: topic.name,
        iconColor: topic.icon_color || 0,
        iconCustomEmojiId: topic.icon_custom_emoji_id,
        threadId: topic.message_thread_id,
      };
    } catch (error) {
      this.logger.error(`Failed to create forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Edit a forum topic
   * @param chatId - Chat ID or username
   * @param topicId - Forum topic identifier
   * @param name - New topic name
   * @param iconCustomEmojiId - Optional custom emoji ID
   */
  async editForumTopic(
    chatId: string,
    topicId: number,
    name: string,
    iconCustomEmojiId?: string
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const topicOptions: any = { name };
      if (iconCustomEmojiId !== undefined) topicOptions.icon_custom_emoji_id = iconCustomEmojiId;

      await this.bot.editForumTopic(chatId, topicId, topicOptions);
    } catch (error) {
      this.logger.error(`Failed to edit forum topic ${topicId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Close a forum topic
   * @param chatId - Chat ID or username
   * @param messageThreadId - Forum topic identifier
   */
  async closeForumTopic(chatId: string, messageThreadId: number): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.closeForumTopic(chatId, messageThreadId);
    } catch (error) {
      this.logger.error(`Failed to close forum topic ${messageThreadId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Reopen a forum topic
   * @param chatId - Chat ID or username
   * @param messageThreadId - Forum topic identifier
   */
  async reopenForumTopic(chatId: string, messageThreadId: number): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.reopenForumTopic(chatId, messageThreadId);
    } catch (error) {
      this.logger.error(`Failed to reopen forum topic ${messageThreadId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a forum topic
   * @param chatId - Chat ID or username
   * @param messageThreadId - Forum topic identifier
   */
  async deleteForumTopic(chatId: string, messageThreadId: number): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.deleteForumTopic(chatId, messageThreadId);
    } catch (error) {
      this.logger.error(`Failed to delete forum topic ${messageThreadId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Unpin all messages in a forum topic
   * @param chatId - Chat ID or username
   * @param messageThreadId - Forum topic identifier
   */
  async unpinAllForumTopicMessages(chatId: string, messageThreadId: number): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.unpinAllForumTopicMessages(chatId, messageThreadId);
    } catch (error) {
      this.logger.error(`Failed to unpin all messages in forum topic ${messageThreadId} in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Edit the 'General' forum topic
   * @param chatId - Chat ID or username
   * @param name - New topic name (1-128 characters)
   */
  async editGeneralForumTopic(chatId: string, name: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.editGeneralForumTopic(chatId, name);
    } catch (error) {
      this.logger.error(`Failed to edit General forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Close the 'General' forum topic
   * @param chatId - Chat ID or username
   */
  async closeGeneralForumTopic(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.closeGeneralForumTopic(chatId);
    } catch (error) {
      this.logger.error(`Failed to close General forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Reopen the 'General' forum topic
   * @param chatId - Chat ID or username
   */
  async reopenGeneralForumTopic(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.reopenGeneralForumTopic(chatId);
    } catch (error) {
      this.logger.error(`Failed to reopen General forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Hide the 'General' forum topic
   * @param chatId - Chat ID or username
   */
  async hideGeneralForumTopic(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.hideGeneralForumTopic(chatId);
    } catch (error) {
      this.logger.error(`Failed to hide General forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Unhide the 'General' forum topic
   * @param chatId - Chat ID or username
   */
  async unhideGeneralForumTopic(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.unhideGeneralForumTopic(chatId);
    } catch (error) {
      this.logger.error(`Failed to unhide General forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Unpin all messages in the 'General' forum topic
   * @param chatId - Chat ID or username
   */
  async unpinAllGeneralForumTopicMessages(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.unpinAllGeneralForumTopicMessages(chatId);
    } catch (error) {
      this.logger.error(`Failed to unpin all messages in General forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Leave a chat (group, supergroup, or channel)
   * @param chatId - Chat ID or username
   */
  async leaveChat(chatId: string): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      await this.bot.leaveChat(chatId);
    } catch (error) {
      this.logger.error(`Failed to leave chat ${chatId}:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    // Remove event listeners before stopping polling
    if (this.bot) {
      if (this.boundMessageHandler) {
        this.bot.off("message", this.boundMessageHandler);
      }
      if (this.boundCallbackHandler) {
        this.bot.off("callback_query", this.boundCallbackHandler);
      }
      if (this.boundPollingHandler) {
        this.bot.off("polling", this.boundPollingHandler);
      }
      if (this.boundPollingErrorHandler) {
        this.bot.off("polling_error", this.boundPollingErrorHandler);
      }
      await this.bot.stopPolling();
    }

    // Clear bound handlers
    this.boundMessageHandler = undefined;
    this.boundCallbackHandler = undefined;
    this.boundPollingHandler = undefined;
    this.boundPollingErrorHandler = undefined;

    this.bot = null;
    this.messageCallback = undefined;
    this.targetTypeCache.clear(); // Clear cache on destroy

    // Clean up performance features
    if (this.cachedClient) {
      this.cachedClient.clearCache();
      this.cachedClient = null;
    }
    if (this.requestQueue) {
      this.requestQueue.clear();
      this.requestQueue = null;
    }
  }

  /**
   * 解析目标类型，支持缓存和智能推断
   *
   * @param target - 目标 ID
   * @param explicitType - 用户明确指定的类型
   * @returns 推断的目标类型
   * @throws 当无法推断且未明确指定时抛出错误
   */
  private resolveTargetType(target: string, explicitType?: TargetType): TargetType {
    // 1. 用户明确指定了类型 - 记住并返回
    if (explicitType) {
      this.targetTypeCache.set(target, explicitType);
      return explicitType;
    }

    // 2. 从缓存查找
    const cached = this.targetTypeCache.get(target);
    if (cached) {
      return cached;
    }

    // 3. 尝试从 ID 格式推断
    const inferred = inferTargetType(target);
    if (inferred) {
      this.targetTypeCache.set(target, inferred);
      return inferred;
    }

    // 4. 实在无法推断 - 返回默认值（Telegram 大多数情况下可以推断到这里）
    // 对于 Telegram，如果到这里，说明是非常规 ID，保守处理
    return 'user'; // 默认当作用户
  }

  /**
   * 便捷方法：发送消息给用户
   */
  async sendToUser(userId: string, text: string, options?: Omit<SendOptions, 'targetType'>): Promise<SendResult> {
    return this.send(userId, { text }, { ...options, targetType: 'user' });
  }

  /**
   * 便捷方法：发送消息到群组
   */
  async sendToGroup(groupId: string, text: string, options?: Omit<SendOptions, 'targetType'>): Promise<SendResult> {
    return this.send(groupId, { text }, { ...options, targetType: 'group' });
  }

  /**
   * 便捷方法：发送消息到频道
   */
  async sendToChannel(channelId: string, text: string, options?: Omit<SendOptions, 'targetType'>): Promise<SendResult> {
    return this.send(channelId, { text }, { ...options, targetType: 'channel' });
  }

  /**
   * Handle incoming Telegram message
   */
  private handleTelegramMessage(msg: any): void {
    try {
      // Debug: Log raw message for troubleshooting
      this.logger.info(`📨 TG RAW: chat_id=${msg.chat.id}, type=${msg.chat.type}, text="${msg.text?.substring(0, 50)}", entities=${JSON.stringify(msg.entities?.map((e: any) => e.type))}`);

      // 直接使用原始 Telegram ID
      const chatId = msg.chat.id.toString();

      const isGroup = msg.chat.type === "supergroup" || msg.chat.type === "group";
      const isChannel = msg.chat.type === "channel";

      const from: Participant = {
        id: msg.from?.id.toString() || chatId,
        type: isGroup ? "group" : isChannel ? "channel" : "user",
        name: msg.chat.title || msg.from?.first_name || msg.from?.username || msg.chat.username,
        username: msg.from?.username,
        avatar: msg.from?.photo?.small_file_id || undefined,
      };

      const to: Participant = {
        id: chatId,
        type: isGroup ? "group" : isChannel ? "channel" : "user",
        name: msg.chat.title || msg.chat.username || chatId,
      };

      const content: MessageContent = {};

      // Handle different message types
      if (msg.text) {
        content.text = msg.text;
      } else if (msg.photo) {
        content.mediaUrl = msg.photo[msg.photo.length - 1].file_id;
        content.mediaType = "image";
        if (msg.caption) content.text = msg.caption;
      } else if (msg.video) {
        content.mediaUrl = msg.video.file_id;
        content.mediaType = "video";
        if (msg.caption) content.text = msg.caption;
      } else if (msg.voice) {
        content.mediaUrl = msg.voice.file_id;
        content.mediaType = "audio";
        content.voice = { url: msg.voice.file_id, duration: msg.voice.duration };
        if (msg.caption) content.text = msg.caption;
      } else if (msg.audio) {
        content.mediaUrl = msg.audio.file_id;
        content.mediaType = "audio";
        if (msg.caption) content.text = msg.caption;
      } else if (msg.document) {
        content.mediaUrl = msg.document.file_id;
        content.mediaType = "file";
        if (msg.caption) content.text = msg.caption;
      } else if (msg.sticker) {
        content.stickerId = msg.sticker.file_id;
      }

      const replyTo: ReplyReference | undefined = msg.reply_to_message
        ? {
            messageId: `${chatId}:${msg.reply_to_message.message_id}`,
            text: msg.reply_to_message.text,
          }
        : undefined;

      // Handle thread info for forum topics
      const thread: ThreadInfo | undefined = msg.message_thread_id
        ? { id: String(msg.message_thread_id) }
        : msg.is_topic_message
          ? { id: String(msg.message_thread_id) }
          : undefined;

      const message: Message = {
        platform: this.platform,
        type: msg.sticker ? "sticker" : msg.photo || msg.video || msg.voice || msg.audio || msg.document ? "media" : "text",
        from,
        to,
        content,
        replyTo,
        thread,
        messageId: `${chatId}:${msg.message_id}`,
        timestamp: msg.date * 1000,
        raw: msg,
      };

      if (this.messageCallback) {
        this.messageCallback(message);
      }
    } catch (error) {
      this.logger.error("Failed to handle Telegram message:", error);
    }
  }

  /**
   * Handle callback query (button clicks)
   */
  private handleCallbackQuery(query: any): void {
    try {
      // 直接使用原始 Telegram ID
      const chatId = query.message.chat.id.toString();

      const from: Participant = {
        id: query.from.id.toString(),
        name: query.from.first_name + (query.from.last_name ? ` ${query.from.last_name}` : ""),
        username: query.from.username,
      };

      const to: Participant = {
        id: chatId,
        type: "user",
        name: query.message.chat.title || query.message.chat.username || chatId,
      };

      const message: Message = {
        platform: this.platform,
        type: "callback",
        from,
        to,
        content: {
          text: query.data || "",
        },
        replyTo: {
          messageId: `${chatId}:${query.message.message_id}`,
          text: query.message.text,
        },
        messageId: `${chatId}:${query.message.message_id}`,
        timestamp: Date.now(),
        raw: query,
      };

      if (this.messageCallback) {
        this.messageCallback(message);
      }

      // Answer the callback query to remove the loading state
      if (this.bot) {
        this.bot.answerCallbackQuery(query.id).catch((error: Error) => {
          this.logger.warn("Failed to answer callback query:", error);
        });
      }
    } catch (error) {
      this.logger.error("Failed to handle callback query:", error);
    }
  }

  // ============================================================================
  // Unified API Methods (Standardized across platforms)
  // ============================================================================

  /**
   * Create invite link
   */
  async createInvite(
    chatId: string,
    options?: import("@omnichat/core").UnifiedInviteOptions
  ): Promise<import("@omnichat/core").UnifiedInviteResult> {
    const telegramOptions: {
      name?: string;
      expireDate?: number;
      memberLimit?: number;
      createsJoinRequest?: boolean;
    } = {};

    if (options?.name) telegramOptions.name = options.name;
    if (options?.maxUses) telegramOptions.memberLimit = options.maxUses;
    if (options?.expiresInSeconds) {
      telegramOptions.expireDate = Math.floor(Date.now() / 1000) + options.expiresInSeconds;
    }
    if (options?.telegram?.createsJoinRequest !== undefined) {
      telegramOptions.createsJoinRequest = options.telegram.createsJoinRequest;
    }

    const result = await this.createChatInviteLink(chatId, telegramOptions);

    // Telegram API returns snake_case format
    return {
      url: result.invite_link,
      code: this.extractInviteCode(result.invite_link),
      creator: result.creator ? this.mapTelegramUserToParticipant(result.creator) : undefined,
      maxUses: result.member_limit,
      expiresAt: result.expire_date,
      isPrimary: result.is_primary,
      raw: result,
    };
  }

  /**
   * Get invites list
   */
  async getInvites(
    chatId: string
  ): Promise<import("@omnichat/core").UnifiedInviteResult[]> {
    // Telegram doesn't have a "list invites" API
    // We can only get the primary invite link
    try {
      const link = await this.exportChatInviteLink(chatId);
      return [{
        url: link,
        code: this.extractInviteCode(link),
        isPrimary: true,
      }];
    } catch {
      return [];
    }
  }

  /**
   * Revoke invite
   */
  async revokeInvite(
    chatId: string,
    inviteCode: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      // For Telegram, inviteCode is the full URL
      await this.revokeChatInviteLink(chatId, inviteCode.startsWith("https://") ? inviteCode : `https://t.me/+${inviteCode}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Pin message
   */
  async pinMessage(
    chatId: string,
    messageId: string,
    options?: import("@omnichat/core").UnifiedPinOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      const unifiedMessageId = `${chatId}:${messageId}`;
      await this.pinChatMessage(unifiedMessageId, {
        disableNotification: options?.silent,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unpin message
   */
  async unpinMessage(
    chatId: string,
    messageId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      const unifiedMessageId = `${chatId}:${messageId}`;
      await this.unpinChatMessage(unifiedMessageId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member info
   */
  async getMemberInfo(
    chatId: string,
    userId: string
  ): Promise<import("@omnichat/core").UnifiedMemberInfo> {
    const member = await this.getChatMember(chatId, userId);
    return {
      id: member.id,
      name: member.name,
      username: member.username,
      avatar: member.avatar,
      roles: member.roles,
    };
  }

  /**
   * Get member count
   */
  async getMemberCount(chatId: string): Promise<number> {
    return this.getChatMemberCount(chatId);
  }

  /**
   * Get administrators
   */
  async getAdministrators(
    chatId: string
  ): Promise<import("@omnichat/core").UnifiedMemberInfo[]> {
    const admins = await this.getChatAdministrators(chatId);
    return admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      username: admin.username,
      roles: admin.roles,
      isAdmin: true,
    }));
  }

  /**
   * Kick user
   */
  async kick(
    chatId: string,
    userId: string,
    options?: import("@omnichat/core").UnifiedModerationOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      // In Telegram, kick = ban (but user can rejoin if not banned)
      // We use ban with revokeMessages option
      await this.banChatMember(chatId, userId, {
        untilDate: 0, // Permanent
        revokeMessages: options?.deleteMessages,
      });
      // Then immediately unban to allow rejoining (like kick)
      await this.unbanChatMember(chatId, userId, true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ban user
   */
  async ban(
    chatId: string,
    userId: string,
    options?: import("@omnichat/core").UnifiedModerationOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this.banChatMember(chatId, userId, {
        untilDate: options?.telegram?.untilDate,
        revokeMessages: options?.deleteMessages,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unban user
   */
  async unban(
    chatId: string,
    userId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this.unbanChatMember(chatId, userId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mute user
   */
  async mute(
    chatId: string,
    userId: string,
    options: import("@omnichat/core").UnifiedMuteOptions
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      const untilDate = options.durationSeconds
        ? Math.floor(Date.now() / 1000) + options.durationSeconds
        : 0;

      // Use restrictChatMember with limited permissions
      const permissions = options.telegram?.permissions || {
        canSendMessages: false,
        canSendAudios: false,
        canSendDocuments: false,
        canSendPhotos: false,
        canSendVideos: false,
        canSendVideoNotes: false,
        canSendVoiceNotes: false,
        canSendPolls: false,
        canSendOtherMessages: false,
        canAddWebPagePreviews: false,
        canChangeInfo: false,
        canInviteUsers: false,
        canPinMessages: false,
        canManageTopics: false,
      };

      await this.restrictChatMember(chatId, userId, permissions, {
        untilDate,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unmute user
   */
  async unmute(
    chatId: string,
    userId: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      // Restore full permissions
      const fullPermissions = {
        canSendMessages: true,
        canSendAudios: true,
        canSendDocuments: true,
        canSendPhotos: true,
        canSendVideos: true,
        canSendVideoNotes: true,
        canSendVoiceNotes: true,
        canSendPolls: true,
        canSendOtherMessages: true,
        canAddWebPagePreviews: true,
        canChangeInfo: false, // These are typically admin-only
        canInviteUsers: true,
        canPinMessages: false,
        canManageTopics: false,
      };

      await this.restrictChatMember(chatId, userId, fullPermissions);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set chat title
   */
  async setTitle(
    chatId: string,
    title: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this.setChatTitle(chatId, title);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set chat description
   */
  async setDescription(
    chatId: string,
    description: string
  ): Promise<import("@omnichat/core").UnifiedResult<void>> {
    try {
      await this.setChatDescription(chatId, description || undefined);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create DM channel (just returns userId for Telegram)
   */
  async createDMChannel(userId: string): Promise<string> {
    // In Telegram, you can directly send messages to users by ID
    return userId;
  }

  // Helper methods

  private extractInviteCode(url: string): string {
    // Extract code from https://t.me/+xxxxx or https://t.me/joinchat/xxxxx
    const match = url.match(/t\.me\/\+(.+)$/);
    if (match) return match[1];
    const match2 = url.match(/t\.me\/joinchat\/(.+)$/);
    if (match2) return match2[1];
    // Just return the last segment
    return url.split("/").pop() || url;
  }

  private mapTelegramUserToParticipant(user: any): Participant {
    return {
      id: String(user.id),
      name: user.first_name || "Unknown",
      username: user.username,
      avatar: undefined, // Telegram requires separate API call for photos
    };
  }
}
