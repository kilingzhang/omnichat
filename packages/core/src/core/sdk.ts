import type {
  Adapter,
  AdapterConfig,
  FullAdapter,
  PollInput,
  PollResult,
  ChatAction,
} from "./adapter.js";
import type { Message, SendContent, SendOptions, SendResult } from "../models/message.js";
import type { Capabilities } from "../models/capabilities.js";
import type { StorageConfig } from "../storage/storage.js";
import type {
  UniversalSendContent,
  PlatformSpecificOptions,
} from "../models/universal-features.js";
import type {
  InviteOptions,
  InviteResult,
  PinOptions,
  Result,
  MemberInfo,
  ModerationOptions,
  MuteOptions,
} from "../models/unified-adapter.js";
import {
  AdapterNotFoundError,
  CapabilityNotSupportedError,
} from "../errors/index.js";
import { StorageManager } from "../storage/manager.js";
import { extendMessage } from "../models/extended-message.js";
import { ComponentTransformer } from "../utils/feature-adapter.js";
import { PLATFORMS } from "../constants/platforms.js";

/**
 * SDK initialization options
 */
export interface SDKOptions {
  adapters: Record<string, AdapterInitializer>;
  globalConfig?: Record<string, unknown>;
  storage?: StorageConfig;
}

/**
 * Adapter initializer
 */
export type AdapterInitializer = {
  class: new () => Adapter;
  config: AdapterConfig;
  enabled?: boolean;
};

/**
 * Message event callback
 */
export type MessageCallback = (message: Message) => void | Promise<void>;

/**
 * Middleware function
 */
export type Middleware = (message: Message, next: () => Promise<void>) => Promise<void>;

/**
 * IM SDK
 */
export class SDK {
  private adapters: Map<string, FullAdapter> = new Map();
  private messageCallbacks: Set<MessageCallback> = new Set();
  private middlewares: Middleware[] = [];
  private storageManager?: StorageManager;
  private initialized = false;

  constructor(private options: SDKOptions) {
    // Initialize storage if configured
    if (options.storage) {
      this.storageManager = new StorageManager(options.storage);
    }
  }

  /**
   * Initialize the SDK and all enabled adapters
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize each enabled adapter
    for (const [platform, initializer] of Object.entries(this.options.adapters)) {
      if (initializer.enabled !== false) {
        const adapter = new initializer.class();
        await adapter.init(initializer.config);
        this.adapters.set(platform, adapter as FullAdapter);

        // Register message callback for this adapter
        adapter.onMessage((message) => this.handleIncomingMessage(message));
      }
    }

    this.initialized = true;
  }

  /**
   * Get an adapter by platform
   */
  getAdapter(platform: string): FullAdapter | undefined {
    return this.adapters.get(platform);
  }

  /**
   * Get all loaded adapters
   */
  getAdapters(): Map<string, FullAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Get capabilities for a platform
   */
  getCapabilities(platform: string): Capabilities | undefined {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      return undefined;
    }
    return adapter.getCapabilities();
  }

  /**
   * Check if a platform has a specific capability
   */
  hasCapability(platform: string, category: keyof Capabilities, capability: string): boolean {
    const caps = this.getCapabilities(platform);
    if (!caps) {
      return false;
    }
    return (caps[category] as Record<string, boolean>)?.[capability] ?? false;
  }

  /**
   * Get adapters that support a specific capability
   */
  getAdaptersByCapability(category: keyof Capabilities, capability: string): string[] {
    const result: string[] = [];
    for (const [platform, adapter] of this.adapters) {
      const caps = adapter.getCapabilities();
      if ((caps[category] as Record<string, boolean>)?.[capability]) {
        result.push(platform);
      }
    }
    return result;
  }

  /**
   * Send a message to a target
   */
  async send(platform: string, content: SendContent, options: SendOptions & { to: string }): Promise<SendResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    const { to, ...sendOptions } = options;
    return adapter.send(to, content, sendOptions);
  }

  /**
   * Reply to a message
   * @param platform - Platform identifier
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID to reply to
   * @param content - Message content
   * @param options - Optional send options
   */
  async reply(platform: string, chatId: string, messageId: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.reply) {
      throw new CapabilityNotSupportedError(platform, "reply");
    }

    return adapter.reply(chatId, messageId, content, options);
  }

  /**
   * Edit a message
   * @param platform - Platform identifier
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID to edit
   * @param newText - New text content
   * @param options - Optional send options
   */
  async edit(platform: string, chatId: string, messageId: string, newText: string, options?: SendOptions): Promise<SendResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.edit) {
      throw new CapabilityNotSupportedError(platform, "edit");
    }

    return adapter.edit(chatId, messageId, newText, options);
  }

  /**
   * Delete a message
   * @param platform - Platform identifier
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID to delete
   */
  async delete(platform: string, chatId: string, messageId: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.delete) {
      throw new CapabilityNotSupportedError(platform, "delete");
    }

    return adapter.delete(chatId, messageId);
  }

  /**
   * Send buttons
   */
  async sendButtons(
    platform: string,
    target: string,
    text: string,
    buttons: Array<Array<{ text: string; data: string }>>,
    options?: SendOptions
  ): Promise<SendResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.sendButtons) {
      throw new CapabilityNotSupportedError(platform, "buttons");
    }

    return adapter.sendButtons(target, text, buttons, options);
  }

  /**
   * Send a poll
   */
  async sendPoll(platform: string, target: string, poll: PollInput, options?: SendOptions): Promise<PollResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.sendPoll) {
      throw new CapabilityNotSupportedError(platform, "polls");
    }

    return adapter.sendPoll(target, poll, options);
  }

  /**
   * Add a reaction
   * @param platform - Platform identifier
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID
   * @param emoji - Reaction emoji
   */
  async addReaction(platform: string, chatId: string, messageId: string, emoji: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.addReaction) {
      throw new CapabilityNotSupportedError(platform, "reactions");
    }

    return adapter.addReaction(chatId, messageId, emoji);
  }

  /**
   * Remove a reaction
   * @param platform - Platform identifier
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID
   * @param emoji - Reaction emoji
   */
  async removeReaction(platform: string, chatId: string, messageId: string, emoji: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.removeReaction) {
      throw new CapabilityNotSupportedError(platform, "reactions");
    }

    return adapter.removeReaction(chatId, messageId, emoji);
  }

  /**
   * Send message with universal components (cross-platform)
   * Automatically transforms components to platform-specific format
   */
  async sendWithComponents(
    platform: string,
    target: string,
    content: UniversalSendContent,
    options?: SendOptions & { to?: string }
  ): Promise<SendResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    const { to, ...sendOptions } = options || {};
    const finalTarget = to || target;

    // Transform universal components to platform-specific format
    let transformedContent: SendContent = {
      text: content.text,
      mediaUrl: content.mediaUrl,
      mediaType: content.mediaType,
      stickerId: content.stickerId,
      poll: content.poll,
      buttons: undefined, // Will be set by transformation
    };

    // Transform components if present
    if (content.components) {
      const transformation = ComponentTransformer.transform(platform, content.components);

      if (transformation.success && transformation.data) {
        // Apply platform-specific transformation
        const platformData = transformation.data;

        // Extract buttons from platform-specific format
        if (platformData.reply_markup) {
          // Telegram
          transformedContent.buttons = this.extractButtonsFromTelegram(platformData.reply_markup);
        } else if (platformData.components) {
          // Discord
          transformedContent.buttons = this.extractButtonsFromDiscord(platformData.components);
        } else if (platformData.blocks) {
          // Slack
          transformedContent.buttons = this.extractButtonsFromSlack(platformData.blocks);
        } else if (platformData.action && platformData.action.buttons) {
          // WhatsApp
          transformedContent.buttons = this.extractButtonsFromWhatsApp(platformData.action.buttons);
        }
      }

      // Log warnings if any
      if (transformation.warnings && transformation.warnings.length > 0) {
        console.warn(`Component transformation warnings for ${platform}:`, transformation.warnings);
      }

      // Log errors if any but still try to send
      if (transformation.errors && transformation.errors.length > 0) {
        console.warn(`Component transformation errors for ${platform}:`, transformation.errors);
      }
    }

    // Merge platform-specific options
    const finalOptions: SendOptions = {
      ...sendOptions,
      ...this.extractPlatformOptions(platform, content.platformOptions),
    };

    return adapter.send(finalTarget, transformedContent, finalOptions);
  }

  /**
   * Check if platform supports a specific feature
   */
  supports(platform: string, featurePath: string): boolean {
    const [category, capability] = featurePath.split(".") as [keyof Capabilities, string];
    return this.hasCapability(platform, category, capability);
  }

  /**
   * Get best platform for a feature (with fallback)
   */
  getBestPlatform(featurePath: string, platforms?: string[]): string | null {
    const platformList = platforms || Array.from(this.adapters.keys());
    const [category, capability] = featurePath.split(".") as [keyof Capabilities, string];

    for (const platform of platformList) {
      if (this.hasCapability(platform, category, capability)) {
        return platform;
      }
    }

    return null;
  }

  /**
   * Extract buttons from Telegram inline_keyboard format
   */
  private extractButtonsFromTelegram(replyMarkup: any): Array<Array<{ text: string; data: string }>> {
    if (!replyMarkup.inline_keyboard) return [];
    return replyMarkup.inline_keyboard.map((row: any[]) =>
      row.map((btn: any) => ({
        text: btn.text,
        data: btn.callback_data || btn.url,
      }))
    );
  }

  /**
   * Extract buttons from Discord components format
   */
  private extractButtonsFromDiscord(components: any[]): Array<Array<{ text: string; data: string }>> {
    return components.map((actionRow: any) =>
      actionRow.components?.map((btn: any) => ({
        text: btn.label,
        data: btn.custom_id || btn.url,
      })) || []
    );
  }

  /**
   * Extract buttons from Slack blocks format
   */
  private extractButtonsFromSlack(blocks: any[]): Array<Array<{ text: string; data: string }>> {
    return blocks.map((block: any) =>
      block.elements?.map((element: any) => ({
        text: element.text?.text || element.text,
        data: element.action_id || element.url,
      })) || []
    );
  }

  /**
   * Extract buttons from WhatsApp interactive format
   */
  private extractButtonsFromWhatsApp(buttons: any[]): Array<Array<{ text: string; data: string }>> {
    return [
      buttons.map((btn: any) => ({
        text: btn.title || btn.text,
        data: btn.reply?.id || btn.url,
      }))
    ];
  }

  /**
   * Extract platform-specific options from PlatformSpecificOptions
   */
  private extractPlatformOptions(platform: string, platformOptions?: PlatformSpecificOptions): SendOptions {
    if (!platformOptions) return {};

    const options: SendOptions = {};

    switch (platform) {
      case PLATFORMS.TELEGRAM:
        if (platformOptions.telegram) {
          const telegramOpts = platformOptions.telegram;
          if (telegramOpts.parseMode) {
            options.parseMode = telegramOpts.parseMode.toLowerCase() as "markdown" | "html";
          }
        }
        break;

      case PLATFORMS.DISCORD:
        if (platformOptions.discord) {
          // Discord-specific options would go here
        }
        break;

      // Future platforms
      // case PLATFORMS.SLACK:
      // case PLATFORMS.WHATSAPP:
    }

    return options;
  }

  /**
   * Get message history
   */
  async getHistory(platform: string, channel: string, limit: number): Promise<Message[]> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.getHistory) {
      throw new CapabilityNotSupportedError(platform, "history");
    }

    return adapter.getHistory(channel, limit);
  }

  /**
   * Search messages
   */
  async search(platform: string, query: string, options?: { channel?: string; limit?: number }): Promise<Message[]> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.search) {
      throw new CapabilityNotSupportedError(platform, "search");
    }

    return adapter.search(query, options);
  }

  /**
   * Register a message callback
   */
  on(callback: MessageCallback): void {
    this.messageCallbacks.add(callback);
  }

  /**
   * Register a platform-specific message callback
   */
  onPlatform(platform: string, callback: MessageCallback): void {
    const wrappedCallback = (message: Message) => {
      if (message.platform === platform) {
        callback(message);
      }
    };
    this.messageCallbacks.add(wrappedCallback);
  }

  /**
   * Add middleware for processing incoming messages
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Handle incoming message from any adapter
   */
  private async handleIncomingMessage(message: Message): Promise<void> {
    // Extend message with runtime properties
    const extended = extendMessage(message);
    extended.sdk = this;

    // Run through middlewares
    let middlewareIndex = 0;

    const next = async (): Promise<void> => {
      if (middlewareIndex >= this.middlewares.length) {
        // All middlewares done, notify callbacks
        for (const callback of this.messageCallbacks) {
          await callback(extended);
        }
        return;
      }

      const middleware = this.middlewares[middlewareIndex++];
      await middleware(extended, next);
    };

    await next();
  }

  /**
   * Get storage manager
   */
  getStorage() {
    return this.storageManager;
  }

  // ============================================================================
  // Group Management
  // ============================================================================

  /**
   * Kick a user from a chat/group
   */
  async kick(
    platform: string,
    chatId: string,
    userId: string,
    options?: ModerationOptions
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.kick) {
      return adapter.kick(chatId, userId, options);
    }

    throw new CapabilityNotSupportedError(platform, "kick");
  }

  /**
   * Ban a user from a chat/group
   */
  async ban(
    platform: string,
    chatId: string,
    userId: string,
    options?: ModerationOptions
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.ban) {
      return adapter.ban(chatId, userId, options);
    }

    throw new CapabilityNotSupportedError(platform, "ban");
  }

  /**
   * Unban a user from a chat/group
   */
  async unban(
    platform: string,
    chatId: string,
    userId: string
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.unban) {
      return adapter.unban(chatId, userId);
    }

    throw new CapabilityNotSupportedError(platform, "unban");
  }

  /**
   * Mute/timeout a user in a chat/group
   */
  async mute(
    platform: string,
    chatId: string,
    userId: string,
    options: MuteOptions
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.mute) {
      return adapter.mute(chatId, userId, options);
    }

    throw new CapabilityNotSupportedError(platform, "mute");
  }

  /**
   * Unmute/remove timeout from a user
   */
  async unmute(
    platform: string,
    chatId: string,
    userId: string
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.unmute) {
      return adapter.unmute(chatId, userId);
    }

    throw new CapabilityNotSupportedError(platform, "unmute");
  }

  // ============================================================================
  // Invite Management
  // ============================================================================

  /**
   * Create an invite link
   */
  async createInvite(
    platform: string,
    chatId: string,
    options?: InviteOptions
  ): Promise<InviteResult> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.createInvite) {
      return adapter.createInvite(chatId, options);
    }

    throw new CapabilityNotSupportedError(platform, "createInvite");
  }

  /**
   * Get invites for a chat/group
   */
  async getInvites(
    platform: string,
    chatId: string
  ): Promise<InviteResult[]> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.getInvites) {
      return adapter.getInvites(chatId);
    }

    throw new CapabilityNotSupportedError(platform, "getInvites");
  }

  /**
   * Revoke/delete an invite
   */
  async revokeInvite(
    platform: string,
    chatId: string,
    inviteCode: string
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.revokeInvite) {
      return adapter.revokeInvite(chatId, inviteCode);
    }

    throw new CapabilityNotSupportedError(platform, "revokeInvite");
  }

  /**
   * Export primary invite link
   */
  async exportInvite(platform: string, chatId: string): Promise<string> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.exportInvite) {
      return adapter.exportInvite(chatId);
    }

    // Fallback: get invites and return first one
    const invites = await this.getInvites(platform, chatId);
    if (invites.length > 0) {
      return invites[0].url;
    }

    throw new CapabilityNotSupportedError(platform, "exportInvite");
  }

  // ============================================================================
  // Message Pinning
  // ============================================================================

  /**
   * Pin a message
   */
  async pinMessage(
    platform: string,
    chatId: string,
    messageId: string,
    options?: PinOptions
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.pinMessage) {
      return adapter.pinMessage(chatId, messageId, options);
    }

    throw new CapabilityNotSupportedError(platform, "pinMessage");
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    platform: string,
    chatId: string,
    messageId: string
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.unpinMessage) {
      return adapter.unpinMessage(chatId, messageId);
    }

    throw new CapabilityNotSupportedError(platform, "unpinMessage");
  }

  // ============================================================================
  // Member Info
  // ============================================================================

  /**
   * Get member information
   */
  async getMember(
    platform: string,
    chatId: string,
    userId: string
  ): Promise<MemberInfo> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.getMemberInfo) {
      return adapter.getMemberInfo(chatId, userId);
    }

    throw new CapabilityNotSupportedError(platform, "getMember");
  }

  /**
   * Get member count for a chat/group
   */
  async getMemberCount(platform: string, chatId: string): Promise<number> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.getMemberCount) {
      return adapter.getMemberCount(chatId);
    }

    throw new CapabilityNotSupportedError(platform, "getMemberCount");
  }

  /**
   * Get administrators of a chat/group
   */
  async getAdministrators(
    platform: string,
    chatId: string
  ): Promise<MemberInfo[]> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.getAdministrators) {
      return adapter.getAdministrators(chatId);
    }

    throw new CapabilityNotSupportedError(platform, "getAdministrators");
  }

  // ============================================================================
  // Chat Settings
  // ============================================================================

  /**
   * Set chat/group title
   */
  async setChatTitle(
    platform: string,
    chatId: string,
    title: string
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.setTitle) {
      return adapter.setTitle(chatId, title);
    }

    throw new CapabilityNotSupportedError(platform, "setChatTitle");
  }

  /**
   * Set chat/group description
   */
  async setChatDescription(
    platform: string,
    chatId: string,
    description: string
  ): Promise<Result<void>> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.setDescription) {
      return adapter.setDescription(chatId, description);
    }

    throw new CapabilityNotSupportedError(platform, "setChatDescription");
  }

  // ============================================================================
  // Chat Actions & Callbacks
  // ============================================================================

  /**
   * Send a chat action (typing indicator, etc.)
   * Telegram: sendChatAction
   * Discord: sendTyping
   */
  async sendChatAction(platform: string, chatId: string, action: ChatAction): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (platform === PLATFORMS.TELEGRAM) {
      const telegramAdapter = adapter as any;
      if (!telegramAdapter.sendChatAction) {
        throw new CapabilityNotSupportedError(platform, "sendChatAction");
      }
      await telegramAdapter.sendChatAction(chatId, action);
    } else if (platform === PLATFORMS.DISCORD) {
      const discordAdapter = adapter as any;
      if (discordAdapter.client) {
        const channel = await discordAdapter.client.channels.fetch(chatId);
        if (channel && channel.isTextBased && channel.isTextBased()) {
          if (action === "typing") {
            await channel.sendTyping();
          }
        }
      }
    } else {
      throw new CapabilityNotSupportedError(platform, "sendChatAction");
    }
  }

  /**
   * Answer a callback query (button click response)
   * Telegram: answerCallbackQuery
   * Discord: deferUpdate / reply to interaction
   */
  async answerCallbackQuery(
    platform: string,
    callbackQueryId: string,
    options?: { text?: string; showAlert?: boolean }
  ): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (platform === PLATFORMS.TELEGRAM) {
      const telegramAdapter = adapter as any;
      if (!telegramAdapter.answerCallbackQuery) {
        throw new CapabilityNotSupportedError(platform, "answerCallbackQuery");
      }
      await telegramAdapter.answerCallbackQuery(callbackQueryId, options);
    } else if (platform === PLATFORMS.DISCORD) {
      // Discord uses interaction responses differently
      // callbackQueryId is actually the interaction token
      const discordAdapter = adapter as any;
      if (discordAdapter.answerInteraction) {
        await discordAdapter.answerInteraction(callbackQueryId, options?.text);
      }
    } else {
      throw new CapabilityNotSupportedError(platform, "answerCallbackQuery");
    }
  }

  // ============================================================================
  // DM Channel Management
  // ============================================================================

  /**
   * Create or get a DM channel with a user
   */
  async createDMChannel(platform: string, userId: string): Promise<string> {
    const adapter = this.adapters.get(platform) as any;
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (adapter.createDMChannel) {
      return adapter.createDMChannel(userId);
    }

    throw new CapabilityNotSupportedError(platform, "createDMChannel");
  }

  // ============================================================================
  // Guild/Server Info
  // ============================================================================

  /**
   * Get guilds/servers the bot is in
   * Telegram: N/A (no concept of guilds)
   * Discord: Get guilds from client cache
   */
  async getGuilds(
    platform: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      icon?: string;
      memberCount?: number;
    }>
  > {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }

    if (platform === PLATFORMS.TELEGRAM) {
      // Telegram doesn't have guilds concept
      throw new CapabilityNotSupportedError(platform, "getGuilds");
    } else if (platform === PLATFORMS.DISCORD) {
      const discordAdapter = adapter as any;
      if (discordAdapter.client && discordAdapter.client.guilds) {
        return discordAdapter.client.guilds.cache.map((guild: any) => ({
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL?.(),
          memberCount: guild.memberCount,
        }));
      }
      throw new CapabilityNotSupportedError(platform, "getGuilds");
    } else {
      throw new CapabilityNotSupportedError(platform, "getGuilds");
    }
  }

  /**
   * Destroy the SDK and cleanup all adapters
   */
  async destroy(): Promise<void> {
    const destroyPromises = Array.from(this.adapters.values()).map((adapter) => adapter.destroy());
    await Promise.all(destroyPromises);

    if (this.storageManager) {
      await this.storageManager.destroy();
    }

    this.adapters.clear();
    this.messageCallbacks.clear();
    this.middlewares = [];
    this.initialized = false;
  }
}
