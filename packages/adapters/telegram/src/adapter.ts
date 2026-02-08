import type {
  FullAdapter,
  AdapterConfig,
  SendContent,
  SendOptions,
  SendResult,
  PollInput,
  PollResult,
  ChatAction,
} from "@omnichat/core";
import type {
  Message,
  MessageContent,
  Participant,
  ReplyReference,
  ThreadInfo,
} from "@omnichat/core";
import type { Capabilities } from "@omnichat/core";

/**
 * Telegram adapter configuration
 */
export interface TelegramConfig extends AdapterConfig {
  apiToken: string;
  webhookUrl?: string;
  polling?: boolean;
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

  constructor() {
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: true, edit: true, delete: true, threads: true, quote: true },
      interaction: { buttons: true, polls: true, reactions: true, stickers: true, effects: true },
      discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
      management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as TelegramConfig;

    if (!this.config.apiToken) {
      throw new Error("Telegram API token is required");
    }

    try {
      // Import node-telegram-bot-api
      const { default: TelegramBot } = await import("node-telegram-bot-api");
      this.bot = new TelegramBot(this.config.apiToken, {
        polling: this.config.polling !== false,
      });

      if (this.config.webhookUrl) {
        await this.bot.setWebHook(this.config.webhookUrl);
      }

      // Register message handlers
      this.bot.on("message", (msg: any) => this.handleTelegramMessage(msg));
      this.bot.on("callback_query", (query: any) => this.handleCallbackQuery(query));

      // Handle polling errors
      this.bot.on("polling_error", (error: Error) => {
        console.error("Telegram polling error:", error);
      });
    } catch (error: any) {
      if ((error as any).code === "MODULE_NOT_FOUND") {
        console.warn("node-telegram-bot-api not installed. Install with: npm install node-telegram-bot-api");
        console.warn("Creating mock adapter for development...");
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
      console.error(`Failed to send message to ${target}:`, error);
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

  async edit(messageId: string, newText: string, options?: SendOptions): Promise<void> {
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
      await this.bot.editMessageText(chatId, parseInt(msgId, 10), newText, opts);
    } catch (error) {
      console.error(`Failed to edit message ${msgId}:`, error);
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
      console.error(`Failed to delete message ${msgId}:`, error);
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
      console.error(`Failed to send poll to ${target}:`, error);
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
        console.warn(`Failed to add reaction to message ${msgId}:`, error);
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
        console.warn(`Failed to remove reactions from message ${msgId}:`, error);
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
      console.error(`Failed to send sticker to ${target}:`, error);
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
      console.error(`Failed to send message with effect to ${target}:`, error);
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
      console.error("Failed to set bot commands:", error);
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
      console.error(`Failed to send chat action ${action} to ${target}:`, error);
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
      console.error(`Failed to download file ${msgId}:`, error);
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
      console.log(`📥 Getting file info for: ${fileId.substring(0, 20)}...`);

      const fileLink = await this.bot.getFileLink(fileId);

      if (!fileLink) {
        throw new Error("Failed to get file link");
      }

      console.log(`📥 File link: ${fileLink}`);

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
            console.log(`📥 Downloaded ${buffer.length} bytes`);
            resolve(buffer);
          });
          response.on("error", reject);
        });
      });
    } catch (error) {
      console.error(`Failed to download file ${fileId}:`, error);
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
      console.error(`Failed to forward message from ${fromChatId} to ${to}:`, error);
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
    if (this.bot) {
      await this.bot.stopPolling();
    }
    this.bot = null;
    this.messageCallback = undefined;
  }

  /**
   * Handle incoming Telegram message
   */
  private handleTelegramMessage(msg: any): void {
    try {
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
      console.error("Failed to handle Telegram message:", error);
    }
  }

  /**
   * Handle callback query (button clicks)
   */
  private handleCallbackQuery(query: any): void {
    try {
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
          text: `[Callback: ${query.data}]`,
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
          console.warn("Failed to answer callback query:", error);
        });
      }
    } catch (error) {
      console.error("Failed to handle callback query:", error);
    }
  }
}
