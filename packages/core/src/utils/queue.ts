/**
 * Request queue management
 *
 * Controls concurrent requests to avoid hitting rate limits.
 */

import { TokenBucket } from './rate-limit.js';
import { Logger } from './logger.js';

/**
 * Request task
 */
interface RequestTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

/**
 * Request queue with concurrency control
 *
 * Manages concurrent requests and rate limiting.
 */
export class RequestQueue {
  private queue: RequestTask<any>[] = [];
  private running = 0;
  private logger: Logger;
  private rateLimiter: TokenBucket;

  constructor(
    private concurrency: number = 5,
    private rateLimit: number = 30
  ) {
    this.rateLimiter = new TokenBucket(rateLimit, rateLimit);
    this.logger = new Logger('RequestQueue');
  }

  /**
   * Add a request to the queue
   *
   * @param fn - Async function to execute
   * @returns Promise that resolves when request completes
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  /**
   * Process queued requests
   */
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;

    // Take batch from queue
    const batchSize = Math.min(this.concurrency, this.queue.length);
    const batch = this.queue.splice(0, batchSize);

    // Execute batch concurrently
    await Promise.all(
      batch.map(async (task) => {
        try {
          // Wait for rate limiter
          await this.rateLimiter.waitForToken();

          // Execute task
          const result = await task.fn();
          task.resolve(result);
        } catch (error) {
          task.reject(error);
        }
      })
    );

    this.running--;

    // Process next batch
    this.process();
  }

  /**
   * Clear all queued requests
   */
  clear(): void {
    this.queue = [];
    this.logger.debug('Queue cleared');
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      running: this.running,
      concurrency: this.concurrency,
      rateLimit: this.rateLimit,
      availableTokens: this.rateLimiter.getAvailableTokens(),
    };
  }

  /**
   * Wait for queue to drain
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.running > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Create a request queue
 *
 * @param concurrency - Max concurrent requests
 * @param rateLimit - Requests per second
 * @returns RequestQueue instance
 */
export function createQueue(
  concurrency = 5,
  rateLimit = 30
): RequestQueue {
  return new RequestQueue(concurrency, rateLimit);
}
