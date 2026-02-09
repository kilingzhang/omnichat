/**
 * Test utilities for integration tests
 */

import { delay } from '@omnichat/core';

/**
 * Test-aware delay for rate limiting
 *
 * Adds intelligent delays between tests to avoid triggering rate limits
 *
 * @param testIndex - Test sequence number
 * @param testsPerMinute - Allowed tests per minute (default: 20)
 */
export async function getTestDelay(
  testIndex: number,
  testsPerMinute = 20
): Promise<void> {
  const minDelay = (60 / testsPerMinute) * 1000;
  const jitter = minDelay * 0.1 * (Math.random() * 2 - 1);
  await delay(minDelay + jitter);
}
