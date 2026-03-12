/**
 * Song Service
 *
 * Service layer for song CRUD operations using Supabase.
 */

import { createServiceClient } from "../supabase/client";
import type { Database } from "../supabase/types";

type SongRow = Database["public"]["Tables"]["songs"]["Row"];
type SongInsert = Database["public"]["Tables"]["songs"]["Insert"];
type SongUpdate = Database["public"]["Tables"]["songs"]["Update"];

export interface Song {
  id: string;
  title: string;
  artist?: string;
  lyrics: string[];
  lrcTimestamps?: number[];
  language?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSongInput {
  title: string;
  artist?: string;
  lyrics: string[];
  lrcTimestamps?: number[];
  language?: string;
  userId: string;
}

export interface UpdateSongInput {
  title?: string;
  artist?: string;
  lyrics?: string[];
  lrcTimestamps?: number[];
  language?: string;
}

export interface SongListParams {
  limit?: number;
  offset?: number;
  search?: string;
  userId?: string;
}

export interface SongListResult {
  data: Song[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Convert database row to Song model
 */
function rowToSong(row: SongRow): Song {
  const base: Omit<Song, "artist" | "lrcTimestamps" | "language"> = {
    id: row.id,
    title: row.title,
    lyrics: JSON.parse(row.lyrics) as string[],
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Add optional properties conditionally
  const result: Song = { ...base };
  if (row.artist !== null) result.artist = row.artist;
  if (row.lrc_timestamps !== null) {
    result.lrcTimestamps = JSON.parse(row.lrc_timestamps) as number[];
  }
  if (row.language !== null) result.language = row.language;

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

/**
 * Get list of songs with optional filtering and pagination
 */
export async function getSongs(
  params: SongListParams = {}
): Promise<SongListResult> {
  const {
    limit = 20,
    offset = 0,
    search,
    userId = "00000000-0000-0000-0000-000000000001", // Default user for demo (valid UUID)
  } = params;

  const supabase = createServiceClient();

  let query = supabase
    .from("songs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Add search filter if provided
  if (search) {
    query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching songs:", error);
    throw new Error(`Failed to fetch songs: ${error.message}`);
  }

  return {
    data: (data ?? []).map(rowToSong),
    total: count ?? 0,
    limit,
    offset,
  };
}

/**
 * Get a single song by ID
 */
export async function getSongById(id: string): Promise<Song | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("songs")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching song:", error);
    throw new Error(`Failed to fetch song: ${error.message}`);
  }

  return rowToSong(data);
}

/**
 * Create a new song
 */
export async function createSong(input: CreateSongInput): Promise<Song> {
  const supabase = createServiceClient();

  const insertData = songToInsert(input);

  const { data, error } = await supabase
    .from("songs")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating song:", error);
    throw new Error(`Failed to create song: ${error.message}`);
  }

  return rowToSong(data);
}

/**
 * Update an existing song
 */
export async function updateSong(
  id: string,
  input: UpdateSongInput
): Promise<Song | null> {
  const supabase = createServiceClient();

  // Build update object with only provided fields
  const updateData: SongUpdate = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.artist !== undefined) updateData.artist = input.artist ?? null;
  if (input.lyrics !== undefined) updateData.lyrics = JSON.stringify(input.lyrics);
  if (input.lrcTimestamps !== undefined) {
    updateData.lrc_timestamps = JSON.stringify(input.lrcTimestamps);
  }
  if (input.language !== undefined) updateData.language = input.language ?? null;

  const { data, error } = await supabase
    .from("songs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error updating song:", error);
    throw new Error(`Failed to update song: ${error.message}`);
  }

  return rowToSong(data);
}

/**
 * Delete a song
 */
export async function deleteSong(id: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("songs").delete().eq("id", id);

  if (error) {
    console.error("Error deleting song:", error);
    throw new Error(`Failed to delete song: ${error.message}`);
  }

  return true;
}
