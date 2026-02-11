/**
 * Simple Bot Type Definitions
 */

import type { Message, SDK } from "@omnichat/core";

/**
 * Command handler interface
 */
export interface CommandHandler {
  description: string;
  usage?: string;
  handler: (message: Message, sdk: SDK) => Promise<void>;
}

/**
 * Command registry type
 */
export type CommandRegistry = Record<string, CommandHandler>;

/**
 * Button callback data
 */
export type ButtonCallbackData = "info" | "cancel" | "help" | string;

/**
 * Keyboard button text
 */
export type KeyboardButton = "👍 Yes" | "👎 No" | "❓ Help" | string;
