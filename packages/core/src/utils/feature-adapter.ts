/**
 * Feature Adapter System
 *
 * Provides adapters for converting universal components to platform-specific formats,
 * with fallback strategies and capability detection.
 */

import type {
  UniversalComponent,
  UniversalInteractiveElements,
  PlatformAdapter,
  AdapterTransformation,
} from "../models/universal-features.js";
import type { Platform } from "../models/message.js";
import { PLATFORMS } from "../constants/platforms.js";

/**
 * Base feature adapter
 */
export abstract class BaseFeatureAdapter<Src = any, Dest = any>
  implements PlatformAdapter<Src, Dest>
{
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  /**
   * Transform universal component to platform-specific format
   */
  abstract transform(component: Src): AdapterTransformation<Dest>;

  /**
   * Check if feature is supported
   */
  abstract isSupported(feature: string): boolean;

  /**
   * Get fallback implementation
   */
  abstract getFallback(feature: string): Dest | null;

  /**
   * Get platform-specific limitations
   */
  abstract getLimitations(feature: string): string[];

  /**
   * Transform multiple components with error handling
   */
  transformMultiple(components: Src[]): AdapterTransformation<Dest[]> {
    const results: Dest[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const component of components) {
      const result = this.transform(component);

      if (result.success && result.data) {
        results.push(result.data);
      }

      if (result.warnings) {
        warnings.push(...result.warnings);
      }

      if (result.errors) {
        errors.push(...result.errors);
      }
    }

    return {
      success: errors.length === 0,
      data: results.length > 0 ? results : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Button adapter for Telegram
 */
export class TelegramButtonAdapter extends BaseFeatureAdapter<
  UniversalComponent,
  any
> {
  constructor() {
    super(PLATFORMS.TELEGRAM);
  }

  transform(component: UniversalComponent): AdapterTransformation<any> {
    try {
      let button: any;

      switch (component.type) {
        case "button":
          button = {
            text: component.label,
            callback_data: component.value || component.id,
          };
          break;

        case "url":
          button = {
            text: component.label,
            url: component.url,
          };
          break;

        case "select":
          // Telegram doesn't support native select menus
          // Convert to multiple buttons
          return {
            success: false,
            fallback: null,
            warnings: [
              "Telegram doesn't support select menus. Converting to buttons.",
            ],
          };

        case "input":
          // Telegram doesn't support input components
          return {
            success: false,
            errors: ["Telegram doesn't support input components."],
          };

        default:
          return {
            success: false,
            errors: [`Unknown component type: ${component.type}`],
          };
      }

      return { success: true, data: button };
    } catch (error) {
      return {
        success: false,
        errors: [`Transform failed: ${error}`],
      };
    }
  }

  isSupported(feature: string): boolean {
    return ["button", "url"].includes(feature);
  }

  getFallback(feature: string): any | null {
    if (feature === "select") {
      // Provide multiple buttons as fallback
      return null; // Caller should handle this
    }
    return null;
  }

  getLimitations(feature: string): string[] {
    const limitations: Record<string, string[]> = {
      button: ["Max 100 buttons per row", "Callback data max 64 bytes"],
      url: ["URL buttons can't have callback data"],
    };
    return limitations[feature] || [];
  }
}

/**
 * Button adapter for Discord
 */
export class DiscordButtonAdapter extends BaseFeatureAdapter<
  UniversalComponent,
  any
> {
  constructor() {
    super(PLATFORMS.DISCORD);
  }

  transform(component: UniversalComponent): AdapterTransformation<any> {
    try {
      let button: any;

      switch (component.type) {
        case "button":
          button = {
            type: 2, // Button
            label: component.label,
            custom_id: component.id,
            style: this.mapStyle(component.style),
          };
          if (component.emoji) {
            button.emoji = { name: component.emoji };
          }
          break;

        case "select":
          button = {
            type: 3, // Select menu
            custom_id: component.id,
            placeholder: component.placeholder || "Select an option",
            options: component.options?.map((opt) => ({
              label: opt.label,
              value: opt.value,
              description: opt.description,
              emoji: opt.emoji ? { name: opt.emoji } : undefined,
            })),
            min_values: component.minValues ?? 1,
            max_values: component.maxValues ?? 1,
          };
          break;

        case "url":
          button = {
            type: 2, // Button
            style: 5, // Link style
            label: component.label,
            url: component.url,
          };
          break;

        case "input":
          button = {
            type: 4, // Text input
            custom_id: component.id,
            label: component.label,
            style: component.style === "primary" ? 2 : 1, // Short or Paragraph
            placeholder: component.placeholder,
            required: component.required ?? false,
            min_length: component.minLength,
            max_length: component.maxLength,
          };
          break;

        default:
          return {
            success: false,
            errors: [`Unknown component type: ${component.type}`],
          };
      }

      return { success: true, data: button };
    } catch (error) {
      return {
        success: false,
        errors: [`Transform failed: ${error}`],
      };
    }
  }

  private mapStyle(style?: string): number {
    const styleMap: Record<string, number> = {
      primary: 1, // Blurple
      secondary: 2, // Grey
      success: 3, // Green
      danger: 4, // Red
    };
    return styleMap[style || "secondary"] ?? 2;
  }

  isSupported(feature: string): boolean {
    return ["button", "select", "url", "input"].includes(feature);
  }

  getFallback(feature: string): any | null {
    return null;
  }

  getLimitations(feature: string): string[] {
    const limitations: Record<string, string[]> = {
      button: ["Max 25 buttons per message", "Max 5 action rows"],
      select: ["Max 25 options", "Min 1, Max 10 select menus per row"],
      input: ["Only available in modals"],
    };
    return limitations[feature] || [];
  }
}

/**
 * Button adapter for Slack
 */
export class SlackButtonAdapter extends BaseFeatureAdapter<
  UniversalComponent,
  any
> {
  constructor() {
    super("slack");
  }

  transform(component: UniversalComponent): AdapterTransformation<any> {
    try {
      let element: any;

      switch (component.type) {
        case "button":
          element = {
            type: "button",
            text: {
              type: "plain_text",
              text: component.label,
            },
            action_id: component.id,
            style: this.mapStyle(component.style),
          };
          if (component.url) {
            element.url = component.url;
          }
          if (component.value) {
            element.value = component.value;
          }
          break;

        case "select":
          element = {
            type: "static_select",
            action_id: component.id,
            placeholder: {
              type: "plain_text",
              text: component.placeholder || "Select an option",
            },
            options: component.options?.map((opt) => ({
              text: {
                type: "plain_text",
                text: opt.label,
              },
              value: opt.value,
              description: opt.description
                ? {
                    type: "plain_text",
                    text: opt.description,
                  }
                : undefined,
            })),
          };
          break;

        case "input":
          element = {
            type: "input",
            block_id: component.id,
            label: {
              type: "plain_text",
              text: component.label,
            },
            element: {
              type: "plain_text_input",
              placeholder: {
                type: "plain_text",
                text: component.placeholder,
              },
              action_id: component.id,
            },
            optional: !component.required,
          };
          break;

        default:
          return {
            success: false,
            errors: [`Unknown component type: ${component.type}`],
          };
      }

      return { success: true, data: element };
    } catch (error) {
      return {
        success: false,
        errors: [`Transform failed: ${error}`],
      };
    }
  }

  private mapStyle(style?: string): string {
    const styleMap: Record<string, string> = {
      primary: "primary",
      danger: "danger",
    };
    return styleMap[style || "secondary"] || "default";
  }

  isSupported(feature: string): boolean {
    return ["button", "select", "input"].includes(feature);
  }

  getFallback(feature: string): any | null {
    return null;
  }

  getLimitations(feature: string): string[] {
    const limitations: Record<string, string[]> = {
      button: ["Max 25 buttons per action block"],
      select: ["Max 100 options"],
      input: ["Only available in modals"],
    };
    return limitations[feature] || [];
  }
}

/**
 * Button adapter for WhatsApp
 */
export class WhatsAppButtonAdapter extends BaseFeatureAdapter<
  UniversalComponent,
  any
> {
  constructor() {
    super("whatsapp");
  }

  transform(component: UniversalComponent): AdapterTransformation<any> {
    try {
      let button: any;

      switch (component.type) {
        case "button":
          // WhatsApp supports reply buttons and call-to-action buttons
          if (component.url) {
            button = {
              type: "call_to_action",
              text: component.label,
              url: component.url,
            };
          } else {
            button = {
              type: "reply",
              reply: {
                id: component.id,
                title: component.label,
              },
            };
          }
          break;

        case "select":
          // WhatsApp uses List Messages for selects
          return {
            success: true,
            data: {
              type: "list",
              action: component,
            },
          };

        default:
          return {
            success: false,
            errors: [`Unknown component type: ${component.type}`],
          };
      }

      return { success: true, data: button };
    } catch (error) {
      return {
        success: false,
        errors: [`Transform failed: ${error}`],
      };
    }
  }

  isSupported(feature: string): boolean {
    return ["button", "select"].includes(feature);
  }

  getFallback(feature: string, component?: UniversalComponent): any | null {
    if (feature === "select" && component) {
      // Use list message format
      return {
        type: "list",
        action: {
          button: component.label,
          sections: [
            {
              title: "Options",
              rows: component.options?.map((opt: any) => ({
                id: opt.value,
                title: opt.label,
                description: opt.description,
              })),
            },
          ],
        },
      };
    }
    return null;
  }

  getLimitations(feature: string): string[] {
    const limitations: Record<string, string[]> = {
      button: [
        "Max 3 buttons per message",
        "Reply buttons: max 20 characters",
        "URL buttons: require HTTPS",
      ],
      select: [
        "Max 10 sections",
        "Max 10 rows per section",
        "Row title: max 24 characters",
      ],
    };
    return limitations[feature] || [];
  }
}

/**
 * Component transformer factory
 */
export class ComponentTransformer {
  private static adapters: Map<Platform, BaseFeatureAdapter> = new Map();

  static {
    // Register default adapters
    this.adapters.set(PLATFORMS.TELEGRAM, new TelegramButtonAdapter());
    this.adapters.set(PLATFORMS.DISCORD, new DiscordButtonAdapter());
    this.adapters.set("slack", new SlackButtonAdapter());
    this.adapters.set("whatsapp", new WhatsAppButtonAdapter());
  }

  /**
   * Register a custom adapter
   */
  static registerAdapter(
    platform: Platform,
    adapter: BaseFeatureAdapter
  ): void {
    this.adapters.set(platform, adapter);
  }

  /**
   * Transform universal components to platform-specific format
   */
  static transform(
    platform: Platform,
    components: UniversalInteractiveElements
  ): AdapterTransformation<any> {
    const adapter = this.adapters.get(platform);

    if (!adapter) {
      return {
        success: false,
        errors: [`No adapter registered for platform: ${platform}`],
      };
    }

    try {
      const rows: any[][] = [];

      for (const row of components.rows) {
        const transformedRow: any[] = [];
        const warnings: string[] = [];

        for (const component of row) {
          const result = adapter.transform(component);

          if (result.success && result.data) {
            transformedRow.push(result.data);
          }

          if (result.warnings) {
            warnings.push(...result.warnings);
          }

          if (result.fallback) {
            transformedRow.push(result.fallback);
          }
        }

        if (transformedRow.length > 0) {
          rows.push(transformedRow);
        }

        if (warnings.length > 0) {
          return {
            success: true,
            data: this.formatForPlatform(platform, rows),
            warnings,
          };
        }
      }

      return {
        success: true,
        data: this.formatForPlatform(platform, rows),
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Transform failed: ${error}`],
      };
    }
  }

  /**
   * Format transformed components for specific platform
   */
  private static formatForPlatform(platform: Platform, rows: any[][]): any {
    switch (platform) {
      case PLATFORMS.TELEGRAM:
        return {
          reply_markup: {
            inline_keyboard: rows,
          },
        };

      case PLATFORMS.DISCORD:
        return {
          components: rows.map((row) => ({
            type: 1, // Action row
            components: row,
          })),
        };

      case "slack":
        return {
          blocks: rows.map((row) => ({
            type: "actions",
            elements: row,
          })),
        };

      case "whatsapp":
        // WhatsApp only supports one row with max 3 buttons
        return {
          type: "interactive",
          action: {
            buttons: rows[0],
          },
        };

      default:
        return { rows };
    }
  }

  /**
   * Check if platform supports a feature
   */
  static supports(platform: Platform, feature: string): boolean {
    const adapter = this.adapters.get(platform);
    return adapter ? adapter.isSupported(feature) : false;
  }

  /**
   * Get platform limitations for a feature
   */
  static getLimitations(platform: Platform, feature: string): string[] {
    const adapter = this.adapters.get(platform);
    return adapter ? adapter.getLimitations(feature) : [];
  }
}
