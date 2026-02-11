/**
 * Stats Service - Tracks group statistics and activity
 */

export interface MessageStats {
  totalMessages: number;
  userMessages: Map<string, number>; // userId -> messageCount
  dailyMessages: Map<string, number>; // date -> messageCount
  lastUpdated: number;
}

export interface UserStats {
  userId: string;
  username?: string;
  messageCount: number;
  firstSeen: number;
  lastSeen: number;
}

// In-memory storage
const groupStats = new Map<string, MessageStats>();
const userStats = new Map<string, UserStats>(); // userId -> stats

export class StatsService {
  /**
   * Record a message
   */
  static recordMessage(groupId: string, userId: string, username?: string): void {
    // Update group stats
    let stats = groupStats.get(groupId);
    if (!stats) {
      stats = {
        totalMessages: 0,
        userMessages: new Map(),
        dailyMessages: new Map(),
        lastUpdated: Date.now(),
      };
      groupStats.set(groupId, stats);
    }

    stats.totalMessages++;
    stats.lastUpdated = Date.now();

    const userCount = stats.userMessages.get(userId) || 0;
    stats.userMessages.set(userId, userCount + 1);

    const today = new Date().toISOString().split('T')[0];
    const dailyCount = stats.dailyMessages.get(today) || 0;
    stats.dailyMessages.set(today, dailyCount + 1);

    // Update user stats
    const userKey = `${groupId}:${userId}`;
    let user = userStats.get(userKey);
    if (!user) {
      user = {
        userId,
        username,
        messageCount: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      };
      userStats.set(userKey, user);
    } else {
      user.messageCount++;
      user.lastSeen = Date.now();
      if (username) {
        user.username = username;
      }
    }
  }

  /**
   * Get group statistics
   */
  static getGroupStats(groupId: string): {
    totalMessages: number;
    totalUsers: number;
    todayMessages: number;
    topUsers: Array<{ userId: string; count: number }>;
  } | null {
    const stats = groupStats.get(groupId);
    if (!stats) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayMessages = stats.dailyMessages.get(today) || 0;

    // Get top users
    const topUsers = Array.from(stats.userMessages.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalMessages: stats.totalMessages,
      totalUsers: stats.userMessages.size,
      todayMessages,
      topUsers,
    };
  }

  /**
   * Get user statistics in a group
   */
  static getUserStats(groupId: string, userId: string): UserStats | null {
    const userKey = `${groupId}:${userId}`;
    return userStats.get(userKey) || null;
  }

  /**
   * Format statistics for display
   */
  static formatStats(groupId: string): string {
    const stats = this.getGroupStats(groupId);
    if (!stats) {
      return '暂无统计数据';
    }

    let message = '📊 群组统计\n\n';
    message += `总消息数：${stats.totalMessages}\n`;
    message += `今日消息：${stats.todayMessages}\n`;
    message += `活跃用户：${stats.totalUsers}\n`;

    if (stats.topUsers.length > 0) {
      message += '\n🏆 最活跃用户\n';
      stats.topUsers.slice(0, 5).forEach((user, index) => {
        const userKey = `${groupId}:${user.userId}`;
        const userData = userStats.get(userKey);
        const username = userData?.username || user.userId;
        message += `${index + 1}. ${username}: ${user.count} 条消息\n`;
      });
    }

    return message;
  }

  /**
   * Reset statistics for a group
   */
  static resetStats(groupId: string): void {
    groupStats.delete(groupId);
    // Also clean up user stats for this group
    for (const [key] of userStats) {
      if (key.startsWith(`${groupId}:`)) {
        userStats.delete(key);
      }
    }
  }

  /**
   * Get statistics for a date range
   */
  static getDailyStats(
    groupId: string,
    days: number = 7
  ): Array<{ date: string; count: number }> {
    const stats = groupStats.get(groupId);
    if (!stats) {
      return [];
    }

    const result: Array<{ date: string; count: number }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = stats.dailyMessages.get(dateStr) || 0;
      result.push({ date: dateStr, count });
    }

    return result;
  }
}
