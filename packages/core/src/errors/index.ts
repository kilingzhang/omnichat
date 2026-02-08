/**
 * Base error class for all SDK errors
 */
export class SDKError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SDKError";
  }
}

/**
 * Adapter not found error
 */
export class AdapterNotFoundError extends SDKError {
  constructor(platform: string) {
    super(`Adapter "${platform}" not found or not loaded`, "ADAPTER_NOT_FOUND");
    this.name = "AdapterNotFoundError";
  }
}

/**
 * Capability not supported error
 */
export class CapabilityNotSupportedError extends SDKError {
  constructor(platform: string, capability: string) {
    super(
      `Platform "${platform}" does not support capability "${capability}"`,
      "CAPABILITY_NOT_SUPPORTED"
    );
    this.name = "CapabilityNotSupportedError";
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends SDKError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}

/**
 * API call errors
 */
export class APICallError extends SDKError {
  constructor(
    message: string,
    public statusCode?: number,
    public platformError?: unknown
  ) {
    super(message, "API_CALL_ERROR");
    this.name = "APICallError";
  }
}

export class NetworkError extends SDKError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

export class RateLimitError extends SDKError {
  constructor(message: string, public retryAfter?: number) {
    super(message, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends SDKError {
  constructor(message: string) {
    super(message, "PERMISSION_ERROR");
    this.name = "PermissionError";
  }
}

/**
 * Validation error
 */
export class ValidationError extends SDKError {
  constructor(message: string) {
    super(`Validation error: ${message}`, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
