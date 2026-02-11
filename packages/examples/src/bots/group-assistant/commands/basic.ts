/**
 * Basic Commands
 * /start, /help, /id
 */

import type { CommandHandler } from "../types.js";
import { generateHelpText } from "../utils/help-text.js";

export const startCommand: CommandHandler = {
  description: "欢迎消息和使用指南",
  handler: async (message, sdk) => {
    const welcomeText = [
      "👋 欢迎使用群组助手！",
      "",
      "我是一个实用的群组管理工具，可以帮助你：",
      "",
      "📋 群组管理",
      "   /welcome - 设置欢迎消息",
      "   /rules - 设置群组规则",
      "   /announce - 发送群组公告",
      "   /stats - 查看群组统计",
      "",
      "👥 成员管理",
      "   /warn - 警告成员",
      "   /mute - 禁言成员",
      "   /kick - 踢出成员",
      "   /ban - 封禁成员",
      "",
      "🛠️ 实用功能",
      "   /poll - 创建投票",
      "   /note - 保存笔记",
      "   /schedule - 定时消息",
      "   /dm - 测试私聊（Discord）",
      "",
      "💡 发送 /help 查看所有命令的详细说明",
    ].join("\n");

    await sdk.send(message.platform, { text: welcomeText }, { to: message.from.id });
    console.log("✅ Welcome message sent");
  },
};

export const helpCommand: CommandHandler = {
  description: "显示所有可用命令",
  handler: async (message, sdk) => {
    const { getCommands } = await import("./index.js");
    const helpText = generateHelpText(getCommands());
    await sdk.send(message.platform, { text: helpText }, { to: message.from.id });
    console.log("✅ Help message sent");
  },
};

export const idCommand: CommandHandler = {
  description: "获取 Chat ID 和 User ID（用于测试）",
  handler: async (message, sdk) => {
    console.log("📤 Command: /id");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🆔 IDs for testing:");

    const platform = message.platform.toUpperCase();
    const isPrivateChat = message.to.type === "user";

    if (isPrivateChat) {
      // Private chat: chat ID is the same as user ID
      console.log("   Platform:", platform);
      console.log("   Chat Type: Private (Direct Message)");
      console.log("   Chat ID/User ID:", message.from.id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━");

      const idInfo = [
        `🆔 Chat & User IDs (${platform})`,
        "",
        "📝 Chat Type: Private (Direct Message)",
        `👤 Your ID: ${message.from.id}`,
        "",
        "💡 For integration tests, use:",
        `   ${platform}_CHAT_ID=${message.from.id}`,
        `   ${platform}_USER_ID=${message.from.id}`,
        "",
        "⚠️ Note: In private chats, Chat ID = User ID",
      ];

      await sdk.send(message.platform, { text: idInfo.join("\n") }, { to: message.from.id });
    } else {
      // Group/Channel chat
      console.log("   Platform:", platform);
      console.log("   Chat Type:", message.to.type);
      console.log("   Chat ID:", message.to.id);
      console.log("   User ID:", message.from.id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━");

      const idInfo = [
        `🆔 Chat & User IDs (${platform})`,
        "",
        `👥 Chat ID: ${message.to.id}`,
        `👤 User ID: ${message.from.id}`,
        `📝 Chat Type: ${message.to.type}`,
        "",
        "💡 Copy these for integration tests:",
        `   ${platform}_CHAT_ID=${message.to.id}`,
        `   ${platform}_USER_ID=${message.from.id}`,
      ];

      await sdk.send(message.platform, { text: idInfo.join("\n") }, { to: message.from.id });
    }

    console.log("✅ ID info sent");
  },
};
