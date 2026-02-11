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
  AdvancedAdapter,
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
  AdvancedCapabilities,
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

// Universal Features
export type {
  UniversalComponent,
  UniversalButtonType,
  ComponentStyle,
  SelectOption,
  UniversalInteractiveElements,
  ComponentLayout,
  Mention,
  MentionType,
  Attachment,
  AttachmentType,
  Embed,
  UniversalSendContent,
  PlatformSpecificOptions,
  TelegramOptions,
  DiscordOptions,
  SlackOptions,
  WhatsAppOptions,
  SignalOptions,
  iMessageOptions,
  CommandParameter,
  CommandParameterType,
  UniversalCommand,
  CommandContext,
  SearchResult,
  SearchResultType,
  UniversalSearch,
  UserManagement,
  UserManagementAction,
  PermissionSet,
  UniversalInviteOptions,
  UniversalInviteResult,
  ReferralParams,
  EmbeddedUI,
  EmbeddedUIType,
  EmbeddedUISize,
  Thread,
  ThreadMessage,
  FeatureCapability,
  PlatformFeatureMatrix,
} from "./models/universal-features.js";
export {
  UniversalFeatureRegistry,
} from "./models/universal-features.js";

// Feature Adapters
export {
  BaseFeatureAdapter,
  TelegramButtonAdapter,
  DiscordButtonAdapter,
  SlackButtonAdapter,
  WhatsAppButtonAdapter,
  ComponentTransformer,
} from "./utils/feature-adapter.js";
export type {
  PlatformAdapter,
  AdapterTransformation,
} from "./models/universal-features.js";
