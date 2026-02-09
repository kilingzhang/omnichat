/**
 * 参数验证工具
 */

/**
 * 验证必需参数
 *
 * @param params - 参数对象
 * @param required - 必需参数名数组
 * @throws ConfigurationError 如果缺少必需参数
 */
export function validateRequired(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(key => !params[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * 解析消息 ID
 *
 * 消息 ID 格式为 "chatId:messageId"
 *
 * @param messageId - 消息 ID 字符串
 * @returns 解析后的 { chatId, messageId }
 * @throws Error 如果格式无效
 */
export function parseMessageId(messageId: string): { chatId: string; messageId: string } {
  const parts = messageId.split(':');

  if (parts.length !== 2) {
    throw new Error(`Invalid messageId format: ${messageId}. Expected format: "chatId:messageId"`);
  }

  return {
    chatId: parts[0],
    messageId: parts[1],
  };
}

/**
 * 格式化消息 ID
 *
 * @param chatId - 聊天 ID
 * @param messageId - 消息 ID
 * @returns 格式化后的消息 ID
 */
export function formatMessageId(chatId: string | number, messageId: string | number): string {
  return `${chatId}:${messageId}`;
}

/**
 * 验证聊天 ID
 *
 * @param chatId - 聊天 ID
 * @throws Error 如果无效
 */
export function validateChatId(chatId: string): void {
  if (!chatId || typeof chatId !== 'string') {
    throw new Error('Chat ID must be a non-empty string');
  }
}

/**
 * 验证文本内容
 *
 * @param text - 文本内容
 * @throws Error 如果无效
 */
export function validateText(text: string): void {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  if (text.length > 4096) {
    throw new Error('Text length cannot exceed 4096 characters');
  }
}

/**
 * 验证 API Token
 *
 * @param token - API Token
 * @throws Error 如果无效
 */
export function validateApiToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new Error('API token must be a non-empty string');
  }

  // Telegram bot token 格式: botfather:数字:字符串
  if (!token.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
    throw new Error('Invalid API token format');
  }
}
