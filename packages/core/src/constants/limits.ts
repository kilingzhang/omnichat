/**
 * Platform-specific limits and constraints
 * Centralized to avoid magic numbers
 */

/**
 * Discord-specific limits
 * @see https://discord.com/developers/docs/resources/channel
 */
export const DISCORD_LIMITS = {
  // Button limits
  BUTTON_LABEL_MAX_LENGTH: 80,
  BUTTONS_PER_ROW: 5,
  BUTTON_ROWS_MAX: 5,
  BUTTONS_TOTAL_MAX: 25,

  // Select menu limits
  SELECT_OPTIONS_MAX: 25,
  SELECT_MIN_VALUES_DEFAULT: 1,
  SELECT_MAX_VALUES_DEFAULT: 1,
  SELECT_PLACEHOLDER_MAX_LENGTH: 150,

  // Modal limits
  MODAL_TITLE_MAX_LENGTH: 45,
  MODAL_INPUT_MIN_LENGTH: 10,
  MODAL_INPUT_MAX_LENGTH: 500,
  MODAL_INPUTS_MAX: 5,

  // Embed limits
  EMBED_TITLE_MAX_LENGTH: 256,
  EMBED_DESCRIPTION_MAX_LENGTH: 4096,
  EMBED_FIELDS_MAX: 25,
  EMBED_FIELD_NAME_MAX_LENGTH: 256,
  EMBED_FIELD_VALUE_MAX_LENGTH: 1024,
  EMBED_TOTAL_CHARS_MAX: 6000,

  // Message limits
  MESSAGE_CONTENT_MAX_LENGTH: 2000,

  // Rate limits
  RATE_LIMIT_GLOBAL: 50, // requests per second
  RATE_LIMIT_CHANNEL: 5, // requests per channel per second
} as const;

/**
 * Telegram-specific limits
 * @see https://core.telegram.org/bots/api
 */
export const TELEGRAM_LIMITS = {
  // Message limits
  MESSAGE_CONTENT_MAX_LENGTH: 4096,
  CAPTION_MAX_LENGTH: 1024,

  // Button limits
  BUTTONS_PER_ROW: 8,
  BUTTON_ROWS_MAX: 100,
  BUTTON_TEXT_MAX_LENGTH: 40,
  CALLBACK_DATA_MAX_LENGTH: 64,

  // Poll limits
  POLL_QUESTION_MAX_LENGTH: 300,
  POLL_OPTION_MAX_LENGTH: 100,
  POLL_OPTIONS_MIN: 2,
  POLL_OPTIONS_MAX: 10,

  // Inline keyboard limits
  INLINE_BUTTONS_PER_ROW: 8,
  INLINE_BUTTON_ROWS_MAX: 100,

  // Rate limits
  RATE_LIMIT_MESSAGES_PER_SECOND: 30,
  RATE_LIMIT_GROUP_PER_MINUTE: 20,
} as const;

/**
 * Generic/Bot limits
 */
export const BOT_LIMITS = {
  // Warning thresholds
  WARNING_THRESHOLD_DEFAULT: 3,

  // Invite settings
  INVITE_MAX_USES_DEFAULT: 10,
  INVITE_EXPIRE_HOURS_DEFAULT: 1,

  // Input indicator
  TYPING_INDICATOR_DURATION_MS: 300,
  TYPING_INDICATOR_DELAY_MS: 300,

  // Pagination
  PAGE_SIZE_DEFAULT: 10,
  PAGE_SIZE_MAX: 50,
} as const;

/**
 * Time constants in milliseconds
 */
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,

  // Common durations
  THIRTY_SECONDS: 30 * 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
} as const;

/**
 * Utility to convert hours to milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * TIME_MS.HOUR;
}

/**
 * Utility to convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * TIME_MS.MINUTE;
}

/**
 * Utility to convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * TIME_MS.SECOND;
}
