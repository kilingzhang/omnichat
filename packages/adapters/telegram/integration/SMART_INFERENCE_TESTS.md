# Smart Type Inference Integration Tests

This directory contains integration tests specifically for the **smart target type inference** feature.

## 📋 What This Tests

These integration tests verify that:

1. **Automatic type inference** works correctly for different ID formats:
   - `@username` → inferred as `channel`
   - Numeric IDs → inferred based on value and SIGN_BIT
   - Negative numbers → handled correctly as groups

2. **Type caching** persists across multiple calls:
   - First call infers or uses explicit type
   - Subsequent calls use cached type
   - Cache can be overridden with new explicit type

3. **Convenience methods** work correctly:
   - `sendToUser(userId, text, options?)`
   - `sendToGroup(groupId, text, options?)`
   - `sendToChannel(channelId, text, options?)`

4. **Mixed usage patterns** are handled correctly:
   - Switching between different targets
   - Rapid successive calls
   - Special characters and edge cases

## 🚀 Quick Start

### 1. Create a Telegram Bot

If you don't already have one:
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Use `/newbot` command
3. Save the token

### 2. Prepare Test Chats

You'll need:

- **A group chat** where the bot is an admin
  - Add the bot to a group
  - Promote to administrator
  - Note the chat ID (e.g., `-100123456789`)

- **A channel** (optional, for channel-specific tests)
  - Add the bot as administrator
  - Note the channel username or ID (e.g., `@mychannel`)

- **A user ID** (optional, for DM tests)
  - Message [@GetMyIdBot](https://t.me/GetMyIdBot)
  - Note your user ID

### 3. Set Up Environment Variables

Create a `.env` file:

```bash
cd integration
cp .env.example .env
```

Edit `.env` with your values:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=-100123456789
TELEGRAM_CHANNEL_ID=@your_channel
TELEGRAM_USER_ID=123456789
```

### 4. Run Tests

#### Option A: Using npm script

```bash
pnpm --filter @omnichat/telegram test:integration:smart
```

#### Option B: Using the provided script

```bash
cd integration
./run-smart-inference-tests.sh
```

#### Option C: Direct vitest

```bash
vitest run integration/smart-type-inference.integration.test.ts
```

## 📊 Expected Output

```
🧪 Smart Type Inference Integration Tests

TelegramAdapter Smart Target Type Inference - Integration Tests
  ✓ Automatic type inference from ID format
    ✓ should send to @username format (channel)
    ✓ should send to numeric user ID
    ✓ should send to numeric group ID (negative)
  ✓ Explicit targetType with caching
    ✓ should use explicit targetType and cache it
    ✓ should allow overriding cached type
  ✓ Convenience methods
    ✓ sendToUser should work correctly
    ✓ sendToGroup should work correctly
    ✓ sendToChannel should work correctly
    ✓ convenience methods should accept additional options
  ✓ Cache persistence across multiple calls
    ✓ should remember inferred types across multiple calls
  ✓ Mixed usage patterns
    ✓ should handle switching between different targets
  ✓ Edge cases
    ✓ should handle rapid successive calls to same target
    ✓ should handle special characters in text

Test Files  1 passed (1)
     Tests  15 passed (15)
```

## 🔍 Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| **Automatic Inference** | 3 | Tests @username, numeric user ID, group ID |
| **Explicit Types** | 2 | Tests explicit targetType and caching |
| **Convenience Methods** | 4 | Tests sendToUser, sendToGroup, sendToChannel |
| **Cache Persistence** | 1 | Tests cache across multiple calls |
| **Mixed Patterns** | 1 | Tests switching between targets |
| **Edge Cases** | 2 | Tests rapid calls, special chars |
| **Total** | **15** | Comprehensive coverage |

## ⚠️ Troubleshooting

### Tests are skipped

**Problem**: Tests show "⏭️ Skipped" messages

**Solution**:
- Make sure `.env` file exists in the `integration/` directory
- Verify all required variables are set:
  ```bash
  cat .env
  ```

### "Bot is not a member" error

**Problem**: Tests fail with "bot is not a member"

**Solution**:
- Add your bot to the test group/channel
- Promote the bot to administrator
- Verify the chat ID is correct

### "Not enough rights" error

**Problem**: Tests fail with "not enough rights"

**Solution**:
- Ensure bot has admin permissions
- Check bot can send messages in the chat
- For channels: bot must be an admin

### "Chat not found" error

**Problem**: Tests fail with "chat not found"

**Solution**:
- Verify the chat ID is correct
- For public channels: use `@username` format
- For private groups: use numeric ID (usually negative)
- Get correct chat ID from [@GetMyIdBot](https://t.me/GetMyIdBot)

### Channel tests skipped

**Problem**: Channel tests show "TELEGRAM_CHANNEL_ID not set"

**Solution**:
- This is expected if you don't have a channel
- Channel tests are optional
- Add `TELEGRAM_CHANNEL_ID` to `.env` to run them

### User DM tests skipped

**Problem**: User DM tests show "TELEGRAM_USER_ID not set"

**Solution**:
- This is expected if you don't have a user ID
- DM tests are optional
- Add `TELEGRAM_USER_ID` to `.env` to run them

## 📝 Notes

### What Actually Happens During Tests

These tests **will send real messages** to your Telegram chats:

1. Each test sends 1-3 messages
2. Messages start with "🧪" emoji for easy identification
3. Total messages sent: ~15-20 per full run

### Cleanup

To clean up test messages:
- Manual deletion is fastest
- Or use a Telegram bulk delete tool
- Consider creating a dedicated test group

### Rate Limits

Telegram has rate limits:
- **Groups**: ~20 messages/minute to same group
- **DMs**: ~20 messages/minute to same user

If you hit rate limits:
- Tests will slow down automatically
- Consider adding delays between tests
- Run tests less frequently

## 🔗 Related Documentation

- [Main Integration Tests README](./README.md) - General integration test guide
- [Smart Type Inference Design](../../SMART_INFERENCE_DESIGN.md) - Design documentation
- [Adapter README](../../README.md) - Main adapter documentation

## 🎯 Success Criteria

All tests should pass with:
- ✅ No errors thrown
- ✅ All messages sent successfully
- ✅ Message IDs returned in correct format
- ✅ No rate limit issues
- ✅ Cache working as expected

If you see all green checkmarks, the smart type inference feature is working correctly! 🎉
