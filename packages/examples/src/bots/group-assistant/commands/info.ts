/**
 * Info Commands
 * /info [media|user|msg]
 */

import type { CommandHandler } from "../types.js";
import { PLATFORMS } from "@omnichat/core";

export const guildCommand: CommandHandler = {
  description: "查看服务器信息 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== PLATFORMS.DISCORD) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此命令仅支持 Discord",
      }, { to: message.to.id });
      return;
    }

    try {
      // Use unified API
      const guilds = await sdk.getGuilds(message.platform);

      if (guilds && guilds.length > 0) {
        const guildList = guilds.map(guild =>
          `📢 **${guild.name}**\n` +
          `   ID: ${guild.id}\n` +
          `   成员数: ${guild.memberCount || "未知"}`
        );

        const response = [
          `🏰 Discord 服务器列表\n`,
          `📊 共 ${guilds.length} 个服务器\n`,
          ...guildList,
        ].join("\n");

        await sdk.send(message.platform, { text: response }, { to: message.to.id });
        console.log("✅ Guild info sent");
      }
    } catch (error: any) {
      console.error("❌ Failed to get guild info:", error.message);
      await sdk.send(message.platform, {
        text: `❌ 获取服务器信息失败: ${error.message}`,
      }, { to: message.to.id });
    }
  },
};

export const infoCommand: CommandHandler = {
  description: "获取信息 /info [media|user|msg]",
  handler: async (message, sdk) => {
    const text = message.content.text ? message.content.text.trim() : "";
    const args = text.split(" ");
    const target = args[1];

    console.log("📤 Command: /info", target || "[no args]");

    if (!target) {
      // 没有参数时显示当前消息的基本信息
      const response = [
        `📊 当前消息信息:`,
        `类型: ${message.content.mediaType || "文本"}`,
        `消息ID: ${message.messageId}`,
        `发送者: ${message.from.name || message.from.id}`,
        `发送者ID: ${message.from.id}`,
      ];
      if (message.content.mediaUrl) {
        response.push(`媒体URL: ${message.content.mediaUrl}`);
      }
      if (message.content.text) {
        response.push(`文本: ${message.content.text}`);
      }

      await sdk.send(message.platform, { text: response.join("\n") }, { to: message.to.id });
      console.log("✅ Message info sent");
      return;
    }

    if (target === "media") {
      const hasMedia = message.content.mediaUrl && message.content.mediaUrl.startsWith("http");
      if (!hasMedia) {
        await sdk.send(message.platform, { text: "❓ This message has no media" }, { to: message.to.id });
        console.log("⚠️ No media found");
      } else {
        await sdk.send(message.platform, {
          text: `📊 Media Info:\n\nType: ${message.content.mediaType}\nURL: ${message.content.mediaUrl}\nMessage ID: ${message.messageId}`,
        }, { to: message.to.id });
        console.log("✅ Media info sent");
      }
    } else if (target === "user") {
      await sdk.send(message.platform, {
        text: `👤 User Info:\n\nName: ${message.from.name || "N/A"}\nID: ${message.from.id}\nType: ${message.from.type}`,
      }, { to: message.to.id });
      console.log("✅ User info sent");
    } else if (target === "msg") {
      await sdk.send(message.platform, {
        text: `📨 Message Info:\n\nType: ${message.type}\nID: ${message.messageId}\nFrom: ${message.from.id}\nText: ${message.content.text || "[No text]"}`,
      }, { to: message.to.id });
      console.log("✅ Message info sent");
    } else {
      await sdk.send(message.platform, { text: "❓ Unknown info type. Try: media, user, msg" }, { to: message.to.id });
      console.log("⚠️ Unknown target");
    }
  },
};
