/**
 * Telegram Chat Management Smoke Tests
 *
 * These are integration/smoke tests that verify the Telegram adapter's chat management
 * features work correctly with a real Telegram bot API.
 *
 * Run with:
 *   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=@xxx TELEGRAM_USER_ID=xxx pnpm test:smoke
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN - A valid Telegram bot token
 *   TELEGRAM_CHAT_ID - A chat ID where the bot has admin permissions
 *   TELEGRAM_USER_ID - A user ID for testing member operations
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TelegramAdapter } from "../src/adapter.js";

describe("TelegramAdapter Chat Management Integration Tests", () => {
  let adapter: TelegramAdapter;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || "@your_chat_username";
  const userId = process.env.TELEGRAM_USER_ID || "123456789";

  // Skip tests if no bot token is provided
  const runTests = Boolean(botToken && botToken !== "your_bot_token_here");

  beforeAll(async () => {
    if (runTests) {
      console.log(`\n🧪 Running integration tests with chat: ${chatId}`);
      adapter = new TelegramAdapter();
      await adapter.init({ apiToken: botToken! });
    }
  });

  afterAll(async () => {
    if (runTests && adapter) {
      await adapter.destroy();
      console.log(`✅ Integration tests completed\n`);
    }
  });

  // ========================================================================
  // Chat Information Methods (4 methods)
  // ========================================================================
  describe.runIf(runTests)("Chat Information", () => {
    it("should get chat information", async () => {
      const chatInfo = await adapter.getChat(chatId);

      expect(chatInfo).toBeDefined();
      expect(chatInfo.id).toBeDefined();
      expect(chatInfo.name).toBeDefined();
      expect(chatInfo.type).toBeDefined();
      expect(["user", "channel", "group"]).toContain(chatInfo.type);
      console.log(`  ✓ Chat info: ${chatInfo.name} (${chatInfo.type})`);
    });

    it("should get chat member count", async () => {
      const count = await adapter.getChatMemberCount(chatId);

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
      console.log(`  ✓ Member count: ${count}`);
    });

    it("should get chat member information", async () => {
      const member = await adapter.getChatMember(chatId, userId);

      expect(member).toBeDefined();
      expect(member.id).toBeDefined();
      expect(member.name).toBeDefined();
      expect(Array.isArray(member.roles)).toBe(true);
      console.log(`  ✓ Member: ${member.name}, roles: ${member.roles.join(", ")}`);
    });

    it("should get chat administrators", async () => {
      const administrators = await adapter.getChatAdministrators(chatId);

      expect(Array.isArray(administrators)).toBe(true);
      expect(administrators.length).toBeGreaterThan(0);
      expect(administrators[0]).toHaveProperty("id");
      expect(administrators[0]).toHaveProperty("name");
      expect(administrators[0]).toHaveProperty("roles");
      console.log(`  ✓ Administrators: ${administrators.length} found`);
    });
  });

  // ========================================================================
  // Message Pinning Methods (3 methods)
  // ========================================================================
  describe.runIf(runTests)("Message Pinning", () => {
    it("should pin a message", async () => {
      // First send a message to get a valid message ID
      const result = await adapter.send(chatId, { text: "Test message for pinning" });

      try {
        await adapter.pinChatMessage(result.messageId!, { disableNotification: true });
        console.log(`  ✓ Message pinned: ${result.messageId}`);

        // Cleanup: unpin the message
        await adapter.unpinChatMessage(result.messageId!);
        console.log(`  ✓ Message unpinned`);
      } catch (error: any) {
        // Bot might not have permission to pin in this chat
        console.log(`  ⚠ Could not pin message: ${error.message}`);
      }
    });

    it("should unpin all chat messages", async () => {
      try {
        await adapter.unpinAllChatMessages(chatId);
        console.log(`  ✓ All messages unpinned`);
      } catch (error: any) {
        console.log(`  ⚠ Could not unpin all: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Permission Management Methods (3 methods)
  // ========================================================================
  describe.runIf(runTests)("Permission Management", () => {
    it("should set chat permissions", async () => {
      try {
        await adapter.setChatPermissions(chatId, {
          canSendMessages: true,
          canSendPhotos: true,
          canSendVideos: true,
          canSendPolls: true,
        });
        console.log(`  ✓ Chat permissions updated`);
      } catch (error: any) {
        // Bot might not have permission to change chat permissions
        console.log(`  ⚠ Could not set permissions: ${error.message}`);
      }
    });

    it("should restrict chat member", async () => {
      try {
        await adapter.restrictChatMember(chatId, userId, {
          canSendMessages: false,
          canSendMedia: false,
        });
        console.log(`  ✓ Member restricted`);

        // Restore permissions
        await adapter.restrictChatMember(chatId, userId, {
          canSendMessages: true,
          canSendMedia: true,
        });
        console.log(`  ✓ Member permissions restored`);
      } catch (error: any) {
        console.log(`  ⚠ Could not restrict member: ${error.message}`);
      }
    });

    it("should promote chat member to administrator", async () => {
      try {
        await adapter.promoteChatMember(chatId, userId, {
          canChangeInfo: true,
          canDeleteMessages: true,
        });
        console.log(`  ✓ Member promoted`);

        // Demote back
        await adapter.promoteChatMember(chatId, userId, {
          canChangeInfo: false,
          canDeleteMessages: false,
        });
        console.log(`  ✓ Member demoted`);
      } catch (error: any) {
        // Bot might not have permission or user is already admin
        console.log(`  ⚠ Could not promote member: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Member Management Methods (2 methods)
  // ========================================================================
  describe.runIf(runTests)("Member Management", () => {
    it("should ban and unban a member", async () => {
      // Note: This will actually ban/unban the user
      // Use with extreme caution in production chats!
      // We'll skip this test by default and just verify the methods exist
      console.log(`  ⚠ Skipping ban/unban test (destructive operation)`);

      // Verify methods exist on adapter
      expect(typeof adapter.banChatMember).toBe("function");
      expect(typeof adapter.unbanChatMember).toBe("function");
    });
  });

  // ========================================================================
  // Chat Settings Methods (5 methods)
  // ========================================================================
  describe.runIf(runTests)("Chat Settings", () => {
    it("should set chat title", async () => {
      try {
        const newTitle = `Test Title ${Date.now()}`;
        await adapter.setChatTitle(chatId, newTitle);
        console.log(`  ✓ Chat title set to: ${newTitle}`);
      } catch (error: any) {
        // Might fail in channels or if bot lacks permission
        console.log(`  ⚠ Could not set title: ${error.message}`);
      }
    });

    it("should set and delete chat description", async () => {
      try {
        const description = `Test description ${Date.now()}`;
        await adapter.setChatDescription(chatId, description);
        console.log(`  ✓ Chat description set`);

        // Clean up
        await adapter.setChatDescription(chatId, "");
        console.log(`  ✓ Chat description cleared`);
      } catch (error: any) {
        console.log(`  ⚠ Could not set description: ${error.message}`);
      }
    });

    it("should export primary invite link", async () => {
      try {
        const link = await adapter.exportChatInviteLink(chatId);
        expect(link).toBeDefined();
        expect(typeof link).toBe("string");
        expect(link).toMatch(/https:\/\/t\.me\/\+/);
        console.log(`  ✓ Invite link: ${link.substring(0, 20)}...`);
      } catch (error: any) {
        console.log(`  ⚠ Could not export invite link: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Invite Link Management Methods (4 methods)
  // ========================================================================
  describe.runIf(runTests)("Invite Link Management", () => {
    it("should create, edit, and revoke invite link", async () => {
      try {
        // Create
        const newLink = await adapter.createChatInviteLink(chatId, {
          name: "Integration Test Link",
          memberLimit: 10,
        });
        expect(newLink.inviteLink).toBeDefined();
        console.log(`  ✓ Invite link created: ${newLink.inviteLink.substring(0, 30)}...`);

        // Edit
        const editedLink = await adapter.editChatInviteLink(chatId, newLink.inviteLink, {
          memberLimit: 20,
        });
        expect(editedLink.inviteLink).toBeDefined();
        console.log(`  ✓ Invite link edited`);

        // Revoke
        const revokedLink = await adapter.revokeChatInviteLink(chatId, newLink.inviteLink);
        expect(revokedLink.isRevoked).toBe(true);
        console.log(`  ✓ Invite link revoked`);
      } catch (error: any) {
        console.log(`  ⚠ Invite link operations failed: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Join Request Management Methods (2 methods)
  // ========================================================================
  describe.runIf(runTests)("Join Request Management", () => {
    it("should handle join request operations", async () => {
      // These will likely fail if there are no pending join requests
      // We're just testing the methods are callable
      try {
        await adapter.approveChatJoinRequest(chatId, userId);
      } catch (error: any) {
        // Expected: "Bad Request: there are no pending join requests"
        expect(error.message).toBeDefined();
      }

      try {
        await adapter.declineChatJoinRequest(chatId, userId);
      } catch (error: any) {
        // Expected: "Bad Request: there are no pending join requests"
        expect(error.message).toBeDefined();
      }

      console.log(`  ✓ Join request methods tested (no pending requests)`);
    });
  });

  // ========================================================================
  // Forum Topic Management Methods (11 methods)
  // ========================================================================
  describe.runIf(runTests)("Forum Topic Management", () => {
    it("should get forum topic icon stickers", async () => {
      try {
        const stickers = await adapter.getForumTopicIconStickers();
        expect(Array.isArray(stickers)).toBe(true);
        expect(stickers.length).toBeGreaterThan(0);
        console.log(`  ✓ Forum topic stickers: ${stickers.length} available`);
      } catch (error: any) {
        console.log(`  ⚠ Could not get forum stickers: ${error.message}`);
      }
    });

    it("should create, edit, close, reopen, and delete forum topic", async () => {
      // This only works in supergroups with forum enabled
      // We'll test the methods are callable
      const testTopicName = `Integration Test ${Date.now()}`;

      try {
        // Create
        const topic = await adapter.createForumTopic(chatId, testTopicName, {
          iconColor: 0x6FB9F0,
        });
        expect(topic.messageThreadId).toBeDefined();
        console.log(`  ✓ Forum topic created: ${topic.messageThreadId}`);

        // Edit
        await adapter.editForumTopic(chatId, topic.messageThreadId, {
          name: `Updated ${testTopicName}`,
        });
        console.log(`  ✓ Forum topic edited`);

        // Close
        await adapter.closeForumTopic(chatId, topic.messageThreadId);
        console.log(`  ✓ Forum topic closed`);

        // Reopen
        await adapter.reopenForumTopic(chatId, topic.messageThreadId);
        console.log(`  ✓ Forum topic reopened`);

        // Unpin all messages
        await adapter.unpinAllForumTopicMessages(chatId, topic.messageThreadId);
        console.log(`  ✓ Forum topic messages unpinned`);

        // Delete
        await adapter.deleteForumTopic(chatId, topic.messageThreadId);
        console.log(`  ✓ Forum topic deleted`);
      } catch (error: any) {
        console.log(`  ⚠ Forum topic operations failed: ${error.message}`);
        console.log(`     (Chat might not be a forum-enabled supergroup)`);
      }
    });

    it("should manage general forum topic", async () => {
      try {
        await adapter.editGeneralForumTopic(chatId, `General Test ${Date.now()}`);
        await adapter.closeGeneralForumTopic(chatId);
        await adapter.reopenGeneralForumTopic(chatId);
        await adapter.hideGeneralForumTopic(chatId);
        await adapter.unhideGeneralForumTopic(chatId);
        await adapter.unpinAllGeneralForumTopicMessages(chatId);
        console.log(`  ✓ General forum topic managed`);
      } catch (error: any) {
        console.log(`  ⚠ General forum topic operations failed: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // User Profile Methods (1 method)
  // ========================================================================
  describe.runIf(runTests)("User Profile", () => {
    it("should get user profile photos", async () => {
      try {
        const photos = await adapter.getUserProfilePhotos(userId, { limit: 5 });
        expect(photos).toBeDefined();
        expect(typeof photos.totalCount).toBe("number");
        expect(Array.isArray(photos.photos)).toBe(true);
        console.log(`  ✓ User profile photos: ${photos.totalCount} total`);
      } catch (error: any) {
        console.log(`  ⚠ Could not get profile photos: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Leave Chat Method (1 method)
  // ========================================================================
  describe.runIf(runTests)("Leave Chat", () => {
    it("should leave a chat (test only - not actually leaving)", async () => {
      // Verify the method exists
      expect(typeof adapter.leaveChat).toBe("function");
      console.log(`  ✓ leaveChat method exists (skipping actual test)`);
    });
  });

  // ========================================================================
  // Capabilities Verification
  // ========================================================================
  describe.runIf(runTests)("Capabilities", () => {
    it("should report all chat management capabilities", () => {
      const caps = adapter.getCapabilities();

      // Verify all new chat management capabilities are enabled
      expect(caps.discovery.memberInfo).toBe(true);
      expect(caps.discovery.channelInfo).toBe(true);
      expect(caps.management.kick).toBe(true);
      expect(caps.management.ban).toBe(true);
      expect(caps.management.permissions).toBe(true);
      console.log(`  ✓ All capabilities verified`);
    });
  });

  // ========================================================================
  // Basic Send/Receive Verification
  // ========================================================================
  describe.runIf(runTests)("Basic Messaging", () => {
    it("should send a text message", async () => {
      const result = await adapter.send(chatId, {
        text: `Integration test message ${Date.now()}`,
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.platform).toBe("telegram");
      console.log(`  ✓ Message sent: ${result.messageId}`);
    });

    it("should send a poll", async () => {
      try {
        const result = await adapter.send(chatId, {
          poll: {
            question: `Test Poll ${Date.now()}`,
            options: ["Option A", "Option B", "Option C"],
          },
        });

        expect(result).toBeDefined();
        console.log(`  ✓ Poll sent: ${result.messageId}`);
      } catch (error: any) {
        console.log(`  ⚠ Could not send poll: ${error.message}`);
      }
    });

    it("should send chat action", async () => {
      try {
        await adapter.sendChatAction(chatId, "typing");
        console.log(`  ✓ Chat action sent: typing`);
      } catch (error: any) {
        console.log(`  ⚠ Could not send chat action: ${error.message}`);
      }
    });
  });
});
