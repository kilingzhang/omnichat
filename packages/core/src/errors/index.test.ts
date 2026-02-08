import { describe, it, expect } from "vitest";
import {
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
} from "../errors/index.js";

describe("Errors", () => {
  describe("SDKError", () => {
    it("should create base SDK error", () => {
      const error = new SDKError("Test error", "TEST_ERROR");
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.name).toBe("SDKError");
    });
  });

  describe("AdapterNotFoundError", () => {
    it("should create adapter not found error", () => {
      const error = new AdapterNotFoundError("telegram");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe('Adapter "telegram" not found or not loaded');
      expect(error.code).toBe("ADAPTER_NOT_FOUND");
      expect(error.name).toBe("AdapterNotFoundError");
    });
  });

  describe("CapabilityNotSupportedError", () => {
    it("should create capability not supported error", () => {
      const error = new CapabilityNotSupportedError("telegram", "polls");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe('Platform "telegram" does not support capability "polls"');
      expect(error.code).toBe("CAPABILITY_NOT_SUPPORTED");
      expect(error.name).toBe("CapabilityNotSupportedError");
    });
  });

  describe("ConfigurationError", () => {
    it("should create configuration error", () => {
      const error = new ConfigurationError("Missing required field");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("Configuration error: Missing required field");
      expect(error.code).toBe("CONFIGURATION_ERROR");
      expect(error.name).toBe("ConfigurationError");
    });
  });

  describe("APICallError", () => {
    it("should create API call error without status", () => {
      const error = new APICallError("API request failed");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("API request failed");
      expect(error.code).toBe("API_CALL_ERROR");
      expect(error.statusCode).toBeUndefined();
      expect(error.platformError).toBeUndefined();
    });

    it("should create API call error with status", () => {
      const error = new APICallError("API request failed", 404);
      expect(error.statusCode).toBe(404);
      expect(error.platformError).toBeUndefined();
    });

    it("should create API call error with platform error", () => {
      const platformError = { code: "TELEGRAM_ERROR", description: "Bad Request" };
      const error = new APICallError("API request failed", 400, platformError);
      expect(error.statusCode).toBe(400);
      expect(error.platformError).toEqual(platformError);
    });
  });

  describe("NetworkError", () => {
    it("should create network error", () => {
      const error = new NetworkError("Connection timeout");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("Connection timeout");
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.name).toBe("NetworkError");
    });
  });

  describe("RateLimitError", () => {
    it("should create rate limit error without retryAfter", () => {
      const error = new RateLimitError("Too many requests");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("Too many requests");
      expect(error.code).toBe("RATE_LIMIT_ERROR");
      expect(error.name).toBe("RateLimitError");
      expect(error.retryAfter).toBeUndefined();
    });

    it("should create rate limit error with retryAfter", () => {
      const error = new RateLimitError("Too many requests", 60);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("AuthenticationError", () => {
    it("should create authentication error", () => {
      const error = new AuthenticationError("Invalid API token");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("Invalid API token");
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.name).toBe("AuthenticationError");
    });
  });

  describe("PermissionError", () => {
    it("should create permission error", () => {
      const error = new PermissionError("Insufficient permissions");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("Insufficient permissions");
      expect(error.code).toBe("PERMISSION_ERROR");
      expect(error.name).toBe("PermissionError");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error", () => {
      const error = new ValidationError("Invalid message ID");
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe("Validation error: Invalid message ID");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.name).toBe("ValidationError");
    });
  });

  describe("error instanceof checks", () => {
    it("should identify all error types correctly", () => {
      const sdkError = new SDKError("Test", "TEST");
      const adapterError = new AdapterNotFoundError("test");
      const capabilityError = new CapabilityNotSupportedError("test", "test");
      const configError = new ConfigurationError("Test");
      const apiError = new APICallError("Test");
      const networkError = new NetworkError("Test");
      const rateLimitError = new RateLimitError("Test");
      const authError = new AuthenticationError("Test");
      const permissionError = new PermissionError("Test");
      const validationError = new ValidationError("Test");

      expect(sdkError).toBeInstanceOf(SDKError);
      expect(adapterError).toBeInstanceOf(SDKError);
      expect(capabilityError).toBeInstanceOf(SDKError);
      expect(configError).toBeInstanceOf(SDKError);
      expect(apiError).toBeInstanceOf(SDKError);
      expect(networkError).toBeInstanceOf(SDKError);
      expect(rateLimitError).toBeInstanceOf(SDKError);
      expect(authError).toBeInstanceOf(SDKError);
      expect(permissionError).toBeInstanceOf(SDKError);
      expect(validationError).toBeInstanceOf(SDKError);
    });
  });
});
