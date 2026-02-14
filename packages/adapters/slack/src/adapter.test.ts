import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SlackAdapter } from "./adapter.js";

// Mock factory - creates fresh mock Slack client instances
const createMockSlackClient = () => ({
  auth: {
    test: vi.fn().mockResolvedValue({ team: "Test Team", user: "TestBot" }),
  },
  chat: {
    postMessage: vi.fn().mockResolvedValue({ ts: "1234567890.123456", ok: true }),
    update: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  },
  conversations: {
    history: vi.fn().mockResolvedValue({ messages: [], ok: true }),
    info: vi.fn().mockResolvedValue({
      channel: { id: "C123", name: "general", is_im: false, is_mpim: false },
      ok: true,
    }),
    kick: vi.fn().mockResolvedValue({ ok: true }),
  },
  reactions: {
    add: vi.fn().mockResolvedValue({ ok: true }),
    remove: vi.fn().mockResolvedValue({ ok: true }),
  },
  pins: {
    list: vi.fn().mockResolvedValue({ items: [], ok: true }),
  },
  users: {
    info: vi.fn().mockResolvedValue({
      user: { id: "U123", name: "testuser", real_name: "Test User" },
      ok: true,
    }),
  },
  search: {
    messages: vi.fn().mockResolvedValue({ messages: { matches: [] }, ok: true }),
  },
  files: {
    upload: vi.fn().mockResolvedValue({
      file: { id: "F123", created: Date.now() / 1000 },
      ok: true,
    }),
  },
});

// Mock Slack module
const createMockSlackModule = () => {
  const clientMethods = createMockSlackClient();

  // Use class syntax to make WebClient work with 'new' operator
  const MockWebClient = class {
    constructor(_token: string) {
      Object.assign(this, clientMethods);
    }
  };

  return {
    WebClient: MockWebClient,
    _clientMethods: clientMethods, // Expose for test access
  };
};

describe("SlackAdapter", () => {
  let adapter: SlackAdapter;
  let mockClientMethods: ReturnType<typeof createMockSlackClient>;
  let mockModule: ReturnType<typeof createMockSlackModule>;

  beforeEach(() => {
    // Create fresh mock instance for each test
    mockModule = createMockSlackModule();
    mockClientMethods = mockModule._clientMethods;

    // Create adapter with mock module injected
    adapter = new SlackAdapter();
    (adapter as any)._testSlackModule = mockModule;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have correct platform name", () => {
      expect(adapter.platform).toBe("slack");
    });

    it("should initialize successfully with valid config", async () => {
      // Mock the dynamic import
      vi.spyOn(adapter as any, "_testSlackModule", "get").mockReturnValue(mockModule);

      await adapter.init({ botToken: "xoxb-test-token" });
      expect(adapter.getCapabilities()).toBeDefined();
    });

    it("should throw error if botToken is missing", async () => {
      await expect(adapter.init({})).rejects.toThrow("Slack bot token is required");
    });
  });

  describe("send", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.send("C123", { text: "hello" })).rejects.toThrow("not initialized");
    });
  });

  describe("reply", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.reply("C123:1234567890.123456", { text: "reply" })).rejects.toThrow();
    });
  });

  describe("edit", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.edit("C123:1234567890.123456", "new text")).rejects.toThrow("not initialized");
    });
  });

  describe("delete", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.delete("C123:1234567890.123456")).rejects.toThrow("not initialized");
    });
  });

  describe("sendButtons", () => {
    it("should throw error if not initialized", async () => {
      await expect(
        adapter.sendButtons("C123", "Choose:", [[{ text: "A", data: "a" }]])
      ).rejects.toThrow("not initialized");
    });
  });

  describe("sendPoll", () => {
    it("should throw error (Slack doesn't support native polls)", async () => {
      await expect(
        adapter.sendPoll("C123", { question: "Q?", options: ["A", "B"] })
      ).rejects.toThrow("Slack does not have native polls");
    });
  });

  describe("addReaction", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.addReaction("C123:1234567890.123456", "thumbsup")).rejects.toThrow("not initialized");
    });
  });

  describe("removeReaction", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.removeReaction("C123:1234567890.123456", "thumbsup")).rejects.toThrow("not initialized");
    });
  });

  describe("getHistory", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.getHistory("C123", 10)).rejects.toThrow("not initialized");
    });
  });

  describe("search", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.search("query")).rejects.toThrow("not initialized");
    });
  });

  describe("getPins", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.getPins("C123")).rejects.toThrow("not initialized");
    });
  });

  describe("getMemberInfo", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.getMemberInfo("U123")).rejects.toThrow("not initialized");
    });
  });

  describe("getChannelInfo", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.getChannelInfo("C123")).rejects.toThrow("not initialized");
    });
  });

  describe("kick", () => {
    it("should throw error if not initialized", async () => {
      await expect(adapter.kick("C123", "U123")).rejects.toThrow("not initialized");
    });
  });

  describe("onMessage", () => {
    it("should register message callback", () => {
      const callback = vi.fn();
      adapter.onMessage(callback);
      expect((adapter as any).messageCallback).toBe(callback);
    });
  });

  describe("getCapabilities", () => {
    it("should return capabilities object", () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.base).toBeDefined();
      expect(capabilities.base.sendText).toBe(true);
      expect(capabilities.base.sendMedia).toBe(true);
      expect(capabilities.base.receive).toBe(true);
    });

    it("should support threads", () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.conversation?.threads).toBe(true);
    });

    it("should support reactions", () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.interaction?.reactions).toBe(true);
    });

    it("should support history and search", () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities.discovery?.history).toBe(true);
      expect(capabilities.discovery?.search).toBe(true);
    });
  });

  describe("destroy", () => {
    it("should cleanup resources", async () => {
      // Mock the dynamic import
      vi.spyOn(adapter as any, "_testSlackModule", "get").mockReturnValue(mockModule);

      await adapter.init({ botToken: "xoxb-test-token" });
      await adapter.destroy();

      expect((adapter as any).client).toBeNull();
      expect((adapter as any).messageCallback).toBeUndefined();
    });
  });
});
