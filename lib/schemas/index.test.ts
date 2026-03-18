/**
 * Zod Validation Schemas 單元測試
 *
 * 覆蓋範圍：
 * - 所有 schema 的有效輸入 parse 成功
 * - 無效輸入 parse 失敗（缺欄位、錯誤類型、格式錯誤）
 * - 邊界值（空字串、極長字串、特殊字元、min/max 邊界）
 * - Helper 函式（toSongListParams, toCreateSongInput, etc.）
 */

import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  searchParamsSchema,
  songIdSchema,
  createSongSchema,
  updateSongSchema,
  songListParamsSchema,
  songResponseSchema,
  songListResponseSchema,
  createPlaylistSchema,
  updatePlaylistSchema,
  playlistResponseSchema,
  updateDisplaySettingsSchema,
  joinSessionSchema,
  changeLineSchema,
  setSongSchema,
  setPlayingSchema,
  errorResponseSchema,
  toSongListParams,
  toCreateSongInput,
  toUpdateSongInput,
  createPartialSongListParams,
} from "./index";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const INVALID_UUID = "not-a-uuid";

// ============================================================================
// paginationSchema
// ============================================================================

describe("paginationSchema", () => {
  it("parses with defaults when no input", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("accepts valid limit and offset", () => {
    const result = paginationSchema.parse({ limit: 50, offset: 10 });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.parse({ limit: "30", offset: "5" });
    expect(result.limit).toBe(30);
    expect(result.offset).toBe(5);
  });

  it("rejects limit exceeding max 100", () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects limit of 0 (not positive)", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() => paginationSchema.parse({ offset: -1 })).toThrow();
  });

  it("accepts limit at boundary value 1", () => {
    const result = paginationSchema.parse({ limit: 1 });
    expect(result.limit).toBe(1);
  });

  it("accepts limit at boundary value 100", () => {
    const result = paginationSchema.parse({ limit: 100 });
    expect(result.limit).toBe(100);
  });
});

// ============================================================================
// searchParamsSchema
// ============================================================================

describe("searchParamsSchema", () => {
  it("parses empty object", () => {
    const result = searchParamsSchema.parse({});
    expect(result.search).toBeUndefined();
    expect(result.userId).toBeUndefined();
  });

  it("accepts valid search string", () => {
    const result = searchParamsSchema.parse({ search: "Amazing Grace" });
    expect(result.search).toBe("Amazing Grace");
  });

  it("trims search string", () => {
    const result = searchParamsSchema.parse({ search: "  hello  " });
    expect(result.search).toBe("hello");
  });

  it("rejects search exceeding 200 characters", () => {
    const longSearch = "a".repeat(201);
    expect(() => searchParamsSchema.parse({ search: longSearch })).toThrow();
  });

  it("accepts search at exactly 200 characters", () => {
    const exactSearch = "a".repeat(200);
    const result = searchParamsSchema.parse({ search: exactSearch });
    expect(result.search).toBe(exactSearch);
  });

  it("accepts valid UUID userId", () => {
    const result = searchParamsSchema.parse({ userId: VALID_UUID });
    expect(result.userId).toBe(VALID_UUID);
  });

  it("rejects invalid UUID userId", () => {
    expect(() =>
      searchParamsSchema.parse({ userId: INVALID_UUID })
    ).toThrow();
  });
});

// ============================================================================
// songIdSchema
// ============================================================================

describe("songIdSchema", () => {
  it("accepts valid UUID id", () => {
    const result = songIdSchema.parse({ id: VALID_UUID });
    expect(result.id).toBe(VALID_UUID);
  });

  it("rejects invalid UUID id", () => {
    expect(() => songIdSchema.parse({ id: "abc" })).toThrow();
  });

  it("rejects missing id", () => {
    expect(() => songIdSchema.parse({})).toThrow();
  });

  it("passes through additional properties", () => {
    const result = songIdSchema.parse({ id: VALID_UUID, extra: "value" });
    expect((result as Record<string, unknown>)["extra"]).toBe("value");
  });
});

// ============================================================================
// createSongSchema
// ============================================================================

describe("createSongSchema", () => {
  const validInput = {
    title: "Amazing Grace",
    lyrics: ["Amazing grace, how sweet the sound"],
  };

  it("accepts minimal valid input", () => {
    const result = createSongSchema.parse(validInput);
    expect(result.title).toBe("Amazing Grace");
    expect(result.lyrics).toEqual(["Amazing grace, how sweet the sound"]);
  });

  it("accepts all optional fields", () => {
    const result = createSongSchema.parse({
      ...validInput,
      artist: "John Newton",
      lrcTimestamps: [0, 5.2],
      language: "en",
      userId: VALID_UUID,
    });
    expect(result.artist).toBe("John Newton");
    expect(result.lrcTimestamps).toEqual([0, 5.2]);
    expect(result.language).toBe("en");
    expect(result.userId).toBe(VALID_UUID);
  });

  it("trims title whitespace", () => {
    const result = createSongSchema.parse({
      ...validInput,
      title: "  Trimmed  ",
    });
    expect(result.title).toBe("Trimmed");
  });

  it("rejects empty title", () => {
    expect(() =>
      createSongSchema.parse({ title: "", lyrics: ["line"] })
    ).toThrow();
  });

  it("rejects title exceeding 255 characters", () => {
    expect(() =>
      createSongSchema.parse({ title: "a".repeat(256), lyrics: ["line"] })
    ).toThrow();
  });

  it("rejects empty lyrics array", () => {
    expect(() =>
      createSongSchema.parse({ title: "Title", lyrics: [] })
    ).toThrow();
  });

  it("rejects missing lyrics", () => {
    expect(() => createSongSchema.parse({ title: "Title" })).toThrow();
  });

  it("rejects negative lrcTimestamps", () => {
    expect(() =>
      createSongSchema.parse({
        ...validInput,
        lrcTimestamps: [-1],
      })
    ).toThrow();
  });

  it("rejects language not exactly 2 characters", () => {
    expect(() =>
      createSongSchema.parse({ ...validInput, language: "eng" })
    ).toThrow();
    expect(() =>
      createSongSchema.parse({ ...validInput, language: "e" })
    ).toThrow();
  });

  it("accepts language at exactly 2 characters", () => {
    const result = createSongSchema.parse({ ...validInput, language: "zh" });
    expect(result.language).toBe("zh");
  });

  it("rejects invalid userId format", () => {
    expect(() =>
      createSongSchema.parse({ ...validInput, userId: "not-uuid" })
    ).toThrow();
  });
});

// ============================================================================
// updateSongSchema
// ============================================================================

describe("updateSongSchema", () => {
  it("accepts partial update with title only", () => {
    const result = updateSongSchema.parse({ title: "New Title" });
    expect(result.title).toBe("New Title");
  });

  it("accepts partial update with lyrics only", () => {
    const result = updateSongSchema.parse({ lyrics: ["Line 1", "Line 2"] });
    expect(result.lyrics).toEqual(["Line 1", "Line 2"]);
  });

  it("rejects empty object (no fields)", () => {
    expect(() => updateSongSchema.parse({})).toThrow();
  });

  it("rejects empty title (min 1)", () => {
    expect(() => updateSongSchema.parse({ title: "" })).toThrow();
  });

  it("rejects empty lyrics array", () => {
    expect(() => updateSongSchema.parse({ lyrics: [] })).toThrow();
  });
});

// ============================================================================
// songListParamsSchema (merge of pagination + search)
// ============================================================================

describe("songListParamsSchema", () => {
  it("parses with all defaults", () => {
    const result = songListParamsSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.search).toBeUndefined();
    expect(result.userId).toBeUndefined();
  });

  it("accepts all fields", () => {
    const result = songListParamsSchema.parse({
      limit: 50,
      offset: 10,
      search: "grace",
      userId: VALID_UUID,
    });
    expect(result.limit).toBe(50);
    expect(result.search).toBe("grace");
  });
});

// ============================================================================
// songResponseSchema
// ============================================================================

describe("songResponseSchema", () => {
  const validSong = {
    id: VALID_UUID,
    title: "Amazing Grace",
    artist: "John Newton",
    lyrics: ["Line 1"],
    lrcTimestamps: [0],
    language: "en",
    userId: VALID_UUID,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("accepts valid song response", () => {
    const result = songResponseSchema.parse(validSong);
    expect(result.id).toBe(VALID_UUID);
    expect(result.title).toBe("Amazing Grace");
  });

  it("accepts null for nullable fields", () => {
    const result = songResponseSchema.parse({
      ...validSong,
      artist: null,
      lrcTimestamps: null,
      language: null,
    });
    expect(result.artist).toBeNull();
    expect(result.lrcTimestamps).toBeNull();
    expect(result.language).toBeNull();
  });

  it("rejects missing required fields", () => {
    expect(() => songResponseSchema.parse({ id: VALID_UUID })).toThrow();
  });

  it("rejects invalid UUID for id", () => {
    expect(() =>
      songResponseSchema.parse({ ...validSong, id: "bad" })
    ).toThrow();
  });
});

// ============================================================================
// songListResponseSchema
// ============================================================================

describe("songListResponseSchema", () => {
  it("accepts valid list response", () => {
    const result = songListResponseSchema.parse({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("rejects negative total", () => {
    expect(() =>
      songListResponseSchema.parse({
        data: [],
        total: -1,
        limit: 20,
        offset: 0,
      })
    ).toThrow();
  });
});

// ============================================================================
// createPlaylistSchema
// ============================================================================

describe("createPlaylistSchema", () => {
  it("accepts valid playlist input", () => {
    const result = createPlaylistSchema.parse({
      name: "Worship Set",
      songIds: [VALID_UUID],
    });
    expect(result.name).toBe("Worship Set");
    expect(result.songIds).toHaveLength(1);
  });

  it("rejects empty name", () => {
    expect(() =>
      createPlaylistSchema.parse({ name: "", songIds: [VALID_UUID] })
    ).toThrow();
  });

  it("rejects name exceeding 255 characters", () => {
    expect(() =>
      createPlaylistSchema.parse({
        name: "a".repeat(256),
        songIds: [VALID_UUID],
      })
    ).toThrow();
  });

  it("rejects empty songIds array", () => {
    expect(() =>
      createPlaylistSchema.parse({ name: "Set", songIds: [] })
    ).toThrow();
  });

  it("rejects invalid UUID in songIds", () => {
    expect(() =>
      createPlaylistSchema.parse({ name: "Set", songIds: ["not-uuid"] })
    ).toThrow();
  });

  it("trims name whitespace", () => {
    const result = createPlaylistSchema.parse({
      name: "  Trimmed  ",
      songIds: [VALID_UUID],
    });
    expect(result.name).toBe("Trimmed");
  });
});

// ============================================================================
// updatePlaylistSchema
// ============================================================================

describe("updatePlaylistSchema", () => {
  it("accepts name only update", () => {
    const result = updatePlaylistSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("accepts songIds only update", () => {
    const result = updatePlaylistSchema.parse({ songIds: [VALID_UUID] });
    expect(result.songIds).toEqual([VALID_UUID]);
  });

  it("accepts empty object (no refine constraint)", () => {
    const result = updatePlaylistSchema.parse({});
    expect(result).toEqual({});
  });
});

// ============================================================================
// playlistResponseSchema
// ============================================================================

describe("playlistResponseSchema", () => {
  it("accepts valid playlist response", () => {
    const result = playlistResponseSchema.parse({
      id: VALID_UUID,
      name: "Worship Set",
      songIds: [VALID_UUID],
      userId: VALID_UUID,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(result.name).toBe("Worship Set");
  });

  it("rejects missing required fields", () => {
    expect(() =>
      playlistResponseSchema.parse({ id: VALID_UUID })
    ).toThrow();
  });
});

// ============================================================================
// updateDisplaySettingsSchema
// ============================================================================

describe("updateDisplaySettingsSchema", () => {
  it("accepts valid settings update", () => {
    const result = updateDisplaySettingsSchema.parse({
      displayLines: 4,
      fontSize: 24,
      theme: "dark",
    });
    expect(result.displayLines).toBe(4);
    expect(result.theme).toBe("dark");
  });

  it("rejects empty object", () => {
    expect(() => updateDisplaySettingsSchema.parse({})).toThrow();
  });

  it("rejects displayLines below min 1", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ displayLines: 0 })
    ).toThrow();
  });

  it("rejects displayLines above max 10", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ displayLines: 11 })
    ).toThrow();
  });

  it("accepts displayLines at boundary 1", () => {
    const result = updateDisplaySettingsSchema.parse({ displayLines: 1 });
    expect(result.displayLines).toBe(1);
  });

  it("accepts displayLines at boundary 10", () => {
    const result = updateDisplaySettingsSchema.parse({ displayLines: 10 });
    expect(result.displayLines).toBe(10);
  });

  it("rejects fontSize below min 12", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ fontSize: 11 })
    ).toThrow();
  });

  it("rejects fontSize above max 72", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ fontSize: 73 })
    ).toThrow();
  });

  it("rejects invalid theme value", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ theme: "neon" })
    ).toThrow();
  });

  it("accepts all valid theme values", () => {
    for (const theme of ["light", "dark", "transparent"] as const) {
      const result = updateDisplaySettingsSchema.parse({ theme });
      expect(result.theme).toBe(theme);
    }
  });

  it("rejects invalid hex color format for backgroundColor", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ backgroundColor: "red" })
    ).toThrow();
    expect(() =>
      updateDisplaySettingsSchema.parse({ backgroundColor: "#FFF" })
    ).toThrow();
    expect(() =>
      updateDisplaySettingsSchema.parse({ backgroundColor: "#GGGGGG" })
    ).toThrow();
  });

  it("accepts valid hex color format", () => {
    const result = updateDisplaySettingsSchema.parse({
      backgroundColor: "#FF0000",
      textColor: "#00ff00",
      highlightColor: "#0000FF",
    });
    expect(result.backgroundColor).toBe("#FF0000");
    expect(result.textColor).toBe("#00ff00");
  });

  it("rejects scrollDuration below min 100", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ scrollDuration: 99 })
    ).toThrow();
  });

  it("rejects scrollDuration above max 1000", () => {
    expect(() =>
      updateDisplaySettingsSchema.parse({ scrollDuration: 1001 })
    ).toThrow();
  });

  it("accepts boolean fields", () => {
    const result = updateDisplaySettingsSchema.parse({
      showBackground: true,
      autoScroll: false,
      enableAnimation: true,
    });
    expect(result.showBackground).toBe(true);
    expect(result.autoScroll).toBe(false);
  });
});

// ============================================================================
// joinSessionSchema
// ============================================================================

describe("joinSessionSchema", () => {
  it("accepts valid join session input", () => {
    const result = joinSessionSchema.parse({
      sessionId: "ABC123",
      role: "controller",
    });
    expect(result.sessionId).toBe("ABC123");
    expect(result.role).toBe("controller");
  });

  it("accepts all valid roles", () => {
    for (const role of ["controller", "display", "admin"] as const) {
      const result = joinSessionSchema.parse({
        sessionId: "S1",
        role,
      });
      expect(result.role).toBe(role);
    }
  });

  it("rejects invalid role", () => {
    expect(() =>
      joinSessionSchema.parse({ sessionId: "S1", role: "viewer" })
    ).toThrow();
  });

  it("rejects empty sessionId", () => {
    expect(() =>
      joinSessionSchema.parse({ sessionId: "", role: "display" })
    ).toThrow();
  });

  it("accepts optional userId", () => {
    const result = joinSessionSchema.parse({
      sessionId: "S1",
      role: "admin",
      userId: VALID_UUID,
    });
    expect(result.userId).toBe(VALID_UUID);
  });
});

// ============================================================================
// changeLineSchema
// ============================================================================

describe("changeLineSchema", () => {
  it("accepts valid non-negative lineIndex", () => {
    const result = changeLineSchema.parse({ lineIndex: 0 });
    expect(result.lineIndex).toBe(0);
  });

  it("accepts large lineIndex", () => {
    const result = changeLineSchema.parse({ lineIndex: 9999 });
    expect(result.lineIndex).toBe(9999);
  });

  it("rejects negative lineIndex", () => {
    expect(() => changeLineSchema.parse({ lineIndex: -1 })).toThrow();
  });

  it("rejects non-integer lineIndex", () => {
    expect(() => changeLineSchema.parse({ lineIndex: 1.5 })).toThrow();
  });

  it("rejects missing lineIndex", () => {
    expect(() => changeLineSchema.parse({})).toThrow();
  });
});

// ============================================================================
// setSongSchema
// ============================================================================

describe("setSongSchema", () => {
  it("accepts valid UUID songId", () => {
    const result = setSongSchema.parse({ songId: VALID_UUID });
    expect(result.songId).toBe(VALID_UUID);
  });

  it("rejects invalid UUID songId", () => {
    expect(() => setSongSchema.parse({ songId: "bad" })).toThrow();
  });

  it("rejects missing songId", () => {
    expect(() => setSongSchema.parse({})).toThrow();
  });
});

// ============================================================================
// setPlayingSchema
// ============================================================================

describe("setPlayingSchema", () => {
  it("accepts isPlaying true", () => {
    const result = setPlayingSchema.parse({ isPlaying: true });
    expect(result.isPlaying).toBe(true);
  });

  it("accepts isPlaying false", () => {
    const result = setPlayingSchema.parse({ isPlaying: false });
    expect(result.isPlaying).toBe(false);
  });

  it("rejects non-boolean isPlaying", () => {
    expect(() => setPlayingSchema.parse({ isPlaying: "true" })).toThrow();
    expect(() => setPlayingSchema.parse({ isPlaying: 1 })).toThrow();
  });

  it("rejects missing isPlaying", () => {
    expect(() => setPlayingSchema.parse({})).toThrow();
  });
});

// ============================================================================
// errorResponseSchema
// ============================================================================

describe("errorResponseSchema", () => {
  it("accepts valid error response", () => {
    const result = errorResponseSchema.parse({
      error: { code: "SONG_NOT_FOUND", message: "Not found" },
      timestamp: Date.now(),
    });
    expect(result.error.code).toBe("SONG_NOT_FOUND");
  });

  it("accepts optional details", () => {
    const result = errorResponseSchema.parse({
      error: {
        code: "ERR",
        message: "msg",
        details: { field: "email" },
      },
      timestamp: 123,
    });
    expect(result.error.details).toEqual({ field: "email" });
  });

  it("rejects missing timestamp", () => {
    expect(() =>
      errorResponseSchema.parse({
        error: { code: "ERR", message: "msg" },
      })
    ).toThrow();
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

describe("toSongListParams", () => {
  it("converts parsed schema output to SongListParams type", () => {
    const parsed = songListParamsSchema.parse({
      limit: 10,
      offset: 5,
      search: "grace",
      userId: VALID_UUID,
    });
    const result = toSongListParams(parsed);

    expect(result).toEqual({
      limit: 10,
      offset: 5,
      search: "grace",
      userId: VALID_UUID,
    });
  });

  it("converts undefined optional fields", () => {
    const parsed = songListParamsSchema.parse({});
    const result = toSongListParams(parsed);

    expect(result.search).toBeUndefined();
    expect(result.userId).toBeUndefined();
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });
});

describe("toCreateSongInput", () => {
  it("converts parsed schema output with all fields", () => {
    const parsed = createSongSchema.parse({
      title: "Song",
      lyrics: ["L1"],
      artist: "Artist",
      lrcTimestamps: [0],
      language: "en",
      userId: VALID_UUID,
    });
    const result = toCreateSongInput(parsed);

    expect(result.title).toBe("Song");
    expect(result.artist).toBe("Artist");
    expect(result.userId).toBe(VALID_UUID);
  });

  it("converts undefined optional fields to undefined", () => {
    const parsed = createSongSchema.parse({
      title: "Song",
      lyrics: ["L1"],
    });
    const result = toCreateSongInput(parsed);

    expect(result.artist).toBeUndefined();
    expect(result.lrcTimestamps).toBeUndefined();
    expect(result.language).toBeUndefined();
    expect(result.userId).toBe("");
  });
});

describe("toUpdateSongInput", () => {
  it("converts parsed update with some fields", () => {
    const parsed = updateSongSchema.parse({ title: "New Title" });
    const result = toUpdateSongInput(parsed);

    expect(result.title).toBe("New Title");
    expect(result.artist).toBeUndefined();
    expect(result.lyrics).toBeUndefined();
  });
});

describe("createPartialSongListParams", () => {
  it("fills defaults for missing fields", () => {
    const result = createPartialSongListParams({});

    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.search).toBeUndefined();
    expect(result.userId).toBeUndefined();
  });

  it("uses provided values over defaults", () => {
    const result = createPartialSongListParams({
      limit: 50,
      search: "query",
    });

    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
    expect(result.search).toBe("query");
  });
});
