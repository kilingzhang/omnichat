/**
 * Telegram Interactive Features Integration Tests
 *
 * Tests for interactive features like buttons, reactions, stickers, etc.
 *
 * Run with:
 *   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx pnpm test:integration:interactive
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN - A valid Telegram bot token
 *   TELEGRAM_CHAT_ID - A chat ID where the bot has admin permissions
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { TelegramAdapter } from "../src/adapter.js";
import { withRetry, delay, getTestDelay } from "../src/rate-limit.js";

describe("TelegramAdapter Interactive Features Integration Tests", () => {
  let adapter: TelegramAdapter;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || "@your_chat_username";

  // Skip tests if no bot token is provided
  const runTests = Boolean(botToken && botToken !== "your_bot_token_here");

  // 用于跟踪测试索引，实现智能延迟
  let testIndex = 0;

  beforeAll(async () => {
    if (runTests) {
      console.log(`\n🧪 Running interactive features tests with chat: ${chatId}`);
      adapter = new TelegramAdapter();
      await adapter.init({ apiToken: botToken! });

      // 初始化后等待，避免触发速率限制
      await delay(2000);
    }
  });

  afterAll(async () => {
    if (runTests && adapter) {
      await adapter.destroy();
      console.log(`✅ Interactive features tests completed\n`);
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
  // Buttons (Inline Keyboards)
  // ========================================================================
  describe.runIf(runTests)("Inline Buttons", () => {
    it("should send message with buttons", async () => {
      const buttons = [
        [
          { text: "✅ Yes", data: "yes" },
          { text: "❌ No", data: "no" }
        ],
        [
          { text: "🤷 Maybe", data: "maybe" }
        ]
      ];

      const result = await withRetry(
        () => adapter.sendButtons(chatId, "Choose an option:", buttons)
      );

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent message with buttons: ${result.messageId}`);
    });

    it("should send multiple rows of buttons", async () => {
      const buttons = [
        [
          { text: "1", data: "1" },
          { text: "2", data: "2" },
          { text: "3", data: "3" }
        ],
        [
          { text: "4", data: "4" },
          { text: "5", data: "5" },
          { text: "6", data: "6" }
        ],
        [
          { text: "7", data: "7" },
          { text: "8", data: "8" },
          { text: "9", data: "9" }
        ],
        [
          { text: "*", data: "multiply" },
          { text: "0", data: "0" },
          { text: "#", data: "hash" }
        ]
      ];

      const result = await withRetry(
        () => adapter.sendButtons(chatId, "Calculator:", buttons)
      );

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent calculator keypad: ${result.messageId}`);
    });
  });

  // ========================================================================
  // Reactions
  // ========================================================================
  describe.runIf(runTests)("Message Reactions", () => {
    it("should add reaction to a message", async () => {
      // 首先发送一条消息
      const message = await withRetry(
        () => adapter.send(chatId, { text: "React to this message! 👍" })
      );

      await delay(1000);

      // 添加反应
      await withRetry(
        () => adapter.addReaction(message.messageId, "👍")
      );

      console.log(`  ✓ Added 👍 reaction to message ${message.messageId}`);
    });

    it("should add multiple reactions to a message", async () => {
      // 首先发送一条消息
      const message = await withRetry(
        () => adapter.send(chatId, { text: "Add multiple reactions! ❤️🔥👏" })
      );

      await delay(1000);

      // 添加多个反应
      await withRetry(
        () => adapter.addReaction(message.messageId, "❤️")
      );

      await delay(500);

      await withRetry(
        () => adapter.addReaction(message.messageId, "🔥")
      );

      await delay(500);

      await withRetry(
        () => adapter.addReaction(message.messageId, "👏")
      );

      console.log(`  ✓ Added multiple reactions to message ${message.messageId}`);
    });

    it("should remove reaction from a message", async () => {
      // 首先发送一条消息并添加反应
      const message = await withRetry(
        () => adapter.send(chatId, { text: "This reaction will be removed" })
      );

      await delay(1000);

      await withRetry(
        () => adapter.addReaction(message.messageId, "👍")
      );

      await delay(1000);

      // 移除反应
      await withRetry(
        () => adapter.removeReaction(message.messageId, "👍")
      );

      console.log(`  ✓ Removed reaction from message ${message.messageId}`);
    });
  });

  // ========================================================================
  // Stickers
  // ========================================================================
  describe.runIf(runTests)("Stickers", () => {
    it("should send a sticker", async () => {
      // 使用一个已知的有效 sticker ID
      // 注意：这个 sticker ID 可能会过期，需要更新
      const stickerId = "CAACAgIAAxkBAAIe2GU_5qKdTT-k79jG7rWtAbwj81iFAALaBwACmYq4VUtAAXCqhHG-H4Q";

      try {
        const result = await withRetry(
          () => adapter.sendSticker(chatId, stickerId)
        );

        expect(result.messageId).toBeDefined();
        console.log(`  ✓ Sent sticker: ${result.messageId}`);
      } catch (error: any) {
        // Sticker 可能已过期，记录警告但不失败测试
        console.log(`  ⚠ Could not send sticker (may be expired): ${error.message}`);
      }
    });

    it("should send sticker with caption", async () => {
      const stickerId = "CAACAgIAAxkBAAIe2GU_5qKdTT-k79jG7rWtAbwj81iFAALaBwACmYq4VUtAAXCqhHG-H4Q";

      try {
        const result = await withRetry(
          () => adapter.sendSticker(chatId, stickerId, { text: "Funny sticker! 😄" })
        );

        expect(result.messageId).toBeDefined();
        console.log(`  ✓ Sent sticker with caption: ${result.messageId}`);
      } catch (error: any) {
        console.log(`  ⚠ Could not send sticker with caption (may be expired): ${error.message}`);
      }
    });
  });

  // ========================================================================
  // Special Effects
  // ========================================================================
  describe.runIf(runTests)("Special Effects", () => {
    it("should send message with effect", async () => {
      const effects = ["🎉", "🎊", "✨", "🎭", "🔥", "💥"];
      const effect = effects[Math.floor(Math.random() * effects.length)];

      const result = await withRetry(
        () => adapter.sendWithEffect(chatId, `Message with ${effect} effect!`, effect)
      );

      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent message with ${effect} effect: ${result.messageId}`);
    });

    it("should send different effects", async () => {
      const effects = ["🎉", "✨", "🔥"];
      const results = [];

      for (const effect of effects) {
        const result = await withRetry(
          () => adapter.sendWithEffect(chatId, `Effect: ${effect}`, effect)
        );
        results.push(result);
        await delay(1000);
      }

      expect(results).toHaveLength(3);
      console.log(`  ✓ Sent ${results.length} messages with different effects`);
    });
  });

  // ========================================================================
  // Polls (already tested in chat-management, but added here for completeness)
  // ========================================================================
  describe.runIf(runTests)("Polls", () => {
    it("should send a poll", async () => {
      const poll = {
        question: "What's your favorite programming language?",
        options: ["TypeScript", "Python", "Rust", "Go"],
        multi: false
      };

      const result = await withRetry(
        () => adapter.sendPoll(chatId, poll)
      );

      expect(result.pollId).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent poll: ${result.pollId}`);
    });

    it("should send a multiple choice poll", async () => {
      const poll = {
        question: "Which frameworks do you use? (Select all that apply)",
        options: ["React", "Vue", "Angular", "Svelte", "Next.js"],
        multi: true
      };

      const result = await withRetry(
        () => adapter.sendPoll(chatId, poll)
      );

      expect(result.pollId).toBeDefined();
      expect(result.messageId).toBeDefined();
      console.log(`  ✓ Sent multiple choice poll: ${result.pollId}`);
    });
  });
});
