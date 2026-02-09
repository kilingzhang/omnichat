# Telegram Adapter Architecture

## Overview

Clean architecture with core utilities in `@omnichat/core` and Telegram-specific logic in the adapter.

## Directory Structure

```
packages/adapters/telegram/src/
├── adapter.ts                 # Main adapter implementation
├── adapter.test.ts           # Unit tests
├── index.ts                  # Public exports
├── types/                    # Type definitions
│   └── telegram.ts
├── client/                   # Telegram Bot API wrapper
│   ├── cached-client.ts     # Cached API client
│   └── index.ts
└── utils/                    # Telegram-specific utilities
    ├── id-converter.ts      # Telegram ID conversion
    ├── validator.ts         # Parameter validation
    └── index.ts

integration/                  # Integration tests (require bot token)
├── test-utils.ts            # Test helpers
├── chat-management.integration.test.ts
├── message-operations.integration.test.ts
├── interactive-features.integration.test.ts
└── bot-configuration.integration.test.ts
```

## Core Utilities (from @omnichat/core)

The adapter uses these utilities from `@omnichat/core`:

- **Logger** - Structured logging
- **SimpleCache** - TTL-based caching
- **RequestQueue** - Concurrent request management
- **TokenBucket** - Rate limiting algorithm
- **CircuitBreaker** - Fail-fast pattern
- **withRetry** - Automatic retry with exponential backoff
- **resilientExecute** - Enhanced retry with circuit breaker

## Usage

### Basic

```typescript
import { TelegramAdapter } from '@omnichat/telegram';

const adapter = new TelegramAdapter();
await adapter.init({ apiToken: 'YOUR_TOKEN' });
await adapter.send(chatId, { text: 'Hello' });
```

### With Performance Features

```typescript
// Enable caching and queue
await adapter.init({
  apiToken: 'YOUR_TOKEN',
  enableCache: true,      // Cache API responses
  enableQueue: true,      // Control concurrent requests
  queueConcurrency: 10    // Max 10 concurrent requests
});
```

## Implementation Details

### Telegram-Specific Utilities

**id-converter.ts**: Handles Telegram's positive/negative ID system
- Converts between Telegram IDs and unified positive IDs
- Uses SIGN_BIT encoding to avoid conflicts

**validator.ts**: Telegram-specific parameter validation
- Chat ID validation
- Message ID parsing
- API token validation

**cached-client.ts**: Wrapper around Telegram Bot API
- Caches `getChat()`, `getChatMemberCount()`, etc.
- Uses `withRetry` from core for automatic retry

### Configuration Options

```typescript
export interface TelegramConfig extends AdapterConfig {
  apiToken: string;
  webhookUrl?: string;
  polling?: boolean;
  // Performance options
  enableCache?: boolean;
  enableQueue?: boolean;
  queueConcurrency?: number;
}
```

## Testing

### Unit Tests (No API required)
```bash
pnpm test:unit
```

### Integration Tests (Requires bot token)
```bash
# Set credentials in integration/.env
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx pnpm test:integration:all
```

## Design Principles

1. **Separation of Concerns**
   - Core utilities in `@omnichat/core`
   - Telegram-specific logic in adapter
   - Clear boundaries between layers

2. **No Duplication**
   - Reuse core utilities instead of reimplementing
   - Single source of truth for common patterns

3. **Performance by Default**
   - Optional caching and queue features
   - Automatic retry and rate limiting
   - Circuit breaker for resilience

4. **Type Safety**
   - Full TypeScript support
   - Minimal `any` types
   - Clear type definitions

## Future Work

- [ ] Add more caching strategies (LRU, LFU)
- [ ] Metrics and monitoring
- [ ] Bulk operation support
- [ ] Enhanced error reporting
