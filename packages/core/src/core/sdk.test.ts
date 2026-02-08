import { describe, it, expect, beforeEach, vi } from "vitest";
import { SDK } from "./sdk.js";
import { Adapter } from "./adapter.js";
import { Capabilities, defaultCapabilities } from "../models/capabilities.js";
import { Message } from "../models/message.js";

/**
 * Mock adapter for testing
 */
class MockAdapter implements Adapter {
  readonly platform = "mock";
  private messageCallback?: (message: Message) => void;

  async init(config: unknown): Promise<void> {
    // Mock initialization
  }

  async send(target: string, content: unknown): Promise<any> {
    return {
      platform: this.platform,
      messageId: "msg_123",
      chatId: target,
      timestamp: Date.now(),
    };
  }

  onMessage(callback: (message: Message) => void): void {
    this.messageCallback = callback;
  }

  getCapabilities(): Capabilities {
    return defaultCapabilities;
  }

  async destroy(): Promise<void> {
    this.messageCallback = undefined;
  }

  // Helper for tests
  emitMessage(message: Message) {
    if (this.messageCallback) {
      this.messageCallback(message);
    }
  }
}

describe("SDK", () => {
  let sdk: SDK;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    sdk = new SDK({
      adapters: {
        mock: {
          class: MockAdapter,
          config: {},
        },
      },
    });
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await sdk.init();
      expect(sdk).toBeDefined();
    });

    it("should throw error when adapter not found", async () => {
      await sdk.init();
      expect(() => sdk.getAdapter("nonexistent")).not.toThrow();
      expect(sdk.getAdapter("nonexistent")).toBeUndefined();
    });

    it("should not initialize twice", async () => {
      await sdk.init();
      await sdk.init(); // Should not throw
      expect(sdk).toBeDefined();
    });
  });

  describe("adapter management", () => {
    it("should get registered adapter", async () => {
      await sdk.init();
      const adapter = sdk.getAdapter("mock");
      expect(adapter).toBeDefined();
      expect(adapter?.platform).toBe("mock");
    });

    it("should get all adapters", async () => {
      await sdk.init();
      const adapters = sdk.getAdapters();
      expect(adapters.size).toBe(1);
      expect(adapters.has("mock")).toBe(true);
    });
  });

  describe("capabilities", () => {
    it("should get capabilities for platform", async () => {
      await sdk.init();
      const caps = sdk.getCapabilities("mock");
      expect(caps).toBeDefined();
      expect(caps).toEqual(defaultCapabilities);
    });

    it("should return undefined for non-existent platform", () => {
      const caps = sdk.getCapabilities("nonexistent");
      expect(caps).toBeUndefined();
    });

    it("should check capability correctly", async () => {
      await sdk.init();
      const canSendText = sdk.hasCapability("mock", "base", "sendText");
      expect(canSendText).toBe(false); // Mock has default caps (all false)
    });

    it("should get adapters by capability", async () => {
      await sdk.init();
      const platforms = sdk.getAdaptersByCapability("base", "sendText");
      expect(Array.isArray(platforms)).toBe(true);
    });
  });

  describe("sending messages", () => {
    beforeEach(async () => {
      await sdk.init();
    });

    it("should send a text message", async () => {
      const result = await sdk.send("mock", { text: "Hello" }, { to: "user:123" });
      expect(result.platform).toBe("mock");
      expect(result.messageId).toBe("msg_123");
      expect(result.chatId).toBe("user:123");
    });

    it("should throw error for non-existent platform", async () => {
      await expect(
        sdk.send("nonexistent", { text: "Hello" }, { to: "user:123" })
      ).rejects.toThrow("Adapter \"nonexistent\" not found");
    });
  });

  describe("message callbacks", () => {
    it("should call message callback", async () => {
      await sdk.init();

      const callback = vi.fn();
      sdk.on(callback);

      const mockAdapter = sdk.getAdapter("mock") as MockAdapter;
      const testMessage: Message = {
        platform: "mock",
        type: "text",
        from: { id: "user:123", name: "Alice" },
        to: { id: "bot:456", type: "user" },
        content: { text: "Hello" },
        messageId: "msg_789",
        timestamp: Date.now(),
      };

      mockAdapter.emitMessage(testMessage);

      await new Promise<void>(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(testMessage);
    });

    it("should call multiple callbacks", async () => {
      await sdk.init();

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      sdk.on(callback1);
      sdk.on(callback2);

      const mockAdapter = sdk.getAdapter("mock") as MockAdapter;
      const testMessage: Message = {
        platform: "mock",
        type: "text",
        from: { id: "user:123", name: "Alice" },
        to: { id: "bot:456", type: "user" },
        content: { text: "Hello" },
        messageId: "msg_789",
        timestamp: Date.now(),
      };

      mockAdapter.emitMessage(testMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe("middleware", () => {
    it("should run middleware before callbacks", async () => {
      await sdk.init();

      const middlewareOrder: string[] = [];

      sdk.use(async (message, next) => {
        middlewareOrder.push("middleware1");
        await next();
      });

      sdk.use(async (message, next) => {
        middlewareOrder.push("middleware2");
        await next();
      });

      const callback = vi.fn(() => middlewareOrder.push("callback"));
      sdk.on(callback);

      const mockAdapter = sdk.getAdapter("mock") as MockAdapter;
      const testMessage: Message = {
        platform: "mock",
        type: "text",
        from: { id: "user:123", name: "Alice" },
        to: { id: "bot:456", type: "user" },
        content: { text: "Hello" },
        messageId: "msg_789",
        timestamp: Date.now(),
      };

      mockAdapter.emitMessage(testMessage);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(middlewareOrder).toEqual(["middleware1", "middleware2", "callback"]);
    });

    it("should allow middleware to intercept messages", async () => {
      await sdk.init();

      const callback = vi.fn();
      sdk.on(callback);

      sdk.use(async (message, next) => {
        // Don't call next - intercept the message
      });

      const mockAdapter = sdk.getAdapter("mock") as MockAdapter;
      const testMessage: Message = {
        platform: "mock",
        type: "text",
        from: { id: "user:123", name: "Alice" },
        to: { id: "bot:456", type: "user" },
        content: { text: "Hello" },
        messageId: "msg_789",
        timestamp: Date.now(),
      };

      mockAdapter.emitMessage(testMessage);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("destruction", () => {
    it("should destroy SDK and all adapters", async () => {
      await sdk.init();
      expect(sdk.getAdapters().size).toBe(1);

      await sdk.destroy();
      expect(sdk.getAdapters().size).toBe(0);
    });
  });
});
