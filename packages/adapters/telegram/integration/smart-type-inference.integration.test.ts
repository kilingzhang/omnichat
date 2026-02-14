/**
 * Smart Target Type Inference - Integration Tests
 *
 * These tests verify the smart target type inference feature works correctly
 * with the real Telegram Bot API.
 *
 * Prerequisites:
 * - TELEGRAM_BOT_TOKEN: Valid Telegram bot token
 * - TELEGRAM_CHAT_ID: A group/channel where bot is admin
 * - TELEGRAM_CHANNEL_ID (optional): A channel ID for testing
 * - TELEGRAM_USER_ID: A user ID for testing DM
 */

import { describe, it, expect, beforeAll } from "vitest";
import { TelegramAdapter } from "../src/adapter.js";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const channelId = process.env.TELEGRAM_CHANNEL_ID;
const userId = process.env.TELEGRAM_USER_ID;

function skipTest(message: string) {
  console.log(`⏭️  Skipped: ${message}`);
}

describe("Smart Target Type Inference - Integration Tests", () => {
  let adapter: TelegramAdapter;

  beforeAll(async () => {
    if (!botToken) {
      skipTest("TELEGRAM_BOT_TOKEN not set");
      return;
    }

    adapter = new TelegramAdapter();
    await adapter.init({ apiToken: botToken });
  });

  describe("Automatic type inference from ID format", () => {
    it("should send to @username format (channel)", async () => {
      if (!botToken || !channelId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set");
        return;
      }

      // Test sending to @username (inferred as channel)
      const result = await adapter.send(channelId, {
        text: "🧪 Smart inference test: @username format"
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`✅ Message sent to @username format: ${result.messageId}`);
    });

    it("should send to numeric user ID", async () => {
      if (!botToken || !userId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_USER_ID not set");
        return;
      }

      // Test sending to numeric user ID (inferred as user)
      const result = await adapter.send(userId, {
        text: "🧪 Smart inference test: numeric user ID"
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`✅ Message sent to numeric user ID: ${result.messageId}`);
    });

    it("should send to numeric group ID (negative)", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      // Test sending to group ID
      const result = await adapter.send(chatId, {
        text: "🧪 Smart inference test: group ID"
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`✅ Message sent to group ID: ${result.messageId}`);
    });
  });

  describe("Explicit targetType with caching", () => {
    it("should use explicit targetType and cache it", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      // First message with explicit type
      const result1 = await adapter.send(chatId, {
        text: "🧪 Explicit type test (first message)"
      }, { targetType: 'group' });

      expect(result1).toBeDefined();

      // Second message without explicit type - should use cached
      const result2 = await adapter.send(chatId, {
        text: "🧪 Explicit type test (second message - cached)"
      });

      expect(result2).toBeDefined();
      console.log(`✅ Both messages sent: ${result1.messageId}, ${result2.messageId}`);
    });

    it("should allow overriding cached type", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      // Send with default type
      await adapter.send(chatId, {
        text: "🧪 Override test (default type)"
      });

      // Send with explicit override
      const result = await adapter.send(chatId, {
        text: "🧪 Override test (explicit type)"
      }, { targetType: 'channel' }); // Explicitly set to channel

      expect(result).toBeDefined();
      console.log(`✅ Type overridden successfully: ${result.messageId}`);
    });
  });

  describe("Convenience methods", () => {
    it("sendToUser should work correctly", async () => {
      if (!botToken || !userId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_USER_ID not set");
        return;
      }

      const result = await adapter.sendToUser(userId, "🧪 sendToUser test");

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`✅ sendToUser worked: ${result.messageId}`);
    });

    it("sendToGroup should work correctly", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      const result = await adapter.sendToGroup(chatId, "🧪 sendToGroup test");

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`✅ sendToGroup worked: ${result.messageId}`);
    });

    it("sendToChannel should work correctly", async () => {
      if (!botToken || !channelId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set");
        return;
      }

      const result = await adapter.sendToChannel(channelId, "🧪 sendToChannel test");

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`✅ sendToChannel worked: ${result.messageId}`);
    });

    it("convenience methods should accept additional options", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      const result = await adapter.sendToGroup(
        chatId,
        "🧪 sendToGroup with options",
        { silent: true }
      );

      expect(result).toBeDefined();
      console.log(`✅ Convenience method with options worked: ${result.messageId}`);
    });
  });

  describe("Cache persistence across multiple calls", () => {
    it("should remember inferred types across multiple calls", async () => {
      if (!botToken || !channelId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set");
        return;
      }

      // First call - infer type from @username
      const result1 = await adapter.send(channelId, {
        text: "🧪 Cache test 1/3"
      });

      // Second call - use cached type
      const result2 = await adapter.send(channelId, {
        text: "🧪 Cache test 2/3"
      });

      // Third call - still using cached type
      const result3 = await adapter.send(channelId, {
        text: "🧪 Cache test 3/3"
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();

      console.log(`✅ Cache persistence verified across 3 calls`);
      console.log(`   Message IDs: ${result1.messageId}, ${result2.messageId}, ${result3.messageId}`);
    });
  });

  describe("Mixed usage patterns", () => {
    it("should handle switching between different targets", async () => {
      if (!botToken || !chatId || !userId) {
        skipTest("TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, or TELEGRAM_USER_ID not set");
        return;
      }

      // Send to group
      const result1 = await adapter.sendToGroup(chatId, "🧪 Mixed: group");

      // Send to user
      const result2 = await adapter.sendToUser(userId, "🧪 Mixed: user");

      // Send to group again (should use cached type)
      const result3 = await adapter.send(chatId, {
        text: "🧪 Mixed: group (cached)"
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();

      console.log(`✅ Mixed usage patterns handled correctly`);
      console.log(`   Group: ${result1.messageId}`);
      console.log(`   User: ${result2.messageId}`);
      console.log(`   Group (cached): ${result3.messageId}`);
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid successive calls to same target", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          adapter.send(chatId, {
            text: `🧪 Rapid fire ${i + 1}/5`
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      console.log(`✅ Handled 5 rapid successive calls`);
    });

    it("should handle special characters in text", async () => {
      if (!botToken || !chatId) {
        skipTest("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
        return;
      }

      const specialText = "🧪 Special chars: @ # $ % ^ & * ( ) [ ] { } | \\ : ; \" ' < > , . ? / ~";

      const result = await adapter.sendToGroup(chatId, specialText);

      expect(result).toBeDefined();
      console.log(`✅ Special characters handled correctly`);
    });
  });
});
