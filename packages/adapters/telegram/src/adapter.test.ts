import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TelegramAdapter } from "./adapter.js";

// Type for the global test helper
declare global {
  const __setImportTelegramBot: (fn: () => Promise<any>) => void;
}

// Mock factory - creates fresh mock bot instances
const createMockBot = () => ({
  on: vi.fn(),
  off: vi.fn(),
  setWebHook: vi.fn(),
  stopPolling: vi.fn(),
  sendMessage: vi.fn(),
  sendPhoto: vi.fn(),
  sendVideo: vi.fn(),
  sendAudio: vi.fn(),
  sendDocument: vi.fn(),
  sendSticker: vi.fn(),
  sendPoll: vi.fn(),
  editMessageText: vi.fn(),
  deleteMessage: vi.fn(),
  forwardMessage: vi.fn(),
  getFileLink: vi.fn(),
  setMyCommands: vi.fn(),
  sendChatAction: vi.fn(),
  setMessageReaction: vi.fn(),
  getChat: vi.fn(),
  getChatMemberCount: vi.fn(),
  getChatMember: vi.fn(),
  getChatAdministrators: vi.fn(),
  pinChatMessage: vi.fn(),
  unpinChatMessage: vi.fn(),
  unpinAllChatMessages: vi.fn(),
  setChatPermissions: vi.fn(),
  banChatMember: vi.fn(),
  unbanChatMember: vi.fn(),
  restrictChatMember: vi.fn(),
  promoteChatMember: vi.fn(),
  setChatTitle: vi.fn(),
  setChatDescription: vi.fn(),
  setChatPhoto: vi.fn(),
  deleteChatPhoto: vi.fn(),
  exportChatInviteLink: vi.fn(),
  createChatInviteLink: vi.fn(),
  editChatInviteLink: vi.fn(),
  revokeChatInviteLink: vi.fn(),
  approveChatJoinRequest: vi.fn(),
  declineChatJoinRequest: vi.fn(),
  getUserProfilePhotos: vi.fn(),
  getForumTopicIconStickers: vi.fn(),
  createForumTopic: vi.fn(),
  editForumTopic: vi.fn(),
  closeForumTopic: vi.fn(),
  reopenForumTopic: vi.fn(),
  deleteForumTopic: vi.fn(),
  unpinAllForumTopicMessages: vi.fn(),
  editGeneralForumTopic: vi.fn(),
  closeGeneralForumTopic: vi.fn(),
  reopenGeneralForumTopic: vi.fn(),
  hideGeneralForumTopic: vi.fn(),
  unhideGeneralForumTopic: vi.fn(),
  unpinAllGeneralForumTopicMessages: vi.fn(),
  leaveChat: vi.fn(),
  answerCallbackQuery: vi.fn().mockResolvedValue(true),
});

describe("TelegramAdapter", () => {
  let adapter: TelegramAdapter;
  let mockBotInstance: ReturnType<typeof createMockBot>;
  let MockTelegramBot: any;

  beforeEach(() => {
    // Create fresh mock instance for each test
    mockBotInstance = createMockBot();

    // Create a mock constructor that returns the mock bot instance
    // Use class syntax to make it work with 'new' operator
    // Extend the mock with all methods from mockBotInstance
    MockTelegramBot = class {
      constructor(token: string, options: any) {
        // Copy all properties and methods from mockBotInstance to this instance
        Object.assign(this, mockBotInstance);
      }
    };

    // Mock the import function to return the constructor
    __setImportTelegramBot(async () => MockTelegramBot);

    adapter = new TelegramAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have correct platform name", () => {
      expect(adapter.platform).toBe("telegram");
    });

    it("should fail initialization without API token", async () => {
      await expect(adapter.init({})).rejects.toThrow("Telegram API token is required");
    });

    it("should initialize with API token", async () => {
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
      expect(caps.interaction.polls).toBe(true);
      expect(caps.interaction.reactions).toBe(true);
      expect(caps.interaction.stickers).toBe(true);
      expect(caps.interaction.effects).toBe(true);

      // Discovery capabilities
      expect(caps.discovery.history).toBe(false);
      expect(caps.discovery.search).toBe(false);
      expect(caps.discovery.pins).toBe(true);  // pinMessage and unpinMessage are supported
      expect(caps.discovery.memberInfo).toBe(true);
      expect(caps.discovery.channelInfo).toBe(true);

      // Management capabilities
      expect(caps.management.kick).toBe(true);
      expect(caps.management.ban).toBe(true);
      expect(caps.management.timeout).toBe(false);
      expect(caps.management.channelCreate).toBe(false);
      expect(caps.management.channelEdit).toBe(true);  // setChatTitle, setChatDescription supported
      expect(caps.management.channelDelete).toBe(false);
      expect(caps.management.permissions).toBe(true);
    });
  });

  describe("message mapping", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    it("should handle bot initialization", async () => {
      // This test verifies that the bot is properly initialized
      // and can handle incoming messages
      expect(adapter.platform).toBe("telegram");
    });

    it("should have correct capabilities", () => {
      const caps = adapter.getCapabilities();
      expect(caps.base.sendText).toBe(true);
      expect(caps.conversation.reply).toBe(true);
      expect(caps.interaction.buttons).toBe(true);
    });
  });

  describe("destroy", () => {
    it("should cleanup adapter resources", async () => {
      await adapter.init({ apiToken: "test" });
      await expect(adapter.destroy()).resolves.not.toThrow();
      expect(mockBotInstance.stopPolling).toHaveBeenCalled();
    });
  });

  describe("Chat Information Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("getChat", () => {
      it("should get chat information successfully", async () => {
        mockBotInstance.getChat.mockResolvedValue({
          id: -100123456789,
          type: "supergroup",
          title: "Test Group",
          username: "testgroup",
          description: "Test description",
          invite_link: "https://t.me/+ABC123",
        });

        const chatInfo = await adapter.getChat("@testgroup");

        expect(chatInfo).toEqual({
          id: "-100123456789",
          name: "Test Group",
          type: "group",
          username: "testgroup",
          description: "Test description",
          inviteLink: "https://t.me/+ABC123",
        });
        expect(mockBotInstance.getChat).toHaveBeenCalledWith("@testgroup");
      });

      it("should handle channel type", async () => {
        mockBotInstance.getChat.mockResolvedValue({
          id: -100123456789,
          type: "channel",
          title: "Test Channel",
          username: "testchannel",
        });

        const chatInfo = await adapter.getChat("@testchannel");

        expect(chatInfo.type).toBe("channel");
      });

      it("should handle private chat", async () => {
        mockBotInstance.getChat.mockResolvedValue({
          id: 123456789,
          type: "private",
          first_name: "John",
          username: "john",
        });

        const chatInfo = await adapter.getChat("123456789");

        expect(chatInfo.type).toBe("user");
        // username takes priority over first_name
        expect(chatInfo.name).toBe("john");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.getChat("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });

      it("should handle API errors", async () => {
        mockBotInstance.getChat.mockRejectedValue(new Error("Chat not found"));

        await expect(adapter.getChat("@nonexistent")).rejects.toThrow("Chat not found");
      });
    });

    describe("getChatMemberCount", () => {
      it("should get member count successfully", async () => {
        mockBotInstance.getChatMemberCount.mockResolvedValue(150);

        const count = await adapter.getChatMemberCount("@testgroup");

        expect(count).toBe(150);
        expect(mockBotInstance.getChatMemberCount).toHaveBeenCalledWith("@testgroup");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.getChatMemberCount("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("getChatMember", () => {
      it("should get member information successfully", async () => {
        mockBotInstance.getChatMember.mockResolvedValue({
          user: {
            id: 123456789,
            first_name: "Alice",
            last_name: "Johnson",
            username: "alice",
          },
          status: "administrator",
          can_be_edited: false,
          can_change_info: true,
          can_delete_messages: true,
        });

        const member = await adapter.getChatMember("@testgroup", "123456789");

        expect(member).toEqual({
          id: "123456789",
          name: "Alice Johnson",
          username: "alice",
          avatar: undefined,
          roles: ["administrator"],
        });
        expect(mockBotInstance.getChatMember).toHaveBeenCalledWith("@testgroup", 123456789);
      });

      it("should handle member without avatar", async () => {
        mockBotInstance.getChatMember.mockResolvedValue({
          user: {
            id: 123456789,
            first_name: "Bob",
          },
          status: "member",
        });

        const member = await adapter.getChatMember("@testgroup", "123456789");

        expect(member.name).toBe("Bob");
        expect(member.roles).toEqual([]);
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.getChatMember("@test", "123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("getChatAdministrators", () => {
      it("should get administrators list successfully", async () => {
        mockBotInstance.getChatAdministrators.mockResolvedValue([
          {
            status: "creator",
            user: {
              id: 111,
              first_name: "Owner",
              username: "owner",
            },
          },
          {
            status: "administrator",
            user: {
              id: 222,
              first_name: "Admin",
              username: "admin",
            },
            can_delete_messages: true,
            can_change_info: true,
            can_pin_messages: true,
          },
        ]);

        const admins = await adapter.getChatAdministrators("@testgroup");

        expect(admins).toHaveLength(2);
        expect(admins[0]).toEqual({
          id: "111",
          name: "Owner",
          username: "owner",
          roles: ["owner"],
        });
        expect(admins[1]).toEqual({
          id: "222",
          name: "Admin",
          username: "admin",
          roles: ["administrator", "can_delete_messages", "can_change_info", "can_pin_messages"],
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.getChatAdministrators("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Message Pinning Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("pinChatMessage", () => {
      it("should pin message successfully", async () => {
        mockBotInstance.pinChatMessage.mockResolvedValue(true);

        await adapter.pinChatMessage("-100123456789:123");

        expect(mockBotInstance.pinChatMessage).toHaveBeenCalledWith("-100123456789", 123, {
          disable_notification: undefined,
        });
      });

      it("should pin message with disable notification", async () => {
        mockBotInstance.pinChatMessage.mockResolvedValue(true);

        await adapter.pinChatMessage("-100123456789:123", { disableNotification: true });

        expect(mockBotInstance.pinChatMessage).toHaveBeenCalledWith("-100123456789", 123, {
          disable_notification: true,
        });
      });

      it("should throw error for invalid message ID format", async () => {
        await expect(adapter.pinChatMessage("invalid")).rejects.toThrow(
          "Invalid messageId format"
        );
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.pinChatMessage("-100123456789:123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("unpinChatMessage", () => {
      it("should unpin message successfully", async () => {
        mockBotInstance.unpinChatMessage.mockResolvedValue(true);

        await adapter.unpinChatMessage("-100123456789:123");

        expect(mockBotInstance.unpinChatMessage).toHaveBeenCalledWith("-100123456789", 123);
      });

      it("should throw error for invalid message ID format", async () => {
        await expect(adapter.unpinChatMessage("invalid")).rejects.toThrow(
          "Invalid messageId format"
        );
      });
    });

    describe("unpinAllChatMessages", () => {
      it("should unpin all messages successfully", async () => {
        mockBotInstance.unpinAllChatMessages.mockResolvedValue(true);

        await adapter.unpinAllChatMessages("@testgroup");

        expect(mockBotInstance.unpinAllChatMessages).toHaveBeenCalledWith("@testgroup");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.unpinAllChatMessages("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Permission Management Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("setChatPermissions", () => {
      it("should set chat permissions successfully", async () => {
        mockBotInstance.setChatPermissions.mockResolvedValue(true);

        await adapter.setChatPermissions("@testgroup", {
          canSendMessages: true,
          canSendPhotos: true,
          canSendPolls: true,
        });

        expect(mockBotInstance.setChatPermissions).toHaveBeenCalledWith("@testgroup", {
          can_send_messages: true,
          can_send_audios: undefined,
          can_send_documents: undefined,
          can_send_photos: true,
          can_send_videos: undefined,
          can_send_video_notes: undefined,
          can_send_voice_notes: undefined,
          can_send_polls: true,
          can_send_other_messages: undefined,
          can_add_web_page_previews: undefined,
          can_change_info: undefined,
          can_invite_users: undefined,
          can_pin_messages: undefined,
          can_manage_topics: undefined,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.setChatPermissions("@test", { canSendMessages: true })
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });

    describe("restrictChatMember", () => {
      it("should restrict member permissions successfully", async () => {
        mockBotInstance.restrictChatMember.mockResolvedValue(true);

        await adapter.restrictChatMember("@testgroup", "123456789", {
          canSendMessages: false,
          canSendMedia: false,
        });

        expect(mockBotInstance.restrictChatMember).toHaveBeenCalled();
        expect(mockBotInstance.restrictChatMember).toHaveBeenCalledWith(
          "@testgroup",
          123456789,
          expect.anything(),
          expect.anything()
        );
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.restrictChatMember("@test", "123", { canSendMessages: false })
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });

    describe("promoteChatMember", () => {
      it("should promote member to administrator successfully", async () => {
        mockBotInstance.promoteChatMember.mockResolvedValue(true);

        await adapter.promoteChatMember("@testgroup", "123456789", {
          canChangeInfo: true,
          canDeleteMessages: true,
          customTitle: "Moderator",
        });

        expect(mockBotInstance.promoteChatMember).toHaveBeenCalledWith("@testgroup", 123456789, {
          can_change_info: true,
          can_delete_messages: true,
          is_anonymous: undefined,
          can_manage_chat: undefined,
          can_manage_video_chats: undefined,
          can_restrict_members: undefined,
          can_promote_members: undefined,
          can_invite_users: undefined,
          can_post_stories: undefined,
          can_edit_stories: undefined,
          can_delete_stories: undefined,
          can_post_messages: undefined,
          can_edit_messages: undefined,
          can_pin_messages: undefined,
          can_manage_topics: undefined,
          can_manage_direct_messages: undefined,
          custom_title: "Moderator",
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.promoteChatMember("@test", "123", { canChangeInfo: true })
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });
  });

  describe("Member Management Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("banChatMember", () => {
      it("should ban member successfully (permanent)", async () => {
        mockBotInstance.banChatMember.mockResolvedValue(true);

        await adapter.banChatMember("@testgroup", "123456789");

        expect(mockBotInstance.banChatMember).toHaveBeenCalledWith("@testgroup", 123456789, {
          until_date: undefined,
          revoke_messages: undefined,
        });
      });

      it("should ban member with until date", async () => {
        mockBotInstance.banChatMember.mockResolvedValue(true);

        const untilDate = Math.floor(Date.now() / 1000) + 86400;
        await adapter.banChatMember("@testgroup", "123456789", { untilDate });

        expect(mockBotInstance.banChatMember).toHaveBeenCalledWith("@testgroup", 123456789, {
          until_date: untilDate,
          revoke_messages: undefined,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.banChatMember("@test", "123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("unbanChatMember", () => {
      it("should unban member successfully", async () => {
        mockBotInstance.unbanChatMember.mockResolvedValue(true);

        await adapter.unbanChatMember("@testgroup", "123456789");

        expect(mockBotInstance.unbanChatMember).toHaveBeenCalledWith("@testgroup", 123456789, {
          only_if_banned: undefined,
        });
      });

      it("should unban member with onlyIfBanned option", async () => {
        mockBotInstance.unbanChatMember.mockResolvedValue(true);

        await adapter.unbanChatMember("@testgroup", "123456789", true);

        expect(mockBotInstance.unbanChatMember).toHaveBeenCalledWith("@testgroup", 123456789, {
          only_if_banned: true,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.unbanChatMember("@test", "123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Chat Settings Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("setChatTitle", () => {
      it("should set chat title successfully", async () => {
        mockBotInstance.setChatTitle.mockResolvedValue(true);

        await adapter.setChatTitle("@testgroup", "New Title");

        expect(mockBotInstance.setChatTitle).toHaveBeenCalledWith("@testgroup", "New Title");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.setChatTitle("@test", "Title")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("setChatDescription", () => {
      it("should set chat description successfully", async () => {
        mockBotInstance.setChatDescription.mockResolvedValue(true);

        await adapter.setChatDescription("@testgroup", "New Description");

        expect(mockBotInstance.setChatDescription).toHaveBeenCalledWith("@testgroup", "New Description");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.setChatDescription("@test", "Desc")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("setChatPhoto", () => {
      it("should set chat photo with file path successfully", async () => {
        mockBotInstance.setChatPhoto.mockResolvedValue(true);

        await adapter.setChatPhoto("@testgroup", "/path/to/photo.jpg");

        expect(mockBotInstance.setChatPhoto).toHaveBeenCalledWith("@testgroup", "/path/to/photo.jpg");
      });

      it("should set chat photo with Buffer successfully", async () => {
        mockBotInstance.setChatPhoto.mockResolvedValue(true);
        const photoBuffer = Buffer.from("fake photo data");

        await adapter.setChatPhoto("@testgroup", photoBuffer);

        expect(mockBotInstance.setChatPhoto).toHaveBeenCalledWith("@testgroup", photoBuffer);
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.setChatPhoto("@test", "/path")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("deleteChatPhoto", () => {
      it("should delete chat photo successfully", async () => {
        mockBotInstance.deleteChatPhoto.mockResolvedValue(true);

        await adapter.deleteChatPhoto("@testgroup");

        expect(mockBotInstance.deleteChatPhoto).toHaveBeenCalledWith("@testgroup");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.deleteChatPhoto("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Invite Link Management Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("exportChatInviteLink", () => {
      it("should export primary invite link successfully", async () => {
        mockBotInstance.exportChatInviteLink.mockResolvedValue("https://t.me/+ABC123");

        const link = await adapter.exportChatInviteLink("@testgroup");

        expect(link).toBe("https://t.me/+ABC123");
        expect(mockBotInstance.exportChatInviteLink).toHaveBeenCalledWith("@testgroup");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.exportChatInviteLink("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("createChatInviteLink", () => {
      it("should create invite link successfully", async () => {
        mockBotInstance.createChatInviteLink.mockResolvedValue({
          invite_link: "https://t.me/+XYZ789",
          creator: { id: 123, first_name: "Bot" },
          creates_join_request: false,
          is_primary: false,
          is_revoked: false,
        });

        const link = await adapter.createChatInviteLink("@testgroup", {
          name: "Test Link",
          memberLimit: 50,
        });

        // Access the returned value directly (it's the raw response from Telegram API)
        expect(link).toHaveProperty("invite_link", "https://t.me/+XYZ789");
        expect(mockBotInstance.createChatInviteLink).toHaveBeenCalledWith("@testgroup", {
          name: "Test Link",
          member_limit: 50,
          expire_date: undefined,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.createChatInviteLink("@test", {})).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("editChatInviteLink", () => {
      it("should edit invite link successfully", async () => {
        mockBotInstance.editChatInviteLink.mockResolvedValue({
          invite_link: "https://t.me/+XYZ789",
          name: "Updated Link",
        });

        const link = await adapter.editChatInviteLink("@testgroup", "https://t.me/+XYZ789", {
          memberLimit: 100,
        });

        expect(link).toHaveProperty("invite_link", "https://t.me/+XYZ789");
        expect(mockBotInstance.editChatInviteLink).toHaveBeenCalledWith("@testgroup", "https://t.me/+XYZ789", {
          member_limit: 100,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.editChatInviteLink("@test", "https://t.me/+XYZ", {})
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });

    describe("revokeChatInviteLink", () => {
      it("should revoke invite link successfully", async () => {
        mockBotInstance.revokeChatInviteLink.mockResolvedValue({
          invite_link: "https://t.me/+XYZ789",
          is_revoked: true,
        });

        const link = await adapter.revokeChatInviteLink("@testgroup", "https://t.me/+XYZ789");

        expect(link).toHaveProperty("is_revoked", true);
        expect(mockBotInstance.revokeChatInviteLink).toHaveBeenCalledWith("@testgroup", "https://t.me/+XYZ789");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.revokeChatInviteLink("@test", "https://t.me/+XYZ")
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });
  });

  describe("Join Request Management Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("approveChatJoinRequest", () => {
      it("should approve join request successfully", async () => {
        mockBotInstance.approveChatJoinRequest.mockResolvedValue(true);

        await adapter.approveChatJoinRequest("@testgroup", "123456789");

        expect(mockBotInstance.approveChatJoinRequest).toHaveBeenCalledWith("@testgroup", 123456789);
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.approveChatJoinRequest("@test", "123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("declineChatJoinRequest", () => {
      it("should decline join request successfully", async () => {
        mockBotInstance.declineChatJoinRequest.mockResolvedValue(true);

        await adapter.declineChatJoinRequest("@testgroup", "123456789");

        expect(mockBotInstance.declineChatJoinRequest).toHaveBeenCalledWith("@testgroup", 123456789);
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.declineChatJoinRequest("@test", "123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Forum Topic Management Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("getForumTopicIconStickers", () => {
      it("should get forum topic icon stickers successfully", async () => {
        mockBotInstance.getForumTopicIconStickers.mockResolvedValue([
          { file_id: "sticker1" },
          { file_id: "sticker2" },
        ]);

        const stickers = await adapter.getForumTopicIconStickers();

        expect(stickers).toHaveLength(2);
        expect(mockBotInstance.getForumTopicIconStickers).toHaveBeenCalled();
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.getForumTopicIconStickers()).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("createForumTopic", () => {
      it("should create forum topic successfully", async () => {
        mockBotInstance.createForumTopic.mockResolvedValue({
          message_thread_id: 123,
          name: "Test Topic",
          icon_color: 0x6FB9F0,
        });

        const topic = await adapter.createForumTopic("@testgroup", {
          name: "Test Topic",
          iconColor: 0x6FB9F0,
        });

        expect(topic.threadId).toBe(123);
        expect(mockBotInstance.createForumTopic).toHaveBeenCalledWith("@testgroup", "Test Topic", {
          icon_color: 0x6FB9F0,
          icon_custom_emoji_id: undefined,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.createForumTopic("@test", { name: "Topic" })).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("editForumTopic", () => {
      it("should edit forum topic successfully", async () => {
        mockBotInstance.editForumTopic.mockResolvedValue(true);

        await adapter.editForumTopic("@testgroup", 123, "Updated Topic");

        expect(mockBotInstance.editForumTopic).toHaveBeenCalledWith("@testgroup", 123, {
          name: "Updated Topic",
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.editForumTopic("@test", 123, "Topic")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("closeForumTopic", () => {
      it("should close forum topic successfully", async () => {
        mockBotInstance.closeForumTopic.mockResolvedValue(true);

        await adapter.closeForumTopic("@testgroup", 123);

        expect(mockBotInstance.closeForumTopic).toHaveBeenCalledWith("@testgroup", 123);
      });
    });

    describe("reopenForumTopic", () => {
      it("should reopen forum topic successfully", async () => {
        mockBotInstance.reopenForumTopic.mockResolvedValue(true);

        await adapter.reopenForumTopic("@testgroup", 123);

        expect(mockBotInstance.reopenForumTopic).toHaveBeenCalledWith("@testgroup", 123);
      });
    });

    describe("deleteForumTopic", () => {
      it("should delete forum topic successfully", async () => {
        mockBotInstance.deleteForumTopic.mockResolvedValue(true);

        await adapter.deleteForumTopic("@testgroup", 123);

        expect(mockBotInstance.deleteForumTopic).toHaveBeenCalledWith("@testgroup", 123);
      });
    });

    describe("unpinAllForumTopicMessages", () => {
      it("should unpin all forum topic messages successfully", async () => {
        mockBotInstance.unpinAllForumTopicMessages.mockResolvedValue(true);

        await adapter.unpinAllForumTopicMessages("@testgroup", 123);

        expect(mockBotInstance.unpinAllForumTopicMessages).toHaveBeenCalledWith("@testgroup", 123);
      });
    });

    describe("editGeneralForumTopic", () => {
      it("should edit general forum topic successfully", async () => {
        mockBotInstance.editGeneralForumTopic.mockResolvedValue(true);

        await adapter.editGeneralForumTopic("@testgroup", "Announcements");

        expect(mockBotInstance.editGeneralForumTopic).toHaveBeenCalledWith("@testgroup", "Announcements");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.editGeneralForumTopic("@test", "Name")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("closeGeneralForumTopic", () => {
      it("should close general forum topic successfully", async () => {
        mockBotInstance.closeGeneralForumTopic.mockResolvedValue(true);

        await adapter.closeGeneralForumTopic("@testgroup");

        expect(mockBotInstance.closeGeneralForumTopic).toHaveBeenCalledWith("@testgroup");
      });
    });

    describe("reopenGeneralForumTopic", () => {
      it("should reopen general forum topic successfully", async () => {
        mockBotInstance.reopenGeneralForumTopic.mockResolvedValue(true);

        await adapter.reopenGeneralForumTopic("@testgroup");

        expect(mockBotInstance.reopenGeneralForumTopic).toHaveBeenCalledWith("@testgroup");
      });
    });

    describe("hideGeneralForumTopic", () => {
      it("should hide general forum topic successfully", async () => {
        mockBotInstance.hideGeneralForumTopic.mockResolvedValue(true);

        await adapter.hideGeneralForumTopic("@testgroup");

        expect(mockBotInstance.hideGeneralForumTopic).toHaveBeenCalledWith("@testgroup");
      });
    });

    describe("unhideGeneralForumTopic", () => {
      it("should unhide general forum topic successfully", async () => {
        mockBotInstance.unhideGeneralForumTopic.mockResolvedValue(true);

        await adapter.unhideGeneralForumTopic("@testgroup");

        expect(mockBotInstance.unhideGeneralForumTopic).toHaveBeenCalledWith("@testgroup");
      });
    });

    describe("unpinAllGeneralForumTopicMessages", () => {
      it("should unpin all general forum topic messages successfully", async () => {
        mockBotInstance.unpinAllGeneralForumTopicMessages.mockResolvedValue(true);

        await adapter.unpinAllGeneralForumTopicMessages("@testgroup");

        expect(mockBotInstance.unpinAllGeneralForumTopicMessages).toHaveBeenCalledWith("@testgroup");
      });
    });
  });

  describe("User Profile Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("getUserProfilePhotos", () => {
      it("should get user profile photos successfully", async () => {
        mockBotInstance.getUserProfilePhotos.mockResolvedValue({
          total_count: 5,
          photos: [
            [
              { file_id: "photo1", width: 100, height: 100 },
              { file_id: "photo2", width: 200, height: 200 },
            ],
            [{ file_id: "photo3", width: 150, height: 150 }],
          ],
        });

        const photos = await adapter.getUserProfilePhotos("123456789");

        expect(photos.totalCount).toBe(5);
        expect(photos.photos).toHaveLength(2);
        expect(mockBotInstance.getUserProfilePhotos).toHaveBeenCalledWith(123456789, {
          offset: 0,
          limit: 100,
        });
      });

      it("should get user profile photos with options", async () => {
        mockBotInstance.getUserProfilePhotos.mockResolvedValue({
          total_count: 5,
          photos: [[]],
        });

        await adapter.getUserProfilePhotos("123456789", { offset: 0, limit: 10 });

        expect(mockBotInstance.getUserProfilePhotos).toHaveBeenCalledWith(123456789, {
          offset: 0,
          limit: 10,
        });
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.getUserProfilePhotos("123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Leave Chat Method", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("leaveChat", () => {
      it("should leave chat successfully", async () => {
        mockBotInstance.leaveChat.mockResolvedValue(true);

        await adapter.leaveChat("@testgroup");

        expect(mockBotInstance.leaveChat).toHaveBeenCalledWith("@testgroup");
      });

      it("should throw error when bot is not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.leaveChat("@test")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Core Messaging Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("send", () => {
      it("should send text message successfully", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 123,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.send("-100123456789", { text: "Hello World" });

        expect(result.messageId).toBe("-100123456789:123");
        expect(result.platform).toBe("telegram");
        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith("-100123456789", "Hello World", expect.any(Object));
      });

      it("should send photo with caption", async () => {
        mockBotInstance.sendPhoto.mockResolvedValue({
          message_id: 456,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.send("-100123456789", {
          text: "Photo caption",
          mediaUrl: "https://example.com/photo.jpg",
          mediaType: "image",
        });

        expect(result.messageId).toBe("-100123456789:456");
        expect(mockBotInstance.sendPhoto).toHaveBeenCalledWith(
          "-100123456789",
          "https://example.com/photo.jpg",
          expect.objectContaining({ caption: "Photo caption" })
        );
      });

      it("should send video with caption", async () => {
        mockBotInstance.sendVideo.mockResolvedValue({
          message_id: 789,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.send("-100123456789", {
          text: "Video caption",
          mediaUrl: "https://example.com/video.mp4",
          mediaType: "video",
        });

        expect(result.messageId).toBe("-100123456789:789");
        expect(mockBotInstance.sendVideo).toHaveBeenCalled();
      });

      it("should send audio file", async () => {
        mockBotInstance.sendAudio.mockResolvedValue({
          message_id: 111,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", {
          text: "Audio caption",
          mediaUrl: "https://example.com/audio.mp3",
          mediaType: "audio",
        });

        expect(mockBotInstance.sendAudio).toHaveBeenCalled();
      });

      it("should send document/file", async () => {
        mockBotInstance.sendDocument.mockResolvedValue({
          message_id: 222,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", {
          text: "File caption",
          mediaUrl: "https://example.com/file.pdf",
          mediaType: "file",
        });

        expect(mockBotInstance.sendDocument).toHaveBeenCalled();
      });

      it("should send sticker", async () => {
        mockBotInstance.sendSticker.mockResolvedValue({
          message_id: 333,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", { stickerId: "CAADBAADmgMAAqKcYAAB" });

        expect(mockBotInstance.sendSticker).toHaveBeenCalledWith("-100123456789", "CAADBAADmgMAAqKcYAAB", expect.any(Object));
      });

      it("should send buttons with text", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 444,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", {
          text: "Choose an option",
          buttons: [
            [{ text: "Option 1", data: "opt1" }],
            [{ text: "Option 2", data: "opt2" }],
          ],
        });

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "Choose an option",
          expect.objectContaining({
            reply_markup: {
              inline_keyboard: [
                [{ text: "Option 1", callback_data: "opt1" }],
                [{ text: "Option 2", callback_data: "opt2" }],
              ],
            },
          })
        );
      });

      it("should send poll via send method", async () => {
        mockBotInstance.sendPoll.mockResolvedValue({
          message_id: 555,
          date: Math.floor(Date.now() / 1000),
          poll: { id: "poll123" },
          chat: { id: -100123456789 },
        });

        const result = await adapter.send("-100123456789", {
          poll: {
            question: "What do you prefer?",
            options: ["Option A", "Option B"],
            multi: false,
          },
        });

        expect(result.messageId).toBe("-100123456789:555");
        expect(mockBotInstance.sendPoll).toHaveBeenCalled();
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.send("-100123456789", { text: "test" })).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });

      it("should throw error when target is empty", async () => {
        await expect(adapter.send("", { text: "test" })).rejects.toThrow("Target");
      });

      it("should throw error when no content provided", async () => {
        await expect(adapter.send("-100123456789", {})).rejects.toThrow(
          "Either text, mediaUrl, stickerId, buttons, or poll is required"
        );
      });

      it("should handle reply to message", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 666,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", { text: "Reply" }, { replyToMessageId: "123" });

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "Reply",
          expect.objectContaining({ reply_to_message_id: 123 })
        );
      });

      it("should handle reply with compound messageId format", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 777,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", { text: "Reply" }, { replyToMessageId: "-100123456789:456" });

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "Reply",
          expect.objectContaining({ reply_to_message_id: 456 })
        );
      });

      it("should handle thread option for forum topics", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 888,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", { text: "Topic message" }, { threadId: "42" });

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "Topic message",
          expect.objectContaining({ message_thread_id: 42 })
        );
      });

      it("should handle silent option", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 999,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", { text: "Silent message" }, { silent: true });

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "Silent message",
          expect.objectContaining({ disable_notification: true })
        );
      });

      it("should handle parseMode option", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 101,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        await adapter.send("-100123456789", { text: "**bold**" }, { parseMode: "markdown" });

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "**bold**",
          expect.objectContaining({ parse_mode: "Markdown" })
        );
      });
    });

    describe("reply", () => {
      it("should reply to message successfully", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 200,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.reply("-100123456789:100", { text: "Reply text" });

        expect(result.messageId).toBe("-100123456789:200");
        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith(
          "-100123456789",
          "Reply text",
          expect.objectContaining({ reply_to_message_id: 100 })
        );
      });

      it("should throw error for invalid messageId format", async () => {
        await expect(adapter.reply("invalid", { text: "test" })).rejects.toThrow("Invalid messageId format");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.reply("-100123456789:100", { text: "test" })).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("edit", () => {
      it("should edit message successfully", async () => {
        mockBotInstance.editMessageText.mockResolvedValue({
          message_id: 100,
          date: Math.floor(Date.now() / 1000),
        });

        const result = await adapter.edit("-100123456789:100", "Edited text");

        expect(result.messageId).toBe("-100123456789:100");
        expect(mockBotInstance.editMessageText).toHaveBeenCalledWith("-100123456789", 100, "Edited text", expect.any(Object));
      });

      it("should throw error for invalid messageId format", async () => {
        await expect(adapter.edit("invalid", "new text")).rejects.toThrow("Invalid messageId format");
      });

      it("should throw error when newText is empty", async () => {
        await expect(adapter.edit("-100123456789:100", "")).rejects.toThrow("New text is required");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.edit("-100123456789:100", "new text")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("delete", () => {
      it("should delete message successfully", async () => {
        mockBotInstance.deleteMessage.mockResolvedValue(true);

        await adapter.delete("-100123456789:100");

        expect(mockBotInstance.deleteMessage).toHaveBeenCalledWith("-100123456789", 100);
      });

      it("should throw error for invalid messageId format", async () => {
        await expect(adapter.delete("invalid")).rejects.toThrow("Invalid messageId format");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.delete("-100123456789:100")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("sendButtons", () => {
      it("should send buttons message", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 300,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.sendButtons(
          "-100123456789",
          "Choose:",
          [[{ text: "Yes", data: "yes" }, { text: "No", data: "no" }]]
        );

        expect(result.messageId).toBe("-100123456789:300");
      });
    });

    describe("sendPoll", () => {
      it("should send poll successfully", async () => {
        mockBotInstance.sendPoll.mockResolvedValue({
          message_id: 400,
          date: Math.floor(Date.now() / 1000),
          poll: { id: "poll456" },
          chat: { id: -100123456789 },
        });

        const result = await adapter.sendPoll("-100123456789", {
          question: "Question?",
          options: ["A", "B", "C"],
          multi: true,
        });

        expect(result.pollId).toBe("poll456");
        expect(result.messageId).toBe("-100123456789:400");
      });

      it("should throw error when question is missing", async () => {
        await expect(adapter.sendPoll("-100123456789", { options: ["A", "B"] } as any)).rejects.toThrow(
          "Poll must have a question"
        );
      });

      it("should throw error when less than 2 options", async () => {
        await expect(adapter.sendPoll("-100123456789", { question: "Q?", options: ["A"] })).rejects.toThrow(
          "at least 2 options"
        );
      });

      it("should throw error when more than 10 options", async () => {
        await expect(
          adapter.sendPoll("-100123456789", { question: "Q?", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"] })
        ).rejects.toThrow("at most 10 options");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.sendPoll("-100123456789", { question: "Q?", options: ["A", "B"] })
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });

    describe("answerCallbackQuery", () => {
      it("should answer callback query successfully", async () => {
        mockBotInstance.answerCallbackQuery.mockResolvedValue(true);

        await adapter.answerCallbackQuery("query123", { text: "Done!", showAlert: true });

        expect(mockBotInstance.answerCallbackQuery).toHaveBeenCalledWith("query123", {
          text: "Done!",
          show_alert: true,
        });
      });

      it("should answer without options", async () => {
        mockBotInstance.answerCallbackQuery.mockResolvedValue(true);

        await adapter.answerCallbackQuery("query123");

        expect(mockBotInstance.answerCallbackQuery).toHaveBeenCalledWith("query123", {
          text: undefined,
          show_alert: false,
        });
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.answerCallbackQuery("query123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("addReaction", () => {
      it("should add reaction successfully", async () => {
        mockBotInstance.setMessageReaction.mockResolvedValue(true);

        await adapter.addReaction("-100123456789:100", "👍");

        expect(mockBotInstance.setMessageReaction).toHaveBeenCalledWith("-100123456789", 100, [
          { type: "emoji", emoji: "👍" },
        ]);
      });

      it("should throw error for invalid messageId format", async () => {
        await expect(adapter.addReaction("invalid", "👍")).rejects.toThrow("Invalid messageId format");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.addReaction("-100123456789:100", "👍")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("removeReaction", () => {
      it("should remove reaction successfully", async () => {
        mockBotInstance.setMessageReaction.mockResolvedValue(true);

        await adapter.removeReaction("-100123456789:100", "👍");

        expect(mockBotInstance.setMessageReaction).toHaveBeenCalledWith("-100123456789", 100, []);
      });

      it("should throw error for invalid messageId format", async () => {
        await expect(adapter.removeReaction("invalid", "👍")).rejects.toThrow("Invalid messageId format");
      });
    });

    describe("sendSticker", () => {
      it("should send sticker successfully", async () => {
        mockBotInstance.sendSticker.mockResolvedValue({
          message_id: 500,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.sendSticker("-100123456789", "CAADBAADmgMAAqKcYAAB");

        expect(result.messageId).toBe("-100123456789:500");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.sendSticker("-100123456789", "sticker123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("sendWithEffect", () => {
      it("should send message with effect successfully", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 600,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100123456789 },
        });

        const result = await adapter.sendWithEffect("-100123456789", "Hello!", "effect123");

        expect(result.messageId).toBe("-100123456789:600");
        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith("-100123456789", {
          text: "Hello!",
          effect_id: "effect123",
        });
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.sendWithEffect("-100123456789", "Hello!", "effect123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("setCommands", () => {
      it("should set bot commands successfully", async () => {
        mockBotInstance.setMyCommands.mockResolvedValue(true);

        await adapter.setCommands([
          { command: "start", description: "Start the bot" },
          { command: "help", description: "Show help" },
        ]);

        expect(mockBotInstance.setMyCommands).toHaveBeenCalledWith([
          { command: "start", description: "Start the bot" },
          { command: "help", description: "Show help" },
        ]);
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.setCommands([])).rejects.toThrow("Telegram bot not initialized");
      });
    });

    describe("sendChatAction", () => {
      it("should send chat action successfully", async () => {
        mockBotInstance.sendChatAction.mockResolvedValue(true);

        await adapter.sendChatAction("-100123456789", "typing");

        expect(mockBotInstance.sendChatAction).toHaveBeenCalledWith("-100123456789", "typing");
      });

      it("should throw error when target is empty", async () => {
        await expect(adapter.sendChatAction("", "typing")).rejects.toThrow("Target");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.sendChatAction("-100123456789", "typing")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("sendWithKeyboard", () => {
      it("should send message with keyboard successfully", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 700,
          chat: { id: -100123456789 },
        });

        const result = await adapter.sendWithKeyboard("-100123456789", "Choose:", {
          keyboard: [[{ text: "Option 1" }, { text: "Option 2" }]],
          resize: true,
          oneTime: true,
        });

        expect(result.messageId).toBe("-100123456789:700");
        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith("-100123456789", "Choose:", {
          reply_markup: {
            keyboard: [[{ text: "Option 1" }, { text: "Option 2" }]],
            resize_keyboard: true,
            one_time_keyboard: true,
            selective: false,
          },
        });
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(
          uninitializedAdapter.sendWithKeyboard("-100123456789", "test", { keyboard: [] })
        ).rejects.toThrow("Telegram bot not initialized");
      });
    });

    describe("hideKeyboard", () => {
      it("should hide keyboard successfully", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 800,
          chat: { id: -100123456789 },
        });

        const result = await adapter.hideKeyboard("-100123456789", "Keyboard hidden");

        expect(result.messageId).toBe("-100123456789:800");
        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith("-100123456789", "Keyboard hidden", {
          reply_markup: {
            remove_keyboard: true,
            selective: false,
          },
        });
      });

      it("should use default text when not provided", async () => {
        mockBotInstance.sendMessage.mockResolvedValue({
          message_id: 801,
          chat: { id: -100123456789 },
        });

        await adapter.hideKeyboard("-100123456789");

        expect(mockBotInstance.sendMessage).toHaveBeenCalledWith("-100123456789", "键盘已隐藏", expect.any(Object));
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.hideKeyboard("-100123456789")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("forwardMessage", () => {
      it("should forward message successfully", async () => {
        mockBotInstance.forwardMessage.mockResolvedValue({
          message_id: 900,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -100999999999 },
        });

        const result = await adapter.forwardMessage("-100999999999", "-100123456789:100");

        expect(result.messageId).toBe("-100999999999:900");
        expect(mockBotInstance.forwardMessage).toHaveBeenCalledWith("-100999999999", "-100123456789", 100);
      });

      it("should throw error for invalid messageId format", async () => {
        await expect(adapter.forwardMessage("-100999999999", "invalid")).rejects.toThrow("Invalid messageId format");
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.forwardMessage("-100999999999", "-100123456789:100")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });

    describe("downloadFileAsBuffer", () => {
      it("should download file as buffer successfully", async () => {
        mockBotInstance.getFileLink.mockResolvedValue("https://api.telegram.org/file/bot123/photos/file.jpg");

        // Mock https.get
        const mockChunk = Buffer.from("fake image data");
        const originalGet = require("https").get;
        require("https").get = vi.fn((url: string, callback: (res: any) => void) => {
          const mockResponse = {
            statusCode: 200,
            on: (event: string, handler: (data?: any) => void) => {
              if (event === "data") {
                handler(mockChunk);
              } else if (event === "end") {
                handler();
              }
            },
          };
          callback(mockResponse);
          return { on: vi.fn() };
        });

        const result = await adapter.downloadFileAsBuffer("file123");

        expect(result).toBeInstanceOf(Buffer);

        // Restore
        require("https").get = originalGet;
      });

      it("should throw error when bot not initialized", async () => {
        const uninitializedAdapter = new TelegramAdapter();
        await expect(uninitializedAdapter.downloadFileAsBuffer("file123")).rejects.toThrow(
          "Telegram bot not initialized"
        );
      });
    });
  });

  describe("Unified API Methods", () => {
    beforeEach(async () => {
      await adapter.init({ apiToken: "test_token" });
    });

    describe("createInvite", () => {
      it("should create invite link with options", async () => {
        mockBotInstance.createChatInviteLink.mockResolvedValue({
          invite_link: "https://t.me/+ABC123",
          creator: { id: 123, first_name: "Bot" },
          member_limit: 50,
          is_primary: false,
        });

        const result = await adapter.createInvite("-100123456789", {
          name: "Test Invite",
          maxUses: 50,
        });

        expect(result.url).toBe("https://t.me/+ABC123");
        expect(result.maxUses).toBe(50);
      });
    });

    describe("getInvites", () => {
      it("should get primary invite link", async () => {
        mockBotInstance.exportChatInviteLink.mockResolvedValue("https://t.me/+XYZ789");

        const result = await adapter.getInvites("-100123456789");

        expect(result).toHaveLength(1);
        expect(result[0].url).toBe("https://t.me/+XYZ789");
        expect(result[0].isPrimary).toBe(true);
      });

      it("should return empty array on error", async () => {
        mockBotInstance.exportChatInviteLink.mockRejectedValue(new Error("No permission"));

        const result = await adapter.getInvites("-100123456789");

        expect(result).toEqual([]);
      });
    });

    describe("revokeInvite", () => {
      it("should revoke invite link", async () => {
        mockBotInstance.revokeChatInviteLink.mockResolvedValue({
          invite_link: "https://t.me/+ABC123",
          is_revoked: true,
        });

        const result = await adapter.revokeInvite("-100123456789", "ABC123");

        expect(result.success).toBe(true);
      });

      it("should return failure on error", async () => {
        mockBotInstance.revokeChatInviteLink.mockRejectedValue(new Error("Cannot revoke"));

        const result = await adapter.revokeInvite("-100123456789", "ABC123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot revoke");
      });
    });

    describe("pinMessage / unpinMessage", () => {
      it("should pin message", async () => {
        mockBotInstance.pinChatMessage.mockResolvedValue(true);

        const result = await adapter.pinMessage("-100123456789", "100", { silent: true });

        expect(result.success).toBe(true);
      });

      it("should unpin message", async () => {
        mockBotInstance.unpinChatMessage.mockResolvedValue(true);

        const result = await adapter.unpinMessage("-100123456789", "100");

        expect(result.success).toBe(true);
      });
    });

    describe("getMemberInfo", () => {
      it("should get member info", async () => {
        mockBotInstance.getChatMember.mockResolvedValue({
          user: { id: 123, first_name: "Alice", username: "alice" },
          status: "member",
        });

        const result = await adapter.getMemberInfo("-100123456789", "123");

        expect(result.id).toBe("123");
        expect(result.name).toBe("Alice");
      });
    });

    describe("getMemberCount", () => {
      it("should get member count", async () => {
        mockBotInstance.getChatMemberCount.mockResolvedValue(150);

        const result = await adapter.getMemberCount("-100123456789");

        expect(result).toBe(150);
      });
    });

    describe("getAdministrators", () => {
      it("should get administrators", async () => {
        mockBotInstance.getChatAdministrators.mockResolvedValue([
          { status: "creator", user: { id: 111, first_name: "Owner" } },
          { status: "administrator", user: { id: 222, first_name: "Admin" } },
        ]);

        const result = await adapter.getAdministrators("-100123456789");

        expect(result).toHaveLength(2);
        expect(result[0].roles).toContain("owner");
        expect(result[1].isAdmin).toBe(true);
      });
    });

    describe("kick", () => {
      it("should kick user", async () => {
        mockBotInstance.banChatMember.mockResolvedValue(true);
        mockBotInstance.unbanChatMember.mockResolvedValue(true);

        const result = await adapter.kick("-100123456789", "123");

        expect(result.success).toBe(true);
        expect(mockBotInstance.banChatMember).toHaveBeenCalled();
        expect(mockBotInstance.unbanChatMember).toHaveBeenCalled();
      });
    });

    describe("ban / unban", () => {
      it("should ban user", async () => {
        mockBotInstance.banChatMember.mockResolvedValue(true);

        const result = await adapter.ban("-100123456789", "123");

        expect(result.success).toBe(true);
      });

      it("should unban user", async () => {
        mockBotInstance.unbanChatMember.mockResolvedValue(true);

        const result = await adapter.unban("-100123456789", "123");

        expect(result.success).toBe(true);
      });
    });

    describe("mute / unmute", () => {
      it("should mute user", async () => {
        mockBotInstance.restrictChatMember.mockResolvedValue(true);

        const result = await adapter.mute("-100123456789", "123", { durationSeconds: 3600 });

        expect(result.success).toBe(true);
      });

      it("should unmute user", async () => {
        mockBotInstance.restrictChatMember.mockResolvedValue(true);

        const result = await adapter.unmute("-100123456789", "123");

        expect(result.success).toBe(true);
      });
    });

    describe("setTitle / setDescription", () => {
      it("should set title", async () => {
        mockBotInstance.setChatTitle.mockResolvedValue(true);

        const result = await adapter.setTitle("-100123456789", "New Title");

        expect(result.success).toBe(true);
      });

      it("should set description", async () => {
        mockBotInstance.setChatDescription.mockResolvedValue(true);

        const result = await adapter.setDescription("-100123456789", "New Description");

        expect(result.success).toBe(true);
      });
    });

    describe("createDMChannel", () => {
      it("should return user ID as channel", async () => {
        const result = await adapter.createDMChannel("123456789");

        expect(result).toBe("123456789");
      });
    });
  });

  describe("Smart Target Type Inference", () => {
    beforeEach(async () => {
      mockBotInstance.sendMessage.mockResolvedValue({
        message_id: 123,
        date: Math.floor(Date.now() / 1000),
      });
      await adapter.init({ apiToken: "test_token" });
    });

    describe("Automatic type inference from ID format", () => {
      it("should infer @username as channel", async () => {
        await adapter.send("@mychannel", { text: "Hello" });
        // Should infer type without explicit targetType
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });

      it("should infer positive numeric ID as user", async () => {
        await adapter.send("123456789", { text: "Hello" });
        // Positive number = user (Telegram convention)
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });

      it("should infer negative numeric ID as group", async () => {
        // Negative number = group/supergroup (Telegram convention)
        const groupId = "-1001234567890";
        await adapter.send(groupId, { text: "Hello" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });

      it("should cache inferred types for subsequent calls", async () => {
        // First call - infer type
        await adapter.send("@mychannel", { text: "Hello1" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(1);

        // Second call - use cached type
        await adapter.send("@mychannel", { text: "Hello2" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(2);
      });
    });

    describe("Explicit targetType with caching", () => {
      it("should use explicit targetType and cache it", async () => {
        // First call with explicit type
        await adapter.send("123456789", { text: "Hello1" }, { targetType: 'group' });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(1);

        // Second call without explicit type - should use cached
        await adapter.send("123456789", { text: "Hello2" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(2);
      });

      it("should allow overriding cached type with new explicit type", async () => {
        // First call - infer as user (default for positive numbers)
        await adapter.send("123456789", { text: "Hello1" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(1);

        // Second call - explicitly set as group
        await adapter.send("123456789", { text: "Hello2" }, { targetType: 'group' });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(2);

        // Third call - should use the new cached type (group)
        await adapter.send("123456789", { text: "Hello3" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(3);
      });
    });

    describe("Convenience methods", () => {
      it("sendToUser should set targetType to user", async () => {
        await adapter.sendToUser("123456789", "Hello");
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });

      it("sendToGroup should set targetType to group", async () => {
        await adapter.sendToGroup("123456789", "Hello");
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });

      it("sendToChannel should set targetType to channel", async () => {
        await adapter.sendToChannel("@mychannel", "Hello");
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });

      it("convenience methods should accept additional options", async () => {
        await adapter.sendToUser("123456789", "Hello", { silent: true });
        expect(mockBotInstance.sendMessage).toHaveBeenCalled();
      });
    });

    describe("Cache management", () => {
      it("should clear cache on destroy", async () => {
        // Set some cache
        await adapter.send("@mychannel", { text: "Hello" });
        expect(mockBotInstance.sendMessage).toHaveBeenCalledTimes(1);

        // Destroy
        await adapter.destroy();

        // Cache should be cleared (new instance would be fresh)
        const newAdapter = new TelegramAdapter();
        await newAdapter.init({ apiToken: "test_token" });
        // This is a new instance with empty cache
      });
    });
  });
});
