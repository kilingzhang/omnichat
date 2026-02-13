/**
 * Core capabilities (required for all adapters)
 */
export interface BaseCapabilities {
  sendText: boolean;
  sendMedia: boolean;
  receive: boolean;
  [key: string]: boolean;
}

/**
 * Conversation flow capabilities
 */
export interface ConversationCapabilities {
  reply: boolean;
  edit: boolean;
  delete: boolean;
  threads: boolean;
  quote: boolean;
  [key: string]: boolean;
}

/**
 * Interaction capabilities
 */
export interface InteractionCapabilities {
  buttons: boolean;
  polls: boolean;
  reactions: boolean;
  stickers: boolean;
  effects: boolean;
  [key: string]: boolean;
}

/**
 * Discovery capabilities
 */
export interface DiscoveryCapabilities {
  history: boolean;
  search: boolean;
  pins: boolean;
  pinMessage: boolean;
  unpinMessage: boolean;
  memberInfo: boolean;
  memberCount: boolean;
  administrators: boolean;
  channelInfo: boolean;
  [key: string]: boolean;
}

/**
 * Management capabilities
 */
export interface ManagementCapabilities {
  kick: boolean;
  ban: boolean;
  mute: boolean; // mute/timeout user
  timeout: boolean; // alias for mute
  unban: boolean;
  channelCreate: boolean;
  channelEdit: boolean;
  channelDelete: boolean;
  permissions: boolean;
  setChatTitle: boolean;
  setChatDescription: boolean;
  [key: string]: boolean;
}

/**
 * Advanced capabilities
 */
export interface AdvancedCapabilities {
  inline: boolean; // Inline mode
  deepLinks: boolean; // Deep links/invite links
  createInvite: boolean; // Create invite links
  getInvites: boolean; // Get invite list
  revokeInvite: boolean; // Revoke/delete invites
  miniApps: boolean; // Mini apps/web apps
  topics: boolean; // Forum topic management
  batch: boolean; // Batch operations
  payments: boolean; // Payment system
  games: boolean; // Games
  videoChat: boolean; // Video chat
  stories: boolean; // Stories
  customEmoji: boolean; // Custom emoji/sticker sets
  webhooks: boolean; // Advanced webhook management
  menuButton: boolean; // Menu button
  [key: string]: boolean;
}

/**
 * Complete capabilities model
 */
export interface Capabilities {
  base: BaseCapabilities;
  conversation: ConversationCapabilities;
  interaction: InteractionCapabilities;
  discovery: DiscoveryCapabilities;
  management: ManagementCapabilities;
  advanced: AdvancedCapabilities;
}

/**
 * Default empty capabilities
 */
export const defaultCapabilities: Capabilities = {
  base: { sendText: false, sendMedia: false, receive: false },
  conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
  interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false },
  discovery: {
    history: false,
    search: false,
    pins: false,
    pinMessage: false,
    unpinMessage: false,
    memberInfo: false,
    memberCount: false,
    administrators: false,
    channelInfo: false,
  },
  management: {
    kick: false,
    ban: false,
    mute: false,
    timeout: false,
    unban: false,
    channelCreate: false,
    channelEdit: false,
    channelDelete: false,
    permissions: false,
    setChatTitle: false,
    setChatDescription: false,
  },
  advanced: {
    inline: false,
    deepLinks: false,
    createInvite: false,
    getInvites: false,
    revokeInvite: false,
    miniApps: false,
    topics: false,
    batch: false,
    payments: false,
    games: false,
    videoChat: false,
    stories: false,
    customEmoji: false,
    webhooks: false,
    menuButton: false,
  },
};

/**
 * Merge capabilities
 */
export function mergeCapabilities(...caps: Partial<Capabilities>[]): Capabilities {
  const result: Capabilities = {
    base: { ...defaultCapabilities.base },
    conversation: { ...defaultCapabilities.conversation },
    interaction: { ...defaultCapabilities.interaction },
    discovery: { ...defaultCapabilities.discovery },
    management: { ...defaultCapabilities.management },
    advanced: { ...defaultCapabilities.advanced },
  };

  for (const cap of caps) {
    if (cap.base) Object.assign(result.base, cap.base);
    if (cap.conversation) Object.assign(result.conversation, cap.conversation);
    if (cap.interaction) Object.assign(result.interaction, cap.interaction);
    if (cap.discovery) Object.assign(result.discovery, cap.discovery);
    if (cap.management) Object.assign(result.management, cap.management);
    if (cap.advanced) Object.assign(result.advanced, cap.advanced);
  }

  return result;
}

/**
 * Check if a capability path is enabled
 */
export function hasCapability(
  caps: Capabilities,
  category: keyof Capabilities,
  capability: string
): boolean {
  return (caps[category] as Record<string, boolean>)?.[capability] ?? false;
}
