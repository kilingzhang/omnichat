/**
 * Moderation Commands
 * /warn, /mute, /kick, /ban
 */

import type { CommandHandler } from "../types.js";
import { ModerationService } from "../services/moderation-service.js";

export const warnCommand: CommandHandler = {
  description: "警告成员 [管理员]",
  usage: "/warn @用户名 <原因>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1);
    const username = args[0]?.replace("@", "");
    const reason = args.slice(1).join(" ") || "违反群组规则";

    if (!username) {
      await sdk.send(message.platform, {
        text: "❌ 请指定要警告的用户\n\n用法: /warn @用户名 <原因>",
      }, { to: message.from.id });
      return;
    }

    // In a real implementation, you would look up the userId from username
    // For now, use username as userId
    const userId = username;

    const warning = ModerationService.warnUser(message.to.id, userId, reason, message.from.id);
    const warningCount = ModerationService.getWarningCount(message.to.id, userId);

    const response = [
      `⚠️ 用户警告`,
      "",
      `👤 用户: @${username}`,
      `📝 原因: ${reason}`,
      `🔢 警告次数: ${warningCount}`,
      "",
      warningCount >= 3 ? "⚠️ 该用户已收到多次警告，建议采取进一步措施" : "💡 请用户遵守群组规则",
    ];

    await sdk.send(message.platform, { text: response.join("\n") }, { to: message.to.id });
    console.log(`⚠️ User ${username} warned in ${message.to.id}`);
  },
};

export const muteCommand: CommandHandler = {
  description: "禁言成员 [管理员]",
  usage: "/mute @用户名 <时长>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1);
    const username = args[0]?.replace("@", "");
    const durationStr = args[1] || "1h";

    if (!username) {
      await sdk.send(message.platform, {
        text: "❌ 请指定要禁言的用户\n\n用法: /mute @用户名 <时长>\n\n时长格式: 1h, 30m, 1d",
      }, { to: message.from.id });
      return;
    }

    const duration = ModerationService.parseDuration(durationStr);
    if (!duration) {
      await sdk.send(message.platform, {
        text: "❌ 无效的时长格式\n\n支持格式: 1h, 30m, 1d\n• h = 小时\n• m = 分钟\n• d = 天",
      }, { to: message.from.id });
      return;
    }

    const userId = username;
    ModerationService.muteUser(message.to.id, userId, duration, undefined, message.from.id);

    const durationText = ModerationService.formatDuration(duration);
    const response = [
      `🔇 用户已禁言`,
      "",
      `👤 用户: @${username}`,
      `⏰ 时长: ${durationText}`,
      "",
      "💡 禁言期间用户无法发送消息",
    ];

    await sdk.send(message.platform, { text: response.join("\n") }, { to: message.to.id });
    console.log(`🔇 User ${username} muted for ${durationText} in ${message.to.id}`);
  },
};

export const kickCommand: CommandHandler = {
  description: "踢出成员 [管理员]",
  usage: "/kick @用户名 <原因>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1);
    const username = args[0]?.replace("@", "");
    const reason = args.slice(1).join(" ") || "违反群组规则";

    if (!username) {
      await sdk.send(message.platform, {
        text: "❌ 请指定要踢出的用户\n\n用法: /kick @用户名 <原因>",
      }, { to: message.from.id });
      return;
    }

    const userId = username;
    ModerationService.recordKick(message.to.id, userId, reason, message.from.id);

    const response = [
      `👞 用户已踢出`,
      "",
      `👤 用户: @${username}`,
      `📝 原因: ${reason}`,
      "",
      "💡 用户可以重新加入群组",
    ];

    await sdk.send(message.platform, { text: response.join("\n") }, { to: message.to.id });
    console.log(`👞 User ${username} kicked from ${message.to.id}`);
  },
};

export const banCommand: CommandHandler = {
  description: "封禁成员 [管理员]",
  usage: "/ban @用户名 <原因>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1);
    const username = args[0]?.replace("@", "");
    const reason = args.slice(1).join(" ") || "严重违反群组规则";

    if (!username) {
      await sdk.send(message.platform, {
        text: "❌ 请指定要封禁的用户\n\n用法: /ban @用户名 <原因>",
      }, { to: message.from.id });
      return;
    }

    const userId = username;
    ModerationService.recordBan(message.to.id, userId, reason, message.from.id);

    const response = [
      `🚫 用户已封禁`,
      "",
      `👤 用户: @${username}`,
      `📝 原因: ${reason}`,
      "",
      "💡 用户无法重新加入群组",
    ];

    await sdk.send(message.platform, { text: response.join("\n") }, { to: message.to.id });
    console.log(`🚫 User ${username} banned from ${message.to.id}`);
  },
};

// Legacy commands (kept for compatibility)
export const advancedCommand: CommandHandler = {
  description: "显示高级功能",
  handler: async (message, sdk) => {
    const caps = sdk.getCapabilities(message.platform);
    const advancedText = [
      "🚀 高级功能\n━━━━━━━━━━━━━━━━━━━━━\n",
      "✅ 可用功能:",
    ];

    if (caps?.advanced) {
      if (caps.advanced.inline) advancedText.push("   • Inline Mode");
      if (caps.advanced.deepLinks) advancedText.push("   • Deep Links");
      if (caps.advanced.miniApps) advancedText.push("   • Mini Apps (Web Apps)");
      if (caps.advanced.topics) advancedText.push("   • Forum Topics");
    }

    await sdk.send(message.platform, { text: advancedText.join("\n") }, { to: message.from.id });
  },
};

export const capsCommand: CommandHandler = {
  description: "显示能力矩阵",
  handler: async (message, sdk) => {
    const caps = sdk.getCapabilities(message.platform);
    if (!caps) {
      await sdk.send(message.platform, { text: "❌ 无可用能力数据" }, { to: message.from.id });
      return;
    }

    const capsText = [
      "📊 平台能力\n━━━━━━━━━━━━━━━━━━━━━\n",
      "🔹 基础功能:",
      `  发送文本: ${caps.base?.sendText ? "✅" : "❌"}`,
      `  发送媒体: ${caps.base?.sendMedia ? "✅" : "❌"}`,
      `  接收消息: ${caps.base?.receive ? "✅" : "❌"}`,
      "",
      "🔹 交互功能:",
      `  按钮: ${caps.interaction?.buttons ? "✅" : "❌"}`,
      `  投票: ${caps.interaction?.polls ? "✅" : "❌"}`,
      `  反应: ${caps.interaction?.reactions ? "✅" : "❌"}`,
      "",
      "🔹 管理功能:",
      `  踢出: ${caps.management?.kick ? "✅" : "❌"}`,
      `  封禁: ${caps.management?.ban ? "✅" : "❌"}`,
      `  超时: ${caps.management?.timeout ? "✅" : "❌"}`,
    ];

    await sdk.send(message.platform, { text: capsText.join("\n") }, { to: message.from.id });
  },
};

export const inlineCommand: CommandHandler = {
  description: "测试 Inline Mode 设置",
  handler: async (message, sdk) => {
    if (!sdk.supports(message.platform, "advanced.inline")) {
      await sdk.send(message.platform, {
        text: "❌ Inline Mode 未启用\n\n💡 启用方法:\n1. 发送给 @BotFather\n2. /setinline\n3. 选择你的 bot\n4. 设置占位符文本",
      }, { to: message.from.id });
      return;
    }

    await sdk.send(message.platform, {
      text: "✅ Inline Mode 可用！\n\n💡 ��试方法:\n在任何聊天中输入: @imsdkbot <查询>\n\n📝 示例: @imsdkbot test",
    }, { to: message.from.id });
  },
};
