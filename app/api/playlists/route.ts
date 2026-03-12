import { NextRequest, NextResponse } from "next/server";

const playlists = [
  {
    id: "1",
    name: "我的最愛",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    songs: [],
  },
];

// GET /api/playlists - Get all playlists
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || "20");
  const offset = Number(searchParams.get("offset") || "0");

  const total = playlists.length;
  const data = playlists.slice(Number(offset), Number(offset) + Number(limit));

  return NextResponse.json({ data, total, limit, offset });
}

// POST /api/playlists - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newPlaylist = {
      id: crypto.randomUUID(),
      name: body.name,
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      songs:
        body.songIds?.map((songId: string, orderIndex: number) => ({
          id: crypto.randomUUID(),
          playlistId: crypto.randomUUID(),
          songId,
          orderIndex,
        })) ?? [],
    };

    playlists.push(newPlaylist);
    return NextResponse.json(newPlaylist, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
