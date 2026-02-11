/**
 * Validation Utilities
 */

import type { Message } from "@omnichat/core";

// Bot configuration storage - keyed by bot ID
const botConfigs = new Map<string, { username: string; id: string }>();

/**
 * Set bot configuration
 */
export function setBotConfig(botId: string, username: string, discordId?: string) {
  botConfigs.set(botId, {
    username: username.toLowerCase(),
    id: discordId || "",
  });
  console.log(`✅ Bot config set for ${botId}: @${username}${discordId ? ` (ID: ${discordId})` : ""}`);
}

/**
 * Get bot configuration
 */
export function getBotConfig(botId: string) {
  return botConfigs.get(botId);
}

/**
 * Check if bot is mentioned in the message
 * Supports:
 * - Telegram: @botname anywhere in the text
 * - Discord: <@bot_id> anywhere in the text
 */
export function isBotMentioned(message: Message, botId?: string): boolean {
  if (!message.content.text) return false;

  // If no bot ID provided, check all bots (for single-bot mode)
  const configsToCheck = botId
    ? [botConfigs.get(botId)].filter(Boolean)
    : Array.from(botConfigs.values());

  const text = message.content.text;

  for (const config of configsToCheck) {
    if (!config) continue;

    // Check Discord format <@bot_id>
    if (config.id && text.includes(`<@${config.id}>`)) {
      return true;
    }

    // Check Telegram format @botname
    const botMentionPattern = new RegExp(`@${config.username}\\b`, 'i');
    if (botMentionPattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Clean command text (remove @mention from anywhere)
 * Supports:
 * - Telegram: @botname
 * - Discord: <@bot_id>
 */
export function cleanCommandText(message: Message, botId?: string): string {
  const text = message.content.text ? message.content.text.trim() : "";
  let cleaned = text;

  // If no bot ID provided, check all bots (for single-bot mode)
  const configsToCheck = botId
    ? [botConfigs.get(botId)].filter(Boolean)
    : Array.from(botConfigs.values());

  for (const config of configsToCheck) {
    if (!config) continue;

    // Remove Discord format <@bot_id>
    if (config.id) {
      cleaned = cleaned.replace(new RegExp(`<@${config.id}>\\s*`, 'gi'), '');
    }

    // Remove Telegram format @botname
    const botMentionPattern = new RegExp(`@${config.username}\\s*`, 'gi');
    cleaned = cleaned.replace(botMentionPattern, '').trim();
  }

  return cleaned.toLowerCase();
}

/**
 * Check if message should be processed in group
 */
export function shouldProcessInGroup(message: Message, botId?: string): boolean {
  // In private chat, always process
  if (message.to.type === "user") return true;

  // In group, only process if bot is mentioned
  return isBotMentioned(message, botId);
}

/**
 * Check if message has media
 */
export function hasMedia(message: Message): boolean {
  return !!(
    message.content.mediaUrl &&
    message.content.mediaUrl.startsWith("http")
  );
}
