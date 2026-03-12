/**
 * Song Service
 *
 * Service layer for song CRUD operations using direct PostgreSQL connection.
 * Replaces Supabase client with self-hosted solution.
 *
 * @module lib/services/songService
 */

import {
  query,
  queryOne,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  isUniqueViolation,
} from "@/lib/db/client";
import type { Song, SongInsert, SongUpdate, ApiSong } from "@/lib/db/types";
import { createPartialSongListParams } from "@/lib/schemas/index";
import { createNotFoundError, isAppError } from "@/lib/errors/AppError";
import { ensureDemoUser } from "./userService";

// Re-export ApiSong as Song for external use
export type { ApiSong as Song };

// ============================================================================
// Types
// ============================================================================

export interface CreateSongInput {
  title: string;
  artist: string | undefined;
  lyrics: string[];
  lrcTimestamps: number[] | undefined;
  language: string | undefined;
  userId: string;
}

export interface UpdateSongInput {
  title: string | undefined;
  artist: string | undefined;
  lyrics: string[] | undefined;
  lrcTimestamps: number[] | undefined;
  language: string | undefined;
}

export interface SongListParams {
  limit: number;
  offset: number;
  search: string | undefined;
  userId: string | undefined;
}

export interface SongListResult {
  data: Song[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Converters
// ============================================================================

/**
 * Convert database row to Song model
 */
function rowToSong(row: any): ApiSong {
  const base: Omit<ApiSong, "artist" | "lrcTimestamps" | "language"> = {
    id: row.id,
    title: row.title,
    lyrics: JSON.parse(row.lyrics) as string[],
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Add optional properties conditionally
  const result: ApiSong = { ...base };
  if (row.artist !== null) result.artist = row.artist;
  if (row.lrc_timestamps !== null) {
    result.lrcTimestamps = JSON.parse(row.lrc_timestamps) as number[];
  }
  if (row.language !== null) result.language = row.language;
  if (row.lrc_content !== null) result.lrc_content = row.lrc_content;

  return result;
}

/**
 * Convert Song model to database insert format
 */
function songToInsert(input: CreateSongInput): SongInsert {
  return {
    title: input.title,
    artist: input.artist ?? null,
    lyrics: JSON.stringify(input.lyrics),
    lrc_timestamps: input.lrcTimestamps
      ? JSON.stringify(input.lrcTimestamps)
      : null,
    language: input.language ?? null,
    user_id: input.userId,
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get list of songs with optional filtering and pagination
 */
export async function getSongs(
  params?: Partial<SongListParams>
): Promise<SongListResult> {
  const fullParams = createPartialSongListParams(params ?? {});
  const { limit, offset, search, userId } = fullParams;

  // Use default user ID if not provided
  const effectiveUserId = userId ?? "00000000-0000-0000-0000-000000000001";

  // Build query parts
  let whereClause = "WHERE user_id = $1";
  let queryParams: unknown[] = [effectiveUserId];
  let paramIndex = 2;

  // Add search filter if provided
  if (search && search.trim()) {
    whereClause += ` AND (title ILIKE $${paramIndex} OR artist ILIKE $${paramIndex + 1})`;
    queryParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
    paramIndex += 2;
  }

  // Count total
  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM songs ${whereClause}`,
    queryParams
  );

  // Get paginated data
  const dataResult = await query(
    `SELECT * FROM songs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    data: dataResult.rows.map(rowToSong),
    total: parseInt(countResult?.count ?? "0", 10),
    limit,
    offset,
  };
}

/**
 * Get a single song by ID
 */
export async function getSongById(id: string): Promise<ApiSong | null> {
  const result = await queryOne(`SELECT * FROM songs WHERE id = $1`, [id]);

  if (!result) {
    return null;
  }

  return rowToSong(result);
}

/**
 * Create a new song
 */
export async function createSong(input: CreateSongInput): Promise<Song> {
  // Ensure user exists (for demo user)
  await ensureDemoUser();

  const insertData = songToInsert(input);
  const { text, params } = buildInsertQuery("songs", insertData, "id, title, artist, lyrics, lrc_timestamps, language, user_id, created_at, updated_at");

  const result = await queryOne(text, params);

  if (!result) {
    throw new Error("Failed to create song");
  }

  return rowToSong(result);
}

/**
 * Update an existing song
 */
export async function updateSong(
  id: string,
  input: UpdateSongInput
): Promise<Song | null> {
  // Build update object with only provided fields
  const updateData: SongUpdate = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.artist !== undefined) updateData.artist = input.artist ?? null;
  if (input.lyrics !== undefined) updateData.lyrics = JSON.stringify(input.lyrics);
  if (input.lrcTimestamps !== undefined) {
    updateData.lrc_timestamps = JSON.stringify(input.lrcTimestamps);
  }
  if (input.language !== undefined) updateData.language = input.language ?? null;

  // Add updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  const { text, params } = buildUpdateQuery(
    "songs",
    updateData,
    "id = $1",
    [id],
    "id, title, artist, lyrics, lrc_timestamps, language, user_id, created_at, updated_at"
  );

  const result = await queryOne(text, params);

  if (!result) {
    return null;
  }

  return rowToSong(result);
}

/**
 * Delete a song
 */
export async function deleteSong(id: string): Promise<boolean> {
  // First check if song exists
  const existing = await getSongById(id);
  if (!existing) {
    throw createNotFoundError("Song", id);
  }

  const { rowCount } = await query("DELETE FROM songs WHERE id = $1", [id]);

  return rowCount > 0;
}

/**
 * Search songs by title or artist
 */
export async function searchSongs(query: string, limit = 20): Promise<Song[]> {
  const effectiveUserId = "00000000-0000-0000-0000-000000000001";

  const result = await query(
    `SELECT * FROM songs
     WHERE user_id = $1
       AND (title ILIKE $2 OR artist ILIKE $2 OR lyrics ILIKE $2)
     ORDER BY
       CASE
         WHEN title ILIKE $2 THEN 1
         WHEN artist ILIKE $2 THEN 2
         ELSE 3
       END,
       title ASC
     LIMIT $3`,
    [effectiveUserId, `%${query}%`, limit]
  );

  return result.rows.map(rowToSong);
}

/**
 * Get songs by playlist ID
 */
export async function getSongsByPlaylistId(
  playlistId: string
): Promise<Song[]> {
  const result = await query(
    `SELECT s.* FROM songs s
     INNER JOIN playlist_songs ps ON s.id = ps.song_id
     WHERE ps.playlist_id = $1
     ORDER BY ps.order_index ASC`,
    [playlistId]
  );

  return result.rows.map(rowToSong);
}
