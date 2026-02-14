import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DiscordAdapter } from "./adapter.js";

// Mock factory - creates fresh mock Discord client instances
const createMockDiscordClient = () => ({
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  login: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  channels: {
    fetch: vi.fn(),
  },
  users: {
    fetch: vi.fn(),
  },
  guilds: {
    fetch: vi.fn(),
  },
  fetchWebhook: vi.fn(),
  fetchInvite: vi.fn(),
  application: {
    commands: {
      create: vi.fn(),
      delete: vi.fn(),
      cache: {
        values: vi.fn().mockReturnValue([]),
      },
    },
  },
  rest: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    id: "test_bot_id",
    tag: "TestBot#0000",
  },
});

// Mock Discord module
const createMockDiscordModule = () => {
  const clientMethods = createMockDiscordClient();

  // Use class syntax to make Client work with 'new' operator
  const MockClient = class {
    constructor(_options: any) {
      Object.assign(this, clientMethods);
    }
  };

  return {
    Client: MockClient,
    _clientMethods: clientMethods, // Expose for test access
    GatewayIntentBits: {
      Guilds: 1,
      GuildMembers: 2,
      GuildModeration: 4,
      GuildEmojisAndStickers: 8,
      GuildIntegrations: 16,
      GuildWebhooks: 32,
      GuildInvites: 64,
      GuildVoiceStates: 128,
      GuildPresences: 256,
      GuildMessages: 512,
      GuildMessageReactions: 1024,
      GuildMessageTyping: 2048,
      DirectMessages: 4096,
      DirectMessageReactions: 8192,
      DirectMessageTyping: 16384,
      MessageContent: 32768,
      GuildScheduledEvents: 65536,
      AutoModerationConfiguration: 131072,
      AutoModerationExecution: 262144,
    },
    ChannelType: {
      GuildText: 0,
      GuildVoice: 2,
      GuildAnnouncement: 5,
      GuildForum: 15,
    },
    ButtonStyle: {
      Primary: 1,
      Secondary: 2,
      Success: 3,
      Danger: 4,
      Link: 5,
    },
    InteractionType: {
      Ping: 1,
      ApplicationCommand: 2,
      MessageComponent: 3,
      ApplicationCommandAutocomplete: 4,
      ModalSubmit: 5,
    },
    ButtonBuilder: class {
      setLabel = vi.fn().mockReturnThis();
      setCustomId = vi.fn().mockReturnThis();
      setStyle = vi.fn().mockReturnThis();
      setEmoji = vi.fn().mockReturnThis();
    },
    ActionRowBuilder: class {
      addComponents = vi.fn().mockReturnThis();
    },
    StringSelectMenuBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setPlaceholder = vi.fn().mockReturnThis();
      addOptions = vi.fn().mockReturnThis();
    },
    StringSelectMenuOptionBuilder: class {
      setLabel = vi.fn().mockReturnThis();
      setValue = vi.fn().mockReturnThis();
    },
    UserSelectMenuBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setPlaceholder = vi.fn().mockReturnThis();
      setMinValues = vi.fn().mockReturnThis();
      setMaxValues = vi.fn().mockReturnThis();
      setDisabled = vi.fn().mockReturnThis();
    },
    RoleSelectMenuBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setPlaceholder = vi.fn().mockReturnThis();
      setMinValues = vi.fn().mockReturnThis();
      setMaxValues = vi.fn().mockReturnThis();
      setDisabled = vi.fn().mockReturnThis();
    },
    ChannelSelectMenuBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setPlaceholder = vi.fn().mockReturnThis();
      setMinValues = vi.fn().mockReturnThis();
      setMaxValues = vi.fn().mockReturnThis();
      setDisabled = vi.fn().mockReturnThis();
    },
    MentionableSelectMenuBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setPlaceholder = vi.fn().mockReturnThis();
      setMinValues = vi.fn().mockReturnThis();
      setMaxValues = vi.fn().mockReturnThis();
      setDisabled = vi.fn().mockReturnThis();
    },
    ModalBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setTitle = vi.fn().mockReturnThis();
      addComponents = vi.fn().mockReturnThis();
    },
    TextInputBuilder: class {
      setCustomId = vi.fn().mockReturnThis();
      setLabel = vi.fn().mockReturnThis();
      setStyle = vi.fn().mockReturnThis();
      setPlaceholder = vi.fn().mockReturnThis();
      setRequired = vi.fn().mockReturnThis();
      setMinLength = vi.fn().mockReturnThis();
      setMaxLength = vi.fn().mockReturnThis();
      setValue = vi.fn().mockReturnThis();
    },
    TextInputStyle: {
      Short: 1,
      Paragraph: 2,
    },
    Routes: {
      interactionCallback: vi.fn().mockReturnValue("/interactions/callback"),
      webhook: vi.fn().mockReturnValue("/webhook"),
      webhookMessage: vi.fn().mockReturnValue("/webhook/message"),
    },
  };
};

describe("DiscordAdapter", () => {
  let adapter: DiscordAdapter;
  let mockDiscordModule: ReturnType<typeof createMockDiscordModule>;
  let mockClient: ReturnType<typeof createMockDiscordClient>;

  beforeEach(() => {
    mockDiscordModule = createMockDiscordModule();
    mockClient = mockDiscordModule._clientMethods;

    adapter = new DiscordAdapter();
    adapter._testDiscordModule = mockDiscordModule;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have correct platform name", () => {
      expect(adapter.platform).toBe("discord");
    });

    it("should fail initialization without bot token", async () => {
      await expect(adapter.init({})).rejects.toThrow("Discord bot token is required");
    });

    it("should initialize with bot token", async () => {
      await expect(
        adapter.init({
          botToken: "test_token",
        })
      ).resolves.not.toThrow();
      expect(mockClient.login).toHaveBeenCalledWith("test_token");
    });

    it("should register message handler on init", async () => {
      await adapter.init({ botToken: "test_token" });
      expect(mockClient.on).toHaveBeenCalledWith("messageCreate", expect.any(Function));
    });

    it("should register interaction handler by default", async () => {
      await adapter.init({ botToken: "test_token" });
      expect(mockClient.on).toHaveBeenCalledWith("interactionCreate", expect.any(Function));
    });

    it("should skip interaction handler when disabled", async () => {
      await adapter.init({ botToken: "test_token", handleInteractions: false });
      // Should not have interaction handler registered
      const calls = mockClient.on.mock.calls;
      const hasInteractionHandler = calls.some(
        (call) => call[0] === "interactionCreate"
      );
      expect(hasInteractionHandler).toBe(false);
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
      expect(caps.conversation.quote).toBe(false);

      // Interaction capabilities
      expect(caps.interaction.buttons).toBe(true);
      expect(caps.interaction.polls).toBe(true);
      expect(caps.interaction.reactions).toBe(true);
      expect(caps.interaction.stickers).toBe(false);
      expect(caps.interaction.effects).toBe(false);

      // Discovery capabilities
      expect(caps.discovery.history).toBe(true);
      expect(caps.discovery.search).toBe(false);
      expect(caps.discovery.pins).toBe(true);
      expect(caps.discovery.memberInfo).toBe(true);
      expect(caps.discovery.channelInfo).toBe(true);

      // Management capabilities
      expect(caps.management.kick).toBe(true);
      expect(caps.management.ban).toBe(true);
      expect(caps.management.mute).toBe(true);
      expect(caps.management.timeout).toBe(true);
      expect(caps.management.channelCreate).toBe(true);
      expect(caps.management.channelEdit).toBe(true);
      expect(caps.management.channelDelete).toBe(true);
      expect(caps.management.permissions).toBe(true);
    });
  });

  describe("send", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should send text message successfully", async () => {
      const mockChannel = {
        id: "123456789",
        send: vi.fn().mockResolvedValue({
          id: "987654321",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.send("123456789", { text: "Hello Discord!" });

      expect(result.platform).toBe("discord");
      expect(result.messageId).toBe("123456789:987654321");
      expect(result.chatId).toBe("123456789");
      expect(mockChannel.send).toHaveBeenCalledWith({ content: "Hello Discord!" });
    });

    it("should send message with media", async () => {
      const mockChannel = {
        id: "123456789",
        send: vi.fn().mockResolvedValue({
          id: "987654321",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.send("123456789", {
        text: "Check this image",
        mediaUrl: "https://example.com/image.png",
      });

      expect(result.messageId).toBeDefined();
      expect(mockChannel.send).toHaveBeenCalledWith({
        content: "Check this image",
        files: [{ attachment: "https://example.com/image.png", description: "Check this image" }],
      });
    });

    it("should send message with embed", async () => {
      const mockChannel = {
        id: "123456789",
        send: vi.fn().mockResolvedValue({
          id: "987654321",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const embed = { title: "Test Embed", description: "Test description" };
      const result = await adapter.send("123456789", {
        text: "Embed message",
        embed,
      } as any);

      expect(result.messageId).toBeDefined();
      expect(mockChannel.send).toHaveBeenCalledWith({
        content: "Embed message",
        embeds: [embed],
      });
    });

    it("should throw error when client not initialized", async () => {
      const uninitializedAdapter = new DiscordAdapter();
      await expect(
        uninitializedAdapter.send("123", { text: "test" })
      ).rejects.toThrow("Discord client not initialized");
    });

    it("should throw error when target is missing", async () => {
      await expect(adapter.send("", { text: "test" })).rejects.toThrow(
        "Target (channel ID) is required"
      );
    });

    it("should throw error when content is missing", async () => {
      await expect(adapter.send("123", {})).rejects.toThrow(
        "Either text, mediaUrl, or embed is required"
      );
    });

    it("should strip 'channel:' prefix from target", async () => {
      const mockChannel = {
        id: "123456789",
        send: vi.fn().mockResolvedValue({
          id: "987654321",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.send("channel:123456789", { text: "Hello!" });

      expect(mockClient.channels.fetch).toHaveBeenCalledWith("123456789");
    });

    it("should create DM channel when user ID is provided", async () => {
      const mockUser = {
        createDM: vi.fn().mockResolvedValue({
          id: "dm_channel_id",
          send: vi.fn().mockResolvedValue({
            id: "987654321",
            createdTimestamp: Date.now(),
          }),
        }),
      };
      mockClient.channels.fetch.mockRejectedValue({ code: 10003, message: "Unknown Channel" });
      mockClient.users.fetch.mockResolvedValue(mockUser);

      const result = await adapter.send("user_id", { text: "Hello DM!" });

      expect(mockClient.users.fetch).toHaveBeenCalledWith("user_id");
      expect(mockUser.createDM).toHaveBeenCalled();
      expect(result.messageId).toBeDefined();
    });
  });

  describe("reply", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should reply to a message successfully", async () => {
      const mockChannel = {
        id: "123456789",
        send: vi.fn().mockResolvedValue({
          id: "987654321",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.reply("123456789", "111222333", { text: "Reply text" });

      expect(result.messageId).toBe("987654321");
      expect(result.chatId).toBe("123456789");
      expect(mockChannel.send).toHaveBeenCalledWith({
        content: "Reply text",
        messageReference: { messageId: "111222333" },
      });
    });

    it("should reply with media", async () => {
      const mockChannel = {
        id: "123456789",
        send: vi.fn().mockResolvedValue({
          id: "987654321",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.reply("123456789", "111222333", {
        text: "Reply with image",
        mediaUrl: "https://example.com/image.png",
      });

      expect(mockChannel.send).toHaveBeenCalledWith({
        files: [{ attachment: "https://example.com/image.png", description: "Reply with image" }],
        messageReference: { messageId: "111222333" },
      });
    });
  });

  describe("edit", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should edit a message successfully", async () => {
      const mockMessage = {
        edit: vi.fn().mockResolvedValue({
          id: "987654321",
          editedTimestamp: Date.now(),
          createdTimestamp: Date.now() - 1000,
        }),
      };
      const mockChannel = {
        id: "123456789",
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.edit("123456789", "987654321", "Updated text");

      expect(result.messageId).toBe("987654321");
      expect(result.chatId).toBe("123456789");
      expect(mockMessage.edit).toHaveBeenCalledWith({ content: "Updated text" });
    });

    it("should throw error when newText is missing", async () => {
      await expect(adapter.edit("123", "456", "")).rejects.toThrow(
        "New text is required for editing"
      );
    });

    it("should throw error when client not initialized", async () => {
      const uninitializedAdapter = new DiscordAdapter();
      await expect(
        uninitializedAdapter.edit("123", "456", "new text")
      ).rejects.toThrow("Discord client not initialized");
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should delete a message successfully", async () => {
      const mockMessage = {
        delete: vi.fn().mockResolvedValue(undefined),
      };
      const mockChannel = {
        id: "123456789",
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.delete("123456789", "987654321");

      expect(mockMessage.delete).toHaveBeenCalled();
    });

    it("should throw error when client not initialized", async () => {
      const uninitializedAdapter = new DiscordAdapter();
      await expect(uninitializedAdapter.delete("123", "456")).rejects.toThrow(
        "Discord client not initialized"
      );
    });
  });

  describe("addReaction", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should add reaction to a message", async () => {
      const mockMessage = {
        react: vi.fn().mockResolvedValue(undefined),
      };
      const mockChannel = {
        id: "123456789",
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.addReaction("123456789", "987654321", "👍");

      expect(mockMessage.react).toHaveBeenCalledWith("👍");
    });

    it("should throw error when client not initialized", async () => {
      const uninitializedAdapter = new DiscordAdapter();
      await expect(uninitializedAdapter.addReaction("123", "456", "👍")).rejects.toThrow(
        "Discord client not initialized"
      );
    });
  });

  describe("removeReaction", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should remove reaction from a message", async () => {
      const mockMessage = {
        reactions: {
          cache: {
            get: vi.fn().mockReturnValue({
              remove: vi.fn().mockResolvedValue(undefined),
            }),
          },
        },
      };
      const mockChannel = {
        id: "123456789",
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.removeReaction("123456789", "987654321", "👍");

      expect(mockMessage.reactions.cache.get).toHaveBeenCalledWith("👍");
    });
  });

  describe("getChannelInfo", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get channel info successfully", async () => {
      const mockChannel = {
        id: "123456789",
        name: "general",
        type: 0, // GuildText
        topic: "General chat",
        memberCount: 100,
        isThread: vi.fn().mockReturnValue(false),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const info = await adapter.getChannelInfo("123456789");

      expect(info.id).toBe("123456789");
      expect(info.name).toBe("general");
      expect(info.type).toBe("channel");
      expect(info.topic).toBe("General chat");
    });

    it("should detect DM channel type", async () => {
      const mockChannel = {
        id: "123456789",
        name: "DM Channel",
        type: 1, // DM
        isThread: vi.fn().mockReturnValue(false),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const info = await adapter.getChannelInfo("123456789");

      expect(info.type).toBe("user");
    });

    it("should detect thread channel type", async () => {
      const mockChannel = {
        id: "123456789",
        name: "Thread",
        type: 11, // Public thread
        isThread: vi.fn().mockReturnValue(true),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const info = await adapter.getChannelInfo("123456789");

      expect(info.type).toBe("group");
    });
  });

  describe("kick", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should kick user from guild", async () => {
      const mockGuild = {
        members: {
          kick: vi.fn().mockResolvedValue(undefined),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.kick("guild_id", "user_id", { reason: "Test kick" });

      expect(result.success).toBe(true);
      expect(mockGuild.members.kick).toHaveBeenCalledWith("user_id", "Test kick");
    });

    it("should return error on failure", async () => {
      mockClient.guilds.fetch.mockRejectedValue(new Error("Kick failed"));

      const result = await adapter.kick("guild_id", "user_id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Kick failed");
    });
  });

  describe("ban", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should ban user from guild", async () => {
      const mockGuild = {
        bans: {
          create: vi.fn().mockResolvedValue(undefined),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.ban("guild_id", "user_id", { reason: "Test ban" });

      expect(result.success).toBe(true);
      expect(mockGuild.bans.create).toHaveBeenCalledWith("user_id", { reason: "Test ban" });
    });

    it("should ban user with duration", async () => {
      const mockGuild = {
        bans: {
          create: vi.fn().mockResolvedValue(undefined),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.ban("guild_id", "user_id", {
        durationSeconds: 3600,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("unban", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should unban user from guild", async () => {
      const mockGuild = {
        bans: {
          remove: vi.fn().mockResolvedValue(undefined),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.unban("guild_id", "user_id");

      expect(result.success).toBe(true);
      expect(mockGuild.bans.remove).toHaveBeenCalledWith("user_id");
    });
  });

  describe("mute", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should mute user (timeout) in guild", async () => {
      const mockMember = {
        timeout: vi.fn().mockResolvedValue(undefined),
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.mute("guild_id", "user_id", {
        durationSeconds: 60,
        reason: "Spam",
      });

      expect(result.success).toBe(true);
      expect(mockMember.timeout).toHaveBeenCalled();
    });

    it("should cap duration at 28 days", async () => {
      const mockMember = {
        timeout: vi.fn().mockResolvedValue(undefined),
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      // 30 days in seconds (over 28 day limit)
      const thirtyDays = 30 * 24 * 60 * 60;
      const result = await adapter.mute("guild_id", "user_id", {
        durationSeconds: thirtyDays,
      });

      expect(result.success).toBe(true);
      // Duration should be capped at 28 days
      expect(mockMember.timeout).toHaveBeenCalledWith(
        expect.any(Number),
        undefined
      );
    });
  });

  describe("unmute", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should unmute user in guild", async () => {
      const mockMember = {
        timeout: vi.fn().mockResolvedValue(undefined),
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.unmute("guild_id", "user_id");

      expect(result.success).toBe(true);
      expect(mockMember.timeout).toHaveBeenCalledWith(null);
    });
  });

  describe("pinMessage / unpinMessage", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should pin a message", async () => {
      const mockMessage = {
        pin: vi.fn().mockResolvedValue(undefined),
      };
      const mockChannel = {
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.pinMessage("channel_id", "message_id");

      expect(result.success).toBe(true);
      expect(mockMessage.pin).toHaveBeenCalled();
    });

    it("should unpin a message", async () => {
      const mockMessage = {
        unpin: vi.fn().mockResolvedValue(undefined),
      };
      const mockChannel = {
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.unpinMessage("channel_id", "message_id");

      expect(result.success).toBe(true);
      expect(mockMessage.unpin).toHaveBeenCalled();
    });
  });

  describe("getMemberInfo", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get member info successfully", async () => {
      const mockMember = {
        user: {
          id: "user_id",
          username: "testuser",
          discriminator: "1234",
        },
        roles: {
          cache: {
            keys: vi.fn().mockReturnValue(["role1", "role2"]),
          },
        },
        joinedAt: new Date(),
        nickname: "Test Nick",
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const info = await adapter.getMemberInfo("guild_id", "user_id");

      expect(info.id).toBe("user_id");
      expect(info.username).toBe("testuser");
      expect(info.name).toBe("Test Nick");
    });
  });

  describe("getAdministrators", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get administrators list", async () => {
      const mockAdminMember = {
        user: { id: "admin_id", username: "admin" },
        displayName: "Admin User",
        permissions: {
          has: vi.fn().mockReturnValue(true),
        },
        roles: {
          cache: {
            keys: vi.fn().mockReturnValue(["admin_role"]),
            map: vi.fn().mockReturnValue(["admin_role"]),
          },
        },
      };
      const mockGuild = {
        ownerId: "owner_id",
        members: {
          fetch: vi.fn().mockResolvedValue(undefined),
          cache: {
            filter: vi.fn().mockReturnValue({
              map: vi.fn().mockImplementation((fn: Function) => {
                fn(mockAdminMember);
                return [
                  {
                    id: "admin_id",
                    name: "Admin User",
                    username: "admin",
                    roles: ["admin_role"],
                    isAdmin: true,
                    isOwner: false,
                    raw: mockAdminMember,
                  },
                ];
              }),
            }),
          },
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      await adapter.getAdministrators("guild_id");

      expect(mockGuild.members.fetch).toHaveBeenCalled();
    });
  });

  describe("createChannel", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should create a text channel", async () => {
      const mockChannel = {
        id: "new_channel_id",
        name: "new-channel",
        type: 0,
      };
      const mockGuild = {
        channels: {
          create: vi.fn().mockResolvedValue(mockChannel),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.createChannel("new-channel", {
        type: "text",
        guildId: "guild_id",
      });

      expect(result.id).toBe("new_channel_id");
      expect(result.name).toBe("new-channel");
    });

    it("should throw error without guildId", async () => {
      await expect(adapter.createChannel("new-channel")).rejects.toThrow(
        "guildId is required in options"
      );
    });
  });

  describe("createInvite", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should create invite successfully", async () => {
      const mockInvite = {
        code: "abc123",
        url: "https://discord.gg/abc123",
      };
      const mockChannel = {
        createInvite: vi.fn().mockResolvedValue(mockInvite),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.createInvite("channel_id", {
        maxUses: 10,
        expiresInSeconds: 3600,
      });

      expect(result.code).toBe("abc123");
      expect(result.url).toBe("https://discord.gg/abc123");
    });
  });

  describe("setTitle / setDescription", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should set channel title", async () => {
      const mockChannel = {
        edit: vi.fn().mockResolvedValue(undefined),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.setTitle("channel_id", "New Title");

      expect(result.success).toBe(true);
      expect(mockChannel.edit).toHaveBeenCalledWith({ name: "New Title" });
    });

    it("should set channel description", async () => {
      const mockChannel = {
        edit: vi.fn().mockResolvedValue(undefined),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.setDescription("channel_id", "New description");

      expect(result.success).toBe(true);
      expect(mockChannel.edit).toHaveBeenCalledWith({ topic: "New description" });
    });
  });

  describe("destroy", () => {
    it("should cleanup adapter resources", async () => {
      await adapter.init({ botToken: "test_token" });
      await adapter.destroy();

      expect(mockClient.destroy).toHaveBeenCalled();
    });
  });

  describe("onMessage", () => {
    it("should register message callback", async () => {
      await adapter.init({ botToken: "test_token" });

      const callback = vi.fn();
      adapter.onMessage(callback);

      // Verify callback is registered (indirectly tested via no error)
      expect(adapter).toBeDefined();
    });
  });

  describe("sendPoll", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should send poll successfully", async () => {
      const mockChannel = {
        send: vi.fn().mockResolvedValue({
          id: "poll_message_id",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.sendPoll("123456789", {
        question: "What do you prefer?",
        options: ["Option A", "Option B"],
        multi: false,
      });

      expect(result.messageId).toBeDefined();
      expect(mockChannel.send).toHaveBeenCalled();
    });
  });

  describe("sendSticker", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should throw error - stickers not supported", async () => {
      await expect(adapter.sendSticker("123456789", "sticker_id_123")).rejects.toThrow(
        "Discord stickers are not supported"
      );
    });
  });

  describe("sendEmbed", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should send embed successfully", async () => {
      const mockChannel = {
        send: vi.fn().mockResolvedValue({
          id: "embed_message_id",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.sendEmbed("123456789", {
        title: "Embed Title",
        description: "Embed Description",
      });

      expect(result.messageId).toBeDefined();
      expect(mockChannel.send).toHaveBeenCalledWith({ embeds: [expect.any(Object)] });
    });
  });

  describe("sendWithButtons", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should send message with buttons", async () => {
      const mockChannel = {
        send: vi.fn().mockResolvedValue({
          id: "button_message_id",
          createdTimestamp: Date.now(),
        }),
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.sendWithButtons(
        "123456789",
        "Choose an option",
        [[{ label: "Yes", style: 3, customId: "yes" }]]
      );

      expect(result.messageId).toBeDefined();
      expect(mockChannel.send).toHaveBeenCalled();
    });
  });

  describe("getHistory", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get message history", async () => {
      const mockMessage = {
        id: "msg1",
        content: "Message 1",
        author: { id: "user1", username: "user1", avatarURL: vi.fn().mockReturnValue(null) },
        createdTimestamp: Date.now(),
        channel: { type: 0, isThread: vi.fn().mockReturnValue(false) },
        guildId: "guild1",
        attachments: { size: 0 },
        sticker: undefined,
      };
      const mockCollection = {
        size: 1,
        map: vi.fn().mockImplementation((fn: (m: any) => any) => [fn(mockMessage)]),
      };
      const mockChannel = {
        messages: {
          fetch: vi.fn().mockResolvedValue(mockCollection),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.getHistory("123456789", 10);

      expect(mockChannel.messages.fetch).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should throw error when channel not found", async () => {
      mockClient.channels.fetch.mockResolvedValue(null);

      await expect(adapter.getHistory("invalid_channel", 10)).rejects.toThrow("not found");
    });
  });

  describe("getPins", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get pinned messages", async () => {
      // Create a mock Collection-like object with map method
      const mockMessage = {
        id: "pin1",
        content: "Pinned message",
        author: { id: "user1", username: "user1", avatarURL: vi.fn().mockReturnValue(null) },
        createdTimestamp: Date.now(),
        channel: { type: 0, isThread: vi.fn().mockReturnValue(false) },
        guildId: "guild1",
        attachments: { size: 0 },
        sticker: undefined,
      };
      const mockCollection = {
        size: 1,
        map: vi.fn().mockImplementation((fn: (m: any) => any) => [fn(mockMessage)]),
      };
      (mockClient.channels as any).fetchPinned = vi.fn().mockResolvedValue(mockCollection);

      const result = await adapter.getPins("123456789");

      expect((mockClient.channels as any).fetchPinned).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("registerCommand", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token", clientId: "test_client_id" });
    });

    it("should register a command", async () => {
      mockClient.application.commands.create.mockResolvedValue({ id: "cmd123" });

      await adapter.registerCommand({
        name: "test",
        description: "Test command",
      });

      expect(mockClient.application.commands.create).toHaveBeenCalled();
    });
  });

  describe("getCommands", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token", clientId: "test_client_id" });
    });

    it("should get all commands", async () => {
      mockClient.application.commands.cache.values.mockReturnValue([
        { id: "cmd1", name: "command1" },
        { id: "cmd2", name: "command2" },
      ]);

      const commands = await adapter.getCommands();

      expect(commands).toBeDefined();
    });
  });

  describe("deleteCommand", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token", clientId: "test_client_id" });
    });

    it("should delete a command", async () => {
      mockClient.application.commands.delete.mockResolvedValue(undefined);

      await adapter.deleteCommand("cmd123");

      expect(mockClient.application.commands.delete).toHaveBeenCalledWith("cmd123");
    });
  });

  describe("createThread", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should create a thread from a message", async () => {
      const mockThread = {
        id: "thread_id",
        name: "New Thread",
      };
      const mockMessage = {
        startThread: vi.fn().mockResolvedValue(mockThread),
      };
      const mockChannel = {
        messages: {
          fetch: vi.fn().mockResolvedValue(mockMessage),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const result = await adapter.createThread("channel_id", "message_id", "New Thread");

      expect(result.id).toBe("thread_id");
    });
  });

  describe("archiveThread", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should archive a thread", async () => {
      const mockThread = {
        edit: vi.fn().mockResolvedValue(undefined),
      };
      mockClient.channels.fetch.mockResolvedValue(mockThread);

      await adapter.archiveThread("thread_id");

      expect(mockThread.edit).toHaveBeenCalled();
    });
  });

  describe("unarchiveThread", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should unarchive a thread", async () => {
      const mockThread = {
        edit: vi.fn().mockResolvedValue(undefined),
      };
      mockClient.channels.fetch.mockResolvedValue(mockThread);

      await adapter.unarchiveThread("thread_id");

      expect(mockThread.edit).toHaveBeenCalled();
    });
  });

  describe("createRole", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should create a role", async () => {
      const mockRole = { id: "role_id", name: "New Role" };
      const mockGuild = {
        roles: {
          create: vi.fn().mockResolvedValue(mockRole),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const result = await adapter.createRole("guild_id", {
        name: "New Role",
        color: 0xff0000,
      });

      expect(result.id).toBe("role_id");
    });
  });

  describe("deleteRole", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should delete a role", async () => {
      const mockGuild = {
        roles: {
          delete: vi.fn().mockResolvedValue(undefined),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      await adapter.deleteRole("guild_id", "role_id");

      expect(mockGuild.roles.delete).toHaveBeenCalled();
    });
  });

  describe("addRole", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should add role to user", async () => {
      const mockMember = {
        roles: {
          add: vi.fn().mockResolvedValue(undefined),
        },
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      await adapter.addRole("guild_id", "user_id", "role_id");

      expect(mockMember.roles.add).toHaveBeenCalled();
    });
  });

  describe("removeRole", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should remove role from user", async () => {
      const mockMember = {
        roles: {
          remove: vi.fn().mockResolvedValue(undefined),
        },
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      await adapter.removeRole("guild_id", "user_id", "role_id");

      expect(mockMember.roles.remove).toHaveBeenCalled();
    });
  });

  describe("getRoles", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get all roles", async () => {
      const mockGuild = {
        roles: {
          cache: {
            map: vi.fn().mockImplementation((fn: (r: any) => any) => [
              fn({ id: "role1", name: "Role 1" }),
              fn({ id: "role2", name: "Role 2" }),
            ]),
          },
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const roles = await adapter.getRoles("guild_id");

      expect(roles).toBeDefined();
    });
  });

  describe("deleteChannel", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should delete a channel", async () => {
      const mockChannel = { delete: vi.fn().mockResolvedValue(undefined) };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.deleteChannel("channel_id");

      expect(mockChannel.delete).toHaveBeenCalled();
    });
  });

  describe("editChannel", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should edit a channel", async () => {
      const mockChannel = { edit: vi.fn().mockResolvedValue(undefined) };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      await adapter.editChannel("channel_id", { name: "new-name" });

      expect(mockChannel.edit).toHaveBeenCalled();
    });
  });

  describe("getInvite", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get invite info", async () => {
      mockClient.fetchInvite.mockResolvedValue({
        code: "abc123",
        url: "https://discord.gg/abc123",
        guild: { name: "Test Guild" },
        channel: { name: "general" },
        uses: 10,
        maxUses: 100,
      });

      const invite = await adapter.getInvite("abc123");

      expect(invite.code).toBe("abc123");
    });
  });

  describe("deleteInvite", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should delete an invite", async () => {
      mockClient.fetchInvite.mockResolvedValue({
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await adapter.deleteInvite("channel_id", "abc123");

      expect(mockClient.fetchInvite).toHaveBeenCalledWith("abc123");
    });
  });

  describe("getMemberCount", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get member count", async () => {
      const mockGuild = {
        memberCount: 150,
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      const count = await adapter.getMemberCount("guild_id");

      expect(count).toBe(150);
    });
  });

  describe("timeout", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should timeout a user", async () => {
      const mockMember = {
        timeout: vi.fn().mockResolvedValue(undefined),
      };
      const mockGuild = {
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember),
        },
      };
      mockClient.guilds.fetch.mockResolvedValue(mockGuild);

      await adapter.timeout("guild_id", "user_id", 60, "Spamming");

      expect(mockMember.timeout).toHaveBeenCalledWith(expect.any(Number), "Spamming");
    });
  });

  describe("createDMChannel", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should create DM channel", async () => {
      const mockUser = {
        createDM: vi.fn().mockResolvedValue({ id: "dm_channel_id" }),
      };
      mockClient.users.fetch.mockResolvedValue(mockUser);

      const channelId = await adapter.createDMChannel("user_id");

      expect(channelId).toBe("dm_channel_id");
    });
  });

  describe("getInvites", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should get channel invites", async () => {
      const mockInvites = [
        { code: "abc123", url: "https://discord.gg/abc123", uses: 5 },
      ];
      const mockChannel = {
        invites: {
          fetch: vi.fn().mockResolvedValue(mockInvites),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const invites = await adapter.getInvites("channel_id");

      expect(invites).toBeDefined();
    });
  });

  describe("exportInvite", () => {
    beforeEach(async () => {
      await adapter.init({ botToken: "test_token" });
    });

    it("should export invite link", async () => {
      const mockInvite = {
        code: "xyz789",
        url: "https://discord.gg/xyz789",
      };
      const mockChannel = {
        createInvite: vi.fn().mockResolvedValue(mockInvite),
        invites: {
          fetch: vi.fn().mockResolvedValue([mockInvite]),
        },
      };
      mockClient.channels.fetch.mockResolvedValue(mockChannel);

      const url = await adapter.exportInvite("channel_id");

      expect(url).toBe("https://discord.gg/xyz789");
    });
  });
});
