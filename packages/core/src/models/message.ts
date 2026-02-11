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
  | "contact"
  | "inline"
  | "chosen_inline"
  | "payment"
  | "game";

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

/**
 * Inline query result
 */
export interface InlineQuery {
  id: string;
  from: Participant;
  query: string;
  offset: string;
  chatType?: "sender" | "private" | "group" | "supergroup" | "channel";
}

/**
 * Inline result types
 */
export type InlineResultType = "article" | "photo" | "video" | "gif" | "mpeg4_gif";

/**
 * Inline result
 */
export interface InlineResult {
  type: InlineResultType;
  id: string;
  title?: string;
  messageText?: string;
  description?: string;
  url?: string;
  thumbUrl?: string;
  inputMessageContent?: {
    messageText: string;
    parseMode?: "markdown" | "html";
  };
}

/**
 * Inline query response
 */
export interface InlineQueryResponse {
  results: InlineResult[];
  nextOffset?: string;
  switchPmText?: string;
  switchPmParameter?: string;
}

/**
 * Deep link parameters
 */
export interface DeepLinkParams {
  start?: string; // /start parameter
  startgroup?: string; // /startgroup parameter
  [key: string]: string | undefined;
}

/**
 * Invite link options
 */
export interface InviteLinkOptions {
  name?: string;
  expireDate?: number;
  memberLimit?: number;
  createsJoinRequest?: boolean;
}

/**
 * Invite link result
 */
export interface InviteLinkResult {
  inviteLink: string;
  creator: Participant;
  createsJoinRequest: boolean;
  isPrimary: boolean;
  isRevoked: boolean;
  expireDate?: number;
  memberLimit?: number;
}

/**
 * Web app info
 */
export interface WebAppInfo {
  url: string;
}

/**
 * Menu button options
 */
export interface MenuButtonOptions {
  type: "commands" | "web_app" | "default";
  text?: string;
  url?: string;
}

/**
 * Forum topic options
 */
export interface ForumTopicOptions {
  name: string;
  iconColor?: number;
  iconCustomEmojiId?: string;
}

/**
 * Forum topic info
 */
export interface ForumTopicInfo {
  messageId: number;
  name: string;
  iconColor: number;
  iconCustomEmojiId?: string;
  threadId: number;
}

/**
 * Permissions for user restriction
 */
export interface ChatPermissions {
  canSendMessages?: boolean;
  canSendMediaMessages?: boolean;
  canSendPolls?: boolean;
  canSendOtherMessages?: boolean;
  canAddWebPagePreviews?: boolean;
  canChangeInfo?: boolean;
  canInviteUsers?: boolean;
  canPinMessages?: boolean;
  canManageTopics?: boolean;
}

/**
 * Administrator rights
 */
export interface AdministratorRights {
  isAnonymous?: boolean;
  canManageChat?: boolean;
  canDeleteMessages?: boolean;
  canManageVideoChats?: boolean;
  canRestrictMembers?: boolean;
  canPromoteMembers?: boolean;
  canChangeInfo?: boolean;
  canInviteUsers?: boolean;
  canPostStories?: boolean;
  canEditStories?: boolean;
  canDeleteStories?: boolean;
  canManageTopics?: boolean;
}

/**
 * Webhook info
 */
export interface WebhookInfo {
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  ipAddress?: string;
  lastErrorDate?: number;
  lastErrorMessage?: string;
  lastSynchronizationErrorDate?: number;
  maxConnections?: number;
  allowedUpdates?: string[];
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{ chatId: string; error: string }>;
}

/**
 * Poll input for creating polls
 */
export interface PollInput {
  question: string;
  options: string[];
  multi?: boolean;
  correctOptionId?: number;
  explanation?: string;
  explanationParseMode?: "markdown" | "html";
  openPeriod?: number;
  closeDate?: number;
  isClosed?: boolean;
}

/**
 * Poll result
 */
export interface PollResult {
  pollId: string;
  messageId: string;
  channel: string;
  options?: Array<{ text: string; voterCount: number }>;
  totalVoterCount?: number;
  isClosed?: boolean;
}

/**
 * Chat action types
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
