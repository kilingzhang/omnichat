/**
 * Example usage of Universal IM SDK
 */

import { SDK } from "@omnichat/core";
import { TelegramAdapter } from "@omnichat/telegram";
import { loadConfig } from "./config.js";

async function main() {
  console.log("🚀 Initializing Universal IM SDK...\n");

  const config = loadConfig();

  // Initialize SDK with Telegram adapter
  const sdk = new SDK({
    adapters: {
      telegram: {
        class: TelegramAdapter,
        config: {
          apiToken: config.telegram?.apiToken || "YOUR_BOT_TOKEN_HERE",
          polling: config.telegram?.polling ?? true,
        },
      },
    },
    globalConfig: {
      debug: true,
    },
  });

  // Initialize the SDK
  await sdk.init();
  console.log("✅ SDK initialized successfully!\n");

  // Check capabilities
  const telegramCaps = sdk.getCapabilities("telegram");
  console.log("📋 Telegram capabilities:");
  console.log(`  - Send text: ${telegramCaps?.base.sendText}`);
  console.log(`  - Send media: ${telegramCaps?.base.sendMedia}`);
  console.log(`  - Reply: ${telegramCaps?.conversation.reply}`);
  console.log(`  - Edit: ${telegramCaps?.conversation.edit}`);
  console.log(`  - Delete: ${telegramCaps?.conversation.delete}`);
  console.log(`  - Buttons: ${telegramCaps?.interaction.buttons}`);
  console.log(`  - Reactions: ${telegramCaps?.interaction.reactions}`);
  console.log(`  - Stickers: ${telegramCaps?.interaction.stickers}\n`);

  // Check if specific capabilities are supported
  console.log("🔍 Capability checks:");
  console.log(`  - Can reply: ${sdk.hasCapability("telegram", "conversation", "reply")}`);
  console.log(`  - Can send polls: ${sdk.hasCapability("telegram", "interaction", "polls")}`);
  console.log(`  - Can search: ${sdk.hasCapability("telegram", "discovery", "search")}\n`);

  // Register message handler
  sdk.on(async (message) => {
    console.log("📨 New message received:");
    console.log(`  Platform: ${message.platform}`);
    console.log(`  From: ${message.from.name} (${message.from.id})`);
    console.log(`  Type: ${message.type}`);
    console.log(`  Content: ${message.content.text || "[Media/Sticker]"}`);

    // Echo back the message
    try {
      await sdk.send(message.platform, {
        text: `Echo: ${message.content.text || "Got it!"}`,
      }, {
        to: message.from.id,
      });
      console.log("✅ Reply sent!\n");
    } catch (error) {
      console.error("❌ Failed to send reply:", error);
    }
  });

  // Example: Send a message with buttons (if you have a chat ID)
  // Uncomment and set your chat ID to test:
  /*
  const chatId = "YOUR_CHAT_ID";
  await sdk.sendButtons("telegram", chatId, "Choose an option:", [
    [{ text: "Option A", data: "a" }],
    [{ text: "Option B", data: "b" }],
  ]);
  console.log("✅ Buttons sent!\n");
  */

  // Example: Add a reaction (requires message ID)
  /*
  await sdk.addReaction("telegram", "CHAT_ID:MESSAGE_ID", "👍");
  console.log("✅ Reaction added!\n");
  */

  console.log("🎯 Bot is running. Press Ctrl+C to stop.\n");

  // Keep the process running
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down...");
    await sdk.destroy();
    process.exit(0);
  });
}

// Run the example
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
