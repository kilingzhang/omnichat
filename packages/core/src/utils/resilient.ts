/**
 * Resilient execution utilities
 *
 * Provides circuit breaker pattern and enhanced retry mechanisms.
 */

import { delay, withRetry, type RetryOptions } from './rate-limit.js';
import { Logger } from './logger.js';
import { TIME_MS } from '../constants/index.js';

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;   // Failures before opening
  resetTimeout?: number;       // Ms before attempting reset
  monitoringPeriod?: number;   // Ms to monitor for failures
}

/**
 * Default circuit breaker reset timeout
 */
const DEFAULT_RESET_TIMEOUT = TIME_MS.ONE_MINUTE;

/**
 * Default monitoring period (10 seconds)
 */
const DEFAULT_MONITORING_PERIOD = TIME_MS.TEN_MINUTES / 6;

/**
 * Circuit breaker implementation
 *
 * Fails fast when a service is consistently failing.
 */
export class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private successCount = 0;
  private logger: Logger;

  constructor(
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: DEFAULT_RESET_TIMEOUT,
      monitoringPeriod: DEFAULT_MONITORING_PERIOD,
      ...options
    };
    this.logger = new Logger('CircuitBreaker');
  }

  /**
   * Check if execution is allowed
   */
  canExecute(): boolean {
    const now = Date.now();

    // Check if we should attempt reset
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.lastFailureTime && (now - this.lastFailureTime) > this.options.resetTimeout!) {
        this.setState(CircuitBreakerState.HALF_OPEN);
        this.logger.info('Circuit breaker entering HALF_OPEN state');
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        // Need 2 consecutive successes to close
        this.setState(CircuitBreakerState.CLOSED);
        this.logger.info('Circuit breaker closing after successful recovery');
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failed in half-open, reopen immediately
      this.setState(CircuitBreakerState.OPEN);
      this.logger.warn('Circuit breaker reopening after failure in HALF_OPEN');
      this.successCount = 0;
    } else if (this.failureCount >= this.options.failureThreshold!) {
      this.setState(CircuitBreakerState.OPEN);
      this.logger.warn(`Circuit breaker opening after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.setState(CircuitBreakerState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.logger.info('Circuit breaker reset');
  }

  /**
   * Set circuit breaker state
   */
  private setState(state: CircuitBreakerState): void {
    if (this.state !== state) {
      this.logger.debug(`Circuit breaker state: ${this.state} -> ${state}`);
      this.state = state;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Resilient execution options
 */
export interface ResilientOptions extends RetryOptions {
  circuitBreaker?: CircuitBreaker;
  fallback?: () => any;
  timeout?: number;
}

/**
 * Execute function with resilient features
 *
 * Combines circuit breaker, retry, and timeout.
 *
 * @param fn - Function to execute
 * @param options - Resilient options
 * @returns Function result
 */
export async function resilientExecute<T>(
  fn: () => Promise<T>,
  options: ResilientOptions = {}
): Promise<T> {
  const {
    circuitBreaker,
    fallback,
    timeout,
    ...retryOptions
  } = options;

  // Check circuit breaker
  if (circuitBreaker && !circuitBreaker.canExecute()) {
    const error = new Error('Circuit breaker is OPEN - service unavailable');
    if (fallback) {
      return fallback();
    }
    throw error;
  }

  try {
    // Add timeout if specified
    const result = timeout
      ? await Promise.race([
          fn(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
          )
        ])
      : await withRetry(fn, retryOptions);

    // Record success
    if (circuitBreaker) {
      circuitBreaker.recordSuccess();
    }

    return result;
  } catch (error: any) {
    // Record failure
    if (circuitBreaker) {
      circuitBreaker.recordFailure();
    }

    // Use fallback if available
    if (fallback) {
      return fallback();
    }

    throw error;
  }
}

/**
 * Create a resilient wrapper for a function
 *
 * @param fn - Original function
 * @param options - Resilient options
 * @returns Wrapped function
 */
export function withResilience<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ResilientOptions = {}
): T {
  const circuitBreaker = options.circuitBreaker
    ? options.circuitBreaker
    : new CircuitBreaker(options.circuitBreaker);

  return (async (...args: Parameters<T>) => {
    return resilientExecute(() => fn(...args), {
      ...options,
      circuitBreaker
    });
  }) as T;
}
