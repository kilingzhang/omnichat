/**
 * Discord Message Operations Integration Tests
 *
 * Tests for message operations like send, reply, edit, delete, etc.
 *
 * Run with:
 *   DISCORD_BOT_TOKEN=xxx DISCORD_CHANNEL_ID=xxx DISCORD_GUILD_ID=xxx pnpm vitest run packages/adapters/discord/integration/message-operations.integration.test.ts
 *
 * Environment variables required:
 *   DISCORD_BOT_TOKEN - A valid Discord bot token
 *   DISCORD_CHANNEL_ID - A channel ID where the bot has send permissions
 *   DISCORD_GUILD_ID - A guild ID where the bot is a member
 *   DISCORD_USER_ID - (Optional) A user ID for DM features
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { DiscordAdapter } from "../src/adapter.js";
import { delay } from "@omnichat/core";
import { getTestDelay } from "./test-utils.js";

describe("DiscordAdapter Message Operations Integration Tests", () => {
  let adapter: DiscordAdapter;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID || "123456789";
  const guildId = process.env.DISCORD_GUILD_ID || "123456789";
  const userId = process.env.DISCORD_USER_ID;

  // Skip tests if no bot token is provided
  const runTests = Boolean(botToken && botToken !== "your_bot_token_here");

  // 用于跟踪测试索引，实现智能延迟
  let testIndex = 0;

  beforeAll(async () => {
    if (runTests) {
      console.log(`\n🧪 Running message operations tests with channel: ${channelId}`);
      adapter = new DiscordAdapter();
      await adapter.init({ botToken: botToken! });

      // 初始化后等待，确保 bot 完全就绪
      await delay(3000);
    }
  });

  afterAll(async () => {
    if (runTests && adapter) {
      await adapter.destroy();
      console.log(`✅ Message operations tests completed\n`);
    }
  });

  afterEach(async () => {
    // 每个测试后添加智能延迟
    if (runTests) {
      testIndex++;
      await getTestDelay(testIndex, 30);
    }
  });

  // ========================================================================
  // Basic Send
  // ========================================================================
  describe.runIf(runTests)("Basic Send", () => {
    it("should send a text message", async () => {
      const result = await adapter.send(channelId, {
        text: `Integration test message ${Date.now()}`,
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.platform).toBe("discord");
      console.log(`  ✓ Sent text message: ${result.messageId}`);
    });

    it("should send message with media URL", async () => {
      const result = await adapter.send(channelId, {
        text: "Check this image!",
        mediaUrl: "https://picsum.photos/seed/discord-test/400/300.jpg",
      });

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent message with media: ${result.messageId}`);
    });

    it("should send embed message", async () => {
      const embed = {
        title: "Test Embed",
        description: "This is a test embed for integration testing",
        color: 0x5865F2, // Discord Blurple
        fields: [
          { name: "Field 1", value: "Value 1", inline: true },
          { name: "Field 2", value: "Value 2", inline: true },
        ],
      };

      const result = await adapter.sendEmbed(channelId, embed);

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent embed message: ${result.messageId}`);
    });
  });

  // ========================================================================
  // Message Reply
  // ========================================================================
  describe.runIf(runTests)("Message Reply", () => {
    it("should reply to a message", async () => {
      // 首先发送一条消息
      const originalMessage = await adapter.send(channelId, {
        text: `Original message for reply test ${Date.now()}`,
      });

      expect(originalMessage.messageId).toBeDefined();

      // 提取消息 ID (格式为 channelId:messageId)
      const messageId = originalMessage.messageId.includes(":")
        ? originalMessage.messageId.split(":")[1]
        : originalMessage.messageId;

      await delay(1000);

      // 回复这条消息
      const replyResult = await adapter.reply(channelId, messageId, {
        text: "This is a reply!",
      });

      expect(replyResult.messageId).toBeDefined();
      console.log(`  ✓ Replied to message ${messageId}`);
    });
  });

  // ========================================================================
  // Message Edit
  // ========================================================================
  describe.runIf(runTests)("Message Edit", () => {
    it("should edit a sent message", async () => {
      // 首先发送一条消息
      const originalMessage = await adapter.send(channelId, {
        text: "Original text to be edited",
      });

      expect(originalMessage.messageId).toBeDefined();

      const messageId = originalMessage.messageId.includes(":")
        ? originalMessage.messageId.split(":")[1]
        : originalMessage.messageId;

      await delay(1000);

      // 编辑这条消息
      const newText = `Edited text at ${Date.now()}!`;
      await adapter.edit(channelId, messageId, newText);

      console.log(`  ✓ Edited message ${messageId}`);
    });
  });

  // ========================================================================
  // Message Delete
  // ========================================================================
  describe.runIf(runTests)("Message Delete", () => {
    it("should delete a message", async () => {
      // 首先发送一条消息
      const messageToDelete = await adapter.send(channelId, {
        text: "This message will be deleted",
      });

      expect(messageToDelete.messageId).toBeDefined();

      const messageId = messageToDelete.messageId.includes(":")
        ? messageToDelete.messageId.split(":")[1]
        : messageToDelete.messageId;

      await delay(1000);

      // 删除这条消息
      await adapter.delete(channelId, messageId);

      console.log(`  ✓ Deleted message ${messageId}`);
    });
  });

  // ========================================================================
  // Reactions
  // ========================================================================
  describe.runIf(runTests)("Message Reactions", () => {
    it("should add reaction to a message", async () => {
      const message = await adapter.send(channelId, {
        text: "React to this message! 👍",
      });

      const messageId = message.messageId.includes(":")
        ? message.messageId.split(":")[1]
        : message.messageId;

      await delay(1000);

      // 添加反应
      await adapter.addReaction(channelId, messageId, "👍");

      console.log(`  ✓ Added 👍 reaction to message ${messageId}`);
    });

    it("should add multiple reactions", async () => {
      const message = await adapter.send(channelId, {
        text: "Multiple reactions test! ❤️🔥",
      });

      const messageId = message.messageId.includes(":")
        ? message.messageId.split(":")[1]
        : message.messageId;

      await delay(1000);

      await adapter.addReaction(channelId, messageId, "❤️");
      await delay(500);
      await adapter.addReaction(channelId, messageId, "🔥");

      console.log(`  ✓ Added multiple reactions to message ${messageId}`);
    });
  });

  // ========================================================================
  // Buttons
  // ========================================================================
  describe.runIf(runTests)("Interactive Buttons", () => {
    it("should send message with buttons", async () => {
      const result = await adapter.sendWithButtons(
        channelId,
        "Choose an option:",
        [
          { label: "✅ Yes", customId: "yes", style: "Success" },
          { label: "❌ No", customId: "no", style: "Danger" },
        ]
      );

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent message with buttons: ${result.messageId}`);
    });

    it("should send message with unified button format", async () => {
      const result = await adapter.send(channelId, {
        text: "Unified button format test",
        buttons: [
          [
            { text: "Option 1", data: "opt1" },
            { text: "Option 2", data: "opt2" },
          ],
          [{ text: "Cancel", data: "cancel" }],
        ],
      });

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent message with unified buttons: ${result.messageId}`);
    });
  });

  // ========================================================================
  // Combined Operations
  // ========================================================================
  describe.runIf(runTests)("Combined Operations", () => {
    it("should send, reply, edit, and delete in sequence", async () => {
      // 发送原始消息
      const original = await adapter.send(channelId, {
        text: "Step 1: Original message",
      });
      const originalMsgId = original.messageId.includes(":")
        ? original.messageId.split(":")[1]
        : original.messageId;
      await delay(1000);

      // 回复
      const reply = await adapter.reply(channelId, originalMsgId, {
        text: "Step 2: Reply",
      });
      const replyMsgId = reply.messageId.includes(":")
        ? reply.messageId.split(":")[1]
        : reply.messageId;
      await delay(1000);

      // 编辑回复
      await adapter.edit(channelId, replyMsgId, "Step 3: Edited reply");
      await delay(1000);

      // 删除回复
      await adapter.delete(channelId, replyMsgId);

      console.log(`  ✓ Completed combined operations sequence`);
    });
  });
});
