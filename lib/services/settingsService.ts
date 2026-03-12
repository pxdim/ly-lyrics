/**
 * Settings Service
 *
 * Service layer for settings CRUD operations using direct PostgreSQL connection.
 * Replaces Supabase client with self-hosted solution.
 *
 * @module lib/services/settingsService
 */

import {
  query,
  queryOne,
  buildInsertQuery,
  buildUpdateQuery,
} from "@/lib/db/client";
import type { Settings, SettingsInsert } from "@/lib/db/types";
import { createNotFoundError } from "@/lib/errors/AppError";
import { ensureDemoUser } from "./userService";

// ============================================================================
// Types
// ============================================================================

export interface DisplaySettings {
  displayLines: number;
  fontSize: number;
  fontFamily: string;
  theme: "light" | "dark" | "transparent";
  showBackground: boolean;
  backgroundColor: string | null;
  textColor: string | null;
  highlightColor: string | null;
  autoScroll: boolean;
  scrollDuration: number;
  enableAnimation: boolean;
}

export interface NdiSettings {
  enabled: boolean;
  width: number;
  height: number;
  frameRate: number;
  alphaChannel: boolean;
}

export interface UserSettings {
  id: string;
  userId: string;
  displaySettings: DisplaySettings;
  ndiSettings?: NdiSettings;
  autoReconnect?: boolean;
}

export interface UpdateSettingsInput {
  displaySettings?: Partial<DisplaySettings>;
  ndiSettings?: Partial<NdiSettings>;
  autoReconnect?: boolean;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  displayLines: 4,
  fontSize: 32,
  fontFamily: "Inter",
  theme: "dark",
  showBackground: true,
  backgroundColor: "#000000",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

export const DEFAULT_NDI_SETTINGS: NdiSettings = {
  enabled: false,
  width: 1920,
  height: 1080,
  frameRate: 30,
  alphaChannel: true,
};

// ============================================================================
// Converters
// ============================================================================

/**
 * Convert database row to Settings model
 */
function rowToSettings(row: any): Settings {
  return {
    id: row.id,
    user_id: row.user_id,
    display_lines: row.display_lines,
    font_size: row.font_size,
    font_family: row.font_family,
    theme: row.theme,
    show_background: row.show_background,
    background_color: row.background_color,
    text_color: row.text_color,
    highlight_color: row.highlight_color,
    auto_scroll: row.auto_scroll,
    scroll_duration: row.scroll_duration,
    enable_animation: row.enable_animation,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert Settings model to DisplaySettings
 */
function settingsToDisplaySettings(settings: Settings): DisplaySettings {
  return {
    displayLines: settings.display_lines,
    fontSize: settings.font_size,
    fontFamily: settings.font_family,
    theme: settings.theme,
    showBackground: settings.show_background,
    backgroundColor: settings.background_color,
    textColor: settings.text_color,
    highlightColor: settings.highlight_color,
    autoScroll: settings.auto_scroll,
    scrollDuration: settings.scroll_duration,
    enableAnimation: settings.enable_animation,
  };
}

/**
 * Convert DisplaySettings to database insert format
 */
function displaySettingsToInsert(
  userId: string,
  displaySettings: DisplaySettings
): SettingsInsert {
  return {
    user_id: userId,
    display_lines: displaySettings.displayLines,
    font_size: displaySettings.fontSize,
    font_family: displaySettings.fontFamily,
    theme: displaySettings.theme,
    show_background: displaySettings.showBackground,
    background_color: displaySettings.backgroundColor,
    text_color: displaySettings.textColor,
    highlight_color: displaySettings.highlightColor,
    auto_scroll: displaySettings.autoScroll,
    scroll_duration: displaySettings.scrollDuration,
    enable_animation: displaySettings.enableAnimation,
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get settings by user ID
 * Creates default settings if not exists
 */
export async function getSettingsByUserId(userId: string): Promise<UserSettings> {
  let result = await queryOne(
    `SELECT * FROM settings WHERE user_id = $1`,
    [userId]
  );

  // Create default settings if not exists
  if (!result) {
    await ensureDemoUser();
    const settings = await createDefaultSettings(userId);
    return settings;
  }

  const settings = rowToSettings(result);

  return {
    id: settings.id,
    userId: settings.user_id,
    displaySettings: settingsToDisplaySettings(settings),
    ndiSettings: DEFAULT_NDI_SETTINGS, // Not stored in DB yet
    autoReconnect: true, // Default value
  };
}

/**
 * Get settings by ID
 */
export async function getSettingsById(id: string): Promise<UserSettings | null> {
  const result = await queryOne(
    `SELECT * FROM settings WHERE id = $1`,
    [id]
  );

  if (!result) {
    return null;
  }

  const settings = rowToSettings(result);

  return {
    id: settings.id,
    userId: settings.user_id,
    displaySettings: settingsToDisplaySettings(settings),
    ndiSettings: DEFAULT_NDI_SETTINGS,
    autoReconnect: true,
  };
}

/**
 * Create default settings for a user
 */
async function createDefaultSettings(userId: string): Promise<UserSettings> {
  const insertData = displaySettingsToInsert(userId, DEFAULT_DISPLAY_SETTINGS);
  const { text, params } = buildInsertQuery(
    "settings",
    insertData as unknown as Record<string, unknown>,
    "id, user_id, display_lines, font_size, font_family, theme, show_background, background_color, text_color, highlight_color, auto_scroll, scroll_duration, enable_animation, created_at, updated_at"
  );

  const result = await queryOne(text, params);

  if (!result) {
    throw new Error("Failed to create settings");
  }

  const settings = rowToSettings(result);

  return {
    id: settings.id,
    userId: settings.user_id,
    displaySettings: settingsToDisplaySettings(settings),
    ndiSettings: DEFAULT_NDI_SETTINGS,
    autoReconnect: true,
  };
}

/**
 * Update settings
 */
export async function updateSettings(
  userId: string,
  input: UpdateSettingsInput
): Promise<UserSettings> {
  // Get existing settings
  const existing = await queryOne(
    `SELECT * FROM settings WHERE user_id = $1`,
    [userId]
  );

  if (!existing) {
    // Create if not exists
    return createDefaultSettings(userId);
  }

  const settings = rowToSettings(existing);
  const updateData: Record<string, unknown> = {};

  // Update display settings if provided
  if (input.displaySettings) {
    const ds = input.displaySettings;

    if (ds.displayLines !== undefined) updateData["display_lines"] = ds.displayLines;
    if (ds.fontSize !== undefined) updateData["font_size"] = ds.fontSize;
    if (ds.fontFamily !== undefined) updateData["font_family"] = ds.fontFamily;
    if (ds.theme !== undefined) updateData["theme"] = ds.theme;
    if (ds.showBackground !== undefined) updateData["show_background"] = ds.showBackground;
    if (ds.backgroundColor !== undefined) updateData["background_color"] = ds.backgroundColor;
    if (ds.textColor !== undefined) updateData["text_color"] = ds.textColor;
    if (ds.highlightColor !== undefined) updateData["highlight_color"] = ds.highlightColor;
    if (ds.autoScroll !== undefined) updateData["auto_scroll"] = ds.autoScroll;
    if (ds.scrollDuration !== undefined) updateData["scroll_duration"] = ds.scrollDuration;
    if (ds.enableAnimation !== undefined) updateData["enable_animation"] = ds.enableAnimation;
  }

  // Add updated_at timestamp
  updateData["updated_at"] = new Date().toISOString();

  // Update if there are changes
  if (Object.keys(updateData).length > 1) { // > 1 because we always add updated_at
    const { text, params } = buildUpdateQuery(
      "settings",
      updateData,
      "user_id = $1",
      [userId],
      "id, user_id, display_lines, font_size, font_family, theme, show_background, background_color, text_color, highlight_color, auto_scroll, scroll_duration, enable_animation, created_at, updated_at"
    );

    const result = await queryOne(text, params);

    if (!result) {
      throw createNotFoundError("Settings", userId);
    }

    const updatedSettings = rowToSettings(result);

    return {
      id: updatedSettings.id,
      userId: updatedSettings.user_id,
      displaySettings: settingsToDisplaySettings(updatedSettings),
      ndiSettings: DEFAULT_NDI_SETTINGS,
      autoReconnect: true,
    };
  }

  // Return existing if no changes
  return {
    id: settings.id,
    userId: settings.user_id,
    displaySettings: settingsToDisplaySettings(settings),
    ndiSettings: DEFAULT_NDI_SETTINGS,
    autoReconnect: true,
  };
}

/**
 * Reset settings to default
 */
export async function resetSettings(userId: string): Promise<UserSettings> {
  // Delete existing settings
  await query(
    `DELETE FROM settings WHERE user_id = $1`,
    [userId]
  );

  // Create new default settings
  return createDefaultSettings(userId);
}

/**
 * Delete settings
 */
export async function deleteSettings(userId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM settings WHERE user_id = $1`,
    [userId]
  );

  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate theme value
 */
export function isValidTheme(theme: string): theme is "light" | "dark" | "transparent" {
  return ["light", "dark", "transparent"].includes(theme);
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string | null): boolean {
  if (color === null) return true;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate display settings
 */
export function validateDisplaySettings(settings: Partial<DisplaySettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.displayLines !== undefined) {
    if (settings.displayLines < 1 || settings.displayLines > 10) {
      errors.push("displayLines must be between 1 and 10");
    }
  }

  if (settings.fontSize !== undefined) {
    if (settings.fontSize < 12 || settings.fontSize > 72) {
      errors.push("fontSize must be between 12 and 72");
    }
  }

  if (settings.theme !== undefined && !isValidTheme(settings.theme)) {
    errors.push("theme must be 'light', 'dark', or 'transparent'");
  }

  if (settings.backgroundColor !== undefined && !isValidHexColor(settings.backgroundColor)) {
    errors.push("backgroundColor must be a valid hex color (e.g., #000000)");
  }

  if (settings.textColor !== undefined && !isValidHexColor(settings.textColor)) {
    errors.push("textColor must be a valid hex color (e.g., #ffffff)");
  }

  if (settings.highlightColor !== undefined && !isValidHexColor(settings.highlightColor)) {
    errors.push("highlightColor must be a valid hex color (e.g., #0ea5e9)");
  }

  if (settings.scrollDuration !== undefined) {
    if (settings.scrollDuration < 100 || settings.scrollDuration > 1000) {
      errors.push("scrollDuration must be between 100 and 1000");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
