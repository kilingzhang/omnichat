# Integration Tests

This directory contains integration tests that verify the Telegram adapter works correctly with the real Telegram Bot API.

**Note:** These are also called "smoke tests" because they provide quick verification that the basic integration works.

### Prerequisites

1. Create a Telegram bot and get the bot token:
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Use `/newbot` command
   - Save the token

2. Add your bot to a chat where it has admin permissions:
   - Add the bot to a group/channel
   - Promote the bot to administrator
   - Note the chat ID (e.g., `-100123456789` or `@channelusername`)

3. Get a user ID for testing member operations:
   - Forward a message from that user to [@GetMyIdBot](https://t.me/GetMyIdBot)
   - Note the user ID

### Run Tests

```bash
# Set environment variables
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_CHAT_ID="-100123456789"  # or @channelusername
export TELEGRAM_USER_ID="123456789"

# Run integration tests
pnpm --filter @omnichat/telegram test:integration
```

### Or use a .env file

Create a `.env` file in the project root:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=-100123456789
TELEGRAM_USER_ID=123456789
```

Then run:

```bash
pnpm --filter @omnichat/telegram test:integration
```

## Test Coverage

The integration tests cover all 47 chat management methods:

- **Chat Information** (4 methods): `getChat`, `getChatMemberCount`, `getChatMember`, `getChatAdministrators`
- **Message Pinning** (3 methods): `pinChatMessage`, `unpinChatMessage`, `unpinAllChatMessages`
- **Permission Management** (3 methods): `setChatPermissions`, `runstrictChatMember`, `promoteChatMember`
- **Member Management** (2 methods): `banChatMember`, `unbanChatMember`
- **Chat Settings** (5 methods): `setChatTitle`, `setChatDescription`, `exportChatInviteLink`
- **Invite Links** (4 methods): `createChatInviteLink`, `editChatInviteLink`, `revokeChatInviteLink`
- **Join Requests** (2 methods): `approveChatJoinRequest`, `declineChatJoinRequest`
- **Forum Topics** (11 methods): `createForumTopic`, `editForumTopic`, `closeForumTopic`, `reopenForumTopic`, `deleteForumTopic`, `unpinAllForumTopicMessages`, `editGeneralForumTopic`, `closeGeneralForumTopic`, `reopenGeneralForumTopic`, `hideGeneralForumTopic`, `unhideGeneralForumTopic`, `unpinAllGeneralForumTopicMessages`
- **User Profile** (1 method): `getUserProfilePhotos`
- **Leave Chat** (1 method): `leaveChat`

## Safety Features

The tests include several safety measures:

1. **Auto-skip if no token**: Tests are skipped if `TELEGRAM_BOT_TOKEN` is not set
2. **Destructive operations**: Tests like `ban/unban` are skipped by default to avoid actual banning
3. **Error handling**: Tests continue even if operations fail (e.g., due to permissions)
4. **Console output**: Clear feedback on what succeeded and what failed

## Expected Output

```
🧪 Running integration tests with chat: @test_channel

 TelegramAdapter Chat Management Integration Tests
  ✓ Chat info: Test Channel (channel)
  ✓ Member count: 150
  ✓ Member: John Doe, roles: administrator
  ✓ Administrators: 3 found
  ✓ Message pinned: -100123456789:123
  ✓ Message unpinned
  ✓ Chat permissions updated
  ✓ Member restricted
  ✓ Member permissions restored
  ✓ Invite link: https://t.me/+ABCD1234...
  ✓ Invite link created
  ✓ Invite link edited
  ✓ Invite link revoked
  ✓ User profile photos: 5 total
  ✓ All capabilities verified
  ✓ Message sent: -100123456789:456
  ✓ Poll sent: -100123456789:457

✅ Integration tests completed
```

## Troubleshooting

### Tests are skipped
- Make sure `TELEGRAM_BOT_TOKEN` is set and is a valid token
- Make sure `TELEGRAM_CHAT_ID` is a chat where the bot is an admin

### Tests fail with "Bot is not a member"
- Add the bot to the chat
- Promote the bot to administrator

### Tests fail with "Not enough rights"
- Make sure the bot has necessary permissions in the chat
- Some operations require specific permissions (e.g., `can_promote_members`)

### Forum topic tests fail
- Forum topics are only available in supergroups
- Enable forum in the supergroup settings first

### Permission errors
Check that your bot has these permissions in the chat:
- `can_change_info` - for title/description
- `can_pin_messages` - for pinning
- `can_promote_members` - for member management
- `can_manage_topics` - for forum topics
- `can_invite_users` - for invite links
