/**
 * Telegram Adapter 类型定义
 */

/**
 * Telegram 配置
 */
export interface TelegramConfig {
  /** Bot API Token */
  apiToken: string;

  /** Webhook URL（可选） */
  webhookUrl?: string;

  /** 是否启用轮询（默认 true） */
  polling?: boolean;

  /** 调试模式 */
  debug?: boolean;

  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Telegram 聊天信息
 */
export interface TelegramChat {
  /** 聊天 ID */
  id: number;

  /** 聊天类型 */
  type: 'private' | 'group' | 'supergroup' | 'channel';

  /** 聊天标题 */
  title?: string;

  /** 聊天描述 */
  description?: string;

  /** 聊天用户名 */
  username?: string;

  /** 是否为论坛 */
  isForum?: boolean;
}

/**
 * Telegram 用户信息
 */
export interface TelegramUser {
  /** 用户 ID */
  id: number;

  /** 用户名 */
  username?: string;

  /** 名字 */
  first_name?: string;

  /** 最后名字 */
  last_name?: string;

  /** 语言代码 */
  language_code?: string;
}

/**
 * Telegram 消息
 */
export interface TelegramMessage {
  /** 消息 ID */
  message_id: number;

  /** 发送者 */
  from: TelegramUser;

  /** 聊天 */
  chat: TelegramChat;

  /** 日期 */
  date: number;

  /** 文本 */
  text?: string;

  /** 照片 */
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    file_size: number;
    width: number;
    height: number;
  }>;

  /** 贴纸 */
  sticker?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    is_animated: boolean;
    is_video: boolean;
    thumbnail?: {
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
    };
  };

  /** 回复引用 */
  reply_to_message?: TelegramMessage;

  /** 编辑日期 */
  edit_date?: number;
}
