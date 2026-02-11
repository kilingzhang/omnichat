/**
 * Help Text Generator
 */

import type { CommandRegistry } from "../types.js";

/**
 * Generate help text from command registry
 */
export function generateHelpText(commands: CommandRegistry): string {
  const lines = [
    "🤖 群组助手命令列表",
    "",
    "━━━━━━━━━━━━━━━━━━━━━",
    "",
    "📋 基础命令",
  ];

  // Basic commands
  const basicCommands = ["/start", "/help", "/id"];
  basicCommands.forEach(cmd => {
    const info = commands[cmd];
    if (info) {
      lines.push(`   ${cmd.padEnd(10)} - ${info.description}`);
    }
  });

  // Group management
  lines.push("", "📋 群组管理 [管理员]");
  const managementCommands = ["/welcome", "/rules", "/announce", "/stats"];
  managementCommands.forEach(cmd => {
    const info = commands[cmd];
    if (info) {
      lines.push(`   ${cmd.padEnd(10)} - ${info.description}`);
    }
  });

  // Moderation
  lines.push("", "👥 成员管理 [管理员]");
  const moderationCommands = ["/warn", "/mute", "/kick", "/ban"];
  moderationCommands.forEach(cmd => {
    const info = commands[cmd];
    if (info) {
      lines.push(`   ${cmd.padEnd(10)} - ${info.description}`);
    }
  });

  // Features
  lines.push("", "🛠️ 实用功能");
  const featureCommands = ["/poll", "/note", "/schedule"];
  featureCommands.forEach(cmd => {
    const info = commands[cmd];
    if (info) {
      const usage = info.usage ? `\n      用法: ${info.usage}` : "";
      lines.push(`   ${cmd.padEnd(10)} - ${info.description}${usage}`);
    }
  });

  // Info & tools
  lines.push("", "ℹ️ 信息 & 工具");
  const otherCommands = ["/info", "/buttons", "/keyboard", "/advanced", "/caps", "/invite"];
  otherCommands.forEach(cmd => {
    const info = commands[cmd];
    if (info) {
      lines.push(`   ${cmd.padEnd(10)} - ${info.description}`);
    }
  });

  lines.push("", "━━━━━━━━━━━━━━━━━━━━━");
  lines.push("", "💡 发送 /start 查看详细说明");

  return lines.join("\n");
}
