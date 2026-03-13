/**
 * Zod Validation Schemas
 *
 * Centralized validation schemas for API requests and responses.
 * Ensures type safety and data integrity across the application.
 */

import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Pagination params
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Search params
 */
export const searchParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  userId: z.string().uuid().optional(),
});

/**
 * Song ID params
 */
export const songIdSchema = z
  .object({
    id: z.string().uuid("Invalid song ID format"),
  })
  .passthrough();

// ============================================================================
// Song Schemas
// ============================================================================

/**
 * Create song input schema
 */
export const createSongSchema = z.object({
  title: z.string().trim().min(1).max(255),
  artist: z.string().trim().max(255).optional(),
  lyrics: z.array(z.string().trim()).min(1, "At least one lyric line is required"),
  lrcTimestamps: z.array(z.number().nonnegative()).optional(),
  language: z.string().length(2).optional(),
  userId: z.string().uuid().optional(),
});

/**
 * Update song input schema
 */
export const updateSongSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    artist: z.string().trim().max(255).optional(),
    lyrics: z.array(z.string().trim()).min(1).optional(),
    lrcTimestamps: z.array(z.number().nonnegative()).optional(),
    language: z.string().length(2).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Song list query params
 */
export const songListParamsSchema = paginationSchema.merge(searchParamsSchema);

/**
 * Song response schema
 */
export const songResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string().nullable(),
  lyrics: z.array(z.string()),
  lrcTimestamps: z.array(z.number()).nullable(),
  language: z.string().nullable(),
  userId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Song list response schema
 */
export const songListResponseSchema = z.object({
  data: z.array(songResponseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

// ============================================================================
// Playlist Schemas
// ============================================================================

/**
 * Create playlist input schema
 */
export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1).max(255),
  songIds: z.array(z.string().uuid()).min(1),
  userId: z.string().uuid().optional(),
});

/**
 * Update playlist input schema
 */
export const updatePlaylistSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  songIds: z.array(z.string().uuid()).optional(),
});

/**
 * Playlist response schema
 */
export const playlistResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  songIds: z.array(z.string().uuid()),
  userId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Settings Schemas
// ============================================================================

/**
 * Display settings update schema
 */
export const updateDisplaySettingsSchema = z.object({
  displayLines: z.number().int().min(1).max(10).optional(),
  fontSize: z.number().int().min(12).max(72).optional(),
  fontFamily: z.string().optional(),
  theme: z.enum(["light", "dark", "transparent"]).optional(),
  showBackground: z.boolean().optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
  highlightColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
  autoScroll: z.boolean().optional(),
  scrollDuration: z.number().int().min(100).max(1000).optional(),
  enableAnimation: z.boolean().optional(),
})
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one setting must be provided",
  });

// ============================================================================
// WebSocket Schemas
// ============================================================================

/**
 * Join session input schema
 */
export const joinSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  role: z.enum(["controller", "display", "admin"], {
    message: "Role must be controller, display, or admin",
  }),
  userId: z.string().uuid().optional(),
});

/**
 * Change line input schema
 */
export const changeLineSchema = z.object({
  lineIndex: z.number().int().min(0, "Line index must be non-negative"),
});

/**
 * Set song input schema
 */
export const setSongSchema = z.object({
  songId: z.string().uuid("Invalid song ID format"),
});

/**
 * Set playing state input schema
 */
export const setPlayingSchema = z.object({
  isPlaying: z.boolean(),
});

// ============================================================================
// Error Schemas
// ============================================================================

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  timestamp: z.number(),
});

// ============================================================================
// Type Exports
// ============================================================================

// Explicit types for exactOptionalPropertyTypes compatibility
// With exactOptionalPropertyTypes: true, we use | undefined instead of ?

// SongListParams - limit and offset have defaults in Zod, so they're always numbers
export type SongListParams = {
  limit: number;
  offset: number;
  search: string | undefined;
  userId: string | undefined;
};

// These types match the Zod schemas with optional properties as | undefined
export type CreateSongInput = {
  title: string;
  artist: string | undefined;
  lyrics: string[];
  lrcTimestamps: number[] | undefined;
  language: string | undefined;
  userId: string;
};

export type UpdateSongInput = {
  title: string | undefined;
  artist: string | undefined;
  lyrics: string[] | undefined;
  lrcTimestamps: number[] | undefined;
  language: string | undefined;
};

// ============================================================================
// Helper Functions for exactOptionalPropertyTypes Compatibility
// ============================================================================

/**
 * Convert Zod output to strict type with all optional properties present
 * This is needed for exactOptionalPropertyTypes: true compatibility
 */
export function toSongListParams(
  data: z.infer<typeof songListParamsSchema>
): SongListParams {
  return {
    limit: data.limit,
    offset: data.offset,
    search: data.search ?? undefined,
    userId: data.userId ?? undefined,
  };
}

export function toCreateSongInput(
  data: z.infer<typeof createSongSchema>
): CreateSongInput {
  return {
    title: data.title,
    lyrics: data.lyrics,
    userId: data.userId ?? "",
    artist: data.artist ?? undefined,
    lrcTimestamps: data.lrcTimestamps ?? undefined,
    language: data.language ?? undefined,
  };
}

export function toUpdateSongInput(
  data: z.infer<typeof updateSongSchema>
): UpdateSongInput {
  return {
    title: data.title ?? undefined,
    artist: data.artist ?? undefined,
    lyrics: data.lyrics ?? undefined,
    lrcTimestamps: data.lrcTimestamps ?? undefined,
    language: data.language ?? undefined,
  };
}

export function createPartialSongListParams(
  partial: Partial<SongListParams>
): SongListParams {
  return {
    limit: partial.limit ?? 20,
    offset: partial.offset ?? 0,
    search: partial.search ?? undefined,
    userId: partial.userId ?? undefined,
  };
}
export type SongResponse = z.infer<typeof songResponseSchema>;
export type SongListResponse = z.infer<typeof songListResponseSchema>;
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type UpdateDisplaySettingsInput = z.infer<typeof updateDisplaySettingsSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type ChangeLineInput = z.infer<typeof changeLineSchema>;
export type SetSongInput = z.infer<typeof setSongSchema>;
export type SetPlayingInput = z.infer<typeof setPlayingSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
