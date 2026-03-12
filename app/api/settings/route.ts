import { NextRequest, NextResponse } from "next/server";

const DEFAULT_DISPLAY_SETTINGS = {
  displayLines: 4,
  theme: "dark" as const,
  fontSize: 32,
  fontFamily: "Inter",
  showBackground: true,
  backgroundColor: "#000000",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

const userSettings = {
  id: "1",
  userId: "user-1",
  displaySettings: { ...DEFAULT_DISPLAY_SETTINGS },
  ndiSettings: {
    enabled: false,
    width: 1920,
    height: 1080,
    frameRate: 30,
    alphaChannel: true,
  },
  autoReconnect: true,
};

// GET /api/settings - Get user settings
export async function GET() {
  return NextResponse.json(userSettings);
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.displaySettings) {
      userSettings.displaySettings = {
        ...userSettings.displaySettings,
        ...body.displaySettings,
      };
    }

    if (body.ndiSettings) {
      userSettings.ndiSettings = {
        ...userSettings.ndiSettings,
        ...body.ndiSettings,
      };
    }

    return NextResponse.json(userSettings);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

// POST /api/settings/reset - Reset to default
export async function POST() {
  userSettings.displaySettings = { ...DEFAULT_DISPLAY_SETTINGS };
  return NextResponse.json(userSettings.displaySettings);
}
