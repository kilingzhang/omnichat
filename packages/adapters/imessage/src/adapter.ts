import type { FullAdapter, AdapterConfig, SendContent, SendOptions, SendResult } from "@omnichat/core";
import type { Message, MessageContent, Participant } from "@omnichat/core";
import type { Capabilities } from "@omnichat/core";
import { Logger } from "@omnichat/core";

/**
 * iMessage adapter configuration
 */
export interface IMessageConfig extends AdapterConfig {
  service?: "imessage" | "sms" | "auto";
}

/**
 * iMessage adapter (macOS only)
 */
export class IMessageAdapter implements FullAdapter {
  readonly platform = "imessage";

  private config?: IMessageConfig;
  private messageCallback?: (message: Message) => void;
  private capabilities: Capabilities;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("IMessageAdapter");
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
      interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false },
      discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
      management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as IMessageConfig;

    // iMessage requires AppleScript on macOS
    // This is a stub implementation
    this.logger.warn("iMessage adapter initialized in stub mode");
    this.logger.warn("Full implementation requires macOS and AppleScript automation");
  }

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    const phoneNumber = target.replace("user:", "").replace("tel:", "");

    // Use osascript to send iMessage (macOS only)
    const script = `
      tell application "Messages"
        send ${content.text ? "\"" + content.text.replace(/"/g, '\\"') + "\"" : ""} to buddy "${phoneNumber}"
      end tell
    `;

    try {
      const { execSync } = await import("child_process");
      execSync(`osascript -e '${script}'`, {
        stdio: "pipe",
      });
    } catch (error: any) {
      if (process.platform !== "darwin") {
        throw new Error("iMessage adapter requires macOS");
      }
      this.logger.warn("AppleScript execution failed", error);
    }

    return {
      platform: this.platform,
      messageId: Date.now().toString(),
      chatId: target,
      timestamp: Date.now(),
    };
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
    this.logger.warn("iMessage message receiving not implemented (requires macOS scripting)");
  }

  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  async destroy(): Promise<void> {
    this.messageCallback = undefined;
  }
}
