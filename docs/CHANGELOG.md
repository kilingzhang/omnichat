# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-02-08

### Added

#### Core SDK
- **Logger Utility** (`@im-sdk/core`)
  - Support for multiple log levels: DEBUG, INFO, WARN, ERROR, SILENT
  - Structured logging with timestamps and prefixes
  - Child logger support for hierarchical logging
  - Configurable log level at runtime

- **Adapter Utilities** (`@im-sdk/core`)
  - `parseMessageId()` - Parse compound messageId format (chatId:messageId)
  - `validateRequired()` - Validate required string fields
  - `validateAtLeastOne()` - Validate at least one field is present
  - `safeExecute()` - Execute async functions with error handling
  - `withRetry()` - Retry wrapper for async functions
  - `truncateText()` - Truncate text for logging
  - `formatError()` - Format error messages with context

#### Telegram Adapter
- Comprehensive logging system
- Parameter validation for all methods
- Improved error handling and reporting
- Poll support (actually implemented, not throwing errors)
- Better reaction handling
- Automatic callback query answering
- polling_error event handling

#### Discord Adapter
- Comprehensive logging system
- Parameter validation for all methods
- Improved error handling and reporting
- Bot message filtering (ignores messages from bots)
- Better attachment handling
- messageId format consistency (channelId:messageId)

### Changed

#### Telegram Adapter
- **Breaking**: `send()` now returns messageId in compound format `chatId:messageId`
- **Improved**: Better error messages with context
- **Fixed**: `sendPoll()` now actually implements poll functionality
- **Fixed**: `removeReaction()` properly clears reactions
- **Fixed**: Callback queries are automatically answered

#### Discord Adapter
- **Breaking**: `send()` now returns messageId in compound format `channelId:messageId`
- **Improved**: Better error messages with context
- **Fixed**: Attachments now properly use `size` instead of `length`
- **Fixed**: Bot messages are now filtered out

### Fixed

- **Core**: Fixed messageId format inconsistency across adapters
- **Telegram**: Fixed replyToMessageId parsing to handle compound format
- **All Adapters**: Added proper try-catch blocks in message handlers
- **All Adapters**: Added parameter validation to prevent invalid operations

### Improved

- All adapters now have comprehensive debug logging
- Error messages now include context (user IDs, channel IDs, etc.)
- Input validation prevents invalid API calls
- Better handling of edge cases (empty strings, missing fields, etc.)
- More informative error messages for debugging

## [0.0.1] - Previous releases

### Initial Release
- Basic SDK structure
- Telegram adapter (basic functionality)
- Discord adapter (basic functionality)
- Core interfaces and types
- Capability system
