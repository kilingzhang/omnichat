import type { Message } from "../models/message.js";
import type { ExtendedMessage } from "../models/extended-message.js";
import type { Middleware } from "../core/sdk.js";

/**
 * Auto-save media files middleware configuration
 */
export interface AutoSaveMediaConfig {
  /**
   * Platforms to enable auto-save for
   * @default ['telegram', 'discord', 'slack']
   */
  platforms?: string[];

  /**
   * Media types to save
   * @default ['image', 'video', 'audio', 'file']
   */
  mediaTypes?: string[];

  /**
   * Whether to download file or just save metadata
   * @default true
   */
  downloadFile?: boolean;
}

/**
 * Create middleware to automatically save media files
 */
export function createAutoSaveMediaMiddleware(config: AutoSaveMediaConfig = {}): Middleware {
  const {
    platforms = ["telegram", "discord", "slack"],
    mediaTypes = ["image", "video", "audio", "file"],
    downloadFile = true,
  } = config;

  return async (message: Message, next) => {
    // Cast to extended message
    const extended = message as ExtendedMessage;

    // Check if platform is enabled
    if (!platforms.includes(extended.platform)) {
      return next();
    }

    // Check if message has media
    if (!extended.content.mediaUrl || !extended.content.mediaType) {
      return next();
    }

    // Check if media type should be saved
    if (!mediaTypes.includes(extended.content.mediaType)) {
      return next();
    }

    try {
      // Get SDK from extended message
      const sdk = extended.sdk;
      if (!sdk) {
        console.log("⚠️  No SDK in message");
        return next();
      }

      const storage = sdk.getStorage();
      if (!storage?.isConfigured()) {
        console.log("⚠️  Storage not configured");
        return next();
      }

      // Download and save file
      const adapter = sdk.getAdapter(extended.platform);

      // Check if adapter has download method
      if (downloadFile && adapter && typeof (adapter as any).downloadFileAsBuffer === "function") {
        console.log(`📥 Downloading media: ${extended.content.mediaUrl} (${extended.content.mediaType})`);

        const buffer = await (adapter as any).downloadFileAsBuffer(extended.content.mediaUrl);

        console.log(`📦 Downloaded ${buffer.length} bytes`);

        // Generate file key
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = getExtension(extended.content.mediaType);
        const key = `${timestamp}_${randomStr}${extension}`;

        // Save to storage
        const savedPath = await storage.save(key, buffer, {
          contentType: extended.content.mediaType,
          platform: extended.platform,
          messageId: extended.messageId,
          userId: extended.from.id,
          timestamp: extended.timestamp,
        });

        // Attach storage info to message
        extended.storagePath = savedPath;
        extended.storageKey = key;
        extended.mediaSaved = true;

        console.log(`✅ Saved media file: ${key} (${buffer.length} bytes)`);
      } else {
        console.log("⚠️  Download method not available");
      }
    } catch (error: any) {
      console.error(`❌ Failed to save media file:`, error);
      console.error(`   Stack: ${error.stack}`);
    }

    return next();
  };
}

function getExtension(mediaType: string): string {
  const extensions: Record<string, string> = {
    image: ".jpg",
    video: ".mp4",
    audio: ".mp3",
    file: ".bin",
  };

  return extensions[mediaType] || ".dat";
}
