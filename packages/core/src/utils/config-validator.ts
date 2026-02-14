import { z } from "zod";
import { ConfigurationError } from "../errors/index.js";

/**
 * Base configuration schema with common fields
 */
export const BaseAdapterConfigSchema = z.object({
  // Platform-specific configuration is allowed
}).passthrough();

/**
 * Telegram configuration schema
 */
export const TelegramConfigSchema = z.object({
  apiToken: z.string().min(1, "Telegram API token is required"),
  polling: z.boolean().optional().default(true),
  webhookUrl: z.string().url().optional(),
});

/**
 * Discord configuration schema
 */
export const DiscordConfigSchema = z.object({
  botToken: z.string().min(1, "Discord bot token is required"),
  clientId: z.string().optional(),
  intents: z.array(z.number()).optional(),
  handleInteractions: z.boolean().optional().default(true),
});

/**
 * Slack configuration schema
 */
export const SlackConfigSchema = z.object({
  botToken: z.string().min(1, "Slack bot token is required"),
  signingSecret: z.string().optional(),
  appLevelToken: z.string().optional(),
  socketMode: z.boolean().optional(),
});

/**
 * WhatsApp configuration schema
 */
export const WhatsAppConfigSchema = z.object({
  sessionId: z.string().min(1, "WhatsApp session ID is required"),
  sessionPath: z.string().optional(),
});

/**
 * Signal configuration schema
 */
export const SignalConfigSchema = z.object({
  phoneNumber: z.string().min(1, "Signal phone number is required"),
});

/**
 * iMessage configuration schema
 */
export const iMessageConfigSchema = z.object({
  // iMessage uses the logged-in Apple ID
  // No required configuration
}).passthrough();

/**
 * Map of platform names to their config schemas
 */
export const PlatformConfigSchemas = {
  telegram: TelegramConfigSchema,
  discord: DiscordConfigSchema,
  slack: SlackConfigSchema,
  whatsapp: WhatsAppConfigSchema,
  signal: SignalConfigSchema,
  imessage: iMessageConfigSchema,
} as const;

/**
 * Platform type for config validation
 */
export type ConfigPlatform = keyof typeof PlatformConfigSchemas;

/**
 * Validate configuration for a specific platform
 *
 * @param platform - Platform name
 * @param config - Configuration object
 * @returns Validated and typed configuration
 * @throws ConfigurationError if validation fails
 *
 * @example
 * ```typescript
 * import { validateConfig, TelegramConfigSchema } from "@omnichat/core";
 *
 * // Validate with platform name
 * const config = validateConfig("telegram", { apiToken: "..." });
 *
 * // Or use schema directly
 * const result = TelegramConfigSchema.safeParse({ apiToken: "..." });
 * if (result.success) {
 *   // result.data is typed
 * }
 * ```
 */
export function validateConfig<T extends ConfigPlatform>(
  platform: T,
  config: unknown
): z.infer<typeof PlatformConfigSchemas[T]> {
  const schema = PlatformConfigSchemas[platform];

  if (!schema) {
    throw new ConfigurationError(`Unknown platform: ${platform}`);
  }

  const result = schema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }).join(", ");

    throw new ConfigurationError(`Invalid ${platform} configuration: ${issues}`);
  }

  return result.data as z.infer<typeof PlatformConfigSchemas[T]>;
}

/**
 * Validate configuration with a custom schema
 *
 * @param schema - Zod schema to validate against
 * @param config - Configuration object
 * @param configName - Name for error messages
 * @returns Validated and typed configuration
 * @throws ConfigurationError if validation fails
 */
export function validateWithSchema<T extends z.ZodTypeAny>(
  schema: T,
  config: unknown,
  configName: string = "configuration"
): z.infer<T> {
  const result = schema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }).join(", ");

    throw new ConfigurationError(`Invalid ${configName}: ${issues}`);
  }

  return result.data;
}

/**
 * Infer type from schema helper
 */
export type InferConfigType<T extends z.ZodTypeAny> = z.infer<T>;
