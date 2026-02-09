/**
 * Telegram Chat ID 转换器
 *
 * Telegram 使用不同的 ID 格式：
 * - 用户 ID: 正数 (如 123456789)
 * - 群组/频道/超级群组 ID: 负数 (如 -100123456789)
 *
 * 为了对外提供统一的接口，我们使用特殊编码方案：
 * - 用户 ID: 设置第 62 位为 1 (SIGN_BIT)
 * - 群组 ID: 使用绝对值，无标记位
 *
 * 这样可以完全避免冲突，因为：
 * - 用户 ID 会有 SIGN_BIT 前缀（大于 2^62）
 * - 群组 ID 没有前缀（小于 2^62）
 * - 两者范围完全不重叠
 */

/**
 * 位操作常量
 */
const SIGN_BIT = 0x4000000000000000; // 2^62 - 用于标记用户 ID
const ABS_MASK = 0x3FFFFFFFFFFFFFFF; // 掩码：用于提取实际的 ID 值

/**
 * Telegram Chat ID 转换工具类
 */
export class TelegramIdConverter {
  /**
   * 将 Telegram ID 转换为统一的公开 ID
   *
   * @param telegramId - Telegram 原始 Chat ID
   * @returns 统一的正数 ID
   */
  static toPublicId(telegramId: string | number): string {
    const id = typeof telegramId === 'string' ? parseInt(telegramId, 10) : telegramId;

    if (id > 0) {
      // 用户 ID：在高比特位设置标记位
      // 这样 1234567890 → 4611686018427388490
      return String(SIGN_BIT | (id & ABS_MASK));
    }

    // 群组/频道：返回绝对值（没有标记位）
    return String(Math.abs(id));
  }

  /**
   * 将统一的公开 ID 转换回 Telegram Chat ID
   *
   * @param publicId - 统一的正数 ID
   * @returns Telegram 原始 Chat ID
   */
  static toTelegramId(publicId: string | number): string {
    const id = typeof publicId === 'string' ? parseInt(publicId, 10) : publicId;

    // 检查是否有私聊标记位（第62位为1）
    if ((id & SIGN_BIT) !== 0) {
      // 私聊：去掉标记位，返回正数
      return String(id & ABS_MASK);
    }

    // 没有标记位：直接返回原值
    // 可能是：
    // - 群组 ID（负数）：如 -5175020124
    // - 用户 ID（正数，无标记）：如 5540291904
    return String(id);
  }

  /**
   * 判断 ID 类型
   *
   * @param id - 统一的 ID
   * @returns ID 类型
   */
  static getType(id: string): 'user' | 'group' | 'unknown' {
    const num = parseInt(id, 10);

    if (isNaN(num)) {
      return 'unknown';
    }

    // 检查是否有私聊标记位
    if ((num & SIGN_BIT) !== 0) {
      return 'user';
    }

    // 普通正数也可能是用户 ID
    if (num > 0 && num < SIGN_BIT) {
      return 'user';
    }

    // 负数或其他情况当作群组
    return 'group';
  }

  /**
   * 检查 ID 是否为用户 ID
   *
   * @param id - 统一的 ID
   * @returns 是否为用户 ID
   */
  static isUserId(id: string): boolean {
    return this.getType(id) === 'user';
  }

  /**
   * 检查 ID 是否为群组 ID
   *
   * @param id - 统一的 ID
   * @returns 是否为群组 ID
   */
  static isGroupId(id: string): boolean {
    return this.getType(id) === 'group';
  }
}

// 导出常量供其他模块使用
export { SIGN_BIT, ABS_MASK };
