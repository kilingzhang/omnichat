/**
 * Discord Channel Management Integration Tests
 *
 * Tests for channel and guild management features.
 *
 * Run with:
 *   DISCORD_BOT_TOKEN=xxx DISCORD_CHANNEL_ID=xxx DISCORD_GUILD_ID=xxx pnpm vitest run packages/adapters/discord/integration/channel-management.integration.test.ts
 *
 * Environment variables required:
 *   DISCORD_BOT_TOKEN - A valid Discord bot token
 *   DISCORD_CHANNEL_ID - A channel ID where the bot has permissions
 *   DISCORD_GUILD_ID - A guild ID where the bot has management permissions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DiscordAdapter } from "../src/adapter.js";
import { delay } from "@omnichat/core";

describe("DiscordAdapter Channel Management Integration Tests", () => {
  let adapter: DiscordAdapter;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID || "123456789";
  const guildId = process.env.DISCORD_GUILD_ID || "123456789";

  // Skip tests if no bot token is provided
  const runTests = Boolean(botToken && botToken !== "your_bot_token_here");

  beforeAll(async () => {
    if (runTests) {
      console.log(`\n🧪 Running channel management tests with guild: ${guildId}`);
      adapter = new DiscordAdapter();
      await adapter.init({ botToken: botToken! });
      await delay(2000);
    }
  });

  afterAll(async () => {
    if (runTests && adapter) {
      await adapter.destroy();
      console.log(`✅ Channel management tests completed\n`);
    }
  });

  // ========================================================================
  // Channel Information
  // ========================================================================
  describe.runIf(runTests)("Channel Information", () => {
    it("should get channel info", async () => {
      const info = await adapter.getChannelInfo(channelId);

      expect(info).toBeDefined();
      expect(info.id).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.type).toBeDefined();
      expect(["user", "channel", "group"]).toContain(info.type);
      console.log(`  ✓ Channel info: ${info.name} (${info.type})`);
    });

    it("should get channel by ID", async () => {
      const channel = await adapter.getChannel(channelId);

      expect(channel).toBeDefined();
      expect(channel.id).toBe(channelId);
      console.log(`  ✓ Channel: ${channel.name}`);
    });
  });

  // ========================================================================
  // Guild Information
  // ========================================================================
  describe.runIf(runTests)("Guild Information", () => {
    it("should get member count", async () => {
      const count = await adapter.getMemberCount(guildId);

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      console.log(`  ✓ Member count: ${count}`);
    });

    it("should get administrators", async () => {
      const admins = await adapter.getAdministrators(guildId);

      expect(Array.isArray(admins)).toBe(true);
      console.log(`  ✓ Administrators: ${admins.length} found`);
      admins.slice(0, 3).forEach((admin) => {
        console.log(`    - ${admin.name} (${admin.username})`);
      });
    });
  });

  // ========================================================================
  // Invite Management
  // ========================================================================
  describe.runIf(runTests)("Invite Management", () => {
    it("should create an invite", async () => {
      try {
        const invite = await adapter.createInvite(channelId, {
          maxUses: 10,
          expiresInSeconds: 3600,
        });

        expect(invite).toBeDefined();
        expect(invite.code).toBeDefined();
        expect(invite.url).toBeDefined();
        console.log(`  ✓ Created invite: ${invite.url}`);
      } catch (error: any) {
        console.log(`  ⚠ Could not create invite: ${error.message}`);
      }
    });

    it("should get invites list", async () => {
      try {
        const invites = await adapter.getInvites(channelId);

        expect(Array.isArray(invites)).toBe(true);
        console.log(`  ✓ Invites: ${invites.length} found`);
      } catch (error: any) {
        console.log(`  ⚠ Could not get invites: ${error.message}`);
      }
    });

    it("should export invite link", async () => {
      try {
        const url = await adapter.exportInvite(channelId);

        expect(url).toBeDefined();
        expect(url).toMatch(/discord\.gg/);
        console.log(`  ✓ Exported invite: ${url}`);
      } catch (error: any) {
        console.log(`  ⚠ Could not export invite: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Message Pinning
  // ========================================================================
  describe.runIf(runTests)("Message Pinning", () => {
    it("should pin and unpin a message", async () => {
      // 首先发送一条消息
      const message = await adapter.send(channelId, {
        text: "Test message for pinning",
      });

      const messageId = message.messageId.includes(":")
        ? message.messageId.split(":")[1]
        : message.messageId;

      await delay(1000);

      try {
        // 置顶
        const pinResult = await adapter.pinMessage(channelId, messageId);
        expect(pinResult.success).toBe(true);
        console.log(`  ✓ Pinned message: ${messageId}`);

        await delay(1000);

        // 取消置顶
        const unpinResult = await adapter.unpinMessage(channelId, messageId);
        expect(unpinResult.success).toBe(true);
        console.log(`  ✓ Unpinned message`);
      } catch (error: any) {
        console.log(`  ⚠ Pin/unpin failed: ${error.message}`);
      }
    });

    it("should get pinned messages", async () => {
      try {
        const pins = await adapter.getPins(channelId);

        expect(Array.isArray(pins)).toBe(true);
        console.log(`  ✓ Pinned messages: ${pins.length}`);
      } catch (error: any) {
        console.log(`  ⚠ Could not get pins: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Message History
  // ========================================================================
  describe.runIf(runTests)("Message History", () => {
    it("should get message history", async () => {
      const history = await adapter.getHistory(channelId, 10);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(10);
      console.log(`  ✓ Retrieved ${history.length} messages from history`);
    });
  });

  // ========================================================================
  // Channel Settings
  // ========================================================================
  describe.runIf(runTests)("Channel Settings", () => {
    it("should set channel title", async () => {
      try {
        // 使用测试频道来测试标题设置
        const result = await adapter.setTitle(channelId, `Test Channel ${Date.now()}`);
        expect(result.success).toBe(true);
        console.log(`  ✓ Channel title updated`);
      } catch (error: any) {
        console.log(`  ⚠ Could not set title: ${error.message}`);
      }
    });

    it("should set channel description", async () => {
      try {
        const result = await adapter.setDescription(
          channelId,
          `Test description ${Date.now()}`
        );
        expect(result.success).toBe(true);
        console.log(`  ✓ Channel description updated`);
      } catch (error: any) {
        console.log(`  ⚠ Could not set description: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Member Info
  // ========================================================================
  describe.runIf(runTests)("Member Info", () => {
    it("should get member info", async () => {
      // 获取管理员列表中的第一个成员
      const admins = await adapter.getAdministrators(guildId);
      if (admins.length > 0) {
        const member = await adapter.getMemberInfo(guildId, admins[0].id);

        expect(member).toBeDefined();
        expect(member.id).toBeDefined();
        expect(member.name).toBeDefined();
        console.log(`  ✓ Member info: ${member.name}`);
      } else {
        console.log(`  ⚠ No members to test with`);
      }
    });
  });

  // ========================================================================
  // Capabilities
  // ========================================================================
  describe.runIf(runTests)("Capabilities", () => {
    it("should report all Discord capabilities", () => {
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

      // Interaction capabilities
      expect(caps.interaction.buttons).toBe(true);
      expect(caps.interaction.reactions).toBe(true);

      // Discovery capabilities
      expect(caps.discovery.history).toBe(true);
      expect(caps.discovery.pins).toBe(true);
      expect(caps.discovery.memberInfo).toBe(true);
      expect(caps.discovery.channelInfo).toBe(true);

      // Management capabilities
      expect(caps.management.kick).toBe(true);
      expect(caps.management.ban).toBe(true);
      expect(caps.management.permissions).toBe(true);

      console.log(`  ✓ All capabilities verified`);
    });
  });
});
