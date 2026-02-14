/**
 * Unified logging system for omnichat
 *
 * Features:
 * - Log levels: DEBUG, INFO, WARN, ERROR, SILENT
 * - Global level configuration
 * - Environment variable support (LOG_LEVEL)
 * - Prefix support for module identification
 * - Child logger creation
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Parse log level from string or environment variable
 */
function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) return LogLevel.INFO;

  const normalized = level.toUpperCase().trim();

  // Support both enum name and numeric value
  switch (normalized) {
    case "DEBUG":
    case "0":
      return LogLevel.DEBUG;
    case "INFO":
    case "1":
      return LogLevel.INFO;
    case "WARN":
    case "WARNING":
    case "2":
      return LogLevel.WARN;
    case "ERROR":
    case "3":
      return LogLevel.ERROR;
    case "SILENT":
    case "QUIET":
    case "4":
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Global logger configuration
 */
class LoggerConfig {
  private static instance: LoggerConfig;
  private globalLevel: LogLevel;
  private loggers: Set<Logger> = new Set();

  private constructor() {
    // Initialize from environment variable or default to INFO
    this.globalLevel = parseLogLevel(process.env.LOG_LEVEL);
  }

  static getInstance(): LoggerConfig {
    if (!LoggerConfig.instance) {
      LoggerConfig.instance = new LoggerConfig();
    }
    return LoggerConfig.instance;
  }

  getGlobalLevel(): LogLevel {
    return this.globalLevel;
  }

  setGlobalLevel(level: LogLevel): void {
    this.globalLevel = level;
    // Update all existing loggers
    for (const logger of this.loggers) {
      logger.setLevel(level);
    }
  }

  register(logger: Logger): void {
    this.loggers.add(logger);
  }

  unregister(logger: Logger): void {
    this.loggers.delete(logger);
  }
}

/**
 * Get the global logger configuration instance
 */
export function getLoggerConfig(): LoggerConfig {
  return LoggerConfig.getInstance();
}

/**
 * Set global log level (affects all loggers)
 */
export function setGlobalLogLevel(level: LogLevel): void {
  LoggerConfig.getInstance().setGlobalLevel(level);
}

/**
 * Get current global log level
 */
export function getGlobalLogLevel(): LogLevel {
  return LoggerConfig.getInstance().getGlobalLevel();
}

/**
 * Unified Logger class
 *
 * @example
 * ```typescript
 * import { Logger, LogLevel } from "@omnichat/core";
 *
 * const logger = new Logger("MyModule");
 * logger.info("Operation completed");
 * logger.error("Failed to process", new Error("details"));
 *
 * // Create child logger
 * const childLogger = logger.child("SubModule");
 * childLogger.debug("Detailed info");
 * ```
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;
  private config: LoggerConfig;

  constructor(prefix: string, level?: LogLevel) {
    this.prefix = prefix;
    this.config = LoggerConfig.getInstance();

    // Use provided level or fall back to global level
    this.level = level ?? this.config.getGlobalLevel();

    // Register with global config for level updates
    this.config.register(this);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.prefix}] ${message}`;
  }

  private log(method: "log" | "info" | "warn" | "error", level: string, message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage(level, message);

    if (typeof console !== "undefined" && console[method]) {
      // eslint-disable-next-line no-console
      console[method](formattedMessage, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log("log", "DEBUG", message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log("info", "INFO", message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log("warn", "WARN", message, ...args);
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log("error", "ERROR", message, error, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  child(prefix: string): Logger {
    return new Logger(`${this.prefix}:${prefix}`, this.level);
  }

  /**
   * Create a logger with a different prefix but same level
   */
  withPrefix(prefix: string): Logger {
    return new Logger(prefix, this.level);
  }
}
