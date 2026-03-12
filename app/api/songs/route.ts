import { NextRequest, NextResponse } from "next/server";
import {
  getSongs,
  createSong,
} from "@/lib/services/songService";
import { createErrorResponse } from "../_errors";
import {
  songListParamsSchema,
  createSongSchema,
  toSongListParams,
  toCreateSongInput,
} from "@/lib/schemas";

// GET /api/songs - Get all songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query params using Zod
    const paramsResult = songListParamsSchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      search: searchParams.get("search"),
      userId: searchParams.get("userId"),
    });

    if (!paramsResult.success) {
      return createErrorResponse(
        "SONG_INVALID_FORMAT",
        "Invalid query parameters",
        400,
        { issues: paramsResult.error.issues }
      );
    }

    const result = await getSongs(toSongListParams(paramsResult.data));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/songs:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to fetch songs", 500);
  }
}

// POST /api/songs - Create a new song
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body using Zod
    const bodyResult = createSongSchema.safeParse(body);

    if (!bodyResult.success) {
      return createErrorResponse(
        "SONG_INVALID_FORMAT",
        bodyResult.error.issues[0]?.message || "Invalid request body",
        400,
        { issues: bodyResult.error.issues }
      );
    }

    // Convert to strict type and add default userId if not provided (demo user)
    const input = toCreateSongInput({
      ...bodyResult.data,
      userId: bodyResult.data.userId || "00000000-0000-0000-0000-000000000001",
    });

    const newSong = await createSong(input);

    return NextResponse.json(newSong, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/songs:", error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return createErrorResponse("SONG_INVALID_FORMAT", "Invalid JSON format", 400);
    }

    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to create song", 500);
  }
}
