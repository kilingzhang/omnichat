/**
 * Callback Query Handler
 * Handles button clicks from inline keyboards
 */

import type { Message, SDK } from "@omnichat/core";
import type { ButtonCallbackData } from "../types.js";

/**
 * Handle callback query (button click)
 */
export async function handleCallbackQuery(
  message: Message,
  sdk: SDK
): Promise<boolean> {
  if (message.type !== "callback") {
    return false;
  }

  console.log("🔘 Button Click Detected!");
  console.log("   Callback Data:", message.content.text || "[No data]");

  const callbackData = (message.content.text || "") as ButtonCallbackData;

  try {
    let responseText = "";
    let showAlert = false;

    switch (callbackData) {
      case "info":
        responseText = "ℹ️ Info Button Clicked!\n\nThis is a demonstration of inline button handling in the Omnichat SDK.";
        break;
      case "cancel":
        responseText = "❌ Cancelled!\n\nThe operation was cancelled.";
        showAlert = true;
        break;
      case "help":
        responseText = "🆘 Help!\n\nSend /help to see all available commands.";
        break;
      default:
        responseText = `Button clicked: ${callbackData}`;
    }

    // Send response to the callback query (Telegram only)
    if (message.platform === "telegram") {
      const telegramAdapter = sdk.getAdapter("telegram") as any;
      if (telegramAdapter && typeof telegramAdapter.answerCallbackQuery === "function") {
        await telegramAdapter.answerCallbackQuery(message.messageId, {
          text: responseText,
          showAlert: showAlert,
        });
        console.log("✅ Callback query answered");
      }
    }

    // Also send a message response
    await sdk.send(message.platform, {
      text: responseText,
    }, {
      to: message.from.id,
    });

    console.log("✅ Button response sent");
  } catch (error: any) {
    console.error("❌ Error handling callback:", error.message);
  }

  return true;
}
