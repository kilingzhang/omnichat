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

/**
 * WhatsApp adapter configuration
 */
export interface WhatsAppConfig extends AdapterConfig {
  sessionId: string;
  authPath?: string;
}

/**
 * WhatsApp adapter
 */
export class WhatsAppAdapter implements FullAdapter {
  readonly platform = "whatsapp";

  private client: any; // Baileys from @whiskeysockets/baileys
  private config?: WhatsAppConfig;
  private messageCallback?: (message: Message) => void;
  private capabilities: Capabilities;

  constructor() {
    this.capabilities = {
      base: { sendText: true, sendMedia: true, receive: true },
      conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
      interaction: { buttons: false, polls: true, reactions: false, stickers: false, effects: false },
      discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
      management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
    };
  }

  async init(config: AdapterConfig): Promise<void> {
    this.config = config as WhatsAppConfig;

    if (!this.config.sessionId) {
      throw new Error("WhatsApp session ID is required");
    }

    try {
      // Dynamically import baileys
      const { default: makeWASocket } = await import("@whiskeysockets/baileys");

      const sessionConfig: any = {
        auth: this.config.authPath ? { saveCreds: this.config.authPath } : undefined,
      };

      this.client = makeWASocket(sessionConfig);

      // Register message handler
      this.client.ev.on("messages.upsert", async (messages: any[]) => {
        for (const msg of messages) {
          if (!msg.key.fromMe) {
            const message = this.mapWhatsAppMessage(msg);
            if (this.messageCallback) {
              this.messageCallback(message);
            }
          }
        }
      });

      // Start the client
      await this.client.start();
    } catch (error: any) {
      if ((error as any).code === "MODULE_NOT_FOUND") {
        console.warn("@whiskeysockets/baileys not installed. Install with: npm install @whiskeysockets/baileys");
        console.warn("Creating mock adapter for development...");
        this.client = null;
      } else {
        throw error;
      }
    }
  }

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    if (!this.client) {
      throw new Error("WhatsApp client not initialized. Install @whiskeysockets/baileys.");
    }

    const jid = target.includes("@") ? target : `${target}@s.whatsapp.net`;

    const whatsappContent: any = {};

    if (content.text) {
      whatsappContent.text = content.text;
    }

    // WhatsApp supported media types with validation
    if (content.mediaUrl) {
      const validTypes = ['image', 'video', 'audio', 'document'];
      const mediaType = validTypes.includes(content.mediaType || '')
        ? content.mediaType || 'image'
        : 'image';

      switch (mediaType) {
        case 'image':
          whatsappContent.image = { url: content.mediaUrl };
          break;
        case 'video':
          whatsappContent.video = { url: content.mediaUrl };
          break;
        case 'audio':
          whatsappContent.audio = { url: content.mediaUrl };
          break;
        case 'document':
          whatsappContent.document = { url: content.mediaUrl };
          break;
        default:
          // Default to image for unsupported types
          whatsappContent.image = { url: content.mediaUrl };
          break;
      }
    }

    if (content.buttons && content.buttons.length > 0) {
      whatsappContent.buttons = content.buttons.map(row =>
        row.map(btn => ({
          buttonText: { displayText: btn.text },
          buttonId: btn.data,
        }))
      );
    }

    const result: any = await this.client.sendMessage(jid, whatsappContent);

    return {
      platform: this.platform,
      messageId: result.key.id,
      chatId: jid,
      timestamp: Date.now(),
    };
  }

  async sendPoll(target: string, poll: PollInput, options?: SendOptions): Promise<PollResult> {
    if (!this.client) {
      throw new Error("WhatsApp client not initialized");
    }

    const jid = target.includes("@") ? target : `${target}@s.whatsapp.net`;

    const pollData: any = {
      name: poll.question,
      values: poll.options,
      selectableCount: poll.multi ? poll.options.length : 1,
    };

    const result: any = await this.client.sendMessage(jid, {
      poll: pollData,
    });

    return {
      pollId: result.key.id,
      messageId: result.key.id,
      channel: jid,
    };
  }

  // Unsupported methods
  async reply(_toMessageId: string, _content: SendContent, _options?: SendOptions): Promise<SendResult> {
    throw new Error("WhatsApp reply not supported - use send() instead");
  }

  async edit(_messageId: string, _newText: string, _options?: SendOptions): Promise<void> {
    throw new Error("WhatsApp message editing not supported");
  }

  async delete(_messageId: string): Promise<void> {
    throw new Error("WhatsApp message deletion not supported");
  }

  async addReaction(_messageId: string, _emoji: string): Promise<void> {
    throw new Error("WhatsApp reactions not supported");
  }

  async removeReaction(_messageId: string, _emoji: string): Promise<void> {
    throw new Error("WhatsApp reactions not supported");
  }

  async sendSticker(_target: string, _stickerId: string, _options?: SendOptions): Promise<SendResult> {
    throw new Error("WhatsApp stickers not implemented yet");
  }

  async getHistory(_channel: string, _limit: number): Promise<Message[]> {
    throw new Error("WhatsApp history not implemented yet");
  }

  async search(_query: string, _options?: { channel?: string; limit?: number }): Promise<Message[]> {
    throw new Error("WhatsApp search not implemented yet");
  }

  async getPins(_channel: string): Promise<Message[]> {
    throw new Error("WhatsApp pins not supported");
  }

  async getMemberInfo(_userId: string): Promise<{
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    roles?: string[];
  }> {
    if (!this.client) {
      throw new Error("WhatsApp client not initialized");
    }

    const jid = _userId.includes("@") ? _userId : `${_userId}@s.whatsapp.net`;
    const user: any = await this.client.profilePictureUrl(jid);

    return {
      id: jid,
      name: jid.split("@")[0],
      username: undefined,
      avatar: user,
      roles: [],
    };
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
  }

  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.end();
    }
    this.client = null;
    this.messageCallback = undefined;
  }

  /**
   * Map WhatsApp message to unified format
   */
  private mapWhatsAppMessage(msg: any): Message {
    const fromJid = msg.key.remoteJid;
    const isGroup = fromJid.includes("@g.us") || fromJid.includes("@broadcast");

    const from: Participant = {
      id: fromJid,
      name: msg.pushName || fromJid.split("@")[0],
      username: undefined,
      avatar: undefined,
    };

    const to: Participant = {
      id: this.client.user?.id || "me",
      type: "user",
      name: this.client.user?.name || "Bot",
    };

    const content: MessageContent = {};

    if (msg.message?.conversation) {
      content.text = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage) {
      content.text = msg.message.extendedTextMessage.text;
    } else if (msg.message?.imageMessage) {
      content.mediaUrl = msg.message.imageMessage.url;
      content.mediaType = "image";
      if (msg.message.imageMessage.caption) {
        content.text = msg.message.imageMessage.caption;
      }
    } else if (msg.message?.videoMessage) {
      content.mediaUrl = msg.message.videoMessage.url;
      content.mediaType = "video";
    } else if (msg.message?.documentMessage) {
      content.mediaUrl = msg.message.documentMessage.url;
      content.mediaType = "file";
    } else if (msg.message?.buttonsResponseMessage) {
      content.text = `[Button: ${msg.message.buttonsResponseMessage.selectedButtonId}]`;
    } else if (msg.message?.pollCreationMessage) {
      const poll = msg.message.pollCreationMessage;
      content.text = `[Poll: ${poll.name}]`;
    }

    const replyTo: ReplyReference | undefined = msg.message?.extendedTextMessage?.contextInfo?.stanzaId
      ? {
          messageId: `${fromJid}:${msg.message.extendedTextMessage.contextInfo.stanzaId}`,
          text: undefined,
        }
      : undefined;

    return {
      platform: this.platform,
      type: msg.message?.imageMessage ? "media" : "text",
      from,
      to,
      content,
      replyTo,
      messageId: `${fromJid}:${msg.key.id}`,
      timestamp: msg.messageTimestamp * 1000,
      raw: msg,
    };
  }
}
