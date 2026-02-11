/**
 * Universal Feature Abstraction Layer
 *
 * This module provides a unified abstraction for cross-platform features,
 * handling the differences between Telegram, Discord, Slack, WhatsApp, etc.
 */

import type { Platform } from "./message.js";

/**
 * Universal button types
 */
export type UniversalButtonType = "button" | "select" | "url" | "input";

/**
 * Universal component style
 */
export type ComponentStyle = "primary" | "secondary" | "danger" | "success";

/**
 * Select option
 */
export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
}

/**
 * Universal interactive component
 */
export interface UniversalComponent {
  type: UniversalButtonType;
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  url?: string;
  options?: SelectOption[];
  style?: ComponentStyle;
  icon?: string;
  emoji?: string;
  required?: boolean;
  minValues?: number;
  maxValues?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * Component layout type
 */
export type ComponentLayout = "grid" | "list" | "inline";

/**
 * Universal interactive elements
 */
export interface UniversalInteractiveElements {
  layout?: ComponentLayout;
  rows: UniversalComponent[][];
  placeholder?: string;
}

/**
 * Mention types
 */
export type MentionType = "user" | "channel" | "role" | "here" | "everyone";

/**
 * Mention
 */
export interface Mention {
  type: MentionType;
  id?: string;
  name?: string;
}

/**
 * Attachment types
 */
export type AttachmentType = "image" | "video" | "audio" | "file";

/**
 * Attachment
 */
export interface Attachment {
  type: AttachmentType;
  url: string;
  filename?: string;
  size?: number;
  caption?: string;
}

/**
 * Embed (rich content)
 */
export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  image?: { url: string };
  thumbnail?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: number;
}

/**
 * Universal send content with platform-specific extensions
 */
export interface UniversalSendContent {
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  stickerId?: string;
  components?: UniversalInteractiveElements;
  attachments?: Attachment[];
  embeds?: Embed[];
  mentions?: Mention[];
  platformOptions?: PlatformSpecificOptions;
  poll?: {
    question: string;
    options: string[];
    multi?: boolean;
  };
}

/**
 * Platform-specific options
 */
export interface PlatformSpecificOptions {
  telegram?: TelegramOptions;
  discord?: DiscordOptions;
  slack?: SlackOptions;
  whatsapp?: WhatsAppOptions;
  signal?: SignalOptions;
  imessage?: iMessageOptions;
}

/**
 * Telegram-specific options
 */
export interface TelegramOptions {
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  allowSendingWithoutReply?: boolean;
}

/**
 * Discord-specific options
 */
export interface DiscordOptions {
  ephemeral?: boolean;
  suppressEmbeds?: boolean;
  suppressNotifications?: boolean;
  tts?: boolean;
  allowedMentions?: {
    parse?: ("users" | "roles" | "everyone")[];
    users?: string[];
    roles?: string[];
  };
}

/**
 * Slack-specific options
 */
export interface SlackOptions {
  threadTs?: string;
  replyBroadcast?: boolean;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  blocks?: any[];
}

/**
 * WhatsApp-specific options
 */
export interface WhatsAppOptions {
  templateId?: string;
  language?: string;
  headerText?: string;
  footerText?: string;
  keyboard?: any;
}

/**
 * Signal-specific options
 */
export interface SignalOptions {
  storyReply?: boolean;
}

/**
 * iMessage-specific options
 */
export interface iMessageOptions {
  effect?: "slam" | "loud" | "gentle" | "invisibleInk";
  balloonTypeId?: string;
}

/**
 * Universal command parameter type
 */
export type CommandParameterType =
  | "string"
  | "number"
  | "boolean"
  | "user"
  | "channel"
  | "role"
  | "attachment";

/**
 * Universal command parameter
 */
export interface CommandParameter {
  name: string;
  type: CommandParameterType;
  required: boolean;
  description: string;
  choices?: Array<{ name: string; value: string }>;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  autocomplete?: boolean;
}

/**
 * Universal command
 */
export interface UniversalCommand {
  name: string;
  description: string;
  parameters?: CommandParameter[];
  handler: (context: CommandContext) => Promise<void> | void;
  platforms?: Platform[];  // If undefined, supports all platforms
  aliases?: string[];
  permissions?: string[];  // Required permissions
  cooldown?: number;  // Cooldown in milliseconds
}

/**
 * Command context
 */
export interface CommandContext {
  platform: Platform;
  userId: string;
  channelId: string;
  guildId?: string;
  parameters: Record<string, unknown>;
  raw: unknown;  // Platform-specific event data
}

/**
 * Universal search result type
 */
export type SearchResultType = "text" | "image" | "video" | "audio" | "card" | "article";

/**
 * Universal search result
 */
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: SearchResultType;
  url?: string;
  imageUrl?: string;
  data?: any;  // Platform-specific data
}

/**
 * Universal search query
 */
export interface UniversalSearch {
  query: string;
  offset?: string;
  limit?: number;
  context?: {
    userId?: string;
    chatType?: "private" | "group" | "channel";
  };
}

/**
 * User management action types
 */
export type UserManagementAction = "remove" | "ban" | "unban" | "restrict" | "promote" | "demote";

/**
 * Permission set
 */
export interface PermissionSet {
  canSendMessages?: boolean;
  canSendMedia?: boolean;
  canSendPolls?: boolean;
  canAddMembers?: boolean;
  canRemoveMembers?: boolean;
  canManageThreads?: boolean;
  canPinMessages?: boolean;
  canManageInfo?: boolean;
}

/**
 * User management action
 */
export interface UserManagement {
  userId: string;
  action: UserManagementAction;
  duration?: number;  // Duration in milliseconds
  reason?: string;
  permissions?: PermissionSet;
  roles?: string[];  // For promote action
}

/**
 * Invite link options
 */
export interface UniversalInviteOptions {
  name?: string;
  expireDuration?: number;  // Duration in milliseconds
  maxUses?: number;
  temporary?: boolean;
  unique?: boolean;
  metadata?: Record<string, string>;  // Tracking parameters
}

/**
 * Invite link result
 */
export interface UniversalInviteResult {
  url: string;
  code: string;
  expiresAt?: number;
  maxUses?: number;
  uses?: number;
  metadata?: Record<string, string>;
}

/**
 * Referral parameters
 */
export interface ReferralParams {
  source?: string;  // Source identifier
  campaign?: string;  // Campaign identifier
  referrer?: string;  // Referrer user ID
  medium?: string;  // Marketing medium
  content?: string;  // Content identifier
  term?: string;  // Search term
}

/**
 * Embedded UI types
 */
export type EmbeddedUIType = "webapp" | "modal" | "view" | "flow" | "form";

/**
 * Embedded UI size
 */
export type EmbeddedUISize = "small" | "medium" | "large" | "fullscreen";

/**
 * Embedded UI
 */
export interface EmbeddedUI {
  url: string;
  type: EmbeddedUIType;
  title?: string;
  initialData?: Record<string, unknown>;
  size?: EmbeddedUISize;
  callback?: (data: any) => void;  // Data callback when UI closes
}

/**
 * Thread information
 */
export interface Thread {
  id: string;
  name: string;
  parentId: string;
  createdAt: number;
  status: "active" | "archived" | "closed" | "locked";
  messageCount?: number;
  participantCount?: number;
}

/**
 * Thread message
 */
export interface ThreadMessage {
  threadId: string;
  content: UniversalSendContent;
}

/**
 * Feature capability check result
 */
export interface FeatureCapability {
  platform: Platform;
  feature: string;
  supported: boolean;
  alternatives?: string[];  // Alternative features if not supported
  limitations?: string[];  // Known limitations
}

/**
 * Platform feature matrix
 */
export interface PlatformFeatureMatrix {
  platform: Platform;
  features: {
    // Base features
    sendText: boolean;
    sendMedia: boolean;
    receive: boolean;
    // Conversation features
    reply: boolean;
    edit: boolean;
    delete: boolean;
    threads: boolean;
    // Interaction features
    buttons: boolean;
    selects: boolean;
    modals: boolean;
    slashCommands: boolean;
    contextMenus: boolean;
    // Advanced features
    inline: boolean;
    webApps: boolean;
    invites: boolean;
    userManagement: boolean;
    threadsManagement: boolean;
    webhooks: boolean;
  };
}

/**
 * Feature adapter transformation result
 */
export interface AdapterTransformation<Result = any> {
  success: boolean;
  data?: Result;
  fallback?: any;  // Fallback data if transformation failed
  warnings?: string[];  // Transformation warnings
  errors?: string[];  // Transformation errors
}

/**
 * Universal feature registry
 */
export class UniversalFeatureRegistry {
  private static featureMatrix: Map<Platform, PlatformFeatureMatrix> = new Map();

  /**
   * Register platform capabilities
   */
  static register(platform: Platform, matrix: PlatformFeatureMatrix): void {
    this.featureMatrix.set(platform, matrix);
  }

  /**
   * Check if platform supports feature
   */
  static supports(platform: Platform, feature: string): boolean {
    const matrix = this.featureMatrix.get(platform);
    if (!matrix) return false;

    const features = matrix.features as any;
    return features[feature] === true;
  }

  /**
   * Get all platforms that support a feature
   */
  static getPlatformsForFeature(feature: string): Platform[] {
    const platforms: Platform[] = [];
    for (const [platform, matrix] of this.featureMatrix.entries()) {
      if (this.supports(platform, feature)) {
        platforms.push(platform);
      }
    }
    return platforms;
  }

  /**
   * Get feature capabilities across all platforms
   */
  static getFeatureCapabilities(feature: string): FeatureCapability[] {
    const capabilities: FeatureCapability[] = [];
    for (const [platform, matrix] of this.featureMatrix.entries()) {
      const features = matrix.features as any;
      const supported = features[feature] === true;

      capabilities.push({
        platform,
        feature,
        supported,
        alternatives: supported ? undefined : this.getAlternatives(platform, feature),
        limitations: supported ? this.getLimitations(platform, feature) : undefined,
      });
    }
    return capabilities;
  }

  private static getAlternatives(platform: string, feature: string): string[] {
    // Define alternative features when a feature is not supported
    const alternatives: Record<string, Record<string, string[]>> = {
      discord: {
        inline: ["slash_commands"],
      },
      slack: {
        inline: ["shortcuts", "slash_commands"],
      },
      whatsapp: {
        slash_commands: ["keyword_detection"],
        buttons: ["list_messages"],
      },
    };

    return (alternatives as any)[platform]?.[feature] || [];
  }

  private static getLimitations(platform: Platform, feature: string): string[] {
    // Define known limitations for features
    const limitations: Record<string, Record<string, string[]>> = {
      telegram: {
        inline: ["Max 50 results", "Results cached for 24h", "Not compatible with webhooks"],
      },
      discord: {
        slash_commands: ["Global commands take up to 1h to register"],
      },
    };

    return limitations[platform]?.[feature] || [];
  }
}

/**
 * Platform-specific adapter interface
 */
export interface PlatformAdapter<Src = any, Dest = any> {
  /**
   * Transform universal component to platform-specific format
   */
  transform(component: Src): AdapterTransformation<Dest>;

  /**
   * Check if feature is supported
   */
  isSupported(feature: string): boolean;

  /**
   * Get fallback implementation
   */
  getFallback(feature: string): Dest | null;

  /**
   * Get platform-specific limitations
   */
  getLimitations(feature: string): string[];
}
