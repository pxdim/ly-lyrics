import { NextRequest, NextResponse } from "next/server";
import {
  getSettingsByUserId,
  updateSettings,
  resetSettings,
} from "@/lib/services/settingsService";
import { createErrorResponse } from "../_errors";
import { getUserId } from "@/lib/auth/session";
import { z } from "zod";

// Validation schema for settings update
const updateSettingsSchema = z.object({
  displaySettings: z.object({
    displayLines: z.number().min(1).max(10).optional(),
    fontSize: z.number().min(12).max(72).optional(),
    fontFamily: z.string().optional(),
    theme: z.enum(["light", "dark", "transparent"]).optional(),
    showBackground: z.boolean().optional(),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    autoScroll: z.boolean().optional(),
    scrollDuration: z.number().min(100).max(1000).optional(),
    enableAnimation: z.boolean().optional(),
  }).optional(),
  autoReconnect: z.boolean().optional(),
});

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const userId = await getUserId();
    const settings = await getSettingsByUserId(userId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error in GET /api/settings:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to fetch settings", 500);
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const bodyResult = updateSettingsSchema.safeParse(body);

    if (!bodyResult.success) {
      return createErrorResponse(
        "SETTINGS_INVALID_FORMAT",
        bodyResult.error.issues[0]?.message || "Invalid request body",
        400,
        { issues: bodyResult.error.issues }
      );
    }

    const userId = await getUserId();

    // 組建更新資料，只包含有值的欄位（避免 exactOptionalPropertyTypes 衝突）
    const updateData: Parameters<typeof updateSettings>[1] = {};
    if (bodyResult.data.displaySettings) {
      const ds = bodyResult.data.displaySettings;
      const displaySettings: Partial<import("@/lib/services/settingsService").DisplaySettings> = {};
      if (ds.displayLines !== undefined) displaySettings.displayLines = ds.displayLines;
      if (ds.fontSize !== undefined) displaySettings.fontSize = ds.fontSize;
      if (ds.fontFamily !== undefined) displaySettings.fontFamily = ds.fontFamily;
      if (ds.theme !== undefined) displaySettings.theme = ds.theme;
      if (ds.showBackground !== undefined) displaySettings.showBackground = ds.showBackground;
      if (ds.backgroundColor !== undefined) displaySettings.backgroundColor = ds.backgroundColor;
      if (ds.textColor !== undefined) displaySettings.textColor = ds.textColor;
      if (ds.highlightColor !== undefined) displaySettings.highlightColor = ds.highlightColor;
      if (ds.autoScroll !== undefined) displaySettings.autoScroll = ds.autoScroll;
      if (ds.scrollDuration !== undefined) displaySettings.scrollDuration = ds.scrollDuration;
      if (ds.enableAnimation !== undefined) displaySettings.enableAnimation = ds.enableAnimation;
      updateData.displaySettings = displaySettings;
    }
    if (bodyResult.data.autoReconnect !== undefined) {
      updateData.autoReconnect = bodyResult.data.autoReconnect;
    }

    const settings = await updateSettings(userId, updateData);

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error in PUT /api/settings:", error);

    if (error instanceof SyntaxError) {
      return createErrorResponse("SETTINGS_INVALID_FORMAT", "Invalid JSON format", 400);
    }

    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to update settings", 500);
  }
}

// POST /api/settings/reset - Reset to default
export async function POST() {
  try {
    const userId = await getUserId();
    const settings = await resetSettings(userId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error in POST /api/settings/reset:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to reset settings", 500);
  }
}
