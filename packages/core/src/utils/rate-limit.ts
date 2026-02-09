/**
 * Rate limiting and retry utilities
 *
 * Provides tools for handling API rate limits and automatic retries.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  return (
    error?.code === 'ETELEGRAM' ||
    error?.response?.body?.error_code === 429 ||
    error?.statusCode === 429
  );
}

/**
 * Extract retry delay from error (in seconds)
 */
export function extractRetryAfter(error: any): number {
  return (
    error?.response?.body?.parameters?.retry_after ||
    error?.retry_after ||
    0
  );
}

/**
 * Delay execution for specified milliseconds
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with automatic retry on rate limit errors
 *
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Function result
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

      // If not rate limit error, throw immediately
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Last attempt, throw error
      if (attempt === maxRetries) {
        throw error;
      }

      // Extract retry delay
      const retryAfter = extractRetryAfter(error);
      let delayMs: number;

      if (retryAfter > 0) {
        // Use API-provided delay
        delayMs = retryAfter * 1000;
      } else {
        // Use exponential backoff
        delayMs = exponentialBackoff
          ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          : baseDelay;
      }

      // Add jitter to avoid thundering herd
      delayMs += Math.random() * 1000;

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, delayMs, error);
      } else {
        console.warn(
          `Rate limited. Retrying after ${Math.round(delayMs / 1000)}s... (attempt ${attempt + 1}/${maxRetries + 1})`
        );
      }

      // Wait before retry
      await delay(delayMs);
    }
  }

  throw lastError;
}

/**
 * Token Bucket algorithm for rate limiting
 *
 * @param rate - Tokens per second
 * @param capacity - Bucket capacity (burst size)
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private rate: number = 30,
    private capacity: number = 30
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Wait until a token is available
   */
  async waitForToken(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time
    const waitTime = ((1 - this.tokens) / this.rate) * 1000;
    await delay(waitTime);

    this.refill();
    this.tokens -= 1;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.rate;

    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Create a rate-limited function wrapper
 *
 * @param fn - Original function
 * @param options - Rate limit options
 * @returns Wrapped function
 */
export function withRateLimit<
  T extends (...args: any[]) => Promise<any>
>(fn: T, options: RetryOptions = {}): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
