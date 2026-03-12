import { NextRequest, NextResponse } from "next/server";
import {
  getSongById,
  updateSong,
  deleteSong,
} from "@/lib/services/songService";
import { createErrorResponse, ErrorResponses } from "../../_errors";
import {
  songIdSchema,
  updateSongSchema,
  toUpdateSongInput,
} from "@/lib/schemas";

// GET /api/songs/[id] - Get a specific song
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate song ID
    const idResult = songIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "SONG_INVALID_FORMAT",
        "Invalid song ID format",
        400
      );
    }

    const song = await getSongById(idResult.data.id);

    if (!song) {
      return ErrorResponses.notFound("歌曲", idResult.data.id);
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error("Error in GET /api/songs/[id]:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to fetch song", 500);
  }
}

// PUT /api/songs/[id] - Update a song
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate song ID
    const idResult = songIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "SONG_INVALID_FORMAT",
        "Invalid song ID format",
        400
      );
    }

    const body = await request.json();

    // Validate update data
    const bodyResult = updateSongSchema.safeParse(body);
    if (!bodyResult.success) {
      return createErrorResponse(
        "SONG_INVALID_FORMAT",
        bodyResult.error.issues[0]?.message || "Invalid update data",
        400,
        { issues: bodyResult.error.issues }
      );
    }

    const updatedSong = await updateSong(idResult.data.id, toUpdateSongInput(bodyResult.data));

    if (!updatedSong) {
      return ErrorResponses.notFound("歌曲", idResult.data.id);
    }

    return NextResponse.json(updatedSong);
  } catch (error) {
    console.error("Error in PUT /api/songs/[id]:", error);

    if (error instanceof SyntaxError) {
      return createErrorResponse("SONG_INVALID_FORMAT", "Invalid JSON format", 400);
    }

    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to update song", 500);
  }
}

// DELETE /api/songs/[id] - Delete a song
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate song ID
    const idResult = songIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "SONG_INVALID_FORMAT",
        "Invalid song ID format",
        400
      );
    }

    // First check if song exists
    const existing = await getSongById(idResult.data.id);
    if (!existing) {
      return ErrorResponses.notFound("歌曲", idResult.data.id);
    }

    await deleteSong(idResult.data.id);

    return NextResponse.json({ success: true, deletedSong: existing });
  } catch (error) {
    console.error("Error in DELETE /api/songs/[id]:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to delete song", 500);
  }
}
