// Core
export { SDK } from "./core/sdk.js";
export type { SDKOptions, AdapterInitializer, MessageCallback, Middleware } from "./core/sdk.js";

// Adapters
export type {
  Adapter,
  AdapterConfig,
  ConversationAdapter,
  InteractionAdapter,
  DiscoveryAdapter,
  ManagementAdapter,
  FullAdapter,
  PollInput,
  PollResult,
  ChatAction,
} from "./core/adapter.js";

// Models
export type {
  Platform,
  MessageType,
  MediaType,
  TargetType,
  Button,
  ThreadInfo,
  ReplyReference,
  Participant,
  MessageContent,
  Message,
  SendContent,
  SendOptions,
  SendResult,
} from "./models/message.js";
export type { ExtendedMessage, extendMessage, isExtendedMessage } from "./models/extended-message.js";

export type {
  Capabilities,
  BaseCapabilities,
  ConversationCapabilities,
  InteractionCapabilities,
  DiscoveryCapabilities,
  ManagementCapabilities,
} from "./models/capabilities.js";
export { defaultCapabilities, mergeCapabilities, hasCapability } from "./models/capabilities.js";

// Errors
export {
  SDKError,
  AdapterNotFoundError,
  CapabilityNotSupportedError,
  ConfigurationError,
  APICallError,
  NetworkError,
  RateLimitError,
  AuthenticationError,
  PermissionError,
  ValidationError,
} from "./errors/index.js";

// Utils
export { Logger, LogLevel } from "./utils/logger.js";
export {
  parseMessageId,
  validateRequired,
  validateAtLeastOne,
  safeExecute,
  truncateText,
  formatError,
} from "./utils/adapter-utils.js";
export { SimpleCache, createCache } from "./utils/cache.js";
export {
  withRetry,
  delay,
  isRateLimitError,
  extractRetryAfter,
  TokenBucket,
  withRateLimit,
  type RetryOptions,
} from "./utils/rate-limit.js";
export { RequestQueue, createQueue } from "./utils/queue.js";
export {
  CircuitBreaker,
  CircuitBreakerState,
  resilientExecute,
  withResilience,
  type CircuitBreakerOptions,
  type ResilientOptions,
} from "./utils/resilient.js";

// Storage
export type {
  Storage,
  StorageConfig,
  StorageMetadata,
} from "./storage/storage.js";
export { StorageManager, LocalFileStorage } from "./storage/index.js";

// Middleware
export { createAutoSaveMediaMiddleware } from "./middleware/auto-save-media.js";
export type { AutoSaveMediaConfig } from "./middleware/auto-save-media.js";
