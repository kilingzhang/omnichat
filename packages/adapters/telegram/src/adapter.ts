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
} from "@omnichat/core";

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

// ============================================================================
// Chat ID Conversion - 统一使用正数对外，内部转换为负数
// ============================================================================

/**
 * Telegram 的 Chat ID 规则：
 * - 正数: 私聊（个人用户）
 * - 负数: 群组/频道/超级群组
 *
 * 为了用户友好，我们统一对外使用正数。
 * 为了避免 ID 冲突，我们在高比特位存储符号信息：
 * - 私聊 ID: 保持原值（正数）
 * - 群组 ID: 将负数转为正数，但在高位设置标记位
 *
 * 编码方案：
 * - 私聊: 0x4000000000000000 + id（设置第62位为1）
 * - 群组: abs(id)（直接使用绝对值）
 *
 * 这样可以完全避免冲突，因为：
 * - 私聊 ID 会有 0x4 前缀（大于 2^62）
 * - 群组 ID 没有前缀（绝对值）
 * - 两者范围完全不重叠
 */
const SIGN_BIT = 0x4000000000000000; // 2^62 - 用于标记私聊 ID
const ABS_MASK = 0x3FFFFFFFFFFFFFFF; // 掩码：用于提取实际的 ID 值

/**
 * 将 Telegram Chat ID（可能是负数）转换为统一的正数 ID
 *
 * @param telegramId - Telegram 原始 Chat ID（正数为私聊，负数为群组）
 * @returns 统一的正数 ID（私聊有高位标记，群组为绝对值）
 */
function telegramIdToPublicId(telegramId: string | number): string {
  const id = typeof telegramId === 'string' ? parseInt(telegramId, 10) : telegramId;

  if (id > 0) {
    // 私聊：在高比特位设置标记位
    // 这样 1234567890 → 4611686018427388490
    return String(SIGN_BIT | (id & ABS_MASK));
  }

  // 群组/频道：返回绝对值（没有标记位）
  return String(Math.abs(id));
}

/**
 * 将统一的正数 ID 转换回 Telegram Chat ID
 *
 * @param publicId - 统一的正数 ID（可能包含高位标记）
 * @returns Telegram 原始 Chat ID（私聊为正数，群组为负数）
 */
function publicIdToTelegramId(publicId: string | number): string {
  const id = typeof publicId === 'string' ? parseInt(publicId, 10) : publicId;

  // 检查是否有私聊标记位（第62位为1）
  if ((id & SIGN_BIT) !== 0) {
    // 私聊：去掉标记位，返回正数
    return String(id & ABS_MASK);
  }

  // 群组：转回负数
  return String(-id);
}

/**
 * 智能推断目标类型（从 ID 格式）
 *
 * @param id - 目标 ID
 * @returns 推断的类型，如果无法推断则返回 null
 */
function inferTargetType(id: string): TargetType | null {
  // @username 公开用户名/频道/群组
  if (id.startsWith('@')) {
    // 进一步判断：频道通常有特定的命名模式，但很难100%确定
    // 这里保守处理：@username 都当作 channel，用户可以通过 targetType 覆盖
    return 'channel';
  }

  // 纯数字 ID - 根据正负号和标记位判断
  const num = parseInt(id, 10);
  if (!isNaN(num)) {
    // 检查是否有私聊标记位（第62位为1）
    if ((num & SIGN_BIT) !== 0) {
      return 'user';  // 私聊（有高位标记）
    }
    // 普通正数 = 用户
    if (num > 0 && num < SIGN_BIT) {
      return 'user';
    }
    // 其他情况当作群组
    return 'group';
  }

  // 无法推断
  return null;
}

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
  // Cache for inferred target types to avoid repeated lookups
  private targetTypeCache = new Map<string, TargetType>();

  constructor() {
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: true, edit: true, delete: true, threads: true, quote: true },
      interaction: { buttons: true, polls: true, reactions: true, stickers: true, effects: true },
      discovery: { history: false, search: false, pins: false, memberInfo: true, channelInfo: true },
      management: { kick: true, ban: true, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: true },
    };
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

    // 智能处理目标类型
    const targetType = this.resolveTargetType(target, options?.targetType);

    // 如果 targetType 提供了额外的验证，可以在这里使用
    // 目前 Telegram 可以从 ID 格式推断，所以不需要额外处理

    // 将统一的正数 ID 转换回 Telegram ID（群组时转回负数）
    const telegramTarget = publicIdToTelegramId(target);

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
          result = await this.bot.sendVideo(telegramTarget, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        } else if (mediaType === "audio") {
          result = await this.bot.sendAudio(telegramTarget, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        } else if (mediaType === "file") {
          result = await this.bot.sendDocument(telegramTarget, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        } else {
          // Default to photo for images
          result = await this.bot.sendPhoto(telegramTarget, content.mediaUrl, {
            caption: content.text,
            ...opts,
          });
        }
      }
      // Send text
      else if (content.text) {
        result = await this.bot.sendMessage(telegramTarget, content.text, opts);
      } else {
        throw new Error("Either text, mediaUrl, stickerId, buttons, or poll is required");
      }

      return {
        platform: this.platform,
        messageId: `${telegramTarget}:${result.message_id}`,
        chatId: telegramIdToPublicId(telegramTarget), // 返回正数 ID 给用户
        timestamp: result.date * 1000,
      };
    } catch (error) {
      console.error(`Failed to send message to ${telegramTarget}:`, error);
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
      console.error(`Failed to get chat info for ${chatId}:`, error);
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
      console.error(`Failed to get chat member count for ${chatId}:`, error);
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
      console.error(`Failed to get chat member ${userId} from ${chatId}:`, error);
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
      console.error(`Failed to get chat administrators for ${chatId}:`, error);
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
      console.error(`Failed to pin message ${msgId}:`, error);
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
      console.error(`Failed to unpin message ${msgId}:`, error);
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
      console.error(`Failed to unpin all messages in ${chatId}:`, error);
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
      console.error(`Failed to set chat permissions for ${chatId}:`, error);
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
      console.error(`Failed to ban user ${userId} from ${chatId}:`, error);
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
      console.error(`Failed to unban user ${userId} from ${chatId}:`, error);
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
      console.error(`Failed to restrict user ${userId} in ${chatId}:`, error);
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
      console.error(`Failed to promote user ${userId} in ${chatId}:`, error);
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
      console.error(`Failed to set chat title for ${chatId}:`, error);
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
      console.error(`Failed to set chat description for ${chatId}:`, error);
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
      console.error(`Failed to set chat photo for ${chatId}:`, error);
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
      console.error(`Failed to delete chat photo for ${chatId}:`, error);
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
      console.error(`Failed to export invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Create chat invite link
   * @param chatId - Chat ID or username
   * @param options - Optional parameters
   * @returns Promise resolving to invite link info
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
    inviteLink: string;
    creator: any;
    createsJoinRequest: boolean;
    isPrimary: boolean;
    name?: string;
    expireDate?: number;
    memberLimit?: number;
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
      console.error(`Failed to create invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Edit chat invite link
   * @param chatId - Chat ID or username
   * @param inviteLink - Invite link to edit
   * @param options - Optional parameters
   * @returns Promise resolving to edited invite link info
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
    inviteLink: string;
    creator: any;
    createsJoinRequest: boolean;
    isPrimary: boolean;
    name?: string;
    expireDate?: number;
    memberLimit?: number;
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
      console.error(`Failed to edit invite link for ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Revoke chat invite link
   * @param chatId - Chat ID or username
   * @param inviteLink - Invite link to revoke
   * @returns Promise resolving to revoked invite link info
   */
  async revokeChatInviteLink(chatId: string, inviteLink: string): Promise<{
    inviteLink: string;
    creator: any;
    createsJoinRequest: boolean;
    isPrimary: boolean;
    isRevoked: true;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const linkInfo = await this.bot.revokeChatInviteLink(chatId, inviteLink);
      return linkInfo;
    } catch (error) {
      console.error(`Failed to revoke invite link for ${chatId}:`, error);
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
      console.error(`Failed to approve join request for user ${userId} in ${chatId}:`, error);
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
      console.error(`Failed to decline join request for user ${userId} in ${chatId}:`, error);
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
      console.error(`Failed to get user profile photos for ${userId}:`, error);
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
      console.error("Failed to get forum topic icon stickers:", error);
      throw error;
    }
  }

  /**
   * Create a forum topic
   * @param chatId - Chat ID or username (must be a supergroup)
   * @param name - Topic name (1-128 characters)
   * @param options - Optional parameters
   * @returns Promise resolving to created topic info
   */
  async createForumTopic(
    chatId: string,
    name: string,
    options?: {
      iconColor?: number; // RGB color
      iconCustomEmojiId?: string; // Custom emoji ID
    }
  ): Promise<{
    messageThreadId: number;
    name: string;
    iconColor: number;
    iconCustomEmojiId?: string;
  }> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const topicOptions: any = {};
      if (options?.iconColor !== undefined) topicOptions.icon_color = options.iconColor;
      if (options?.iconCustomEmojiId !== undefined) topicOptions.icon_custom_emoji_id = options.iconCustomEmojiId;

      const topic = await this.bot.createForumTopic(chatId, name, topicOptions);

      return {
        messageThreadId: topic.message_thread_id,
        name: topic.name,
        iconColor: topic.icon_color,
        iconCustomEmojiId: topic.icon_custom_emoji_id,
      };
    } catch (error) {
      console.error(`Failed to create forum topic in ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Edit a forum topic
   * @param chatId - Chat ID or username
   * @param messageThreadId - Forum topic identifier
   * @param options - Optional parameters
   */
  async editForumTopic(
    chatId: string,
    messageThreadId: number,
    options?: {
      name?: string;
      iconCustomEmojiId?: string;
    }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot not initialized");
    }

    try {
      const topicOptions: any = {};
      if (options?.name !== undefined) topicOptions.name = options.name;
      if (options?.iconCustomEmojiId !== undefined) topicOptions.icon_custom_emoji_id = options.iconCustomEmojiId;

      await this.bot.editForumTopic(chatId, messageThreadId, topicOptions);
    } catch (error) {
      console.error(`Failed to edit forum topic ${messageThreadId} in ${chatId}:`, error);
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
      console.error(`Failed to close forum topic ${messageThreadId} in ${chatId}:`, error);
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
      console.error(`Failed to reopen forum topic ${messageThreadId} in ${chatId}:`, error);
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
      console.error(`Failed to delete forum topic ${messageThreadId} in ${chatId}:`, error);
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
      console.error(`Failed to unpin all messages in forum topic ${messageThreadId} in ${chatId}:`, error);
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
      console.error(`Failed to edit General forum topic in ${chatId}:`, error);
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
      console.error(`Failed to close General forum topic in ${chatId}:`, error);
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
      console.error(`Failed to reopen General forum topic in ${chatId}:`, error);
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
      console.error(`Failed to hide General forum topic in ${chatId}:`, error);
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
      console.error(`Failed to unhide General forum topic in ${chatId}:`, error);
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
      console.error(`Failed to unpin all messages in General forum topic in ${chatId}:`, error);
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
      console.error(`Failed to leave chat ${chatId}:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.bot) {
      await this.bot.stopPolling();
    }
    this.bot = null;
    this.messageCallback = undefined;
    this.targetTypeCache.clear(); // Clear cache on destroy
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
      const telegramChatId = msg.chat.id.toString();
      const chatId = telegramIdToPublicId(telegramChatId); // 转换为正数

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
        id: chatId, // 使用转换后的正数 ID
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
