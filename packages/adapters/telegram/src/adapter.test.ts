import { describe, it, expect, beforeEach, vi } from "vitest";
import { TelegramAdapter } from "./adapter.js";
import { Message } from "@omnichat/core";

describe("TelegramAdapter", () => {
  let adapter: TelegramAdapter;

  beforeEach(() => {
    adapter = new TelegramAdapter();
  });

  describe("initialization", () => {
    it("should have correct platform name", () => {
      expect(adapter.platform).toBe("telegram");
    });

    it("should fail initialization without API token", async () => {
      await expect(adapter.init({})).rejects.toThrow("Telegram API token is required");
    });

    it("should initialize with API token", async () => {
      // Mock the import to avoid needing the actual library
      vi.mock("node-telegram-bot-api", () => ({
        default: vi.fn().mockImplementation(() => ({
          on: vi.fn(),
          setWebHook: vi.fn(),
        })),
      }));

      await expect(
        adapter.init({
          apiToken: "test_token",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("capabilities", () => {
    it("should declare correct capabilities", () => {
      const caps = adapter.getCapabilities();

      // Base capabilities
      expect(caps.base.sendText).toBe(true);
      expect(caps.base.sendMedia).toBe(true);
      expect(caps.base.receive).toBe(true);

      // Conversation capabilities
      expect(caps.conversation.reply).toBe(true);
      expect(caps.conversation.edit).toBe(true);
      expect(caps.conversation.delete).toBe(true);
      expect(caps.conversation.threads).toBe(true);
      expect(caps.conversation.quote).toBe(true);

      // Interaction capabilities
      expect(caps.interaction.buttons).toBe(true);
      expect(caps.interaction.polls).toBe(false);
      expect(caps.interaction.reactions).toBe(true);
      expect(caps.interaction.stickers).toBe(true);
      expect(caps.interaction.effects).toBe(true);

      // Discovery capabilities
      expect(caps.discovery.history).toBe(false);
      expect(caps.discovery.search).toBe(false);
      expect(caps.discovery.pins).toBe(false);
      expect(caps.discovery.memberInfo).toBe(false);
      expect(caps.discovery.channelInfo).toBe(false);

      // Management capabilities
      expect(caps.management.kick).toBe(false);
      expect(caps.management.ban).toBe(false);
      expect(caps.management.timeout).toBe(false);
      expect(caps.management.channelCreate).toBe(false);
      expect(caps.management.channelEdit).toBe(false);
      expect(caps.management.channelDelete).toBe(false);
      expect(caps.management.permissions).toBe(false);
    });
  });

  describe("message mapping", () => {
    it("should map text message correctly", () => {
      const telegramMsg = {
        message_id: 123,
        date: 1704635200,
        from: { id: 456, first_name: "Alice", username: "alice" },
        chat: { id: 789, type: "private" },
        text: "Hello, world!",
      };

      // Create adapter instance and access private method via casting
      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.platform).toBe("telegram");
      expect(message.type).toBe("text");
      expect(message.from.id).toBe("456");
      expect(message.from.name).toBe("Alice");
      expect(message.from.username).toBe("alice");
      expect(message.to.id).toBe("789");
      expect(message.to.type).toBe("user");
      expect(message.content.text).toBe("Hello, world!");
      expect(message.messageId).toBe("789:123");
      expect(message.timestamp).toBe(1704635200000);
      expect(message.raw).toBe(telegramMsg);
    });

    it("should map photo message correctly", () => {
      const telegramMsg = {
        message_id: 124,
        date: 1704635200,
        from: { id: 456, first_name: "Alice" },
        chat: { id: 789, type: "private" },
        photo: [{ file_id: "photo_123" }, { file_id: "photo_456" }],
        caption: "Photo caption",
      };

      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.type).toBe("media");
      expect(message.content.mediaUrl).toBe("photo_456");
      expect(message.content.mediaType).toBe("image");
      expect(message.content.text).toBe("Photo caption");
    });

    it("should map sticker message correctly", () => {
      const telegramMsg = {
        message_id: 125,
        date: 1704635200,
        from: { id: 456, first_name: "Alice" },
        chat: { id: 789, type: "private" },
        sticker: { file_id: "sticker_123" },
      };

      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.type).toBe("sticker");
      expect(message.content.stickerId).toBe("sticker_123");
    });

    it("should map group chat message correctly", () => {
      const telegramMsg = {
        message_id: 126,
        date: 1704635200,
        from: { id: 456, first_name: "Alice" },
        chat: { id: -100123456789, type: "supergroup", title: "Test Group" },
        text: "Hello group!",
      };

      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.to.id).toBe("-100123456789");
      expect(message.to.type).toBe("group");
      expect(message.to.name).toBe("Test Group");
    });

    it("should map message with reply_to", () => {
      const telegramMsg = {
        message_id: 127,
        date: 1704635200,
        from: { id: 456, first_name: "Alice" },
        chat: { id: 789, type: "private" },
        text: "Reply to previous",
        reply_to_message: {
          message_id: 100,
          text: "Original message",
        },
      };

      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.replyTo).toBeDefined();
      expect(message.replyTo?.messageId).toBe("789:100");
      expect(message.replyTo?.text).toBe("Original message");
    });

    it("should map message with thread", () => {
      const telegramMsg = {
        message_id: 128,
        date: 1704635200,
        from: { id: 456, first_name: "Alice" },
        chat: { id: 789, type: "supergroup" },
        text: "Thread message",
        message_thread_id: 42,
      };

      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.thread).toBeDefined();
      expect(message.thread?.id).toBe(42);
    });

    it("should map callback query correctly", () => {
      const callbackQuery = {
        id: "callback_123",
        from: { id: 456, first_name: "Alice", username: "alice" },
        message: {
          message_id: 129,
          chat: { id: 789, type: "private" },
          text: "Original text",
        },
        data: "button_clicked",
      };

      const message = (adapter as any).mapCallbackQuery(callbackQuery);

      expect(message.platform).toBe("telegram");
      expect(message.type).toBe("callback");
      expect(message.from.id).toBe("456");
      expect(message.from.name).toBe("Alice");
      expect(message.from.username).toBe("alice");
      expect(message.content.text).toBe("[Callback: button_clicked]");
      expect(message.replyTo?.messageId).toBe("789:129");
      expect(message.replyTo?.text).toBe("Original text");
    });

    it("should handle full name with last name", () => {
      const telegramMsg = {
        message_id: 130,
        date: 1704635200,
        from: { id: 456, first_name: "Alice", last_name: "Johnson" },
        chat: { id: 789, type: "private" },
        text: "Full name test",
      };

      const message = (adapter as any).mapTelegramMessage(telegramMsg);

      expect(message.from.name).toBe("Alice Johnson");
    });
  });

  describe("message ID parsing", () => {
    it("should format message ID correctly", () => {
      expect("789:123").toMatch(/^\d+:\d+$/);
    });
  });

  describe("destroy", () => {
    it("should cleanup adapter resources", async () => {
      vi.mock("node-telegram-bot-api", () => ({
        default: vi.fn().mockImplementation(() => ({
          on: vi.fn(),
          stopPolling: vi.fn(),
        })),
      }));

      await adapter.init({ apiToken: "test" });
      await expect(adapter.destroy()).resolves.not.toThrow();
    });
  });
});
