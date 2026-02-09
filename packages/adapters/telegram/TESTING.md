# Testing Strategy

## Overview

This project uses a multi-layered testing approach to ensure code quality and reliability.

## Test Types

### 1. Unit Tests (`adapter.test.ts`)

**Purpose**: Test individual methods in isolation using mocks.

**Characteristics**:
- ✅ Fast (millisecond execution)
- ✅ Reliable (no external dependencies)
- ✅ Repeatable (can run anytime)
- ✅ Isolated (tests only our code logic)

**What we test**:
- Parameter conversion (camelCase ↔ snake_case)
- Error handling
- Edge cases
- Method call signatures

**Example**:
```typescript
it("should convert userId to number for API call", async () => {
  mockBotInstance.getChatMember.mockResolvedValue(mockMember);
  await adapter.getChatMember("@chat", "123");

  // Verify the adapter converts string to number for API
  expect(mockBotInstance.getChatMember).toHaveBeenCalledWith("@chat", 123);
});
```

**Run with**:
```bash
pnpm --filter @omnichat/telegram test:unit
```

---

### 2. Integration Tests (`integration/chat-management.integration.test.ts`)

**Purpose**: Test integration with real Telegram Bot API.

**Also called**: "Smoke tests" - quick verification that basic functionality works

**Characteristics**:
- ⚠️ Slower (requires network calls)
- ⚠️ Requires real API credentials
- ✅ Validates real integration
- ✅ Catches API contract mismatches

**What we test**:
- Real API calls work correctly
- Authentication is valid
- Permissions are properly configured
- API response format matches expectations

**Setup**:
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="@your_chat"
export TELEGRAM_USER_ID="123456789"
```

**Run with**:
```bash
pnpm --filter @omnichat/telegram test:integration
```

---

## Test Mocking Strategy

### Why do we mock in unit tests?

We mock the Telegram Bot API in unit tests because:

1. **Speed**: Tests run in milliseconds, not seconds
2. **Reliability**: Tests don't fail due to network issues
3. **Isolation**: We test OUR code, not Telegram's servers
4. **Control**: We can simulate edge cases (API errors, timeouts, etc.)

### What do we mock?

We mock the `node-telegram-bot-api` library's methods:
- All API calls (getChat, sendMessage, etc.)
- Network responses
- Error conditions

### Test Helper for Mocking

The adapter uses dynamic imports which are normally hard to mock. To solve this, we have a test-only helper:

```typescript
// Only available in test environment via globalThis
globalThis.__setImportTelegramBot(mockFunction);
```

**This is NOT part of the public API** - it's only exposed when `NODE_ENV === 'test'` or `VITEST === 'true'`.

---

## Test Coverage

### Current Coverage

- **Unit Tests**: 82 tests covering:
  - ✅ Initialization
  - ✅ Capabilities
  - ✅ Chat Information (4 methods)
  - ✅ Message Pinning (3 methods)
  - ✅ Permission Management (3 methods)
  - ✅ Member Management (2 methods)
  - ✅ Chat Settings (5 methods)
  - ✅ Invite Link Management (4 methods)
  - ✅ Join Request Management (2 methods)
  - ✅ Forum Topic Management (11 methods)
  - ✅ User Profile Photos (1 method)
  - ✅ Leave Chat (1 method)

- **Integration Tests**: Smoke tests for all chat management features

### What gets tested in unit tests vs integration tests?

| Feature | Unit Tests | Integration Tests |
|---------|-----------|------------------|
| Parameter conversion | ✅ | - |
| Error handling | ✅ | - |
| API call signature | ✅ | - |
| Real API connectivity | - | ✅ |
| Authentication | - | ✅ |
| Actual data format | - | ✅ |
| Permissions validation | - | ✅ |

---

## Running Tests

### All Unit Tests
```bash
pnpm --filter @omnichat/telegram test:unit
```

### All Integration Tests (requires API token)
```bash
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx pnpm --filter @omnichat/telegram test:integration
```

### Specific Test File
```bash
pnpm --filter @omnichat/telegram exec vitest run src/adapter.test.ts
```

### Watch Mode (development)
```bash
pnpm --filter @omnichat/telegram exec vitest watch src/
```

---

## Best Practices

### When to write unit tests:
- Testing your code's logic (parameter conversion, validation)
- Testing error handling
- Testing edge cases
- Fast feedback during development

### When to write integration tests:
- Validating API integration
- Testing authentication/authorization
- Exploring new API features
- Regression testing before releases

### When to use real data:
- Never in unit tests
- Only in integration tests
- Only with test credentials
- Never with production data

---

## Common Test Patterns

### Unit Test Pattern
```typescript
describe("Feature", () => {
  beforeEach(async () => {
    await adapter.init({ apiToken: "test_token" });
  });

  it("should do something", async () => {
    // 1. Setup mock responses
    mockBot.method.mockResolvedValue(expectedResponse);

    // 2. Call the method
    const result = await adapter.method(params);

    // 3. Verify behavior
    expect(result).toEqual(expected);
    expect(mockBot.method).toHaveBeenCalledWith(expectedParams);
  });
});
```

### Integration Test Pattern
```typescript
describe.runIf(process.env.TELEGRAM_BOT_TOKEN)("Real API Tests", () => {
  it("should work with real API", async () => {
    const adapter = new TelegramAdapter();
    await adapter.init({ apiToken: process.env.TELEGRAM_BOT_TOKEN! });

    const result = await adapter.method();
    expect(result).toBeDefined();
  });
});
```

---

## Troubleshooting

### Unit Tests Fail
- Check if mock is properly set up
- Verify parameter conversion logic
- Check error handling

### Integration Tests Fail
- Verify API token is valid
- Check bot permissions in the chat
- Ensure chat/user IDs are correct
- Check Telegram API status

### Mock Not Working
- Ensure `globalThis.__setImportTelegramBot` is available
- Check if `NODE_ENV` or `VITEST` env var is set
- Verify the mock function returns a valid constructor
