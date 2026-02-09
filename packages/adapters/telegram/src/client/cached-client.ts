/**
 * Telegram API client wrapper
 *
 * Provides caching, retry, and queue functionality
 */

import { Logger, createCache, withRetry } from '@omnichat/core';

/**
 * 缓存的 API 客户端
 */
export class CachedTelegramClient {
  private logger = new Logger('CachedClient');
  private chatInfoCache = createCache<any>(60000); // 60 秒
  private memberCountCache = createCache<number>(30000); // 30 秒
  private memberInfoCache = createCache<any>(30000); // 30 秒

  constructor(private bot: any) {}

  /**
   * 获取聊天信息（带缓存）
   */
  async getChat(chatId: string): Promise<any> {
    // 先查缓存
    const cached = this.chatInfoCache.get(chatId);
    if (cached) {
      this.logger.debug(`Cache hit: getChat(${chatId})`);
      return cached;
    }

    // 缓存未命中，调用 API
    this.logger.debug(`Cache miss: getChat(${chatId})`);
    const chat = await withRetry(() => this.bot.getChat(chatId));
    this.chatInfoCache.set(chatId, chat);
    return chat;
  }

  /**
   * 获取成员数（带缓存）
   */
  async getChatMemberCount(chatId: string): Promise<number> {
    const cached = this.memberCountCache.get(chatId);
    if (cached !== undefined) {
      this.logger.debug(`Cache hit: getChatMemberCount(${chatId})`);
      return cached;
    }

    this.logger.debug(`Cache miss: getChatMemberCount(${chatId})`);
    const count = await withRetry(() => this.bot.getChatMembersCount(chatId)) as number;
    this.memberCountCache.set(chatId, count);
    return count;
  }

  /**
   * 获取成员信息（带缓存）
   */
  async getChatMember(chatId: string, userId: string): Promise<any> {
    const cacheKey = `${chatId}:${userId}`;
    const cached = this.memberInfoCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: getChatMember(${cacheKey})`);
      return cached;
    }

    this.logger.debug(`Cache miss: getChatMember(${cacheKey})`);
    const member = await withRetry(() => this.bot.getChatMember(chatId, userId));
    this.memberInfoCache.set(cacheKey, member);
    return member;
  }

  /**
   * 获取管理员列表（带缓存）
   */
  async getChatAdministrators(chatId: string): Promise<any[]> {
    const cacheKey = `admins:${chatId}`;
    const cached = this.chatInfoCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: getChatAdministrators(${chatId})`);
      return cached as any[];
    }

    this.logger.debug(`Cache miss: getChatAdministrators(${chatId})`);
    const admins = await withRetry(() => this.bot.getChatAdministrators(chatId));
    this.chatInfoCache.set(cacheKey, admins);
    return admins as any[];
  }

  /**
   * 发送消息（不缓存）
   */
  async sendMessage(chatId: string, text: string, options?: any): Promise<any> {
    return withRetry(() => this.bot.sendMessage(chatId, text, options));
  }

  /**
   * 发送照片（不缓存）
   */
  async sendPhoto(chatId: string, photo: string, options?: any): Promise<any> {
    return withRetry(() => this.bot.sendPhoto(chatId, photo, options));
  }

  /**
   * 置顶消息（不缓存）
   */
  async pinChatMessage(chatId: string, messageId: number, options?: any): Promise<any> {
    return withRetry(() => this.bot.pinChatMessage(chatId, messageId, options));
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.chatInfoCache.clear();
    this.memberCountCache.clear();
    this.memberInfoCache.clear();
    this.logger.debug('All caches cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      chatInfo: this.chatInfoCache.size(),
      memberCount: this.memberCountCache.size(),
      memberInfo: this.memberInfoCache.size(),
    };
  }
}
