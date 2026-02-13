/**
 * Platform Constants
 * Centralized platform identifiers to avoid hardcoding
 */

/**
 * Supported platform identifiers
 */
export const PLATFORMS = {
  TELEGRAM: "telegram",
  DISCORD: "discord",
  // Future platforms can be added here
  // SLACK: "slack",
  // WHATSAPP: "whatsapp",
} as const;

export type PlatformType = (typeof PLATFORMS)[keyof typeof PLATFORMS];

/**
 * Platform display names for UI
 */
export const PLATFORM_NAMES: Record<PlatformType, string> = {
  [PLATFORMS.TELEGRAM]: "Telegram",
  [PLATFORMS.DISCORD]: "Discord",
} as const;

/**
 * Platform icons for UI
 */
export const PLATFORM_ICONS: Record<PlatformType, string> = {
  [PLATFORMS.TELEGRAM]: "📱",
  [PLATFORMS.DISCORD]: "💬",
} as const;

/**
 * Check if a platform string is valid
 */
export function isValidPlatform(platform: string): platform is PlatformType {
  return Object.values(PLATFORMS).includes(platform as PlatformType);
}

/**
 * Get platform info
 */
export function getPlatformInfo(platform: string): {
  name: string;
  icon: string;
} | null {
  if (!isValidPlatform(platform)) return null;
  return {
    name: PLATFORM_NAMES[platform],
    icon: PLATFORM_ICONS[platform],
  };
}
