import { NextRequest, NextResponse } from "next/server";
import {
  getSongById,
  updateSong,
  deleteSong,
  type UpdateSongInput,
} from "@/lib/services/songService";

// GET /api/songs/[id] - Get a specific song
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await getSongById(id);

    if (!song) {
      return NextResponse.json(
        { error: `Song with id "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error("Error in GET /api/songs/[id]:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch song",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/songs/[id] - Update a song
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate lyrics if provided
    if (body.lyrics !== undefined && !Array.isArray(body.lyrics)) {
      return NextResponse.json(
        { error: "Lyrics must be an array of strings" },
        { status: 400 }
      );
    }

    const input: UpdateSongInput = {
      title: body.title,
      artist: body.artist,
      lyrics: body.lyrics,
      lrcTimestamps: body.lrcTimestamps,
      language: body.language,
    };

    const updatedSong = await updateSong(id, input);

    if (!updatedSong) {
      return NextResponse.json(
        { error: `Song with id "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSong);
  } catch (error) {
    console.error("Error in PUT /api/songs/[id]:", error);
    return NextResponse.json(
      {
        error: "Failed to update song",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/songs/[id] - Delete a song
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First check if song exists
    const existing = await getSongById(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Song with id "${id}" not found` },
        { status: 404 }
      );
    }

    await deleteSong(id);

    return NextResponse.json({ success: true, deletedSong: existing });
  } catch (error) {
    console.error("Error in DELETE /api/songs/[id]:", error);
    return NextResponse.json(
      {
        error: "Failed to delete song",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
