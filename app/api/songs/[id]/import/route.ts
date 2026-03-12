/**
 * Import LRC API Route
 *
 * Import LRC file content and update a song's lyrics and timestamps.
 *
 * @module app/api/songs/[id]/import/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSongById, updateSong } from "@/lib/services/songService";
import { parseLRC, lrcLinesToLyrics, lrcLinesToTimestamps, isValidLRC } from "@/lib/lrc/parser";
import { createErrorResponse } from "@/lib/errors/AppError";
import { requireAuth } from "@/lib/auth/session";

// ============================================================================
// Route Handler
// ============================================================================

interface ImportRequestBody {
  lrcContent: string;
}

/**
 * POST /api/songs/[id]/import - Import LRC content to a song
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await requireAuth();

    const { id } = await params;

    // Check if song exists
    const song = await getSongById(id);

    if (!song) {
      return createErrorResponse("SONG_NOT_FOUND", "Song not found", 404);
    }

    // Parse request body
    const body = (await request.json()) as ImportRequestBody;

    if (!body.lrcContent || typeof body.lrcContent !== "string") {
      return createErrorResponse(
        "LRC_INVALID_CONTENT",
        "LRC content is required",
        400
      );
    }

    // Validate LRC content
    if (!isValidLRC(body.lrcContent)) {
      return createErrorResponse(
        "LRC_INVALID_FORMAT",
        "Invalid LRC format",
        400
      );
    }

    // Parse LRC content
    const lrcFile = parseLRC(body.lrcContent);

    // Convert to lyrics and timestamps
    const lyrics = lrcLinesToLyrics(lrcFile.lines);
    const timestamps = lrcLinesToTimestamps(lrcFile.lines);

    // Update song with imported lyrics
    const updatedSong = await updateSong(id, {
      title: undefined,
      artist: undefined,
      lyrics,
      lrcTimestamps: timestamps,
      language: undefined,
    });

    if (!updatedSong) {
      return createErrorResponse("SONG_UPDATE_FAILED", "Failed to update song", 500);
    }

    return NextResponse.json({
      success: true,
      song: updatedSong,
      metadata: lrcFile.metadata,
      linesImported: lrcFile.lines.length,
    });
  } catch (error) {
    console.error("Error in POST /api/songs/[id]/import:", error);

    if (error instanceof SyntaxError) {
      return createErrorResponse("LRC_INVALID_JSON", "Invalid JSON format", 400);
    }

    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to import LRC", 500);
  }
}
