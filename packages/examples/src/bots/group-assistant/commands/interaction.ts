/**
 * Feature Commands
 * /poll, /note, /schedule
 */

import type { CommandHandler } from "../types.js";
import { PollService } from "../services/poll-service.js";
import { NoteService } from "../services/note-service.js";

export const pollCommand: CommandHandler = {
  description: "创建投票",
  usage: "/poll <问题>\n1. 选项1\n2. 选项2",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const content = text.split(" ").slice(1).join(" ");

    if (!content) {
      await sdk.send(message.platform, {
        text: "❌ 请输入投票内容\n\n用法: /poll <问题>\n1. 选项1\n2. 选项2\n\n📝 示例:\n/poll 午餐吃什么？\n1. 麦当劳\n2. 肯德基\n3. 必胜客",
      }, { to: message.from.id });
      return;
    }

    const lines = content.split("\n");
    const question = lines[0];
    const options = PollService.parsePollOptions(lines.slice(1).join("\n"));

    if (options.length < 2) {
      await sdk.send(message.platform, {
        text: "❌ 投票至少需要 2 个选项\n\n格式:\n/poll <问题>\n1. 选项1\n2. 选项2",
      }, { to: message.from.id });
      return;
    }

    const poll = PollService.createPoll(
      message.to.id,
      question,
      options,
      message.from.id
    );

    const pollText = PollService.formatPoll(poll);
    await sdk.send(message.platform, { text: pollText }, { to: message.to.id });
    console.log(`🗳️ Poll created in ${message.to.id}`);
  },
};

export const noteCommand: CommandHandler = {
  description: "保存笔记",
  usage: "/note <笔记内容>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const content = text.split(" ").slice(1).join(" ");

    if (!content) {
      const notes = NoteService.getGroupNotes(message.to.id);
      const notesText = NoteService.formatNotesList(message.to.id);
      await sdk.send(message.platform, { text: notesText }, { to: message.from.id });
      return;
    }

    const tags = NoteService.extractTags(content);
    const note = NoteService.createNote(
      message.to.id,
      content,
      message.from.id,
      tags
    );

    const response = [
      "📝 笔记已保存！",
      "",
      `📄 内容: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
      tags.length > 0 ? `🏷️ 标签: ${tags.join(", ")}` : "",
      "",
      "💡 使用 /note 查看所有笔记",
    ].filter(Boolean).join("\n");

    await sdk.send(message.platform, { text: response }, { to: message.from.id });
    console.log(`📝 Note created in ${message.to.id}`);
  },
};

export const dmCommand: CommandHandler = {
  description: "发起私聊 [测试]",
  usage: "/dm",
  handler: async (message, sdk) => {
    try {
      // Get the Discord adapter to send a DM
      if (message.platform === "discord") {
        const discordAdapter = sdk.getAdapter("discord") as any;

        if (discordAdapter && discordAdapter.client) {
          // Fetch the user and create DM channel
          const user = await discordAdapter.client.users.fetch(message.from.id);
          const dmChannel = await user.createDM();

          await dmChannel.send({
            content: "🔔 测试私聊消息！\n\n现在你可以给我发私信了，我应该能收到了！\n\n试试回复这条消息吧~",
          });

          // Also send confirmation in the guild channel
          await sdk.send(message.platform, {
            text: `✅ 已向你发起私聊！\n\n📬 请检查你的私信，我给你发了一条测试消息。\n\n💡 现在 bot 应该可以接收你的私信了。`,
          }, { to: message.from.id });

          console.log(`✅ Initiated DM to user ${message.from.id}`);
        }
      } else {
        await sdk.send(message.platform, {
          text: "ℹ️ 此命令目前仅支持 Discord\n\n💡 在 Discord 中使用 /dm 来测试私聊功能",
        }, { to: message.from.id });
      }
    } catch (error: any) {
      console.error("❌ Failed to send DM:", error.message);
      await sdk.send(message.platform, {
        text: `❌ 发送私聊失败: ${error.message}`,
      }, { to: message.from.id });
    }
  },
};

export const scheduleCommand: CommandHandler = {
  description: "定时消息 [管理员]",
  usage: "/schedule <时间> <消息>",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const args = text.split(" ").slice(1);
    const timeStr = args[0];
    const messageText = args.slice(1).join(" ");

    if (!timeStr || !messageText) {
      await sdk.send(message.platform, {
        text: "❌ 参数错误\n\n用法: /schedule <时间> <消息>\n\n📝 示例:\n/schedule 2024-01-15 09:00 新年快乐！\n/schedule 1h 提醒开会",
      }, { to: message.from.id });
      return;
    }

    // Try parsing as datetime
    let scheduledFor = PollService.parseScheduledTime(timeStr);

    // If that fails, try parsing as duration
    if (!scheduledFor) {
      const duration = ModerationService.parseDuration(timeStr);
      if (duration) {
        scheduledFor = Date.now() + duration;
      }
    }

    if (!scheduledFor || scheduledFor < Date.now()) {
      await sdk.send(message.platform, {
        text: "❌ 无效的时间格式\n\n支持格式:\n• 2024-01-15 09:00\n• 1h, 30m, 1d",
      }, { to: message.from.id });
      return;
    }

    const scheduled = PollService.scheduleMessage(
      message.to.id,
      messageText,
      scheduledFor,
      message.from.id
    );

    const scheduledTime = PollService.formatScheduledTime(scheduledFor);
    const response = [
      "⏰ 定时消息已设置",
      "",
      `📝 内容: ${messageText}`,
      `🕐 发送时间: ${scheduledTime}`,
      "",
      "💡 到时将自动发送到群组",
    ];

    await sdk.send(message.platform, { text: response.join("\n") }, { to: message.from.id });
    console.log(`⏰ Scheduled message for ${scheduledTime} in ${message.to.id}`);
  },
};

// Legacy commands (kept for compatibility)
export const buttonsCommand: CommandHandler = {
  description: "测试交互按钮",
  handler: async (message, sdk) => {
    await sdk.send(message.platform, {
      text: "🎛️ 交互按钮测试\n\n点击按钮查看响应！",
      buttons: [[
        { text: "ℹ️ 信息", data: "info" },
        { text: "❌ 取消", data: "cancel" },
      ], [
        { text: "🆘 帮助", data: "help" },
      ]],
    }, { to: message.from.id });
  },
};

export const keyboardCommand: CommandHandler = {
  description: "测试自定义键盘",
  handler: async (message, sdk) => {
    // Telegram-only feature
    if (message.platform !== "telegram") {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能目前仅支持 Telegram\n⏳ 其他平台支持正在开发中...",
      }, { to: message.from.id });
      return;
    }

    const telegramAdapter = sdk.getAdapter("telegram") as any;
    if (telegramAdapter && typeof telegramAdapter.sendWithKeyboard === "function") {
      await telegramAdapter.sendWithKeyboard(message.from.id, "⌨️ 自定义键盘\n\n使用下方的按钮！", {
        keyboard: [
          [{ text: "👍 是", callback_data: "yes" }],
          [{ text: "👎 否", callback_data: "no" }],
          [{ text: "❓ 帮助", callback_data: "help" }],
        ],
        resize: true,
        oneTime: false,
      });
    } else {
      await sdk.send(message.platform, {
        text: "❌ 此适配器不支持自定义键盘",
      }, { to: message.from.id });
    }
  },
};

export const hideCommand: CommandHandler = {
  description: "隐藏自定义键盘",
  handler: async (message, sdk) => {
    // Telegram-only feature
    if (message.platform !== "telegram") {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能目前仅支持 Telegram\n⏳ 其他平台支持正在开发中...",
      }, { to: message.from.id });
      return;
    }

    const telegramAdapter = sdk.getAdapter("telegram") as any;
    if (telegramAdapter && typeof telegramAdapter.hideKeyboard === "function") {
      await telegramAdapter.hideKeyboard(message.from.id, "⌨️ 键盘已隐藏！\n\n使用 /keyboard 显示键盘。");
    } else {
      await sdk.send(message.platform, { text: "❌ 不支持隐藏键盘" }, { to: message.from.id });
    }
  },
};

// Helper for duration parsing
import { ModerationService } from "../services/moderation-service.js";
