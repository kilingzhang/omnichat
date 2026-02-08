/**
 * Utility functions for adapters
 */

/**
 * Parse compound messageId in format "chatId:messageId"
 * @throws {Error} If format is invalid
 */
export function parseMessageId(messageId: string): { chatId: string; msgId: string } {
  const parts = messageId.split(":");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid messageId format: ${messageId}. Expected format: chatId:messageId`,
    );
  }

  const [chatId, msgId] = parts;

  if (!chatId || !msgId) {
    throw new Error(
      `Invalid messageId format: ${messageId}. Expected format: chatId:messageId`,
    );
  }

  return { chatId, msgId };
}

/**
 * Validate required string field
 * @throws {Error} If value is empty
 */
export function validateRequired(value: string, fieldName: string): void {
  if (!value || typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }
}

/**
 * Validate that at least one of the fields is present
 * @throws {Error} If none of the fields are present
 */
export function validateAtLeastOne(fields: Record<string, unknown>, fieldNames: string[]): void {
  const hasValue = fieldNames.some((name) => {
    const value = fields[name];
    return value !== undefined && value !== null && value !== "";
  });

  if (!hasValue) {
    throw new Error(`At least one of ${fieldNames.join(", ")} is required`);
  }
}

/**
 * Safely execute async function with error handling
 */
export async function safeExecute<T>(
  logger: any,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Failed to ${operation}`, error);
    throw error;
  }
}

/**
 * Create a retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  _delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Continue to next iteration (delay skipped for simplicity)
      }
    }
  }

  throw lastError;
}

/**
 * Truncate text to maximum length
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}

/**
 * Format error message with context
 */
export function formatError(message: string, context: Record<string, unknown>): string {
  const contextStr = Object.entries(context)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ");
  return `${message} (${contextStr})`;
}
