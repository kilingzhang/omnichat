import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export interface BotConfig {
  bots: BotInstanceConfig[];
}

export interface BotInstanceConfig {
  id: string;
  name: string;
  platform: "telegram" | "discord" | "slack" | "whatsapp" | "signal" | "imessage";
  enabled?: boolean;
  telegram?: {
    apiToken: string;
    polling?: boolean;
  };
  discord?: {
    botToken: string;
    clientId?: string;
    intents?: string[];
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
  // Start from the current file and go up to find the root .env
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // src/bots/group-assistant -> src/bots -> src -> examples -> packages -> root
  const srcDir = join(currentDir, "..", "..");      // go up to src/
  const examplesDir = join(srcDir, "..");           // go up to examples/
  const packagesDir = join(examplesDir, "..");      // go up to packages/
  const rootDir = join(packagesDir, "..");          // go up to root

  let envContent = "";

  const possiblePaths = [
    join(currentDir, ".env"),
    join(srcDir, ".env"),
    join(examplesDir, ".env"),
    join(packagesDir, ".env"),
    join(rootDir, ".env"),
  ];

  for (const path of possiblePaths) {
    try {
      envContent = readFileSync(path, "utf-8");
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

  // Environment variables take precedence over .env file
  const BOTS = process.env.BOTS || env.BOTS;

  if (!BOTS) {
    console.error("❌ BOTS environment variable is required!");
    console.error("");
    console.error("💡 Please set BOTS environment variable:");
    console.error("   BOTS=[{\"id\":\"telegram\",\"platform\":\"telegram\",\"name\":\"bot\",\"telegram\":{\"apiToken\":\"YOUR_TOKEN\"}}]");
    console.error("");
    console.error("💡 Example with multiple bots:");
    console.error("   BOTS=[{\"id\":\"bot1\",\"platform\":\"telegram\",\"name\":\"bot1\",\"telegram\":{\"apiToken\":\"TOKEN1\"}},{\"id\":\"bot2\",\"platform\":\"discord\",\"name\":\"bot2\",\"discord\":{\"botToken\":\"TOKEN2\",\"clientId\":\"ID\"}}]");
    console.error("");
    process.exit(1);
  }

  try {
    const botsConfig = JSON.parse(BOTS);

    if (!Array.isArray(botsConfig) || botsConfig.length === 0) {
      throw new Error("BOTS must be a non-empty array");
    }

    console.log(`📦 Loaded configuration for ${botsConfig.length} bot(s)`);

    return { bots: botsConfig };
  } catch (error) {
    console.error("❌ Failed to parse BOTS configuration!");
    console.error("Error:", error);
    console.error("");
    console.error("💡 BOTS must be a valid JSON array:");
    console.error('   BOTS=[{"id":"mybot","platform":"telegram","name":"bot","telegram":{"apiToken":"YOUR_TOKEN"}}]');
    console.error("");
    process.exit(1);
  }
}
