/**
 * 速率限制处理工具
 *
 * Telegram Bot API 有速率限制：
 * - 每个群组每分钟最多 20 条消息
 * - 每个 bot 总体每秒最多 30 条消息
 * - 违反限制会返回 429 错误，要求等待 retry_after 秒
 *
 * 这个模块提供了自动重试和智能延迟机制
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

/**
 * 检查错误是否是速率限制错误
 */
export function isRateLimitError(error: any): boolean {
  return (
    error?.code === 'ETELEGRAM' &&
    error?.response?.body?.error_code === 429
  );
}

/**
 * 从错误中提取重试延迟时间（秒）
 */
export function extractRetryAfter(error: any): number {
  return error?.response?.body?.parameters?.retry_after || 0;
}

/**
 * 带自动重试的异步函数执行器
 *
 * @param fn 要执行的异步函数
 * @param options 重试选项
 * @returns 函数执行结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 如果不是速率限制错误，直接抛出
      if (!isRateLimitError(error)) {
        throw error;
      }

      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }

      // 提取重试延迟时间
      const retryAfter = extractRetryAfter(error);
      let delay: number;

      if (retryAfter > 0) {
        // 使用 API 返回的延迟时间
        delay = retryAfter * 1000;
      } else {
        // 使用指数退避
        delay = exponentialBackoff
          ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          : baseDelay;
      }

      // 添加少量随机抖动，避免多个客户端同时重试
      delay += Math.random() * 1000;

      // 调用重试回调
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      } else {
        console.warn(
          `Rate limited. Retrying after ${Math.round(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries + 1})`
        );
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 延迟执行
 *
 * @param ms 延迟毫秒数
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试用的速率限制感知延迟
 *
 * 在测试之间添加智能延迟，避免触发速率限制
 *
 * @param testIndex 测试索引
 * @param testsPerMinute 每分钟允许的测试数（默认 20）
 */
export async function getTestDelay(
  testIndex: number,
  testsPerMinute = 20
): Promise<void> {
  // 计算每个测试之间的最小延迟
  const minDelay = (60 / testsPerMinute) * 1000;

  // 添加少量随机抖动（±10%）
  const jitter = minDelay * 0.1 * (Math.random() * 2 - 1);
  const delayMs = minDelay + jitter;

  await delay(delayMs);
}

/**
 * 创建一个带速率限制的函数包装器
 *
 * @param fn 原始函数
 * @param options 速率限制选项
 * @returns 包装后的函数
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}

/**
 * Token Bucket 算法实现速率限制
 *
 * @param rate 每秒允许的请求数
 * @param capacity 桶容量（允许的突发请求数）
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private rate: number = 30, private capacity: number = 30) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * 等待直到有可用的 token
   */
  async waitForToken(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // 计算需要等待的时间
    const waitTime = ((1 - this.tokens) / this.rate) * 1000;
    await delay(waitTime);

    this.refill();
    this.tokens -= 1;
  }

  /**
   * 重新填充桶
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.rate;

    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}
