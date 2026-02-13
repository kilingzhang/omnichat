/**
 * Management Commands
 * /welcome, /rules, /announce, /stats
 */

import type { CommandHandler } from "../types.js";
import { WelcomeService } from "../services/welcome-service.js";
import { StatsService } from "../services/stats-service.js";
import { NoteService } from "../services/note-service.js";
import { PLATFORMS, BOT_LIMITS, TIME_MS } from "@omnichat/core";

export const welcomeCommand: CommandHandler = {
  description: "设置欢迎消息 [管理员]",
  usage: "/welcome <消息内容>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1).join(" ");

    if (!args) {
      const current = WelcomeService.getWelcomeMessage(message.to.id);
      const response = current
        ? `📝 当前欢迎消息：\n\n${current}`
        : "❌ 未设置欢迎消息\n\n用法: /welcome <消息内容>\n\n💡 使用 {members} 来提及新成员";
      await sdk.send(message.platform, { text: response }, { to: message.to.id });
      return;
    }

    WelcomeService.setWelcomeMessage(message.to.id, args);
    await sdk.send(message.platform, { text: "✅ 欢迎消息已设置！" }, { to: message.to.id });
    console.log(`✅ Welcome message set for ${message.to.id}`);
  },
};

export const rulesCommand: CommandHandler = {
  description: "设置群组规则 [管理员]",
  usage: "/rules <规则内容>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1).join(" ");

    if (!args) {
      const current = WelcomeService.getRules(message.to.id);
      const response = current
        ? `📜 当前群组规则：\n\n${current}`
        : "❌ 未设置群组规则\n\n用法: /rules <规则内容>";
      await sdk.send(message.platform, { text: response }, { to: message.to.id });
      return;
    }

    WelcomeService.setRules(message.to.id, args);
    await sdk.send(message.platform, { text: "✅ 群组规则已设置！" }, { to: message.to.id });
    console.log(`✅ Rules set for ${message.to.id}`);
  },
};

export const announceCommand: CommandHandler = {
  description: "发送群组公告 [管理员]",
  usage: "/announce <公告内容>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1).join(" ");

    if (!args) {
      await sdk.send(message.platform, { text: "❌ 请输入公告内容\n\n用法: /announce <公告内容>" }, { to: message.to.id });
      return;
    }

    // Create announcement
    NoteService.createAnnouncement(message.to.id, args, message.from.id);

    // Send to group
    const announcementText = `📢 公告\n\n${args}`;
    await sdk.send(message.platform, { text: announcementText }, { to: message.to.id });
    console.log(`✅ Announcement sent to ${message.to.id}`);
  },
};

export const statsCommand: CommandHandler = {
  description: "查看群组统计信息",
  handler: async (message, sdk) => {
    const statsText = StatsService.formatStats(message.to.id);
    await sdk.send(message.platform, { text: statsText }, { to: message.to.id });
    console.log(`✅ Stats sent for ${message.to.id}`);
  },
};

// Legacy commands (kept for compatibility but with better descriptions)
export const inviteCommand: CommandHandler = {
  description: "创建邀请链接",
  handler: async (message, sdk) => {
    console.log("📤 Command: /invite - Create invite link");

    // Check platform support using capability
    if (!sdk.supports(message.platform, "advanced.createInvite")) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能目前仅支持 Telegram\n⏳ 其他平台支持正在开发中...",
      }, { to: message.to.id });
      return;
    }

    try {
      if (message.to.type === "user") {
        await sdk.send(message.platform, {
          text: "ℹ️ 邀请链接仅适用于群组和频道。\n\n💡 将 bot 添加到群组以测试此功能！",
        }, { to: message.to.id });
        return;
      }

      // Use unified API
      const invite = await sdk.createInvite(message.platform, message.to.id, {
        maxUses: BOT_LIMITS.INVITE_MAX_USES_DEFAULT,
        expiresInSeconds: Math.floor(TIME_MS.ONE_HOUR / 1000), // Convert ms to seconds
      });

      await sdk.send(message.platform, {
        text: `✅ 邀请链接已创建！\n\n🔗 ${invite.url}\n\n⏰ 过期时间: ${invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "无限"}\n👥 成员限制: ${invite.maxUses || "无限"}`,
      }, { to: message.to.id });

      console.log("✅ Invite link created:", invite.url);
    } catch (error: any) {
      await sdk.send(message.platform, {
        text: `❌ 创建邀请链接失败: ${error.message}`,
      }, { to: message.to.id });
    }
  },
};
