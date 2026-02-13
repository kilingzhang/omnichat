/**
 * Command Registry
 * Central registry for all bot commands
 */

import type { CommandRegistry } from "../types.js";
import {
  startCommand,
  helpCommand,
  idCommand,
} from "./basic.js";
import {
  buttonsCommand,
  keyboardCommand,
  hideCommand,
  pollCommand,
  noteCommand,
  scheduleCommand,
  dmCommand,
  selectMenuCommand,
  modalCommand,
  mentionCommand,
  slashCommand,
  embedCommand,
} from "./interaction.js";
import {
  advancedCommand,
  capsCommand,
  inlineCommand,
  warnCommand,
  muteCommand,
  kickCommand,
  banCommand,
} from "./advanced.js";
import {
  inviteCommand,
  welcomeCommand,
  rulesCommand,
  announceCommand,
  statsCommand,
} from "./management.js";
import { infoCommand, guildCommand } from "./info.js";

/**
 * Get all commands
 */
export function getCommands(): CommandRegistry {
  return {
    // Basic commands
    "/start": startCommand,
    "/help": helpCommand,
    "/id": idCommand,

    // Group management
    "/welcome": welcomeCommand,
    "/rules": rulesCommand,
    "/announce": announceCommand,
    "/stats": statsCommand,

    // Moderation
    "/warn": warnCommand,
    "/mute": muteCommand,
    "/kick": kickCommand,
    "/ban": banCommand,

    // Features
    "/poll": pollCommand,
    "/note": noteCommand,
    "/schedule": scheduleCommand,
    "/dm": dmCommand,

    // Info & tools
    "/info": infoCommand,
    "/guild": guildCommand,
    "/buttons": buttonsCommand,
    "/keyboard": keyboardCommand,
    "/hide": hideCommand,
    "/advanced": advancedCommand,
    "/caps": capsCommand,
    "/inline": inlineCommand,
    "/invite": inviteCommand,

    // Discord-specific features
    "/selectmenu": selectMenuCommand,
    "/modal": modalCommand,
    "/mention": mentionCommand,
    "/slash": slashCommand,
    "/embed": embedCommand,
  };
}

/**
 * Export commands individually for testing
 */
export const commands = {
  start: startCommand,
  help: helpCommand,
  id: idCommand,
  welcome: welcomeCommand,
  rules: rulesCommand,
  announce: announceCommand,
  stats: statsCommand,
  warn: warnCommand,
  mute: muteCommand,
  kick: kickCommand,
  ban: banCommand,
  poll: pollCommand,
  note: noteCommand,
  schedule: scheduleCommand,
  info: infoCommand,
  buttons: buttonsCommand,
  keyboard: keyboardCommand,
  hide: hideCommand,
  advanced: advancedCommand,
  caps: capsCommand,
  inline: inlineCommand,
  invite: inviteCommand,
  // Discord-specific
  selectmenu: selectMenuCommand,
  modal: modalCommand,
  mention: mentionCommand,
  slash: slashCommand,
  embed: embedCommand,
};
