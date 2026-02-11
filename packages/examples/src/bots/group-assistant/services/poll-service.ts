/**
 * Poll Service - Creates and manages polls and voting
 */

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: Set<string>;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: number;
  allowMultiple: boolean;
  closed: boolean;
}

export interface ScheduledMessage {
  id: string;
  chatId: string;
  text: string;
  scheduledFor: number;
  createdBy: string;
  sent: boolean;
}

// In-memory storage
const polls = new Map<string, Poll>(); // pollId -> poll
const groupPolls = new Map<string, string[]>(); // groupId -> pollIds
const scheduledMessages = new Map<string, ScheduledMessage>();

export class PollService {
  /**
   * Create a new poll
   */
  static createPoll(
    groupId: string,
    question: string,
    options: string[],
    createdBy: string,
    allowMultiple = false
  ): Poll {
    const pollId = `${groupId}:${Date.now()}`;

    const pollOptions: PollOption[] = options.map((text, index) => ({
      id: `${pollId}:${index}`,
      text,
      votes: 0,
      voters: new Set(),
    }));

    const poll: Poll = {
      id: pollId,
      question,
      options: pollOptions,
      createdBy,
      createdAt: Date.now(),
      allowMultiple,
      closed: false,
    };

    polls.set(pollId, poll);

    const groupPollList = groupPolls.get(groupId) || [];
    groupPollList.push(pollId);
    groupPolls.set(groupId, groupPollList);

    return poll;
  }

  /**
   * Get a poll by ID
   */
  static getPoll(pollId: string): Poll | null {
    return polls.get(pollId) || null;
  }

  /**
   * Get all polls for a group
   */
  static getGroupPolls(groupId: string): Poll[] {
    const pollIds = groupPolls.get(groupId) || [];
    return pollIds
      .map((id) => polls.get(id))
      .filter((p): p is Poll => p !== undefined);
  }

  /**
   * Vote in a poll
   */
  static vote(pollId: string, userId: string, optionId: string): {
    success: boolean;
    message: string;
  } {
    const poll = polls.get(pollId);
    if (!poll) {
      return { success: false, message: '投票不存在' };
    }

    if (poll.closed) {
      return { success: false, message: '投票已关闭' };
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      return { success: false, message: '选项不存在' };
    }

    // Check if user has already voted
    const hasVoted = poll.options.some((o) => o.voters.has(userId));
    if (hasVoted && !poll.allowMultiple) {
      return { success: false, message: '你已经投过票了' };
    }

    // Remove vote from other options if multiple votes not allowed
    if (!poll.allowMultiple) {
      poll.options.forEach((o) => o.voters.delete(userId));
    }

    // Add vote
    option.voters.add(userId);
    option.votes = option.voters.size;

    return { success: true, message: '投票成功！' };
  }

  /**
   * Close a poll
   */
  static closePoll(pollId: string, userId: string): {
    success: boolean;
    message: string;
  } {
    const poll = polls.get(pollId);
    if (!poll) {
      return { success: false, message: '投票不存在' };
    }

    if (poll.createdBy !== userId) {
      return { success: false, message: '只有创建者才能关闭投票' };
    }

    poll.closed = true;
    return { success: true, message: '投票已关闭' };
  }

  /**
   * Format poll for display
   */
  static formatPoll(poll: Poll, showResults = false): string {
    let message = `🗳️ ${poll.question}\n\n`;

    poll.options.forEach((option, index) => {
      const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || '•';

      if (showResults || poll.closed) {
        const percentage =
          poll.options.reduce((sum, o) => sum + o.votes, 0) > 0
            ? Math.round((option.votes / poll.options.reduce((sum, o) => sum + o.votes, 0)) * 100)
            : 0;
        const bar = '█'.repeat(Math.floor(percentage / 5)) || '▏';
        message += `${emoji} ${option.text}\n`;
        message += `   ${bar} ${option.votes} 票 (${percentage}%)\n`;
      } else {
        message += `${emoji} ${option.text}\n`;
      }
    });

    if (poll.closed) {
      message += '\n✅ 投票已结束';
    } else if (poll.allowMultiple) {
      message += '\n💡 可以多选';
    }

    return message;
  }

  /**
   * Delete a poll
   */
  static deletePoll(pollId: string, userId: string): boolean {
    const poll = polls.get(pollId);
    if (!poll || poll.createdBy !== userId) {
      return false;
    }

    polls.delete(pollId);
    return true;
  }

  /**
   * Parse poll options from text
   */
  static parsePollOptions(text: string): string[] {
    const lines = text.split('\n').filter((line) => line.trim());
    const options: string[] = [];

    for (const line of lines) {
      // Try to match "1. option" or "1) option" or "option"
      const match = line.match(/^\d+[\.\)]\s*(.+)$/) || line.match(/^(\S.+)$/);
      if (match) {
        options.push(match[1].trim());
      }
    }

    return options;
  }

  /**
   * Schedule a message
   */
  static scheduleMessage(
    chatId: string,
    text: string,
    scheduledFor: number,
    createdBy: string
  ): ScheduledMessage {
    const id = `${chatId}:${Date.now()}`;

    const scheduled: ScheduledMessage = {
      id,
      chatId,
      text,
      scheduledFor,
      createdBy,
      sent: false,
    };

    scheduledMessages.set(id, scheduled);
    return scheduled;
  }

  /**
   * Get due scheduled messages
   */
  static getDueMessages(): ScheduledMessage[] {
    const now = Date.now();
    const due: ScheduledMessage[] = [];

    for (const [id, msg] of scheduledMessages) {
      if (!msg.sent && msg.scheduledFor <= now) {
        due.push(msg);
      }
    }

    return due;
  }

  /**
   * Mark message as sent
   */
  static markMessageSent(id: string): void {
    const msg = scheduledMessages.get(id);
    if (msg) {
      msg.sent = true;
    }
  }

  /**
   * Get scheduled messages for a chat
   */
  static getScheduledMessages(chatId: string): ScheduledMessage[] {
    const messages: ScheduledMessage[] = [];

    for (const [id, msg] of scheduledMessages) {
      if (msg.chatId === chatId && !msg.sent) {
        messages.push(msg);
      }
    }

    return messages.sort((a, b) => a.scheduledFor - b.scheduledFor);
  }

  /**
   * Cancel scheduled message
   */
  static cancelScheduledMessage(id: string, userId: string): boolean {
    const msg = scheduledMessages.get(id);
    if (!msg || msg.createdBy !== userId) {
      return false;
    }

    return scheduledMessages.delete(id);
  }

  /**
   * Parse scheduled time
   */
  static parseScheduledTime(timeStr: string): number | null {
    try {
      // Try to parse as date-time
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Format scheduled time for display
   */
  static formatScheduledTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }
}
