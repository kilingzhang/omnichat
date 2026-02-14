import type { AdapterConfig, Adapter } from "./adapter.js";
import type { Capabilities } from "../models/capabilities.js";
import type { Message, SendContent, SendOptions, SendResult } from "../models/message.js";
import { Logger, LogLevel } from "../utils/logger.js";
import { ConfigurationError } from "../errors/index.js";

/**
 * Event handler record for tracking registered listeners
 */
export interface EventHandlerRecord {
  event: string;
  handler: (...args: any[]) => void;
  target: any; // The event emitter (bot, client, etc.)
}

/**
 * Base class for platform adapters providing common functionality
 *
 * This class provides:
 * - Initialization state management
 * - Logger setup
 * - Event listener tracking and cleanup
 * - Common validation helpers
 * - Configuration error handling
 *
 * @example
 * ```typescript
 * class MyAdapter extends BaseAdapter implements FullAdapter {
 *   readonly platform = "myplatform";
 *
 *   protected override onInit(config: MyConfig): Promise<void> {
 *     this.requireConfigKey(config, 'apiKey', 'API key is required');
 *     // ... platform-specific initialization
 *   }
 *
 *   protected override onDestroy(): Promise<void> {
 *     // ... platform-specific cleanup
 *   }
 * }
 * ```
 */
export abstract class BaseAdapter implements Adapter {
  /**
   * Unique platform identifier (must be overridden)
   */
  abstract readonly platform: string;

  /**
   * Whether the adapter has been initialized
   */
  protected initialized = false;

  /**
   * Logger instance for this adapter
   */
  protected logger: Logger;

  /**
   * Configuration passed to init()
   */
  protected config?: AdapterConfig;

  /**
   * Message callback registered via onMessage()
   */
  protected messageCallback?: (message: Message) => void | Promise<void>;

  /**
   * Registered event handlers for cleanup
   */
  private eventHandlers: EventHandlerRecord[] = [];

  /**
   * Capabilities for this adapter (should be set in constructor)
   */
  protected abstract capabilities: Capabilities;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    // Use the class name as logger name
    this.logger = new Logger((this.constructor as any).name, logLevel);
  }

  /**
   * Initialize the adapter with configuration
   * Subclasses should override onInit() instead of this method
   */
  async init(config: AdapterConfig): Promise<void> {
    if (this.initialized) {
      this.logger.warn(`Adapter already initialized, re-initializing...`);
      await this.destroy();
    }

    this.config = config;
    this.logger.info(`Initializing ${this.platform} adapter...`);

    try {
      await this.onInit(config);
      this.initialized = true;
      this.logger.info(`✅ ${this.platform} adapter initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.platform} adapter`, error as Error);
      throw error;
    }
  }

  /**
   * Platform-specific initialization logic
   * Override this method in subclasses
   */
  protected async onInit(_config: AdapterConfig): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override this
  }

  /**
   * Check that a required configuration key is present
   * @throws ConfigurationError if the key is missing or empty
   */
  protected requireConfigKey(config: AdapterConfig, key: string, message?: string): void {
    const value = config[key];
    if (value === undefined || value === null || value === '') {
      throw new ConfigurationError(
        message || `Configuration key "${key}" is required for ${this.platform} adapter`,
        key
      );
    }
  }

  /**
   * Check that the adapter has been initialized
   * @throws ConfigurationError if not initialized
   */
  protected requireInitialized(): void {
    if (!this.initialized) {
      throw new ConfigurationError(
        `${this.platform} adapter has not been initialized. Call init() first.`,
        'initialized'
      );
    }
  }

  /**
   * Register an event handler with automatic cleanup tracking
   *
   * @param target - The event emitter (bot, client, etc.)
   * @param event - Event name
   * @param handler - Event handler function
   */
  protected registerEventHandler(
    target: any,
    event: string,
    handler: (...args: any[]) => void
  ): void {
    target.on?.(event, handler);
    this.eventHandlers.push({ target, event, handler });
  }

  /**
   * Remove all registered event handlers
   * Called automatically during destroy()
   */
  protected removeAllEventHandlers(): void {
    for (const { target, event, handler } of this.eventHandlers) {
      try {
        target.off?.(event, handler);
      } catch (error) {
        this.logger.warn(`Failed to remove handler for event "${event}"`, error as Error);
      }
    }
    this.eventHandlers = [];
  }

  /**
   * Register callback for incoming messages
   */
  onMessage(callback: (message: Message) => void | Promise<void>): void {
    this.messageCallback = callback;
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  /**
   * Destroy the adapter and cleanup resources
   * Subclasses should override onDestroy() for platform-specific cleanup
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.info(`Destroying ${this.platform} adapter...`);

    try {
      // Remove all event handlers first
      this.removeAllEventHandlers();

      // Call platform-specific cleanup
      await this.onDestroy();

      // Clear state
      this.messageCallback = undefined;
      this.initialized = false;

      this.logger.info(`${this.platform} adapter destroyed`);
    } catch (error) {
      this.logger.error(`Error destroying ${this.platform} adapter`, error as Error);
      throw error;
    }
  }

  /**
   * Platform-specific cleanup logic
   * Override this method in subclasses
   */
  protected async onDestroy(): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override this
  }

  /**
   * Abstract send method - must be implemented by subclasses
   */
  abstract send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult>;

  /**
   * Safely invoke the message callback if registered
   */
  protected invokeMessageCallback(message: Message): void {
    if (this.messageCallback) {
      try {
        const result = this.messageCallback(message);
        // Handle async callbacks
        if (result instanceof Promise) {
          result.catch((error) => {
            this.logger.error('Error in message callback', error);
          });
        }
      } catch (error) {
        this.logger.error('Error in message callback', error as Error);
      }
    }
  }
}

/**
 * Helper type for adapter constructors
 */
export type AdapterConstructor<T extends Adapter = Adapter> = new () => T;
