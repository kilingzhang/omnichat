/**
 * Standard Adapter Types
 *
 * This module defines standard method signatures for adapter methods
 * that have equivalent functionality across platforms. Platform-specific extensions
 * are supported via optional parameters.
 *
 * Design Principles:
 * 1. Consistent parameter names across all platforms
 * 2. Consistent return value formats
 * 3. Platform-specific options via dedicated extension objects
 * 4. Graceful handling of unsupported features
 */

import type { Participant } from "./message.js";

// ============================================================================
// Common Types
// ============================================================================

/**
 * Result wrapper for operations
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** Platform raw response */
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
// Invite Link Types
// ============================================================================

/**
 * Invite link options
 */
export interface InviteOptions {
  /** Maximum number of uses (null = unlimited) */
  maxUses?: number;
  /** Expiration time in seconds from now (null = never expires) */
  expiresInSeconds?: number;
  /** Name/label for this invite */
  name?: string;
  /** Reason for audit log */
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
 * Invite link result
 */
export interface InviteResult {
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

  /** Platform raw data */
  raw?: unknown;
}

// ============================================================================
// Pin Message Types
// ============================================================================

/**
 * Pin message options
 */
export interface PinOptions {
  /** Whether to disable notification (silent pin) */
  silent?: boolean;
  /** Reason for pin */
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

// ============================================================================
// Member Types
// ============================================================================

/**
 * Member information
 */
export interface MemberInfo {
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

  /** Platform raw data */
  raw?: unknown;
}

// ============================================================================
// Moderation Types
// ============================================================================

/**
 * Moderation options
 */
export interface ModerationOptions {
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
 * Mute/timeout options
 */
export interface MuteOptions {
  /** Duration in seconds */
  durationSeconds: number;
  /** Reason for the action */
  reason?: string;

  /** Platform-specific extensions */
  telegram?: {
    /** Custom permissions to restrict */
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

// ============================================================================
// Chat Settings Types
// ============================================================================

/**
 * Chat settings options
 */
export interface ChatSettingsOptions {
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

// ============================================================================
// Platform Feature Detection
// ============================================================================

/**
 * Feature support flags
 */
export interface PlatformFeatureSupport {
  /** Invite features */
  invites: {
    create: boolean;
    list: boolean;
    revoke: boolean;
    export: boolean;
    namedInvites: boolean;
    temporaryInvites: boolean;
  };

  /** Pin features */
  pins: {
    pin: boolean;
    unpin: boolean;
    list: boolean;
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
    granularMute: boolean;
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
// Helper Functions (internal use)
// ============================================================================

/**
 * Convert invite options to Discord format
 * @internal
 */
export function inviteOptionsToDiscord(
  options: InviteOptions = {}
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
 * Convert invite options to Telegram format
 * @internal
 */
export function inviteOptionsToTelegram(
  options: InviteOptions = {}
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
