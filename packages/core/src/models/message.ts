/**
 * Platform identifiers
 */
export type Platform = "telegram" | "discord" | "whatsapp" | "signal" | "slack" | "imessage" | string;

/**
 * Message types
 */
export type MessageType =
  | "text"
  | "media"
  | "reaction"
  | "callback"
  | "sticker"
  | "voice"
  | "location"
  | "contact";

/**
 * Media types
 */
export type MediaType = "image" | "video" | "file" | "audio" | "document";

/**
 * Target types
 */
export type TargetType = "user" | "channel" | "group" | "dm";

/**
 * Button definition for inline keyboards
 */
export interface Button {
  text: string;
  data: string; // callback data
}

/**
 * Thread/topic information
 */
export interface ThreadInfo {
  id: string | number;
  title?: string;
}

/**
 * Reply reference
 */
export interface ReplyReference {
  messageId: string;
  text?: string;
  from?: {
    id: string;
    name?: string;
  };
}

/**
 * User/group information
 */
export interface Participant {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
  type?: TargetType;
}

/**
 * Message content
 */
export interface MessageContent {
  text?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  emoji?: string; // for reactions
  buttons?: Button[][];
  stickerId?: string;
  voice?: {
    url: string;
    duration?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    title?: string;
  };
  contact?: {
    phoneNumber: string;
    firstName: string;
    lastName?: string;
  };
}

/**
 * Unified message format across all platforms
 */
export interface Message {
  // Source platform
  platform: Platform;

  // Message type
  type: MessageType;

  // Sender
  from: Participant;

  // Recipient
  to: Participant;

  // Message content
  content: MessageContent;

  // Reply reference
  replyTo?: ReplyReference;

  // Thread/topic
  thread?: ThreadInfo;

  // Unique message identifier
  messageId: string;

  // Timestamp
  timestamp: number;

  // Raw platform-specific data (for advanced use cases)
  raw?: unknown;
}

/**
 * Send content (what to send)
 */
export interface SendContent {
  text?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  buttons?: Button[][];
  stickerId?: string;
  poll?: {
    question: string;
    options: string[];
    multi?: boolean;
  };
}

/**
 * Send options
 */
export interface SendOptions {
  // Target type (optional, but recommended for platforms with ambiguous IDs like QQ/WeChat)
  // For platforms that can infer type (Telegram with @username, Feishu with oc_ prefix), this can be omitted
  // Once specified for an ID, the adapter will remember it for future use
  targetType?: TargetType;

  // Reply to specific message
  replyToMessageId?: string;

  // Thread ID
  threadId?: string | number;

  // Silent message (no notification)
  silent?: boolean;

  // Parse mode (markdown, html, etc.)
  parseMode?: "markdown" | "html" | "plain";

  // Custom platform-specific options
  platformOptions?: Record<string, unknown>;
}

/**
 * Send result
 */
export interface SendResult {
  platform: Platform;
  messageId: string;
  chatId: string;
  timestamp: number;
}
