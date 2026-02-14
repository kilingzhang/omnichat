import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseAdapter } from "./base-adapter.js";
import type { AdapterConfig } from "./adapter.js";
import type { SendContent, SendOptions, SendResult } from "../models/message.js";
import type { Capabilities } from "../models/capabilities.js";
import { LogLevel } from "../utils/logger.js";
import { ConfigurationError } from "../errors/index.js";

// Create a concrete implementation for testing
class TestAdapter extends BaseAdapter {
  readonly platform = "test";
  protected capabilities: Capabilities = {
    base: { sendText: true, sendMedia: true, receive: true },
    conversation: { reply: true, edit: true, delete: true, threads: false, quote: false },
    interaction: { buttons: true, polls: false, reactions: true, stickers: false, effects: false },
    discovery: { history: false, search: false, pins: false, pinMessage: false, unpinMessage: false, memberInfo: false, memberCount: false, administrators: false, channelInfo: false },
    management: { kick: false, ban: false, mute: false, timeout: false, unban: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false, setChatTitle: false, setChatDescription: false },
    advanced: { inline: false, deepLinks: false, createInvite: false, getInvites: false, revokeInvite: false, miniApps: false, topics: false, batch: false, payments: false, games: false, videoChat: false, stories: false, customEmoji: false, webhooks: false, menuButton: false },
  };

  // Track initialization calls
  onInitCalled = false;
  onDestroyCalled = false;
  lastConfig?: AdapterConfig;

  async send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult> {
    this.requireInitialized();
    return {
      platform: this.platform,
      messageId: `${target}:123`,
      chatId: target,
      timestamp: Date.now(),
    };
  }

  protected override async onInit(config: AdapterConfig): Promise<void> {
    this.onInitCalled = true;
    this.lastConfig = config;
  }

  protected override async onDestroy(): Promise<void> {
    this.onDestroyCalled = true;
  }
}

describe("BaseAdapter", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe("initialization", () => {
    it("should start uninitialized", () => {
      expect(adapter["initialized"]).toBe(false);
    });

    it("should call onInit and set initialized", async () => {
      const config = { apiKey: "test-key" };
      await adapter.init(config);

      expect(adapter.onInitCalled).toBe(true);
      expect(adapter.lastConfig).toBe(config);
      expect(adapter["initialized"]).toBe(true);
    });

    it("should reinitialize if already initialized", async () => {
      const config1 = { apiKey: "key1" };
      const config2 = { apiKey: "key2" };

      await adapter.init(config1);
      expect(adapter.onDestroyCalled).toBe(false);

      await adapter.init(config2);
      expect(adapter.onDestroyCalled).toBe(true);
      expect(adapter.lastConfig).toBe(config2);
    });

    it("should throw error if onInit fails", async () => {
      class FailingAdapter extends TestAdapter {
        protected override async onInit(): Promise<void> {
          throw new Error("Init failed");
        }
      }

      const failingAdapter = new FailingAdapter();
      await expect(failingAdapter.init({})).rejects.toThrow("Init failed");
      expect(failingAdapter["initialized"]).toBe(false);
    });
  });

  describe("requireConfigKey", () => {
    it("should not throw if key exists", async () => {
      const config = { apiKey: "test" };
      await adapter.init(config);

      expect(() => adapter["requireConfigKey"](config, "apiKey")).not.toThrow();
    });

    it("should throw ConfigurationError if key is missing", async () => {
      const config = {};

      expect(() => adapter["requireConfigKey"](config, "apiKey")).toThrow(ConfigurationError);
    });

    it("should throw with custom message", async () => {
      const config = {};

      expect(() => adapter["requireConfigKey"](config, "apiKey", "Custom message")).toThrow("Custom message");
    });

    it("should throw if key is empty string", async () => {
      const config = { apiKey: "" };

      expect(() => adapter["requireConfigKey"](config, "apiKey")).toThrow(ConfigurationError);
    });

    it("should throw if key is null", async () => {
      const config = { apiKey: null };

      expect(() => adapter["requireConfigKey"](config, "apiKey")).toThrow(ConfigurationError);
    });
  });

  describe("requireInitialized", () => {
    it("should throw if not initialized", () => {
      expect(() => adapter["requireInitialized"]()).toThrow(ConfigurationError);
      expect(() => adapter["requireInitialized"]()).toThrow("has not been initialized");
    });

    it("should not throw if initialized", async () => {
      await adapter.init({});
      expect(() => adapter["requireInitialized"]()).not.toThrow();
    });
  });

  describe("send", () => {
    it("should throw if not initialized", async () => {
      await expect(adapter.send("target", { text: "hello" })).rejects.toThrow("has not been initialized");
    });

    it("should return SendResult if initialized", async () => {
      await adapter.init({});
      const result = await adapter.send("target", { text: "hello" });

      expect(result.platform).toBe("test");
      expect(result.messageId).toBe("target:123");
      expect(result.chatId).toBe("target");
    });
  });

  describe("destroy", () => {
    it("should do nothing if not initialized", async () => {
      await adapter.destroy();
      expect(adapter.onDestroyCalled).toBe(false);
    });

    it("should call onDestroy and clear state if initialized", async () => {
      await adapter.init({});
      await adapter.destroy();

      expect(adapter.onDestroyCalled).toBe(true);
      expect(adapter["initialized"]).toBe(false);
      expect(adapter["messageCallback"]).toBeUndefined();
    });
  });

  describe("onMessage", () => {
    it("should register callback", async () => {
      const callback = vi.fn();
      adapter.onMessage(callback);

      expect(adapter["messageCallback"]).toBe(callback);
    });
  });

  describe("invokeMessageCallback", () => {
    it("should call registered callback", async () => {
      const callback = vi.fn();
      adapter.onMessage(callback);

      const message = { platform: "test", type: "text" as const, from: { id: "1" }, to: { id: "2" }, content: { text: "hello" }, messageId: "1", timestamp: Date.now() };
      adapter["invokeMessageCallback"](message);

      expect(callback).toHaveBeenCalledWith(message);
    });

    it("should handle async callbacks", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      adapter.onMessage(callback);

      const message = { platform: "test", type: "text" as const, from: { id: "1" }, to: { id: "2" }, content: { text: "hello" }, messageId: "1", timestamp: Date.now() };
      adapter["invokeMessageCallback"](message);

      // Wait for async callback to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledWith(message);
    });

    it("should catch errors in sync callbacks", () => {
      const callback = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      adapter.onMessage(callback);

      const message = { platform: "test", type: "text" as const, from: { id: "1" }, to: { id: "2" }, content: { text: "hello" }, messageId: "1", timestamp: Date.now() };

      // Should not throw
      expect(() => adapter["invokeMessageCallback"](message)).not.toThrow();
    });

    it("should do nothing if no callback registered", () => {
      const message = { platform: "test", type: "text" as const, from: { id: "1" }, to: { id: "2" }, content: { text: "hello" }, messageId: "1", timestamp: Date.now() };

      expect(() => adapter["invokeMessageCallback"](message)).not.toThrow();
    });
  });

  describe("event handlers", () => {
    it("should register event handler", async () => {
      const emitter = {
        on: vi.fn(),
        off: vi.fn(),
      };
      const handler = vi.fn();

      adapter["registerEventHandler"](emitter, "test-event", handler);

      expect(emitter.on).toHaveBeenCalledWith("test-event", handler);
    });

    it("should remove all event handlers on destroy", async () => {
      const emitter = {
        on: vi.fn(),
        off: vi.fn(),
      };
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      adapter["registerEventHandler"](emitter, "event1", handler1);
      adapter["registerEventHandler"](emitter, "event2", handler2);

      await adapter.init({});
      await adapter.destroy();

      expect(emitter.off).toHaveBeenCalledWith("event1", handler1);
      expect(emitter.off).toHaveBeenCalledWith("event2", handler2);
    });

    it("should continue removing handlers even if one fails", async () => {
      const emitter1 = {
        on: vi.fn(),
        off: vi.fn().mockImplementation(() => {
          throw new Error("off failed");
        }),
      };
      const emitter2 = {
        on: vi.fn(),
        off: vi.fn(),
      };
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      adapter["registerEventHandler"](emitter1, "event1", handler1);
      adapter["registerEventHandler"](emitter2, "event2", handler2);

      await adapter.init({});
      await adapter.destroy();

      expect(emitter1.off).toHaveBeenCalled();
      expect(emitter2.off).toHaveBeenCalledWith("event2", handler2);
    });
  });

  describe("getCapabilities", () => {
    it("should return capabilities", () => {
      const caps = adapter.getCapabilities();
      expect(caps).toEqual(adapter["capabilities"]);
    });
  });

  describe("logger", () => {
    it("should use class name as logger prefix", () => {
      expect(adapter["logger"]).toBeDefined();
    });

    it("should accept custom log level", () => {
      const debugAdapter = new TestAdapter(LogLevel.DEBUG);
      expect(debugAdapter["logger"].getLevel()).toBe(LogLevel.DEBUG);
    });
  });
});
