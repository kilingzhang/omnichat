import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export interface BotConfig {
  platform: "telegram" | "discord" | "slack" | "whatsapp" | "signal" | "imessage";
  telegram?: {
    apiToken: string;
    polling?: boolean;
  };
  discord?: {
    botToken: string;
    intents?: number[];
  };
  slack?: {
    botToken: string;
  };
  whatsapp?: {
    sessionId: string;
    authPath?: string;
  };
  signal?: {
    phoneNumber: string;
    profileKey?: string;
  };
  imessage?: {
    service?: "imessage" | "sms" | "auto";
  };
}

export function loadConfig(): BotConfig {
  // Try multiple possible locations for .env file
  // 1. Current directory (for production/compiled builds)
  // 2. Parent directory (for development)
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const parentDir = join(currentDir, "..");
  const rootDir = join(parentDir, "..");

  let envPath = "";
  let envContent = "";

  const possiblePaths = [
    join(currentDir, ".env"),
    join(parentDir, ".env"),
    join(rootDir, ".env"),
  ];

  for (const path of possiblePaths) {
    try {
      envContent = readFileSync(path, "utf-8");
      envPath = path;
      break;
    } catch (error: any) {
      // Continue to next path
    }
  }

  let env: Record<string, string> = {};

  if (envContent) {
    env = envContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .reduce((acc, line) => {
        const [key, ...valueParts] = line.split("=");
        const value = valueParts.join("=").trim();
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);
  } else {
    console.warn(`Warning: Could not find .env file in any of these locations:`);
    possiblePaths.forEach((p) => console.warn(`  - ${p}`));
  }

  const platform = (env.PLATFORM || "telegram").toLowerCase() as any;
  const config: BotConfig = { platform };

  switch (platform) {
    case "telegram":
      config.telegram = {
        apiToken: env.TELEGRAM_BOT_TOKEN || "",
        polling: env.TELEGRAM_POLLING === "true" || env.TELEGRAM_POLLING === undefined,
      };
      break;

    case "discord":
      config.discord = {
        botToken: env.DISCORD_BOT_TOKEN || "",
        intents: env.DISCORD_INTENTS
          ? env.DISCORD_INTENTS.split(",").map(Number)
          : undefined,
      };
      break;

    case "slack":
      config.slack = {
        botToken: env.SLACK_BOT_TOKEN || "",
      };
      break;

    case "whatsapp":
      config.whatsapp = {
        sessionId: env.WHATSAPP_SESSION_ID || "",
        authPath: env.WHATSAPP_AUTH_PATH,
      };
      break;

    case "signal":
      config.signal = {
        phoneNumber: env.SIGNAL_PHONE_NUMBER || "",
        profileKey: env.SIGNAL_PROFILE_KEY,
      };
      break;

    case "imessage":
      config.imessage = {
        service: env.IMESSAGE_SERVICE as any || "imessage",
      };
      break;

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  return config;
}
