import { NextRequest, NextResponse } from "next/server";
import {
  getSongs,
  createSong,
  type CreateSongInput,
} from "@/lib/services/songService";

// GET /api/songs - Get all songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "20");
    const offset = Number(searchParams.get("offset") || "0");
    const searchValue = searchParams.get("search");
    const userIdValue = searchParams.get("userId");

    // Build params object conditionally
    const params: { limit: number; offset: number; search?: string; userId?: string } = {
      limit,
      offset,
    };
    if (searchValue) params.search = searchValue;
    if (userIdValue) params.userId = userIdValue;

    const result = await getSongs(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/songs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch songs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/songs - Create a new song
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!body.lyrics || !Array.isArray(body.lyrics)) {
      return NextResponse.json(
        { error: "Lyrics must be an array of strings" },
        { status: 400 }
      );
    }

    const input: CreateSongInput = {
      title: body.title,
      artist: body.artist,
      lyrics: body.lyrics,
      lrcTimestamps: body.lrcTimestamps,
      language: body.language,
      userId: body.userId || "user-1", // Default user for demo
    };

    const newSong = await createSong(input);

    return NextResponse.json(newSong, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/songs:", error);
    return NextResponse.json(
      {
        error: "Failed to create song",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
