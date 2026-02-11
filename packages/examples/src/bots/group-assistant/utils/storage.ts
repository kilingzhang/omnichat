/**
 * Storage utility for data persistence
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

export interface GroupSettings {
  welcomeEnabled?: boolean;
  welcomeMessage?: string;
  rules?: string;
  autoMod?: boolean;
  linkProtection?: boolean;
}

export interface StorageData {
  groups: Record<string, GroupSettings>;
  version: number;
}

const DEFAULT_DATA: StorageData = {
  groups: {},
  version: 1,
};

export class Storage {
  private data: StorageData;
  private filePath: string;
  private dirty = false;

  constructor(filename = 'group-assistant.json') {
    this.filePath = join(DATA_DIR, filename);
    this.data = { ...DEFAULT_DATA };
  }

  /**
   * Initialize storage - load data from disk
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });

      const content = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, use defaults
      this.data = { ...DEFAULT_DATA };
    }
  }

  /**
   * Save data to disk
   */
  async save(): Promise<void> {
    if (!this.dirty) {
      return;
    }

    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  /**
   * Mark data as dirty (needs saving)
   */
  private markDirty(): void {
    this.dirty = true;
  }

  /**
   * Get group settings
   */
  getGroupSettings(groupId: string): GroupSettings {
    return this.data.groups[groupId] || {};
  }

  /**
   * Update group settings
   */
  updateGroupSettings(groupId: string, settings: Partial<GroupSettings>): void {
    if (!this.data.groups[groupId]) {
      this.data.groups[groupId] = {};
    }
    Object.assign(this.data.groups[groupId], settings);
    this.markDirty();
  }

  /**
   * Delete group settings
   */
  deleteGroupSettings(groupId: string): void {
    delete this.data.groups[groupId];
    this.markDirty();
  }

  /**
   * Auto-save interval (in milliseconds)
   */
  static readonly AUTO_SAVE_INTERVAL = 60 * 1000; // 1 minute

  /**
   * Start auto-save
   */
  startAutoSave(): NodeJS.Timeout {
    return setInterval(() => {
      this.save().catch((error) => {
        console.error('Auto-save failed:', error);
      });
    }, Storage.AUTO_SAVE_INTERVAL);
  }

  /**
   * Get all data (for backup/export)
   */
  getAllData(): StorageData {
    return { ...this.data };
  }

  /**
   * Restore data (from backup/import)
   */
  restoreData(data: StorageData): void {
    this.data = { ...data };
    this.markDirty();
  }
}

// Singleton instance
let storageInstance: Storage | null = null;

export function getStorage(): Storage {
  if (!storageInstance) {
    storageInstance = new Storage();
  }
  return storageInstance;
}
