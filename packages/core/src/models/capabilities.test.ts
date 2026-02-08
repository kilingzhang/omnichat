import { describe, it, expect } from "vitest";
import { Capabilities, defaultCapabilities, mergeCapabilities, hasCapability } from "../models/capabilities.js";

describe("Capabilities", () => {
  describe("defaultCapabilities", () => {
    it("should have all capabilities set to false", () => {
      expect(defaultCapabilities.base.sendText).toBe(false);
      expect(defaultCapabilities.base.sendMedia).toBe(false);
      expect(defaultCapabilities.base.receive).toBe(false);

      expect(defaultCapabilities.conversation.reply).toBe(false);
      expect(defaultCapabilities.conversation.edit).toBe(false);
      expect(defaultCapabilities.conversation.delete).toBe(false);
      expect(defaultCapabilities.conversation.threads).toBe(false);
      expect(defaultCapabilities.conversation.quote).toBe(false);

      expect(defaultCapabilities.interaction.buttons).toBe(false);
      expect(defaultCapabilities.interaction.polls).toBe(false);
      expect(defaultCapabilities.interaction.reactions).toBe(false);
      expect(defaultCapabilities.interaction.stickers).toBe(false);
      expect(defaultCapabilities.interaction.effects).toBe(false);

      expect(defaultCapabilities.discovery.history).toBe(false);
      expect(defaultCapabilities.discovery.search).toBe(false);
      expect(defaultCapabilities.discovery.pins).toBe(false);
      expect(defaultCapabilities.discovery.memberInfo).toBe(false);
      expect(defaultCapabilities.discovery.channelInfo).toBe(false);

      expect(defaultCapabilities.management.kick).toBe(false);
      expect(defaultCapabilities.management.ban).toBe(false);
      expect(defaultCapabilities.management.timeout).toBe(false);
      expect(defaultCapabilities.management.channelCreate).toBe(false);
      expect(defaultCapabilities.management.channelEdit).toBe(false);
      expect(defaultCapabilities.management.channelDelete).toBe(false);
      expect(defaultCapabilities.management.permissions).toBe(false);
    });
  });

  describe("mergeCapabilities", () => {
    it("should merge two capability sets", () => {
      const caps1: Partial<Capabilities> = {
        base: { sendText: true, sendMedia: true, receive: true },
      };
      const caps2: Partial<Capabilities> = {
        interaction: { buttons: true, reactions: true },
      };

      const result = mergeCapabilities(caps1, caps2);

      expect(result.base.sendText).toBe(true);
      expect(result.base.sendMedia).toBe(true);
      expect(result.base.receive).toBe(true);
      expect(result.interaction.buttons).toBe(true);
      expect(result.interaction.reactions).toBe(true);
      expect(result.interaction.polls).toBe(false); // From default
    });

    it("should merge multiple capability sets", () => {
      const caps1: Partial<Capabilities> = {
        base: { sendText: true },
      };
      const caps2: Partial<Capabilities> = {
        base: { sendMedia: true },
      };
      const caps3: Partial<Capabilities> = {
        base: { receive: true },
      };

      const result = mergeCapabilities(caps1, caps2, caps3);

      expect(result.base.sendText).toBe(true);
      expect(result.base.sendMedia).toBe(true);
      expect(result.base.receive).toBe(true);
    });

    it("should override capabilities in order", () => {
      const caps1: Partial<Capabilities> = {
        base: { sendText: true },
      };
      const caps2: Partial<Capabilities> = {
        base: { sendText: false },
      };

      const result = mergeCapabilities(caps1, caps2);

      expect(result.base.sendText).toBe(false);
    });

    it("should return default capabilities when no arguments", () => {
      const result = mergeCapabilities();
      expect(result).toEqual(defaultCapabilities);
    });

    it("should not mutate input objects", () => {
      const caps1: Partial<Capabilities> = {
        base: { sendText: true, sendMedia: false, receive: false },
      };
      const caps2: Partial<Capabilities> = {
        base: { sendMedia: true },
      };

      const result = mergeCapabilities(caps1, caps2);

      expect(caps1.base.sendMedia).toBe(false);
      expect(caps1.base.sendText).toBe(true);
      expect(result.base.sendMedia).toBe(true);
      expect(result.base.sendText).toBe(true);
    });
  });

  describe("hasCapability", () => {
    it("should return true for enabled capability", () => {
      const caps: Capabilities = {
        base: { sendText: true, sendMedia: false, receive: false } as any,
        conversation: { reply: false, edit: false, delete: false, threads: false, quote: false } as any,
        interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false } as any,
        discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false } as any,
        management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false } as any,
      };

      const result = hasCapability(caps, "base", "sendText");
      expect(result).toBe(true);
    });

    it("should return false for disabled capability", () => {
      const caps: Capabilities = {
        base: { sendText: true, sendMedia: false, receive: false } as any,
        conversation: { reply: false, edit: false, delete: false, threads: false, quote: false } as any,
        interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false } as any,
        discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false } as any,
        management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false } as any,
      };

      const result = hasCapability(caps, "base", "sendMedia");
      expect(result).toBe(false);
    });

    it("should return false for non-existent capability", () => {
      const caps: Capabilities = {
        base: { sendText: true, sendMedia: false, receive: false } as any,
        conversation: { reply: false, edit: false, delete: false, threads: false, quote: false } as any,
        interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false } as any,
        discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false } as any,
        management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false } as any,
      };

      const result = hasCapability(caps, "base", "nonExistent");
      expect(result).toBe(false);
    });

    it("should return false for non-existent category", () => {
      const caps: Capabilities = {
        base: { sendText: true, sendMedia: false, receive: false },
        conversation: { reply: false, edit: false, delete: false, threads: false, quote: false },
        interaction: { buttons: false, polls: false, reactions: false, stickers: false, effects: false },
        discovery: { history: false, search: false, pins: false, memberInfo: false, channelInfo: false },
        management: { kick: false, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false },
      };

      const result = hasCapability(caps, "nonExistent" as any, "sendText");
      expect(result).toBe(false);
    });

    it("should check all capability categories", () => {
      const caps: Capabilities = {
        base: { sendText: true, sendMedia: false, receive: false } as any,
        conversation: { reply: true, edit: false, delete: false, threads: false, quote: false } as any,
        interaction: { buttons: true, polls: false, reactions: false, stickers: false, effects: false } as any,
        discovery: { history: true, search: false, pins: false, memberInfo: false, channelInfo: false } as any,
        management: { kick: true, ban: false, timeout: false, channelCreate: false, channelEdit: false, channelDelete: false, permissions: false } as any,
      };

      expect(hasCapability(caps, "base", "sendText")).toBe(true);
      expect(hasCapability(caps, "conversation", "reply")).toBe(true);
      expect(hasCapability(caps, "interaction", "buttons")).toBe(true);
      expect(hasCapability(caps, "discovery", "history")).toBe(true);
      expect(hasCapability(caps, "management", "kick")).toBe(true);

      expect(hasCapability(caps, "base", "sendMedia")).toBe(false);
      expect(hasCapability(caps, "conversation", "edit")).toBe(false);
      expect(hasCapability(caps, "interaction", "polls")).toBe(false);
      expect(hasCapability(caps, "discovery", "search")).toBe(false);
      expect(hasCapability(caps, "management", "ban")).toBe(false);
    });
  });
});
