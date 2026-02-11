/**
 * Custom Keyboard Handler
 * Handles button clicks from custom reply keyboards
 */

import type { Message, SDK } from "@omnichat/core";
import type { KeyboardButton } from "../types.js";

/**
 * Handle custom keyboard button click
 */
export async function handleKeyboardButtonClick(
  message: Message,
  sdk: SDK
): Promise<boolean> {
  const text = message.content.text || "";

  // Check if this is a keyboard button
  const keyboardButtons: KeyboardButton[] = ["👍 Yes", "👎 No", "❓ Help"];
  if (!keyboardButtons.includes(text as KeyboardButton)) {
    return false;
  }

  console.log("📤 Keyboard button clicked:", text);

  let responseText = "";
  switch (text) {
    case "👍 Yes":
      responseText = "✅ You selected: YES\n\nGreat choice!";
      break;
    case "👎 No":
      responseText = "❌ You selected: NO\n\nThat's okay too!";
      break;
    case "❓ Help":
      responseText = "🆘 Help!\n\nSend /help to see all available commands.";
      break;
  }

  await sdk.send(message.platform, {
    text: responseText,
  }, {
    to: message.from.id,
    replyToMessageId: message.messageId,
  });

  console.log("✅ Keyboard response sent");
  return true;
}
