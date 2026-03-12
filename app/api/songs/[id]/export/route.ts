/**
 * Export LRC API Route
 *
 * Export a song's lyrics and timestamps as LRC file content.
 *
 * @module app/api/songs/[id]/export/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSongById } from "@/lib/services/songService";
import { toLrcLines, serializeLRC, msToTimeTag } from "@/lib/lrc/parser";
import { createErrorResponse } from "@/lib/errors/AppError";

// ============================================================================
// Route Handler
// ============================================================================

/**
 * GET /api/songs/[id]/export - Export song as LRC file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get song
    const song = await getSongById(id);

    if (!song) {
      return createErrorResponse("SONG_NOT_FOUND", "Song not found", 404);
    }

    // Convert to LRC lines
    const lrcLines = toLrcLines(
      song.lyrics,
      song.lrcTimestamps
    );

    // Create LRC file with metadata
    const lrcFile = {
      metadata: {
        title: song.title,
        artist: song.artist,
      },
      lines: lrcLines,
    };

    // Serialize to LRC format
    const lrcContent = serializeLRC(lrcFile);

    // Return as downloadable file
    const filename = `${song.title}${song.artist ? ` - ${song.artist}` : ""}.lrc`;

    return new NextResponse(lrcContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/songs/[id]/export:", error);
    return createErrorResponse("SYS_INTERNAL_ERROR", "Failed to export LRC", 500);
  }
}
