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
  memberInfo: boolean;
  channelInfo: boolean;
  [key: string]: boolean;
}

/**
 * Management capabilities
 */
export interface ManagementCapabilities {
  kick: boolean;
  ban: boolean;
  timeout: boolean;
  channelCreate: boolean;
  channelEdit: boolean;
  channelDelete: boolean;
  permissions: boolean;
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
}

/**
 * Default empty capabilities
 */
export const defaultCapabilities: Capabilities = {
  base: { sendText: false, sendMedia: false, receive: false },
  conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
  interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false },
  discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
  management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
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
  };

  for (const cap of caps) {
    if (cap.base) Object.assign(result.base, cap.base);
    if (cap.conversation) Object.assign(result.conversation, cap.conversation);
    if (cap.interaction) Object.assign(result.interaction, cap.interaction);
    if (cap.discovery) Object.assign(result.discovery, cap.discovery);
    if (cap.management) Object.assign(result.management, cap.management);
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
