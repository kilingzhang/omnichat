/**
 * Callback Query Handler
 * Handles button clicks from inline keyboards and Discord interactions
 */

import type { Message, SDK } from "@omnichat/core";
import { PLATFORMS, DISCORD_LIMITS } from "@omnichat/core";
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
      case "open_modal":
        // Discord: Open modal when button is clicked
        if (message.platform === PLATFORMS.DISCORD) {
          const discordAdapter = sdk.getAdapter(PLATFORMS.DISCORD) as any;
          if (discordAdapter && typeof discordAdapter.showModal === "function") {
            const rawInteraction = (message as any).raw;
            if (rawInteraction) {
              await discordAdapter.showModal(rawInteraction, {
                customId: "feedback_modal",
                title: "📝 反馈表单",
                components: [
                  {
                    customId: "feedback_name",
                    label: "你的名字",
                    style: "Short",
                    placeholder: "请输入你的名字",
                    required: true,
                  },
                  {
                    customId: "feedback_email",
                    label: "邮箱地址",
                    style: "Short",
                    placeholder: "example@email.com",
                    required: false,
                  },
                  {
                    customId: "feedback_message",
                    label: "反馈内容",
                    style: "Paragraph",
                    placeholder: "请详细描述你的反馈...",
                    required: true,
                    minLength: DISCORD_LIMITS.MODAL_INPUT_MIN_LENGTH,
                    maxLength: DISCORD_LIMITS.MODAL_INPUT_MAX_LENGTH,
                  },
                ],
              });
              console.log("✅ Modal shown");
              return true;
            }
          }
          responseText = "❌ 无法打开模态框，请重试";
        } else {
          responseText = "ℹ️ 模态框仅支持 Discord";
        }
        break;
      default:
        responseText = `Button clicked: ${callbackData}`;
    }

    // Discord: Use interaction reply instead of sending a new message
    if (message.platform === PLATFORMS.DISCORD) {
      const rawInteraction = (message as any).raw;
      if (rawInteraction && typeof rawInteraction.reply === "function") {
        if (!rawInteraction.replied && !rawInteraction.deferred) {
          await rawInteraction.reply({ content: responseText, ephemeral: false });
        } else if (rawInteraction.deferred) {
          await rawInteraction.editReply({ content: responseText });
        } else {
          await rawInteraction.followUp({ content: responseText, ephemeral: false });
        }
        console.log("✅ Discord button response sent via interaction");
        return true;
      }
    }

    // Telegram: Use unified API for callback query
    if (message.platform === PLATFORMS.TELEGRAM) {
      try {
        await sdk.answerCallbackQuery(message.platform, message.messageId, {
          text: responseText,
          showAlert: showAlert,
        });
        console.log("✅ Telegram callback query answered");
      } catch {
        // Fallback if unified API fails
        const telegramAdapter = sdk.getAdapter(PLATFORMS.TELEGRAM) as any;
        if (telegramAdapter && typeof telegramAdapter.answerCallbackQuery === "function") {
          await telegramAdapter.answerCallbackQuery(message.messageId, {
            text: responseText,
            showAlert: showAlert,
          });
          console.log("✅ Telegram callback query answered (fallback)");
        }
      }
    }

    // Also send a message response (for platforms that need it)
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
