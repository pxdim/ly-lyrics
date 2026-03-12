/**
 * Playlist Service
 *
 * Service layer for playlist CRUD operations using direct PostgreSQL connection.
 * Replaces Supabase client with self-hosted solution.
 *
 * @module lib/services/playlistService
 */

import {
  query,
  queryOne,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  isUniqueViolation,
} from "@/lib/db/client";
import type { Playlist, PlaylistInsert, PlaylistUpdate, PlaylistSong, PlaylistSongInsert } from "@/lib/db/types";
import { createNotFoundError, isAppError } from "@/lib/errors/AppError";
import { ensureDemoUser } from "./userService";
import type { Song } from "./songService";

// ============================================================================
// Types
// ============================================================================

export interface CreatePlaylistInput {
  name: string;
  songIds?: string[];
  userId: string;
}

export interface UpdatePlaylistInput {
  name?: string;
}

export interface PlaylistListParams {
  limit: number;
  offset: number;
  userId: string | undefined;
}

export interface PlaylistListResult {
  data: PlaylistWithSongs[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlaylistWithSongs extends Playlist {
  songs: Song[];
  songCount: number;
}

export interface AddSongInput {
  playlistId: string;
  songId: string;
  orderIndex?: number;
}

export interface ReorderSongsInput {
  playlistId: string;
  songIds: string[]; // New order of song IDs
}

// ============================================================================
// Converters
// ============================================================================

/**
 * Convert database row to Playlist model
 */
function rowToPlaylist(row: any): Playlist {
  return {
    id: row.id,
    name: row.name,
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert database row to PlaylistSong model
 */
function rowToPlaylistSong(row: any): PlaylistSong {
  return {
    id: row.id,
    playlist_id: row.playlist_id,
    song_id: row.song_id,
    order_index: row.order_index,
  };
}

/**
 * Convert Playlist model to database insert format
 */
function playlistToInsert(input: CreatePlaylistInput): PlaylistInsert {
  return {
    name: input.name,
    user_id: input.userId,
  };
}

/**
 * Convert AddSongInput to database insert format
 */
function addSongToInsert(input: AddSongInput): PlaylistSongInsert {
  return {
    playlist_id: input.playlistId,
    song_id: input.songId,
    order_index: input.orderIndex ?? 0,
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get list of playlists with optional filtering and pagination
 */
export async function getPlaylists(
  params?: Partial<PlaylistListParams>
): Promise<PlaylistListResult> {
  const { limit = 20, offset = 0, userId } = params ?? {};

  // Use default user ID if not provided
  const effectiveUserId = userId ?? "00000000-0000-0000-0000-000000000001";

  // Count total
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM playlists WHERE user_id = $1`,
    [effectiveUserId]
  );

  // Get paginated data
  const dataResult = await query(
    `SELECT * FROM playlists
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [effectiveUserId, limit, offset]
  );

  const playlists = dataResult.rows.map(rowToPlaylist);

  // Get songs for each playlist
  const playlistsWithSongs: PlaylistWithSongs[] = await Promise.all(
    playlists.map(async (playlist) => {
      const songs = await getSongsByPlaylistId(playlist.id);
      return {
        ...playlist,
        songs,
        songCount: songs.length,
      };
    })
  );

  return {
    data: playlistsWithSongs,
    total: parseInt(countResult?.count ?? "0", 10),
    limit,
    offset,
  };
}

/**
 * Get a single playlist by ID with songs
 */
export async function getPlaylistById(id: string): Promise<PlaylistWithSongs | null> {
  const result = await queryOne(`SELECT * FROM playlists WHERE id = $1`, [id]);

  if (!result) {
    return null;
  }

  const playlist = rowToPlaylist(result);
  const songs = await getSongsByPlaylistId(id);

  return {
    ...playlist,
    songs,
    songCount: songs.length,
  };
}

/**
 * Create a new playlist
 */
export async function createPlaylist(input: CreatePlaylistInput): Promise<PlaylistWithSongs> {
  // Ensure user exists (for demo user)
  await ensureDemoUser();

  const insertData = playlistToInsert(input);
  const { text, params } = buildInsertQuery(
    "playlists",
    insertData,
    "id, name, user_id, created_at, updated_at"
  );

  const result = await queryOne(text, params);

  if (!result) {
    throw new Error("Failed to create playlist");
  }

  const playlist = rowToPlaylist(result);

  // Add songs if provided
  if (input.songIds && input.songIds.length > 0) {
    for (let i = 0; i < input.songIds.length; i++) {
      await addSongToPlaylist({
        playlistId: playlist.id,
        songId: input.songIds[i],
        orderIndex: i,
      });
    }
  }

  return getPlaylistById(playlist.id) as Promise<PlaylistWithSongs>;
}

/**
 * Update an existing playlist
 */
export async function updatePlaylist(
  id: string,
  input: UpdatePlaylistInput
): Promise<PlaylistWithSongs | null> {
  // Build update object with only provided fields
  const updateData: PlaylistUpdate = {};
  if (input.name !== undefined) updateData.name = input.name;

  // Add updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  const { text, params } = buildUpdateQuery(
    "playlists",
    updateData,
    "id = $1",
    [id],
    "id, name, user_id, created_at, updated_at"
  );

  const result = await queryOne(text, params);

  if (!result) {
    return null;
  }

  return getPlaylistById(id);
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(id: string): Promise<boolean> {
  // First check if playlist exists
  const existing = await queryOne(`SELECT * FROM playlists WHERE id = $1`, [id]);
  if (!existing) {
    throw createNotFoundError("Playlist", id);
  }

  const { rowCount } = await query("DELETE FROM playlists WHERE id = $1", [id]);

  return rowCount > 0;
}

// ============================================================================
// Song Management Operations
// ============================================================================

/**
 * Get songs by playlist ID
 */
export async function getSongsByPlaylistId(playlistId: string): Promise<Song[]> {
  const { rowToSong: songRowToSong } = await import("./songService");

  const result = await query(
    `SELECT s.* FROM songs s
     INNER JOIN playlist_songs ps ON s.id = ps.song_id
     WHERE ps.playlist_id = $1
     ORDER BY ps.order_index ASC`,
    [playlistId]
  );

  return result.rows.map(songRowToSong);
}

/**
 * Add a song to a playlist
 */
export async function addSongToPlaylist(input: AddSongInput): Promise<PlaylistSong> {
  // If orderIndex is not provided, append to the end
  let orderIndex = input.orderIndex;
  if (orderIndex === undefined) {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = $1`,
      [input.playlistId]
    );
    orderIndex = parseInt(countResult?.count ?? "0", 10);
  }

  const insertData: PlaylistSongInsert = {
    playlist_id: input.playlistId,
    song_id: input.songId,
    order_index: orderIndex,
  };

  const { text, params } = buildInsertQuery(
    "playlist_songs",
    insertData,
    "id, playlist_id, song_id, order_index"
  );

  const result = await queryOne(text, params);

  if (!result) {
    throw new Error("Failed to add song to playlist");
  }

  return rowToPlaylistSong(result);
}

/**
 * Remove a song from a playlist
 */
export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string
): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2`,
    [playlistId, songId]
  );

  // Reorder remaining songs
  if (rowCount > 0) {
    await reorderRemainingSongs(playlistId);
  }

  return rowCount > 0;
}

/**
 * Reorder songs in a playlist
 */
export async function reorderPlaylistSongs(input: ReorderSongsInput): Promise<void> {
  const { playlistId, songIds } = input;

  // Use transaction for atomic updates
  await query(async (client) => {
    for (let i = 0; i < songIds.length; i++) {
      await client.query(
        `UPDATE playlist_songs SET order_index = $1
         WHERE playlist_id = $2 AND song_id = $3`,
        [i, playlistId, songIds[i]]
      );
    }
  });
}

/**
 * Reorder remaining songs after deletion
 */
async function reorderRemainingSongs(playlistId: string): Promise<void> {
  await query(
    `WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY order_index ASC) - 1 as new_order
      FROM playlist_songs
      WHERE playlist_id = $1
    )
    UPDATE playlist_songs ps
    SET order_index = o.new_order
    FROM ordered o
    WHERE ps.id = o.id`,
    [playlistId]
  );
}

/**
 * Get playlist by song ID
 */
export async function getPlaylistsBySongId(songId: string): Promise<Playlist[]> {
  const result = await query(
    `SELECT p.* FROM playlists p
     INNER JOIN playlist_songs ps ON p.id = ps.playlist_id
     WHERE ps.song_id = $1
     ORDER BY p.created_at DESC`,
    [songId]
  );

  return result.rows.map(rowToPlaylist);
}
