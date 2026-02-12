/**
 * Storage Configuration and Types
 */

export interface StorageConfig {
  type: "local" | "s3" | "memory";
  basePath?: string;
  autoSaveMedia?: boolean;
  namingStrategy?: "timestamp" | "uuid" | "original";
  maxFileSize?: number;
}

export interface StorageMetadata {
  contentType?: string;
  platform?: string;
  messageId?: string;
  userId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface StorageResult {
  key: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface Storage {
  save(key: string, data: Buffer, metadata?: StorageMetadata): Promise<string>;
  load(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
}

export const defaultStorageConfig: StorageConfig = {
  type: "memory",
  autoSaveMedia: false,
  namingStrategy: "timestamp",
};
