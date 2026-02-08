import type { FullAdapter, AdapterConfig, SendContent, SendOptions, SendResult } from "@omnichat/core";
import type { Message, MessageContent, Participant, ReplyReference } from "@omnichat/core";
import type { Capabilities } from "@omnichat/core";

/**
 * Signal adapter configuration
 */
export interface SignalConfig extends AdapterConfig {
  phoneNumber: string;
  profileKey?: string;
}

/**
 * Signal adapter
 */
export class SignalAdapter implements FullAdapter {
  readonly platform = "signal";

  private client: any;
  private config?: SignalConfig;
  private messageCallback?: (message: Message) => void;
  private capabilities: Capabilities;

  constructor() {
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
      interaction: { buttons: false, polls: false, reactions: true, stickers: false, effects: false },
      discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
      management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as SignalConfig;

    if (!this.config.phoneNumber) {
      throw new Error("Signal phone number is required");
    }

    try {
      const signal = await import("libsignal-node");
      this.client = null; // Signal requires complex setup, just basic stub
      console.warn("Signal adapter initialized in stub mode. Full implementation requires Signal database setup.");
    } catch (error: any) {
      if ((error as any).code === "MODULE_NOT_FOUND") {
        console.warn("libsignal-node not installed. Install with: npm install libsignal-node");
        console.warn("Creating mock adapter for development...");
        this.client = null;
      } else {
        throw error;
      }
    }
  }

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    if (!this.client) {
      throw new Error("Signal client not initialized");
    }

    throw new Error("Signal send not implemented - use external Signal CLI");
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.client) {
      throw new Error("Signal client not initialized");
    }

    console.log(`Adding reaction ${emoji} to ${messageId}`);
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.client) {
      throw new Error("Signal client not initialized");
    }

    console.log(`Removing reaction ${emoji} from ${messageId}`);
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
  }

  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  async destroy(): Promise<void> {
    this.client = null;
    this.messageCallback = undefined;
  }
}
