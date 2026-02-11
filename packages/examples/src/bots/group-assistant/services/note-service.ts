/**
 * Note Service - Manages group notes and information storage
 */

export interface Note {
  id: string;
  groupId: string;
  content: string;
  createdBy: string;
  createdAt: number;
  tags: string[];
}

export interface Announcement {
  id: string;
  groupId: string;
  content: string;
  createdBy: string;
  createdAt: number;
  pinned: boolean;
}

// In-memory storage
const notes = new Map<string, Note>(); // noteId -> note
const groupNotes = new Map<string, string[]>(); // groupId -> noteIds
const announcements = new Map<string, Announcement>(); // announcementId -> announcement
const groupAnnouncements = new Map<string, string[]>(); // groupId -> announcementIds

export class NoteService {
  /**
   * Create a new note
   */
  static createNote(
    groupId: string,
    content: string,
    createdBy: string,
    tags: string[] = []
  ): Note {
    const id = `${groupId}:${Date.now()}`;

    const note: Note = {
      id,
      groupId,
      content,
      createdBy,
      createdAt: Date.now(),
      tags,
    };

    notes.set(id, note);

    const groupNoteList = groupNotes.get(groupId) || [];
    groupNoteList.push(id);
    groupNotes.set(groupId, groupNoteList);

    return note;
  }

  /**
   * Get all notes for a group
   */
  static getGroupNotes(groupId: string): Note[] {
    const noteIds = groupNotes.get(groupId) || [];
    return noteIds
      .map((id) => notes.get(id))
      .filter((n): n is Note => n !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Search notes by keyword
   */
  static searchNotes(groupId: string, keyword: string): Note[] {
    const allNotes = this.getGroupNotes(groupId);
    const lowerKeyword = keyword.toLowerCase();

    return allNotes.filter(
      (note) =>
        note.content.toLowerCase().includes(lowerKeyword) ||
        note.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * Get notes by tag
   */
  static getNotesByTag(groupId: string, tag: string): Note[] {
    const allNotes = this.getGroupNotes(groupId);
    const lowerTag = tag.toLowerCase();

    return allNotes.filter((note) => note.tags.some((t) => t.toLowerCase() === lowerTag));
  }

  /**
   * Delete a note
   */
  static deleteNote(noteId: string, userId: string): boolean {
    const note = notes.get(noteId);
    if (!note || note.createdBy !== userId) {
      return false;
    }

    // Remove from group notes
    const groupNoteList = groupNotes.get(note.groupId) || [];
    const index = groupNoteList.indexOf(noteId);
    if (index > -1) {
      groupNoteList.splice(index, 1);
      groupNotes.set(note.groupId, groupNoteList);
    }

    return notes.delete(noteId);
  }

  /**
   * Format note for display
   */
  static formatNote(note: Note, showIndex = false, index = 0): string {
    const date = new Date(note.createdAt).toLocaleString('zh-CN');
    let message = '';

    if (showIndex) {
      message += `${index}. `;
    }

    message += `${note.content}`;

    if (note.tags.length > 0) {
      message += `\n标签: ${note.tags.map((t) => `#${t}`).join(' ')}`;
    }

    message += `\n保存时间: ${date}`;

    return message;
  }

  /**
   * Format notes list for display
   */
  static formatNotesList(groupId: string): string {
    const notes = this.getGroupNotes(groupId);

    if (notes.length === 0) {
      return '暂无笔记';
    }

    let message = '📝 群组笔记\n\n';

    notes.slice(0, 10).forEach((note, index) => {
      message += `${index + 1}. ${note.content}\n`;
      if (note.tags.length > 0) {
        message += `   ${note.tags.map((t) => `#${t}`).join(' ')}\n`;
      }
      message += '\n';
    });

    if (notes.length > 10) {
      message += `\n...还有 ${notes.length - 10} 条笔记\n`;
    }

    return message;
  }

  /**
   * Create an announcement
   */
  static createAnnouncement(
    groupId: string,
    content: string,
    createdBy: string
  ): Announcement {
    const id = `${groupId}:announce:${Date.now()}`;

    const announcement: Announcement = {
      id,
      groupId,
      content,
      createdBy,
      createdAt: Date.now(),
      pinned: false,
    };

    announcements.set(id, announcement);

    const groupAnnouncementList = groupAnnouncements.get(groupId) || [];
    groupAnnouncementList.push(id);
    groupAnnouncements.set(groupId, groupAnnouncementList);

    return announcement;
  }

  /**
   * Get all announcements for a group
   */
  static getAnnouncements(groupId: string): Announcement[] {
    const announcementIds = groupAnnouncements.get(groupId) || [];
    return announcementIds
      .map((id) => announcements.get(id))
      .filter((a): a is Announcement => a !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get pinned announcement for a group
   */
  static getPinnedAnnouncement(groupId: string): Announcement | null {
    const announcements = this.getAnnouncements(groupId);
    return announcements.find((a) => a.pinned) || null;
  }

  /**
   * Pin/unpin an announcement
   */
  static togglePinAnnouncement(announcementId: string, userId: string): boolean {
    const announcement = announcements.get(announcementId);
    if (!announcement || announcement.createdBy !== userId) {
      return false;
    }

    // Unpin other announcements in the group
    if (!announcement.pinned) {
      const groupAnnouncementList = groupAnnouncements.get(announcement.groupId) || [];
      groupAnnouncementList.forEach((id) => {
        const a = announcements.get(id);
        if (a && a.id !== announcementId) {
          a.pinned = false;
        }
      });
    }

    announcement.pinned = !announcement.pinned;
    return true;
  }

  /**
   * Delete an announcement
   */
  static deleteAnnouncement(announcementId: string, userId: string): boolean {
    const announcement = announcements.get(announcementId);
    if (!announcement || announcement.createdBy !== userId) {
      return false;
    }

    // Remove from group announcements
    const groupAnnouncementList = groupAnnouncements.get(announcement.groupId) || [];
    const index = groupAnnouncementList.indexOf(announcementId);
    if (index > -1) {
      groupAnnouncementList.splice(index, 1);
      groupAnnouncements.set(announcement.groupId, groupAnnouncementList);
    }

    return announcements.delete(announcementId);
  }

  /**
   * Format announcement for display
   */
  static formatAnnouncement(announcement: Announcement): string {
    const date = new Date(announcement.createdAt).toLocaleString('zh-CN');
    let message = '📢 公告\n\n';
    message += announcement.content;
    if (announcement.pinned) {
      message += '\n\n📌 已置顶';
    }
    message += `\n\n发布时间: ${date}`;
    return message;
  }

  /**
   * Extract tags from content
   */
  static extractTags(content: string): string[] {
    const tagRegex = /#(\w+)/g;
    const tags: string[] = [];
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }

    return tags;
  }
}
