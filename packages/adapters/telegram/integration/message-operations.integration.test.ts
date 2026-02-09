/**
 * Telegram Message Operations Integration Tests
 *
 * Tests for message operations like reply, edit, delete, forward, etc.
 *
 * Run with:
 *   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx TELEGRAM_USER_ID=xxx pnpm test:integration:message-ops
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN - A valid Telegram bot token
 *   TELEGRAM_CHAT_ID - A chat ID where the bot has admin permissions
 *   TELEGRAM_USER_ID - A user ID for DM features
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { TelegramAdapter } from "../src/adapter.js";
import { withRetry, delay } from "@omnichat/core";
import { getTestDelay } from "./test-utils.js";

describe("TelegramAdapter Message Operations Integration Tests", () => {
  let adapter: TelegramAdapter;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || "@your_chat_username";
  const userId = process.env.TELEGRAM_USER_ID || "123456789";

  // Skip tests if no bot token is provided
  const runTests = Boolean(botToken && botToken !== "your_bot_token_here");

  // 用于跟踪测试索引，实现智能延迟
  let testIndex = 0;

  beforeAll(async () => {
    if (runTests) {
      console.log(`\n🧪 Running message operations tests with chat: ${chatId}`);
      adapter = new TelegramAdapter();
      await adapter.init({ apiToken: botToken! });

      // 初始化后等待，避免触发速率限制
      await delay(2000);
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
      await getTestDelay(testIndex, 15); // 每分钟 15 个测试（保守估计）
    }
  });

  // ========================================================================
  // Message Reply
  // ========================================================================
  describe.runIf(runTests)("Message Reply", () => {
    it("should reply to a message", async () => {
      // 首先发送一条消息
      const originalMessage = await withRetry(
        () => adapter.send(chatId, { text: `Original message for reply test ${Date.now()}` })
      );

      expect(originalMessage.messageId).toBeDefined();

      // 等待一下
      await delay(1000);

      // 回复这条消息
      const replyResult = await withRetry(
        () => adapter.reply(originalMessage.messageId, { text: "This is a reply!" })
      );

      expect(replyResult.messageId).toBeDefined();
      console.log(`  ✓ Replied to message ${originalMessage.messageId}`);
    });
  });

  // ========================================================================
  // Message Edit
  // ========================================================================
  describe.runIf(runTests)("Message Edit", () => {
    it("should edit a sent message", async () => {
      // 首先发送一条消息
      const originalMessage = await withRetry(
        () => adapter.send(chatId, { text: "Original text to be edited" })
      );

      expect(originalMessage.messageId).toBeDefined();

      // 等待一下
      await delay(1000);

      // 编辑这条消息
      const newText = "Edited text!";
      await withRetry(
        () => adapter.edit(originalMessage.messageId, newText)
      );

      console.log(`  ✓ Edited message ${originalMessage.messageId}`);
    });
  });

  // ========================================================================
  // Message Delete
  // ========================================================================
  describe.runIf(runTests)("Message Delete", () => {
    it("should delete a message", async () => {
      // 首先发送一条消息
      const messageToDelete = await withRetry(
        () => adapter.send(chatId, { text: "This message will be deleted" })
      );

      expect(messageToDelete.messageId).toBeDefined();

      // 等待一下
      await delay(1000);

      // 删除这条消息
      await withRetry(
        () => adapter.delete(messageToDelete.messageId)
      );

      console.log(`  ✓ Deleted message ${messageToDelete.messageId}`);
    });
  });

  // ========================================================================
  // Message Forward
  // ========================================================================
  describe.runIf(runTests)("Message Forward", () => {
    it("should forward a message to another chat", async () => {
      // 首先在源聊天发送一条消息
      const originalMessage = await withRetry(
        () => adapter.send(chatId, { text: "Message to be forwarded" })
      );

      expect(originalMessage.messageId).toBeDefined();

      // 等待一下
      await delay(1000);

      // 转发到同一个聊天（实际使用中应该转发到不同的聊天）
      const forwardResult = await withRetry(
        () => adapter.forwardMessage(chatId, chatId, {
          replyToMessageId: originalMessage.messageId
        })
      );

      expect(forwardResult.messageId).toBeDefined();
      console.log(`  ✓ Forwarded message ${originalMessage.messageId}`);
    });
  });

  // ========================================================================
  // Combined Operations
  // ========================================================================
  describe.runIf(runTests)("Combined Operations", () => {
    it("should send, reply, edit, and delete in sequence", async () => {
      // 发送原始消息
      const original = await withRetry(
        () => adapter.send(chatId, { text: "Step 1: Original message" })
      );
      await delay(1000);

      // 回复
      const reply = await withRetry(
        () => adapter.reply(original.messageId, { text: "Step 2: Reply" })
      );
      await delay(1000);

      // 编辑回复
      await withRetry(
        () => adapter.edit(reply.messageId, "Step 3: Edited reply")
      );
      await delay(1000);

      // 删除回复
      await withRetry(
        () => adapter.delete(reply.messageId)
      );

      console.log(`  ✓ Completed combined operations sequence`);
    });
  });
});
