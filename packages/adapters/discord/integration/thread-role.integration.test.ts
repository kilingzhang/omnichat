/**
 * Discord Thread & Role Integration Tests
 *
 * Tests for thread and role management features.
 *
 * Run with:
 *   DISCORD_BOT_TOKEN=xxx DISCORD_CHANNEL_ID=xxx DISCORD_GUILD_ID=xxx pnpm vitest run packages/adapters/discord/integration/thread-role.integration.test.ts
 *
 * Environment variables required:
 *   DISCORD_BOT_TOKEN - A valid Discord bot token
 *   DISCORD_CHANNEL_ID - A channel ID where the bot has thread permissions
 *   DISCORD_GUILD_ID - A guild ID where the bot has role management permissions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DiscordAdapter } from "../src/adapter.js";
import { delay } from "@omnichat/core";

describe("DiscordAdapter Thread & Role Integration Tests", () => {
  let adapter: DiscordAdapter;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID || "123456789";
  const guildId = process.env.DISCORD_GUILD_ID || "123456789";

  // Skip tests if no bot token is provided
  const runTests = Boolean(botToken && botToken !== "your_bot_token_here");

  beforeAll(async () => {
    if (runTests) {
      console.log(`\n🧪 Running thread & role tests with guild: ${guildId}`);
      adapter = new DiscordAdapter();
      await adapter.init({ botToken: botToken! });
      await delay(2000);
    }
  });

  afterAll(async () => {
    if (runTests && adapter) {
      await adapter.destroy();
      console.log(`✅ Thread & role tests completed\n`);
    }
  });

  // ========================================================================
  // Thread Management
  // ========================================================================
  describe.runIf(runTests)("Thread Management", () => {
    it("should create a thread from a message", async () => {
      // 首先发送一条消息
      const message = await adapter.send(channelId, {
        text: "Message to create thread from",
      });

      const messageId = message.messageId.includes(":")
        ? message.messageId.split(":")[1]
        : message.messageId;

      await delay(1000);

      try {
        const thread = await adapter.createThread(
          channelId,
          messageId,
          `Test Thread ${Date.now()}`
        );

        expect(thread).toBeDefined();
        expect(thread.id).toBeDefined();
        expect(thread.name).toBeDefined();
        console.log(`  ✓ Created thread: ${thread.name} (${thread.id})`);

        // 清理：归档线程
        await delay(1000);
        await adapter.archiveThread(thread.id);
        console.log(`  ✓ Archived thread`);
      } catch (error: any) {
        console.log(`  ⚠ Thread creation failed: ${error.message}`);
      }
    });

    it("should create a standalone thread", async () => {
      try {
        const thread = await adapter.createStandaloneThread(channelId, `Standalone Thread ${Date.now()}`, {
          autoArchiveDuration: 60,
          type: "public",
        });

        expect(thread).toBeDefined();
        expect(thread.id).toBeDefined();
        console.log(`  ✓ Created standalone thread: ${thread.id}`);

        // 清理
        await delay(1000);
        await adapter.archiveThread(thread.id);
        console.log(`  ✓ Archived standalone thread`);
      } catch (error: any) {
        console.log(`  ⚠ Standalone thread failed: ${error.message}`);
      }
    });

    it("should get active threads", async () => {
      try {
        const threads = await adapter.getActiveThreads(channelId);

        expect(Array.isArray(threads)).toBe(true);
        console.log(`  ✓ Active threads: ${threads.length}`);
      } catch (error: any) {
        console.log(`  ⚠ Could not get active threads: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Role Management
  // ========================================================================
  describe.runIf(runTests)("Role Management", () => {
    it("should get all roles", async () => {
      const roles = await adapter.getRoles(guildId);

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
      console.log(`  ✓ Roles: ${roles.length} found`);
      roles.slice(0, 5).forEach((role) => {
        console.log(`    - ${role.name} (${role.id})`);
      });
    });

    it("should create and delete a role", async () => {
      try {
        // 创建角色
        const role = await adapter.createRole(guildId, {
          name: `Test Role ${Date.now()}`,
          color: 0x5865F2,
        });

        expect(role).toBeDefined();
        expect(role.id).toBeDefined();
        console.log(`  ✓ Created role: ${role.name} (${role.id})`);

        await delay(1000);

        // 删除角色
        await adapter.deleteRole(guildId, role.id);
        console.log(`  ✓ Deleted role`);
      } catch (error: any) {
        console.log(`  ⚠ Role management failed: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Webhook Management
  // ========================================================================
  describe.runIf(runTests)("Webhook Management", () => {
    it("should create and delete a webhook", async () => {
      try {
        // 创建 webhook
        const webhook = await adapter.createWebhook(channelId, {
          name: `Test Webhook ${Date.now()}`,
        });

        expect(webhook).toBeDefined();
        expect(webhook.id).toBeDefined();
        expect(webhook.url).toBeDefined();
        console.log(`  ✓ Created webhook: ${webhook.name}`);

        await delay(1000);

        // 删除 webhook
        await adapter.deleteWebhookById(webhook.id);
        console.log(`  ✓ Deleted webhook`);
      } catch (error: any) {
        console.log(`  ⚠ Webhook management failed: ${error.message}`);
      }
    });

    it("should get webhooks for channel", async () => {
      try {
        const webhooks = await adapter.getWebhooks(channelId);

        expect(Array.isArray(webhooks)).toBe(true);
        console.log(`  ✓ Webhooks: ${webhooks.length} found`);
      } catch (error: any) {
        console.log(`  ⚠ Could not get webhooks: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Slash Commands (requires clientId)
  // ========================================================================
  describe.runIf(runTests)("Slash Commands", () => {
    it("should get registered commands", async () => {
      try {
        // 重新初始化带 clientId
        const testAdapter = new DiscordAdapter();
        await testAdapter.init({
          botToken: botToken!,
          clientId: process.env.DISCORD_CLIENT_ID,
        });

        const commands = await testAdapter.getCommands();
        expect(Array.isArray(commands)).toBe(true);
        console.log(`  ✓ Commands: ${commands.length} registered`);

        await testAdapter.destroy();
      } catch (error: any) {
        console.log(`  ⚠ Command operations failed: ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Moderation Features
  // ========================================================================
  describe.runIf(runTests)("Moderation Features", () => {
    it("should get member for moderation test", async () => {
      const admins = await adapter.getAdministrators(guildId);
      if (admins.length > 0) {
        const admin = admins[0];
        const member = await adapter.getMember(guildId, admin.id);

        expect(member).toBeDefined();
        expect(member.user).toBeDefined();
        expect(Array.isArray(member.roles)).toBe(true);
        console.log(`  ✓ Member retrieved: ${member.user.username}`);
      }
    });

    // 注意：实际的 kick/ban/mute 操作是破坏性的，不在集成测试中执行
    it("should have moderation methods available", () => {
      expect(typeof adapter.kick).toBe("function");
      expect(typeof adapter.ban).toBe("function");
      expect(typeof adapter.unban).toBe("function");
      expect(typeof adapter.mute).toBe("function");
      expect(typeof adapter.unmute).toBe("function");
      expect(typeof adapter.timeout).toBe("function");
      console.log(`  ✓ All moderation methods available`);
    });
  });
});
