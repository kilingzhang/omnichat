/**
 * Smart Type Inference - Usage Examples
 *
 * This file demonstrates how to use the smart target type inference feature
 * in real-world scenarios.
 */

import { TelegramAdapter } from '@omnichat/telegram';

// Initialize the adapter
const adapter = new TelegramAdapter();
await adapter.init({ apiToken: process.env.TELEGRAM_BOT_TOKEN! });

// ============================================================================
// Example 1: Automatic Inference (Simplest)
// ============================================================================

// The adapter automatically infers the type from the ID format

// @username format → automatically inferred as channel
await adapter.send('@mychannel', {
  text: 'Hello channel! (type automatically inferred)'
});

// Numeric user ID → automatically inferred as user
await adapter.send('123456789', {
  text: 'Hello user! (type automatically inferred)'
});

// The adapter remembers the type for subsequent calls
await adapter.send('123456789', {
  text: 'Hi again! (using cached type)'
});

// ============================================================================
// Example 2: Explicit Type (For Ambiguous IDs)
// ============================================================================

// For platforms where IDs are ambiguous (like QQ), specify the type
await adapter.send('123456789', {
  text: 'Hello group! (explicit type specified)'
}, { targetType: 'group' });

// Subsequent calls use the cached type
await adapter.send('123456789', {
  text: 'Hi again! (using cached group type)'
});

// ============================================================================
// Example 3: Convenience Methods (Most Clear)
// ============================================================================

// Use convenience methods for maximum clarity
await adapter.sendToUser('123456789', 'Hello user!');
await adapter.sendToGroup('-100123456789', 'Hello group!');
await adapter.sendToChannel('@mychannel', 'Hello channel!');

// Convenience methods accept all the same options
await adapter.sendToUser('123456789', 'Silent message', { silent: true });
await adapter.sendToGroup('-100123456789', 'Markdown *text*', { parseMode: 'markdown' });

// ============================================================================
// Example 4: Mixed Usage Patterns
// ============================================================================

// Real-world scenario: Send notifications to different targets

async function sendNotification(message: string) {
  const users = ['123456789', '987654321'];
  const groups = ['-100123456789', '-100987654321'];
  const channels = ['@updates', '@announcements'];

  // Send to users
  for (const userId of users) {
    await adapter.sendToUser(userId, message);
  }

  // Send to groups
  for (const groupId of groups) {
    await adapter.sendToGroup(groupId, message);
  }

  // Send to channels
  for (const channelId of channels) {
    await adapter.sendToChannel(channelId, message);
  }
}

// ============================================================================
// Example 5: Error Handling
// ============================================================================

// Handle cases where type cannot be inferred
try {
  // This works for Telegram (can infer from @username)
  await adapter.send('@mychannel', { text: 'Hello' });
} catch (error) {
  console.error('Failed to send:', error);
}

// For ambiguous IDs, always specify type
try {
  await adapter.send('ambiguous_id', {
    text: 'Hello'
  }, { targetType: 'user' }); // Explicit type
} catch (error) {
  console.error('Failed to send:', error);
}

// ============================================================================
// Example 6: Real-World Bot Commands
// ============================================================================

// Example bot that handles different types of targets
class MyBot {
  private adapter: TelegramAdapter;

  constructor() {
    this.adapter = new TelegramAdapter();
  }

  async start(token: string) {
    await this.adapter.init({ apiToken: token });
  }

  // Broadcast to all subscribers
  async broadcast(message: string, targets: string[]) {
    for (const target of targets) {
      try {
        // Use automatic inference - let the adapter figure it out
        await this.adapter.send(target, { text: message });
      } catch (error) {
        console.error(`Failed to send to ${target}:`, error);
      }
    }
  }

  // Send to specific user
  async directMessage(userId: string, message: string) {
    return await this.adapter.sendToUser(userId, message);
  }

  // Post to channel
  async postToChannel(channelId: string, message: string) {
    return await this.adapter.sendToChannel(channelId, message);
  }
}

// ============================================================================
// Example 7: Working with Different ID Formats
// ============================================================================

// Telegram ID formats you might encounter:

// 1. Public channel username
await adapter.sendToChannel('@my_public_channel', 'Hello!');

// 2. Private channel ID (starts with -100)
await adapter.sendToChannel('-1001234567890', 'Hello!');

// 3. Public group username
await adapter.sendToGroup('@my_public_group', 'Hello!');

// 4. Private group ID (starts with -100)
await adapter.sendToGroup('-1001234567890', 'Hello!');

// 5. User ID (numeric, no sign)
await adapter.sendToUser('123456789', 'Hello!');

// ============================================================================
// Example 8: Advanced - Custom Type Resolution
// ============================================================================

// If you need custom logic for type resolution
async function smartSend(target: string, text: string) {
  // Your custom logic to determine type
  let type: 'user' | 'group' | 'channel';

  if (target.startsWith('@')) {
    // Could be channel or group - check with API
    const chatInfo = await adapter.getChat(target);
    type = chatInfo.type === 'channel' ? 'channel' : 'group';
  } else if (target.startsWith('-100')) {
    type = 'group'; // Supergroup/channel
  } else {
    type = 'user'; // Numeric ID
  }

  // Send with determined type
  return await adapter.send(target, { text }, { targetType: type });
}

// ============================================================================
// Example 9: Testing Your Bot
// ============================================================================

// Test function to verify your bot works with different ID types
async function testBot() {
  const testTargets = {
    user: '123456789',          // Replace with real user ID
    group: '-100123456789',      // Replace with real group ID
    channel: '@mychannel'        // Replace with real channel
  };

  console.log('Testing bot with different target types...');

  // Test user
  try {
    await adapter.sendToUser(testTargets.user, '🧪 Test: user message');
    console.log('✅ User message sent');
  } catch (error) {
    console.error('❌ User message failed:', error);
  }

  // Test group
  try {
    await adapter.sendToGroup(testTargets.group, '🧪 Test: group message');
    console.log('✅ Group message sent');
  } catch (error) {
    console.error('❌ Group message failed:', error);
  }

  // Test channel
  try {
    await adapter.sendToChannel(testTargets.channel, '🧪 Test: channel message');
    console.log('✅ Channel message sent');
  } catch (error) {
    console.error('❌ Channel message failed:', error);
  }
}

// ============================================================================
// Best Practices
// ============================================================================

/*
 * 1. Use automatic inference when IDs are unambiguous
 *    - Telegram: @username, numeric IDs
 *    - Let the adapter figure it out
 *
 * 2. Use explicit types for ambiguous IDs
 *    - QQ, WeChat: same format for users and groups
 *    - Always specify targetType
 *
 * 3. Use convenience methods for clarity
 *    - sendToUser(), sendToGroup(), sendToChannel()
 *    - Most readable and maintainable
 *
 * 4. Cache is automatic
 *    - First call with explicit type sets cache
 *    - Subsequent calls use cached type
 *    - Can override with new explicit type
 *
 * 5. Error handling
 *    - Always wrap in try/catch
 *    - Handle rate limits
 *    - Log failures for debugging
 */
