/**
 * Info Commands
 * /info [media|user|msg]
 */

import type { CommandHandler } from "../types.js";

export const guildCommand: CommandHandler = {
  description: "查看服务器信息 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== "discord") {
      await sdk.send(message.platform, {
        text: "ℹ️ 此命令仅支持 Discord",
      }, { to: message.from.id });
      return;
    }

    try {
      const discordAdapter = sdk.getAdapter("discord") as any;

      if (discordAdapter && discordAdapter.client) {
        const guilds = discordAdapter.client.guilds.cache;
        const guildList = [];

        for (const [id, guild] of guilds) {
          const memberCount = guild.memberCount;
          const botMember = await guild.members.fetch(discordAdapter.client.user.id);
          const userMember = guild.members.cache.has(message.from.id) ? "✅ 在服务器" : "❌ 不在服务器";

          guildList.push(
            `📢 **${guild.name}**\n` +
            `   ID: ${id}\n` +
            `   成员数: ${memberCount}\n` +
            `   你: ${userMember}\n` +
            `   Bot权限: ${botMember.permissions.has('Administrator') ? '管理员' : '普通'}`
          );
        }

        const response = [
          `🏰 Discord 服务器列表\n`,
          `📊 共 ${guilds.size} 个服务器\n`,
          ...guildList,
          `\n💡 如果显示"不在服务器"，你需要加入这个服务器，bot 才能接收你的私信。`,
        ].join("\n");

        await sdk.send(message.platform, { text: response }, { to: message.from.id });
        console.log("✅ Guild info sent");
      }
    } catch (error: any) {
      console.error("❌ Failed to get guild info:", error.message);
      await sdk.send(message.platform, {
        text: `❌ 获取服务器信息失败: ${error.message}`,
      }, { to: message.from.id });
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

      await sdk.send(message.platform, { text: response.join("\n") }, { to: message.from.id });
      console.log("✅ Message info sent");
      return;
    }

    if (target === "media") {
      const hasMedia = message.content.mediaUrl && message.content.mediaUrl.startsWith("http");
      if (!hasMedia) {
        await sdk.send(message.platform, { text: "❓ This message has no media" }, { to: message.from.id });
        console.log("⚠️ No media found");
      } else {
        await sdk.send(message.platform, {
          text: `📊 Media Info:\n\nType: ${message.content.mediaType}\nURL: ${message.content.mediaUrl}\nMessage ID: ${message.messageId}`,
        }, { to: message.from.id });
        console.log("✅ Media info sent");
      }
    } else if (target === "user") {
      await sdk.send(message.platform, {
        text: `👤 User Info:\n\nName: ${message.from.name || "N/A"}\nID: ${message.from.id}\nType: ${message.from.type}`,
      }, { to: message.from.id });
      console.log("✅ User info sent");
    } else if (target === "msg") {
      await sdk.send(message.platform, {
        text: `📨 Message Info:\n\nType: ${message.type}\nID: ${message.messageId}\nFrom: ${message.from.id}\nText: ${message.content.text || "[No text]"}`,
      }, { to: message.from.id });
      console.log("✅ Message info sent");
    } else {
      await sdk.send(message.platform, { text: "❓ Unknown info type. Try: media, user, msg" }, { to: message.from.id });
      console.log("⚠️ Unknown target");
    }
  },
};
