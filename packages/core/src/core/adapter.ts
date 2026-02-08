import type { Message, SendContent, SendOptions, SendResult } from "../models/message.js";
import type { Capabilities } from "../models/capabilities.js";

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  // Platform-specific configuration
  [key: string]: unknown;
}

/**
 * Poll input
 */
export interface PollInput {
  question: string;
  options: string[];
  multi?: boolean;
}

/**
 * Poll result
 */
export interface PollResult {
  pollId: string;
  messageId: string;
  channel: string;
}

/**
 * Core adapter interface (required for all adapters)
 */
export interface Adapter {
  /**
   * Unique platform identifier
   */
  readonly platform: string;

  /**
   * Initialize the adapter with configuration
   */
  init(config: AdapterConfig): Promise<void>;

  /**
   * Send a message to a target
   */
  send(target: string, content: SendContent, options?: SendOptions): Promise<SendResult>;

  /**
   * Register callback for incoming messages
   */
  onMessage(callback: (message: Message) => void | Promise<void>): void;

  /**
   * Get adapter capabilities
   */
  getCapabilities(): Capabilities;

  /**
   * Destroy the adapter and cleanup resources
   */
  destroy(): Promise<void>;
}

/**
 * Extended adapter interface with optional conversation capabilities
 */
export interface ConversationAdapter extends Adapter {
  /**
   * Edit a previously sent message
   */
  edit?(messageId: string, newText: string, options?: SendOptions): Promise<void>;

  /**
   * Delete a message
   */
  delete?(messageId: string): Promise<void>;

  /**
   * Reply to a specific message
   */
  reply?(toMessageId: string, content: SendContent, options?: SendOptions): Promise<SendResult>;
}

/**
 * Chat action types for typing indicators
 */
export type ChatAction =
  | "typing"
  | "upload_photo"
  | "record_video"
  | "upload_video"
  | "record_voice"
  | "upload_voice"
  | "upload_document"
  | "find_location"
  | "record_video_note"
  | "upload_video_note";

/**
 * Extended adapter interface with interaction capabilities
 */
export interface InteractionAdapter extends Adapter {
  /**
   * Send a chat action (typing indicator, etc.)
   */
  sendChatAction?(target: string, action: ChatAction): Promise<void>;

  /**
   * Send a message with inline buttons
   */
  sendButtons?(
    target: string,
    text: string,
    buttons: Array<Array<{ text: string; data: string }>>,
    options?: SendOptions
  ): Promise<SendResult>;

  /**
   * Create a poll
   */
  sendPoll?(target: string, poll: PollInput, options?: SendOptions): Promise<PollResult>;

  /**
   * Add a reaction to a message
   */
  addReaction?(messageId: string, emoji: string): Promise<void>;

  /**
   * Remove a reaction from a message
   */
  removeReaction?(messageId: string, emoji: string): Promise<void>;

  /**
   * Send a sticker
   */
  sendSticker?(target: string, stickerId: string, options?: SendOptions): Promise<SendResult>;
}

/**
 * Extended adapter interface with discovery capabilities
 */
export interface DiscoveryAdapter extends Adapter {
  /**
   * Get message history for a channel
   */
  getHistory?(channel: string, limit: number, options?: { before?: string; after?: string }): Promise<Message[]>;

  /**
   * Search messages
   */
  search?(query: string, options?: { channel?: string; limit?: number }): Promise<Message[]>;

  /**
   * Get pinned messages
   */
  getPins?(channel: string): Promise<Message[]>;

  /**
   * Get member information
   */
  getMemberInfo?(userId: string): Promise<{
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    roles?: string[];
  }>;

  /**
   * Get channel information
   */
  getChannelInfo?(channelId: string): Promise<{
    id: string;
    name: string;
    type: "user" | "channel" | "group";
    topic?: string;
    memberCount?: number;
  }>;
}

/**
 * Extended adapter interface with management capabilities
 */
export interface ManagementAdapter extends Adapter {
  /**
   * Kick a user from a channel
   */
  kick?(channelId: string, userId: string, reason?: string): Promise<void>;

  /**
   * Ban a user from a server
   */
  ban?(serverId: string, userId: string, reason?: string, duration?: number): Promise<void>;

  /**
   * Timeout a user
   */
  timeout?(channelId: string, userId: string, duration: number): Promise<void>;

  /**
   * Create a channel
   */
  createChannel?(name: string, options?: { type?: "text" | "voice" }): Promise<{
    id: string;
    name: string;
  }>;

  /**
   * Edit a channel
   */
  editChannel?(channelId: string, updates: { name?: string; topic?: string }): Promise<void>;

  /**
   * Delete a channel
   */
  deleteChannel?(channelId: string): Promise<void>;
}

/**
 * Combined adapter type that includes all capabilities
 */
export type FullAdapter = Adapter &
  Partial<ConversationAdapter> &
  Partial<InteractionAdapter> &
  Partial<DiscoveryAdapter> &
  Partial<ManagementAdapter>;
