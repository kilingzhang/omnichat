/**
 * Moderation Service - Handles member warnings, mutes, kicks, and bans
 */

export interface Warning {
  userId: string;
  reason: string;
  timestamp: number;
  issuedBy: string;
}

export interface ModerationAction {
  userId: string;
  action: 'mute' | 'kick' | 'ban';
  reason?: string;
  duration?: number; // for mutes, in milliseconds
  timestamp: number;
  issuedBy: string;
}

export interface GroupModeration {
  warnings: Warning[];
  actions: ModerationAction[];
  activeMutes: Map<string, number>; // userId -> expiry timestamp
}

// In-memory storage
const groupModeration = new Map<string, GroupModeration>();

export class ModerationService {
  /**
   * Warn a user
   */
  static warnUser(
    groupId: string,
    userId: string,
    reason: string,
    issuedBy: string
  ): Warning {
    let mod = groupModeration.get(groupId);
    if (!mod) {
      mod = {
        warnings: [],
        actions: [],
        activeMutes: new Map(),
      };
      groupModeration.set(groupId, mod);
    }

    const warning: Warning = {
      userId,
      reason,
      timestamp: Date.now(),
      issuedBy,
    };

    mod.warnings.push(warning);
    return warning;
  }

  /**
   * Get warnings for a user
   */
  static getWarnings(groupId: string, userId: string): Warning[] {
    const mod = groupModeration.get(groupId);
    if (!mod) {
      return [];
    }
    return mod.warnings.filter((w) => w.userId === userId);
  }

  /**
   * Get warning count for a user
   */
  static getWarningCount(groupId: string, userId: string): number {
    return this.getWarnings(groupId, userId).length;
  }

  /**
   * Mute a user
   */
  static muteUser(
    groupId: string,
    userId: string,
    duration: number,
    reason?: string,
    issuedBy?: string
  ): ModerationAction {
    let mod = groupModeration.get(groupId);
    if (!mod) {
      mod = {
        warnings: [],
        actions: [],
        activeMutes: new Map(),
      };
      groupModeration.set(groupId, mod);
    }

    const expiry = Date.now() + duration;
    mod.activeMutes.set(userId, expiry);

    const action: ModerationAction = {
      userId,
      action: 'mute',
      reason,
      duration,
      timestamp: Date.now(),
      issuedBy: issuedBy || 'system',
    };

    mod.actions.push(action);
    return action;
  }

  /**
   * Check if a user is muted
   */
  static isMuted(groupId: string, userId: string): boolean {
    const mod = groupModeration.get(groupId);
    if (!mod) {
      return false;
    }

    const expiry = mod.activeMutes.get(userId);
    if (!expiry) {
      return false;
    }

    // Check if mute has expired
    if (Date.now() > expiry) {
      mod.activeMutes.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Get remaining mute time
   */
  static getMuteRemaining(groupId: string, userId: string): number | null {
    const mod = groupModeration.get(groupId);
    if (!mod) {
      return null;
    }

    const expiry = mod.activeMutes.get(userId);
    if (!expiry) {
      return null;
    }

    const remaining = expiry - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Unmute a user
   */
  static unmuteUser(groupId: string, userId: string): boolean {
    const mod = groupModeration.get(groupId);
    if (!mod) {
      return false;
    }

    return mod.activeMutes.delete(userId);
  }

  /**
   * Record a kick action
   */
  static recordKick(
    groupId: string,
    userId: string,
    reason?: string,
    issuedBy?: string
  ): ModerationAction {
    let mod = groupModeration.get(groupId);
    if (!mod) {
      mod = {
        warnings: [],
        actions: [],
        activeMutes: new Map(),
      };
      groupModeration.set(groupId, mod);
    }

    const action: ModerationAction = {
      userId,
      action: 'kick',
      reason,
      timestamp: Date.now(),
      issuedBy: issuedBy || 'system',
    };

    mod.actions.push(action);
    return action;
  }

  /**
   * Record a ban action
   */
  static recordBan(
    groupId: string,
    userId: string,
    reason?: string,
    issuedBy?: string
  ): ModerationAction {
    let mod = groupModeration.get(groupId);
    if (!mod) {
      mod = {
        warnings: [],
        actions: [],
        activeMutes: new Map(),
      };
      groupModeration.set(groupId, mod);
    }

    const action: ModerationAction = {
      userId,
      action: 'ban',
      reason,
      timestamp: Date.now(),
      issuedBy: issuedBy || 'system',
    };

    mod.actions.push(action);
    return action;
  }

  /**
   * Get moderation history for a user
   */
  static getUserHistory(groupId: string, userId: string): {
    warnings: number;
    mutes: number;
    kicks: number;
    bans: number;
  } {
    const mod = groupModeration.get(groupId);
    if (!mod) {
      return { warnings: 0, mutes: 0, kicks: 0, bans: 0 };
    }

    const userActions = mod.actions.filter((a) => a.userId === userId);

    return {
      warnings: mod.warnings.filter((w) => w.userId === userId).length,
      mutes: userActions.filter((a) => a.action === 'mute').length,
      kicks: userActions.filter((a) => a.action === 'kick').length,
      bans: userActions.filter((a) => a.action === 'ban').length,
    };
  }

  /**
   * Format user history for display
   */
  static formatUserHistory(groupId: string, userId: string, username?: string): string {
    const history = this.getUserHistory(groupId, userId);
    const warnings = this.getWarnings(groupId, userId);

    let message = `👤 用户记录: ${username || userId}\n\n`;
    message += `⚠️ 警告: ${history.warnings}\n`;
    message += `🔇 禁言: ${history.mutes}\n`;
    message += `👞 踢出: ${history.kicks}\n`;
    message += `🚫 封禁: ${history.bans}\n`;

    if (warnings.length > 0) {
      message += '\n最近警告:\n';
      warnings.slice(-3).forEach((w) => {
        const date = new Date(w.timestamp).toLocaleString('zh-CN');
        message += `• ${date}: ${w.reason}\n`;
      });
    }

    return message;
  }

  /**
   * Clean up expired mutes
   */
  static cleanupExpiredMutes(groupId: string): void {
    const mod = groupModeration.get(groupId);
    if (!mod) {
      return;
    }

    const now = Date.now();
    for (const [userId, expiry] of mod.activeMutes) {
      if (now > expiry) {
        mod.activeMutes.delete(userId);
      }
    }
  }

  /**
   * Parse duration string (e.g., "1h", "30m", "2d")
   */
  static parseDuration(durationStr: string): number | null {
    const match = durationStr.match(/^(\d+)([hmd])$/);
    if (!match) {
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000; // hours
      case 'm':
        return value * 60 * 1000; // minutes
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days
      default:
        return null;
    }
  }

  /**
   * Format duration for display
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }
}
