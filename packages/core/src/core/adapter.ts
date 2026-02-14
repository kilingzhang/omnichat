import type {
  Message,
  SendContent,
  SendOptions,
  SendResult,
  InlineQuery,
  InlineQueryResponse,
  DeepLinkParams,
  InviteLinkOptions,
  InviteLinkResult,
  WebAppInfo,
  MenuButtonOptions,
  ForumTopicOptions,
  ForumTopicInfo,
  ChatPermissions,
  AdministratorRights,
  WebhookInfo,
  BatchOperationResult,
} from "../models/message.js";
import type { Capabilities } from "../models/capabilities.js";
import type {
  Result,
  InviteOptions,
  InviteResult,
  PinOptions,
  MemberInfo,
  ModerationOptions,
  MuteOptions,
  ChatSettingsOptions,
} from "../models/unified-adapter.js";

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
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID (pure numeric ID)
   * @param newText - New text content
   * @param options - Optional send options
   */
  edit?(chatId: string, messageId: string, newText: string, options?: SendOptions): Promise<SendResult>;

  /**
   * Delete a message
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID (pure numeric ID)
   */
  delete?(chatId: string, messageId: string): Promise<void>;

  /**
   * Reply to a specific message
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID to reply to (pure numeric ID)
   * @param content - Message content
   * @param options - Optional send options
   */
  reply?(chatId: string, messageId: string, content: SendContent, options?: SendOptions): Promise<SendResult>;
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
  | "choose_sticker"
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
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID (pure numeric ID)
   * @param emoji - Reaction emoji
   */
  addReaction?(chatId: string, messageId: string, emoji: string): Promise<void>;

  /**
   * Remove a reaction from a message
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID (pure numeric ID)
   * @param emoji - Reaction emoji
   */
  removeReaction?(chatId: string, messageId: string, emoji: string): Promise<void>;

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
  getMemberInfo?(chatId: string, userId: string): Promise<MemberInfo>;

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
   * Kick a user from a chat
   * @param chatId - Chat/channel/guild ID
   * @param userId - User ID to kick
   * @param options - Optional moderation options
   */
  kick?(chatId: string, userId: string, options?: ModerationOptions): Promise<Result<void>>;

  /**
   * Ban a user from a chat/server
   * @param chatId - Chat/channel/guild ID
   * @param userId - User ID to ban
   * @param options - Optional moderation options (duration, reason)
   */
  ban?(chatId: string, userId: string, options?: ModerationOptions): Promise<Result<void>>;

  /**
   * Unban a user
   * @param chatId - Chat/channel/guild ID
   * @param userId - User ID to unban
   */
  unban?(chatId: string, userId: string): Promise<Result<void>>;

  /**
   * Mute a user (timeout in Discord)
   * @param chatId - Chat/channel/guild ID
   * @param userId - User ID to mute
   * @param options - Mute options (duration, reason)
   */
  mute?(chatId: string, userId: string, options: MuteOptions): Promise<Result<void>>;

  /**
   * Unmute a user
   * @param chatId - Chat/channel/guild ID
   * @param userId - User ID to unmute
   */
  unmute?(chatId: string, userId: string): Promise<Result<void>>;

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

  /**
   * Restrict user permissions
   */
  restrictUser?(chatId: string, userId: string, permissions: ChatPermissions): Promise<void>;

  /**
   * Promote user to administrator
   */
  promoteUser?(chatId: string, userId: string, rights: AdministratorRights): Promise<void>;
}

/**
 * Extended adapter interface with advanced capabilities
 */
export interface AdvancedAdapter extends Adapter {
  /**
   * Handle inline queries
   */
  onInlineQuery?(callback: (query: InlineQuery) => void | Promise<InlineQueryResponse>): void;

  /**
   * Answer inline query
   */
  answerInlineQuery?(queryId: string, results: any[], options?: { nextOffset?: string; switchPmText?: string; switchPmParameter?: string }): Promise<void>;

  /**
   * Create invite link
   */
  createInvite?(chatId: string, options?: InviteOptions): Promise<InviteResult>;

  /**
   * Get all invites
   */
  getInvites?(chatId: string): Promise<InviteResult[]>;

  /**
   * Revoke invite
   */
  revokeInvite?(chatId: string, inviteCode: string): Promise<Result<void>>;

  /**
   * Export invite link
   */
  exportInvite?(chatId: string): Promise<string>;

  /**
   * Pin message
   */
  pinMessage?(chatId: string, messageId: string, options?: PinOptions): Promise<Result<void>>;

  /**
   * Unpin message
   */
  unpinMessage?(chatId: string, messageId: string): Promise<Result<void>>;

  /**
   * Get administrators
   */
  getAdministrators?(chatId: string): Promise<MemberInfo[]>;

  /**
   * Set title
   */
  setTitle?(chatId: string, title: string): Promise<Result<void>>;

  /**
   * Set description
   */
  setDescription?(chatId: string, description: string): Promise<Result<void>>;

  /**
   * Create deep link / invite link (legacy)
   */
  createInviteLink?(chatId: string, options?: InviteLinkOptions): Promise<InviteLinkResult>;

  /**
   * Edit invite link
   */
  editInviteLink?(chatId: string, link: string, options?: InviteLinkOptions): Promise<InviteLinkResult>;

  /**
   * Revoke invite link
   */
  revokeInviteLink?(chatId: string, link: string): Promise<InviteLinkResult>;

  /**
   * Export invite link (legacy)
   */
  exportInviteLink?(chatId: string): Promise<string>;

  /**
   * Create forum topic
   */
  createForumTopic?(chatId: string, options: ForumTopicOptions): Promise<ForumTopicInfo>;

  /**
   * Edit forum topic
   */
  editForumTopic?(chatId: string, topicId: number, name: string, iconCustomEmojiId?: string): Promise<void>;

  /**
   * Close forum topic
   */
  closeForumTopic?(chatId: string, topicId: number): Promise<void>;

  /**
   * Reopen forum topic
   */
  reopenForumTopic?(chatId: string, topicId: number): Promise<void>;

  /**
   * Delete forum topic
   */
  deleteForumTopic?(chatId: string, topicId: number): Promise<void>;

  /**
   * Get forum topic info
   */
  getForumTopicInfo?(chatId: string, topicId: number): Promise<ForumTopicInfo>;

  /**
   * Get all forum topics
   */
  getForumTopics?(chatId: string): Promise<ForumTopicInfo[]>;

  /**
   * Generalize forum topic
   */
  generalizeForumTopic?(chatId: string, topicId: number): Promise<void>;

  /**
   * Hide general forum topic
   */
  hideGeneralForumTopic?(chatId: string): Promise<void>;

  /**
   * Unhide general forum topic
   */
  unhideGeneralForumTopic?(chatId: string): Promise<void>;

  /**
   * Send message with web app
   */
  sendWithWebApp?(target: string, text: string, webApp: WebAppInfo, options?: SendOptions): Promise<SendResult>;

  /**
   * Set chat menu button
   */
  setMenuButton?(options: MenuButtonOptions, chatId?: string): Promise<void>;

  /**
   * Get chat menu button
   */
  getMenuButton?(chatId?: string): Promise<MenuButtonOptions>;

  /**
   * Get webhook info
   */
  getWebhookInfo?(): Promise<WebhookInfo>;

  /**
   * Set webhook
   */
  setWebhook?(url: string, options?: {
    certificate?: string;
    ipAddress?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
    dropPendingUpdates?: boolean;
    secretToken?: string;
  }): Promise<boolean>;

  /**
   * Delete webhook
   */
  deleteWebhook?(dropPendingUpdates?: boolean): Promise<boolean>;

  /**
   * Copy message
   */
  copyMessage?(toChatId: string, fromChatId: string, messageId: string, options?: SendOptions): Promise<SendResult>;

  /**
   * Batch send messages
   */
  batchSend?(chatIds: string[], content: SendContent, options?: SendOptions): Promise<BatchOperationResult>;

  /**
   * Forward message (already in base adapter, but included for completeness)
   */
  forwardMessage?(to: string, fromChatId: string, options?: SendOptions): Promise<SendResult>;

  /**
   * Send invoice (for payments)
   */
  sendInvoice?(
    target: string,
    title: string,
    description: string,
    payload: string,
    providerToken: string,
    currency: string,
    prices: Array<{ label: string; amount: number }>,
    options?: SendOptions
  ): Promise<SendResult>;

  /**
   * Answer shipping query (for payments)
   */
  answerShippingQuery?(shippingQueryId: string, ok: boolean, shippingOptions?: any[], errorMessage?: string): Promise<void>;

  /**
   * Answer pre-checkout query (for payments)
   */
  answerPreCheckoutQuery?(preCheckoutQueryId: string, ok: boolean, errorMessage?: string): Promise<void>;

  /**
   * Send game
   */
  sendGame?(target: string, gameShortName: string, options?: SendOptions): Promise<SendResult>;

  /**
   * Set game score
   */
  setGameScore?(userId: string, score: number, chatId?: string, messageId?: string, force?: boolean, disableEditMessage?: boolean): Promise<void>;

  /**
   * Get game high scores
   */
  getGameHighScores?(userId: string, chatId?: string, messageId?: string): Promise<Array<{ position: number; userId: string; score: number }>>;
}

/**
 * Combined adapter type that includes all capabilities
 */
export type FullAdapter = Adapter &
  Partial<ConversationAdapter> &
  Partial<InteractionAdapter> &
  Partial<DiscoveryAdapter> &
  Partial<ManagementAdapter> &
  Partial<AdvancedAdapter>;
