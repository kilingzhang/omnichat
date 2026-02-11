import type {
  Adapter,
  AdapterConfig,
  FullAdapter,
  PollInput,
  PollResult,
} from "./adapter.js";
import type { Message, SendContent, SendOptions, SendResult } from "../models/message.js";
import type { ExtendedMessage } from "../models/extended-message.js";
import type { Capabilities } from "../models/capabilities.js";
import type { StorageConfig } from "../storage/storage.js";
import type {
  UniversalSendContent,
  UniversalInteractiveElements,
  PlatformSpecificOptions,
} from "../models/universal-features.js";
import {
  AdapterNotFoundError,
  CapabilityNotSupportedError,
  ConfigurationError,
} from "../errors/index.js";
import { StorageManager } from "../storage/manager.js";
import { extendMessage } from "../models/extended-message.js";
import { ComponentTransformer } from "../utils/feature-adapter.js";

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
 * Unified IM SDK
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
   */
  async reply(platform: string, toMessageId: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.reply) {
      throw new CapabilityNotSupportedError(platform, "reply");
    }

    return adapter.reply(toMessageId, content, options);
  }

  /**
   * Edit a message
   */
  async edit(platform: string, messageId: string, newText: string, options?: SendOptions): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.edit) {
      throw new CapabilityNotSupportedError(platform, "edit");
    }

    return adapter.edit(messageId, newText, options);
  }

  /**
   * Delete a message
   */
  async delete(platform: string, messageId: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.delete) {
      throw new CapabilityNotSupportedError(platform, "delete");
    }

    return adapter.delete(messageId);
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
   */
  async addReaction(platform: string, messageId: string, emoji: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.addReaction) {
      throw new CapabilityNotSupportedError(platform, "reactions");
    }

    return adapter.addReaction(messageId, emoji);
  }

  /**
   * Remove a reaction
   */
  async removeReaction(platform: string, messageId: string, emoji: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new AdapterNotFoundError(platform);
    }
    if (!adapter.removeReaction) {
      throw new CapabilityNotSupportedError(platform, "reactions");
    }

    return adapter.removeReaction(messageId, emoji);
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
      case "telegram":
        if (platformOptions.telegram) {
          const telegramOpts = platformOptions.telegram;
          if (telegramOpts.parseMode) {
            options.parseMode = telegramOpts.parseMode.toLowerCase() as "markdown" | "html";
          }
          // Add more Telegram-specific options as needed
        }
        break;

      case "discord":
        if (platformOptions.discord) {
          // Discord-specific options would go here
          // Note: Discord doesn't use SendOptions the same way
        }
        break;

      case "slack":
        if (platformOptions.slack) {
          // Slack-specific options would go here
        }
        break;

      case "whatsapp":
        if (platformOptions.whatsapp) {
          // WhatsApp-specific options would go here
        }
        break;
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
