/**
 * Welcome Service - Handles welcome messages and new member greetings
 */

// In-memory storage (in production, use a database)
const welcomeMessages = new Map<string, string>();
const groupRules = new Map<string, string>();

export class WelcomeService {
  /**
   * Set welcome message for a group
   */
  static setWelcomeMessage(groupId: string, message: string): void {
    welcomeMessages.set(groupId, message);
  }

  /**
   * Get welcome message for a group
   */
  static getWelcomeMessage(groupId: string): string | null {
    return welcomeMessages.get(groupId) || null;
  }

  /**
   * Set group rules
   */
  static setRules(groupId: string, rules: string): void {
    groupRules.set(groupId, rules);
  }

  /**
   * Get group rules
   */
  static getRules(groupId: string): string | null {
    return groupRules.get(groupId) || null;
  }
}
