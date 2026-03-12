/**
 * Database Type Definitions
 *
 * TypeScript types matching the PostgreSQL schema.
 * Replaces Supabase generated types.
 *
 * @module lib/db/types
 */

// ============================================================================
// Table Row Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  lyrics: string; // JSON stringified array
  lrc_timestamps: string | null; // JSON stringified array
  lrc_content: LrcLine[] | null; // Parsed LRC content
  language: string | null; // ISO 639-1 code
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  order_index: number;
  added_at: Date;
}

export interface Settings {
  id: string;
  user_id: string;
  display_lines: number;
  font_size: number;
  font_family: string;
  theme: "light" | "dark" | "transparent";
  show_background: boolean;
  background_color: string | null;
  text_color: string | null;
  highlight_color: string | null;
  auto_scroll: boolean;
  scroll_duration: number;
  enable_animation: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

// ============================================================================
// Insert Types
// ============================================================================

export interface UserInsert {
  id?: string;
  email: string;
  password_hash: string;
  name?: string | null;
  email_verified?: boolean;
}

export interface SongInsert {
  id?: string;
  title: string;
  artist?: string | null;
  lyrics: string; // JSON stringified
  lrc_timestamps?: string | null; // JSON stringified
  lrc_content?: LrcLine[] | null;
  language?: string | null;
  user_id: string;
}

export interface PlaylistInsert {
  id?: string;
  name: string;
  description?: string | null;
  user_id: string;
}

export interface PlaylistSongInsert {
  id?: string;
  playlist_id: string;
  song_id: string;
  order_index: number;
}

export interface SettingsInsert {
  id?: string;
  user_id: string;
  display_lines?: number;
  font_size?: number;
  font_family?: string;
  theme?: "light" | "dark" | "transparent";
  show_background?: boolean;
  background_color?: string | null;
  text_color?: string | null;
  highlight_color?: string | null;
  auto_scroll?: boolean;
  scroll_duration?: number;
  enable_animation?: boolean;
}

// ============================================================================
// Update Types
// ============================================================================

export interface UserUpdate {
  email?: string;
  password_hash?: string;
  name?: string | null;
  email_verified?: boolean;
}

export interface SongUpdate {
  title?: string;
  artist?: string | null;
  lyrics?: string;
  lrc_timestamps?: string | null;
  lrc_content?: LrcLine[] | null;
  language?: string | null;
}

export interface PlaylistUpdate {
  name?: string;
  description?: string | null;
}

export interface PlaylistSongUpdate {
  order_index?: number;
}

export interface SettingsUpdate {
  display_lines?: number;
  font_size?: number;
  font_family?: string;
  theme?: "light" | "dark" | "transparent";
  show_background?: boolean;
  background_color?: string | null;
  text_color?: string | null;
  highlight_color?: string | null;
  auto_scroll?: boolean;
  scroll_duration?: number;
  enable_animation?: boolean;
}

// ============================================================================
// LRC Types
// ============================================================================

export interface LrcLine {
  time: number; // Milliseconds from start
  text: string;
}

export interface LrcFile {
  lines: LrcLine[];
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    offset?: number; // Offset in milliseconds
  };
}

// ============================================================================
// Join Types (for Views)
// ============================================================================

export interface SongWithUser extends Song {
  user_name: string;
  user_email: string;
}

export interface PlaylistWithCounts extends Playlist {
  song_count: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SongListResult {
  data: Song[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlaylistListResult {
  data: PlaylistWithCounts[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Convert database row to API model
 */
export type RowToSong<T extends Song> = Omit<T, "lyrics" | "lrc_timestamps"> & {
  lyrics: string[];
  lrc_timestamps: number[];
};

/**
 * Convert database row to API model with user info
 */
export type RowToSongWithUser<T extends SongWithUser> = Omit<
  T,
  "lyrics" | "lrc_timestamps"
> & {
  lyrics: string[];
  lrc_timestamps: number[];
};

/**
 * Convert database row to API model with playlist
 */
export type RowToPlaylistWithSongs<T extends PlaylistWithCounts> = Omit<T, "song_count"> & {
  songs?: Song[];
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object is a valid User
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "email" in obj &&
    "password_hash" in obj
  );
}

/**
 * Check if an object is a valid Song
 */
export function isSong(obj: unknown): obj is Song {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "title" in obj &&
    "lyrics" in obj &&
    "user_id" in obj
  );
}
