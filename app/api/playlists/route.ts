import { NextRequest, NextResponse } from "next/server";
import {
  getPlaylists,
  createPlaylist,
} from "@/lib/services/playlistService";
import { createErrorResponse } from "../_errors";
import { getUserId } from "@/lib/auth/session";
import { z } from "zod";

// Validation schema for playlist creation
const createPlaylistSchema = z.object({
  name: z.string().min(1).max(255),
  songIds: z.array(z.string()).optional(),
});

// GET /api/playlists - Get all playlists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "20");
    const offset = Number(searchParams.get("offset") || "0");

    // Get current user ID (falls back to demo user if not authenticated)
    const userId = await getUserId();

    const result = await getPlaylists({
      limit,
      offset,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/playlists:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to fetch playlists", 500);
  }
}

// POST /api/playlists - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const bodyResult = createPlaylistSchema.safeParse(body);

    if (!bodyResult.success) {
      return createErrorResponse(
        "PLAYLIST_INVALID_FORMAT",
        bodyResult.error.issues[0]?.message || "Invalid request body",
        400,
        { issues: bodyResult.error.issues }
      );
    }

    // Get current user ID (falls back to demo user if not authenticated)
    const userId = await getUserId();

    const newPlaylist = await createPlaylist({
      name: bodyResult.data.name,
      songIds: bodyResult.data.songIds,
      userId,
    });

    return NextResponse.json(newPlaylist, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/playlists:", error);

    if (error instanceof SyntaxError) {
      return createErrorResponse("PLAYLIST_INVALID_FORMAT", "Invalid JSON format", 400);
    }

    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to create playlist", 500);
  }
}
