import type { SDK } from "../core/sdk.js";
import type { Message } from "./message.js";

/**
 * Extended message with runtime attachments
 * These properties are attached during message processing
 */
export interface ExtendedMessage extends Message {
  /**
   * SDK instance (attached for middleware access)
   * @internal
   */
  sdk?: SDK;

  /**
   * Storage path where media was saved
   */
  storagePath?: string;

  /**
   * Storage key for the saved file
   */
  storageKey?: string;

  /**
   * Whether media has been downloaded/saved
   */
  mediaSaved?: boolean;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Extend a message with runtime properties
 */
export function extendMessage(message: Message): ExtendedMessage {
  return message as ExtendedMessage;
}

/**
 * Check if message is extended
 */
export function isExtendedMessage(message: Message): message is ExtendedMessage {
  return "sdk" in message || "storagePath" in message;
}
