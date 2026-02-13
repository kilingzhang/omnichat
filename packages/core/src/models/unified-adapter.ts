/**
 * Unified Adapter Method Signatures
 *
 * This module defines standardized method signatures for adapter private methods
 * that have equivalent functionality across platforms. Platform-specific extensions
 * are supported via optional parameters.
 *
 * Design Principles:
 * 1. Unified parameter names across all platforms
 * 2. Consistent return value formats
 * 3. Platform-specific options via dedicated extension objects
 * 4. Graceful handling of unsupported features
 */

import type { Platform, Participant } from "./message.js";

// ============================================================================
// Common Types
// ============================================================================

/**
 * Unified result wrapper for operations
 */
export interface UnifiedResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** Platform-specific raw response */
  raw?: unknown;
}

/**
 * Pagination options for list operations
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

// ============================================================================
// Invite Link Methods
// ============================================================================

/**
 * Unified invite link options
 *
 * Platform-specific behavior:
 * - Telegram: uses memberLimit, expireDate (unix timestamp), createsJoinRequest
 * - Discord: uses maxUses, maxAge (seconds), temporary, unique
 */
export interface UnifiedInviteOptions {
  /** Maximum number of uses (null = unlimited) */
  maxUses?: number;
  /** Expiration time in seconds from now (null = never expires) */
  expiresInSeconds?: number;
  /** Name/label for this invite */
  name?: string;
  /** Reason for audit log (Discord) */
  reason?: string;

  /** Platform-specific extensions */
  telegram?: {
    /** Whether invite creates join request instead of direct join */
    createsJoinRequest?: boolean;
  };
  discord?: {
    /** Whether invite grants temporary membership */
    temporary?: boolean;
    /** Whether to create unique invite */
    unique?: boolean;
  };
}

/**
 * Unified invite link result
 */
export interface UnifiedInviteResult {
  /** The invite link/URL */
  url: string;
  /** Invite code (extracted from URL or native code) */
  code: string;
  /** Creator of the invite */
  creator?: Participant;
  /** Maximum uses (null = unlimited) */
  maxUses?: number;
  /** Current use count */
  useCount?: number;
  /** Expiration timestamp (unix, null = never) */
  expiresAt?: number;
  /** Whether this invite is revoked */
  isRevoked?: boolean;
  /** Whether this is the primary invite */
  isPrimary?: boolean;

  /** Platform-specific data */
  raw?: unknown;
}

/**
 * Unified invite methods interface
 */
export interface UnifiedInviteMethods {
  /**
   * Create a new invite link
   * @param chatId - Chat/channel ID (Telegram) or channel ID (Discord)
   * @param options - Unified invite options
   */
  createInvite(
    chatId: string,
    options?: UnifiedInviteOptions
  ): Promise<UnifiedInviteResult>;

  /**
   * Get all invites for a chat/channel
   * @param chatId - Chat/channel ID
   */
  getInvites(
    chatId: string,
    options?: PaginationOptions
  ): Promise<UnifiedInviteResult[]>;

  /**
   * Revoke/delete an invite
   * @param chatId - Chat/channel ID
   * @param inviteCode - Invite code or URL to revoke
   */
  revokeInvite(
    chatId: string,
    inviteCode: string
  ): Promise<UnifiedResult<void>>;

  /**
   * Export primary invite link (gets or creates default invite)
   * @param chatId - Chat/channel ID
   */
  exportInvite(chatId: string): Promise<string>;
}

// ============================================================================
// Pin Message Methods
// ============================================================================

/**
 * Unified pin message options
 */
export interface UnifiedPinOptions {
  /** Whether to disable notification (silent pin) */
  silent?: boolean;
  /** Reason for pin (for platforms that support it) */
  reason?: string;

  /** Platform-specific extensions */
  telegram?: {
    /** Whether to notify only mentioned users */
    notifyOnlyMentioned?: boolean;
  };
  discord?: {
    /** Reason for audit log */
    auditLogReason?: string;
  };
}

/**
 * Unified pin methods interface
 */
export interface UnifiedPinMethods {
  /**
   * Pin a message
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID to pin
   * @param options - Pin options
   */
  pinMessage(
    chatId: string,
    messageId: string,
    options?: UnifiedPinOptions
  ): Promise<UnifiedResult<void>>;

  /**
   * Unpin a message
   * @param chatId - Chat/channel ID
   * @param messageId - Message ID to unpin
   */
  unpinMessage(
    chatId: string,
    messageId: string
  ): Promise<UnifiedResult<void>>;

  /**
   * Get all pinned messages
   * @param chatId - Chat/channel ID
   */
  getPinnedMessages(chatId: string): Promise<string[]>;
}

// ============================================================================
// Member Methods
// ============================================================================

/**
 * Unified member information
 */
export interface UnifiedMemberInfo {
  /** User ID */
  id: string;
  /** Display name */
  name: string;
  /** Username (handle) */
  username?: string;
  /** Avatar URL */
  avatar?: string;
  /** Roles/permissions */
  roles?: string[];
  /** When user joined */
  joinedAt?: number;
  /** Whether user is an admin */
  isAdmin?: boolean;
  /** Whether user is the owner */
  isOwner?: boolean;
  /** Custom title (for admins) */
  customTitle?: string;

  /** Platform-specific data */
  raw?: unknown;
}

/**
 * Unified member methods interface
 */
export interface UnifiedMemberMethods {
  /**
   * Get member information
   * @param chatId - Chat/server/guild ID
   * @param userId - User ID
   */
  getMember(chatId: string, userId: string): Promise<UnifiedMemberInfo>;

  /**
   * Get member count for a chat
   * @param chatId - Chat/server ID
   */
  getMemberCount(chatId: string): Promise<number>;

  /**
   * Get administrators of a chat
   * @param chatId - Chat/server ID
   */
  getAdministrators(chatId: string): Promise<UnifiedMemberInfo[]>;

  /**
   * Get all members (if supported)
   * @param chatId - Chat/server ID
   * @param options - Pagination options
   */
  getMembers?(
    chatId: string,
    options?: PaginationOptions
  ): Promise<UnifiedMemberInfo[]>;
}

// ============================================================================
// Moderation Methods
// ============================================================================

/**
 * Unified moderation options
 */
export interface UnifiedModerationOptions {
  /** Reason for the action (for audit log) */
  reason?: string;
  /** Duration in seconds (for temporary actions like mute/timeout) */
  durationSeconds?: number;
  /** Whether to delete user's messages */
  deleteMessages?: boolean;

  /** Platform-specific extensions */
  telegram?: {
    /** Whether to ban until a specific date (unix timestamp) */
    untilDate?: number;
    /** Whether to revoke all invite links created by user */
    revokeInvites?: boolean;
  };
  discord?: {
    /** Number of days of messages to delete (0-7) */
    deleteMessageDays?: number;
  };
}

/**
 * Unified mute/timeout options
 */
export interface UnifiedMuteOptions {
  /** Duration in seconds */
  durationSeconds: number;
  /** Reason for the action */
  reason?: string;

  /** Platform-specific extensions */
  telegram?: {
    /** Custom permissions to restrict (Telegram granular permissions) */
    permissions?: {
      canSendMessages?: boolean;
      canSendMedia?: boolean;
      canSendPolls?: boolean;
      canSendOther?: boolean;
      canAddWebPagePreviews?: boolean;
      canChangeInfo?: boolean;
      canInviteUsers?: boolean;
      canPinMessages?: boolean;
    };
  };
  discord?: {
    /** Audit log reason */
    auditLogReason?: string;
  };
}

/**
 * Unified moderation methods interface
 */
export interface UnifiedModerationMethods {
  /**
   * Kick a user from chat/server
   * @param chatId - Chat/server ID
   * @param userId - User ID to kick
   * @param options - Moderation options
   */
  kick(
    chatId: string,
    userId: string,
    options?: UnifiedModerationOptions
  ): Promise<UnifiedResult<void>>;

  /**
   * Ban a user from chat/server
   * @param chatId - Chat/server ID
   * @param userId - User ID to ban
   * @param options - Moderation options
   */
  ban(
    chatId: string,
    userId: string,
    options?: UnifiedModerationOptions
  ): Promise<UnifiedResult<void>>;

  /**
   * Unban a user
   * @param chatId - Chat/server ID
   * @param userId - User ID to unban
   * @param options - Moderation options
   */
  unban(
    chatId: string,
    userId: string,
    options?: UnifiedModerationOptions
  ): Promise<UnifiedResult<void>>;

  /**
   * Mute/timeout a user (temporary restriction)
   * @param chatId - Chat/server ID
   * @param userId - User ID to mute
   * @param options - Mute options
   */
  mute(
    chatId: string,
    userId: string,
    options: UnifiedMuteOptions
  ): Promise<UnifiedResult<void>>;

  /**
   * Unmute/remove timeout from a user
   * @param chatId - Chat/server ID
   * @param userId - User ID to unmute
   */
  unmute(
    chatId: string,
    userId: string
  ): Promise<UnifiedResult<void>>;
}

// ============================================================================
// Chat Settings Methods
// ============================================================================

/**
 * Unified chat settings options
 */
export interface UnifiedChatSettingsOptions {
  /** New title/name for the chat */
  title?: string;
  /** New description/topic for the chat */
  description?: string;

  /** Platform-specific extensions */
  telegram?: {
    /** New chat photo */
    photo?: string;
  };
  discord?: {
    /** Audit log reason */
    reason?: string;
    /** Channel topic (separate from description in Discord) */
    topic?: string;
    /** Slow mode delay in seconds */
    slowModeDelay?: number;
  };
}

/**
 * Unified chat settings methods interface
 */
export interface UnifiedChatSettingsMethods {
  /**
   * Set chat title
   * @param chatId - Chat/channel ID
   * @param title - New title
   */
  setTitle(chatId: string, title: string): Promise<UnifiedResult<void>>;

  /**
   * Set chat description
   * @param chatId - Chat/channel ID
   * @param description - New description (empty string to clear)
   */
  setDescription(
    chatId: string,
    description: string
  ): Promise<UnifiedResult<void>>;

  /**
   * Update multiple chat settings
   * @param chatId - Chat/channel ID
   * @param options - Settings to update
   */
  updateSettings(
    chatId: string,
    options: UnifiedChatSettingsOptions
  ): Promise<UnifiedResult<void>>;
}

// ============================================================================
// DM Channel Methods
// ============================================================================

/**
 * Unified DM methods interface
 */
export interface UnifiedDMMethods {
  /**
   * Create or get DM channel with a user
   * @param userId - User ID to create DM with
   * @returns DM channel ID
   */
  createDMChannel(userId: string): Promise<string>;

  /**
   * Close/delete DM channel
   * @param channelId - DM channel ID
   */
  closeDMChannel?(channelId: string): Promise<UnifiedResult<void>>;
}

// ============================================================================
// Combined Unified Adapter Interface
// ============================================================================

/**
 * Complete unified adapter interface combining all method categories
 */
export interface UnifiedAdapterMethods
  extends UnifiedInviteMethods,
          UnifiedPinMethods,
          UnifiedMemberMethods,
          UnifiedModerationMethods,
          UnifiedChatSettingsMethods,
          UnifiedDMMethods {
  /**
   * Get the platform identifier
   */
  getPlatform(): Platform;
}

// ============================================================================
// Platform-Specific Feature Detection
// ============================================================================

/**
 * Feature support flags for platform-specific features
 */
export interface PlatformFeatureSupport {
  /** Invite features */
  invites: {
    create: boolean;
    list: boolean;
    revoke: boolean;
    export: boolean;
    /** Platform supports named invites */
    namedInvites: boolean;
    /** Platform supports temporary invites */
    temporaryInvites: boolean;
  };

  /** Pin features */
  pins: {
    pin: boolean;
    unpin: boolean;
    list: boolean;
    /** Platform supports silent pin */
    silentPin: boolean;
  };

  /** Member features */
  members: {
    get: boolean;
    count: boolean;
    admins: boolean;
    list: boolean;
  };

  /** Moderation features */
  moderation: {
    kick: boolean;
    ban: boolean;
    unban: boolean;
    mute: boolean;
    unmute: boolean;
    /** Platform supports granular mute permissions */
    granularMute: boolean;
    /** Platform supports message deletion on ban */
    deleteOnBan: boolean;
  };

  /** Chat settings features */
  settings: {
    title: boolean;
    description: boolean;
    photo: boolean;
    topic: boolean;
  };

  /** DM features */
  dm: {
    create: boolean;
    close: boolean;
  };
}

/**
 * Get default feature support (all disabled)
 */
export function getDefaultFeatureSupport(): PlatformFeatureSupport {
  return {
    invites: {
      create: false,
      list: false,
      revoke: false,
      export: false,
      namedInvites: false,
      temporaryInvites: false,
    },
    pins: {
      pin: false,
      unpin: false,
      list: false,
      silentPin: false,
    },
    members: {
      get: false,
      count: false,
      admins: false,
      list: false,
    },
    moderation: {
      kick: false,
      ban: false,
      unban: false,
      mute: false,
      unmute: false,
      granularMute: false,
      deleteOnBan: false,
    },
    settings: {
      title: false,
      description: false,
      photo: false,
      topic: false,
    },
    dm: {
      create: false,
      close: false,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Discord invite options to unified format
 */
export function discordInviteToUnified(
  options: {
    maxAge?: number;
    maxUses?: number;
    temporary?: boolean;
    unique?: boolean;
    reason?: string;
  } = {}
): UnifiedInviteOptions {
  return {
    maxUses: options.maxUses,
    expiresInSeconds: options.maxAge,
    reason: options.reason,
    discord: {
      temporary: options.temporary,
      unique: options.unique,
    },
  };
}

/**
 * Convert unified invite options to Discord format
 */
export function unifiedInviteToDiscord(
  options: UnifiedInviteOptions = {}
): {
  maxAge?: number;
  maxUses?: number;
  temporary?: boolean;
  unique?: boolean;
  reason?: string;
} {
  return {
    maxAge: options.expiresInSeconds,
    maxUses: options.maxUses,
    temporary: options.discord?.temporary,
    unique: options.discord?.unique,
    reason: options.reason,
  };
}

/**
 * Convert Telegram invite options to unified format
 */
export function telegramInviteToUnified(
  options: {
    name?: string;
    expireDate?: number;
    memberLimit?: number;
    createsJoinRequest?: boolean;
  } = {}
): UnifiedInviteOptions {
  const now = Math.floor(Date.now() / 1000);
  return {
    name: options.name,
    maxUses: options.memberLimit,
    expiresInSeconds: options.expireDate ? options.expireDate - now : undefined,
    telegram: {
      createsJoinRequest: options.createsJoinRequest,
    },
  };
}

/**
 * Convert unified invite options to Telegram format
 */
export function unifiedInviteToTelegram(
  options: UnifiedInviteOptions = {}
): {
  name?: string;
  expireDate?: number;
  memberLimit?: number;
  createsJoinRequest?: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  return {
    name: options.name,
    memberLimit: options.maxUses,
    expireDate: options.expiresInSeconds ? now + options.expiresInSeconds : undefined,
    createsJoinRequest: options.telegram?.createsJoinRequest,
  };
}

/**
 * Convert Discord duration to seconds
 * Discord uses milliseconds for timeout
 */
export function discordDurationToSeconds(durationMs: number): number {
  return Math.floor(durationMs / 1000);
}

/**
 * Convert seconds to Discord duration (milliseconds)
 */
export function secondsToDiscordDuration(seconds: number): number {
  return seconds * 1000;
}
