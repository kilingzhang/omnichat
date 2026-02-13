/**
 * Feature Commands
 * /poll, /note, /schedule
 */

import type { CommandHandler } from "../types.js";
import { PollService } from "../services/poll-service.js";
import { NoteService } from "../services/note-service.js";
import { ModerationService } from "../services/moderation-service.js";
import { PLATFORMS, DISCORD_LIMITS } from "@omnichat/core";

export const pollCommand: CommandHandler = {
  description: "创建投票",
  usage: "/poll <问题>\n1. 选项1\n2. 选项2",
  handler: async (message, sdk) => {
    const text = typeof message.content === 'string' ? message.content : message.content?.text || '';
    const content = text.split(" ").slice(1).join(" ");

    if (!content) {
      await sdk.send(message.platform, {
        text: "❌ 请输入投票内容\n\n用法: /poll <问题>\n1. 选项1\n2. 选项2\n\n📝 示例:\n/poll 午餐吃什么？\n1. 麦当劳\n2. 肯德基\n3. 必胜客",
      }, { to: message.to.id });
      return;
    }

    const lines = content.split("\n");
    const question = lines[0];
    const options = PollService.parsePollOptions(lines.slice(1).join("\n"));

    if (options.length < 2) {
      await sdk.send(message.platform, {
        text: "❌ 投票至少需要 2 个选项\n\n格式:\n/poll <问题>\n1. 选项1\n2. 选项2",
      }, { to: message.to.id });
      return;
    }

    // Try to use native poll for the platform
    if (message.platform === PLATFORMS.TELEGRAM) {
      try {
        await sdk.sendPoll(message.platform, message.to.id, {
          question: question,
          options: options,
          multi: false, // 单选
        });
        console.log(`🗳️ Native Telegram poll created in ${message.to.id}`);
        return;
      } catch (error: any) {
        console.error("❌ Failed to send native poll:", error.message);
        // Fall through to text-based poll
      }
    }

    // Discord: Send poll with interactive buttons
    if (message.platform === PLATFORMS.DISCORD) {
      // Create buttons for each option
      const buttons = options.map((opt, idx) => ({
        text: `${idx + 1}. ${opt.substring(0, DISCORD_LIMITS.BUTTON_LABEL_MAX_LENGTH - 10)}`,
        data: `poll_vote_${idx}`,
      }));

      // Group buttons into rows (Discord limit: 5 per row)
      const buttonRows: any[][] = [];
      for (let i = 0; i < buttons.length; i += DISCORD_LIMITS.BUTTONS_PER_ROW) {
        buttonRows.push(buttons.slice(i, i + DISCORD_LIMITS.BUTTONS_PER_ROW));
      }

      await sdk.send(message.platform, {
        text: `🗳️ **${question}**\n\n点击下方按钮投票！`,
        buttons: buttonRows,
      }, { to: message.to.id });
      console.log(`🗳️ Discord button poll created in ${message.to.id}`);
      return;
    }

    // Fallback: text-based poll for other platforms
    const poll = PollService.createPoll(
      message.to.id,
      question,
      options,
      message.from.id
    );

    const pollText = PollService.formatPoll(poll);
    await sdk.send(message.platform, { text: pollText }, { to: message.to.id });
    console.log(`🗳️ Text poll created in ${message.to.id}`);
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
      await sdk.send(message.platform, { text: notesText }, { to: message.to.id });
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

    await sdk.send(message.platform, { text: response }, { to: message.to.id });
    console.log(`📝 Note created in ${message.to.id}`);
  },
};

export const dmCommand: CommandHandler = {
  description: "发起私聊 [测试]",
  usage: "/dm",
  handler: async (message, sdk) => {
    try {
      // Use unified API to create DM channel
      if (message.platform === PLATFORMS.DISCORD) {
        const dmChannelId = await sdk.createDMChannel(message.platform, message.from.id);

        await sdk.send(message.platform, {
          text: "🔔 测试私聊消息！\n\n现在你可以给我发私信了，我应该能收到了！\n\n试试回复这条消息吧~",
        }, { to: dmChannelId });

        // Also send confirmation in the guild channel
        await sdk.send(message.platform, {
          text: `✅ 已向你发起私聊！\n\n📬 请检查你的私信，我给你发了一条测试消息。\n\n💡 现在 bot 应该可以接收你的私信了。`,
        }, { to: message.to.id });

        console.log(`✅ Initiated DM to user ${message.from.id}`);
      } else {
        await sdk.send(message.platform, {
          text: "ℹ️ 此命令目前仅支持 Discord\n\n💡 在 Discord 中使用 /dm 来测试私聊功能",
        }, { to: message.to.id });
      }
    } catch (error: any) {
      console.error("❌ Failed to send DM:", error.message);
      await sdk.send(message.platform, {
        text: `❌ 发送私聊失败: ${error.message}`,
      }, { to: message.to.id });
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
      }, { to: message.to.id });
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
      }, { to: message.to.id });
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

    await sdk.send(message.platform, { text: response.join("\n") }, { to: message.to.id });
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
    }, { to: message.to.id });
  },
};

export const keyboardCommand: CommandHandler = {
  description: "测试自定义键盘",
  handler: async (message, sdk) => {
    // Telegram-only feature
    if (message.platform !== PLATFORMS.TELEGRAM) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能目前仅支持 Telegram\n⏳ 其他平台支持正在开发中...",
      }, { to: message.to.id });
      return;
    }

    // Use adapter directly for platform-specific feature
    const telegramAdapter = sdk.getAdapter(PLATFORMS.TELEGRAM) as any;
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
      }, { to: message.to.id });
    }
  },
};

export const hideCommand: CommandHandler = {
  description: "隐藏自定义键盘",
  handler: async (message, sdk) => {
    // Telegram-only feature
    if (message.platform !== PLATFORMS.TELEGRAM) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能目前仅支持 Telegram\n⏳ 其他平台支持正在开发中...",
      }, { to: message.to.id });
      return;
    }

    const telegramAdapter = sdk.getAdapter(PLATFORMS.TELEGRAM) as any;
    if (telegramAdapter && typeof telegramAdapter.hideKeyboard === "function") {
      await telegramAdapter.hideKeyboard(message.from.id, "⌨️ 键盘已隐藏！\n\n使用 /keyboard 显示键盘。");
    } else {
      await sdk.send(message.platform, { text: "❌ 不支持隐藏键盘" }, { to: message.to.id });
    }
  },
};

// ============================================================================
// Discord-specific Commands
// ============================================================================

/**
 * /selectmenu - Test Discord Select Menu (dropdown)
 */
export const selectMenuCommand: CommandHandler = {
  description: "测试下拉菜单 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== PLATFORMS.DISCORD) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能仅支持 Discord\n\n💡 Discord 的下拉菜单可以选择多个选项。",
      }, { to: message.to.id });
      return;
    }

    const discordAdapter = sdk.getAdapter(PLATFORMS.DISCORD) as any;
    if (discordAdapter && typeof discordAdapter.sendSelectMenu === "function") {
      await discordAdapter.sendSelectMenu(message.from.id, {
        customId: "test_select",
        placeholder: "选择你喜欢的编程语言...",
        minValues: 1,
        maxValues: 3,
        options: [
          { label: "TypeScript", value: "typescript", description: "JavaScript with types", emoji: "💻" },
          { label: "Python", value: "python", description: "Simple and powerful", emoji: "🐍" },
          { label: "Rust", value: "rust", description: "Fast and safe", emoji: "🦀" },
          { label: "Go", value: "go", description: "Simple and concurrent", emoji: "🐹" },
        ],
      }, "📋 下拉菜单测试\n\n请选择你喜欢的编程语言（最多选3个）：");

      console.log(`📋 Select menu sent to ${message.from.id}`);
    } else {
      await sdk.send(message.platform, {
        text: "❌ 此适配器不支持下拉菜单",
      }, { to: message.to.id });
    }
  },
};

/**
 * /modal - Test Discord Modal (popup form)
 */
export const modalCommand: CommandHandler = {
  description: "测试模态框 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== PLATFORMS.DISCORD) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能仅支持 Discord\n\n💡 Discord 的模态框可以收集用户输入。",
      }, { to: message.to.id });
      return;
    }

    // Note: Modal requires an interaction, not a regular message
    // We need to send a button first that triggers the modal
    await sdk.send(message.platform, {
      text: "📝 模态框测试\n\n点击下方按钮打开模态框表单！",
      buttons: [[
        { text: "📋 打开表单", data: "open_modal" },
      ]],
    }, { to: message.to.id });

    console.log(`📋 Modal button sent to ${message.from.id}`);
  },
};

/**
 * /mention - Test Discord Entity Select Menu (user/role/channel picker)
 */
export const mentionCommand: CommandHandler = {
  description: "测试实体选择器 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== PLATFORMS.DISCORD) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能仅支持 Discord\n\n💡 Discord 的实体选择器可以选择用户、角色或频道。",
      }, { to: message.to.id });
      return;
    }

    const discordAdapter = sdk.getAdapter(PLATFORMS.DISCORD) as any;
    if (discordAdapter && typeof discordAdapter.sendEntitySelectMenu === "function") {
      await discordAdapter.sendEntitySelectMenu(message.from.id, {
        customId: "user_select",
        type: "User",
        placeholder: "选择一个用户...",
        minValues: 1,
        maxValues: 1,
      }, "👥 用户选择器测试\n\n请选择一个用户：");

      console.log(`👥 Entity select menu sent to ${message.from.id}`);
    } else {
      await sdk.send(message.platform, {
        text: "❌ 此适配器不支持实体选择器",
      }, { to: message.to.id });
    }
  },
};

/**
 * /slash - Show registered slash commands info
 */
export const slashCommand: CommandHandler = {
  description: "查看斜杠命令 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== PLATFORMS.DISCORD) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能仅支持 Discord\n\n💡 Discord 的斜杠命令可以在输入框中自动补全。",
      }, { to: message.to.id });
      return;
    }

    const responseText = [
      "🎮 Discord 斜杠命令",
      "",
      "📝 可用命令（已在启动时自动注册）：",
      "",
      "📋 基础命令: /start, /help, /id, /info",
      "👥 管理命令: /welcome, /rules, /announce, /stats",
      "🛡️ 审核命令: /warn, /mute, /kick, /ban",
      "🛠️ 功能命令: /poll, /note, /dm",
      "🎮 交互命令: /buttons, /selectmenu, /modal, /embed",
      "",
      "🖱️ 右键菜单:",
      "   • 用户: 查看用户信息",
      "   • 消息: 引用消息, 翻译消息",
      "",
      "💡 输入 / 即可看到命令列表！",
      "⏳ 如果命令未显示，请等待几分钟让 Discord 同步。",
    ].join("\n");

    await sdk.send(message.platform, { text: responseText }, { to: message.to.id });
  },
};

/**
 * /embed - Test Discord Embed (rich message)
 */
export const embedCommand: CommandHandler = {
  description: "测试嵌入消息 [Discord]",
  handler: async (message, sdk) => {
    if (message.platform !== PLATFORMS.DISCORD) {
      await sdk.send(message.platform, {
        text: "ℹ️ 此功能仅支持 Discord\n\n💡 Discord 的 Embed 可以显示格式化的富文本消息。",
      }, { to: message.to.id });
      return;
    }

    const discordAdapter = sdk.getAdapter(PLATFORMS.DISCORD) as any;

    // Use sendEmbed method if available
    if (discordAdapter && typeof discordAdapter.sendEmbed === "function") {
      try {
        await discordAdapter.sendEmbed(
          message.from.id,
          {
            title: "📊 Embed 消息测试",
            description: "这是 Discord 特有的富文本消息格式",
            color: 0x00AE86,
            fields: [
              { name: "字段 1", value: "这是第一个字段的内容", inline: true },
              { name: "字段 2", value: "这是第二个字段的内容", inline: true },
              { name: "字段 3", value: "这是第三个字段（非行内）", inline: false },
            ],
            footer: { text: "Omnichat Bot • Discord Embed 测试" },
            timestamp: new Date().toISOString(),
          },
          undefined
        );
        console.log(`📊 Embed sent to ${message.from.id}`);
      } catch (error: any) {
        console.error(`❌ 发送 Embed 失败:`, error);
        await sdk.send(message.platform, {
          text: `❌ 发送 Embed 失败: ${error.message}`,
        }, { to: message.to.id });
      }
    } else {
      // Fallback: just send a text message
      await sdk.send(message.platform, {
        text: "📊 Embed 消息测试\n\n⚠️ 此适配器不支持 Embed，显示纯文本。\n\n字段 1: 这是第一个字段的内容\n字段 2: 这是第二个字段的内容\n字段 3: 这是第三个字段",
      }, { to: message.to.id });
    }
  },
};
