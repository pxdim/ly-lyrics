/**
 * LRC Parser
 *
 * Parse LRC (Lyric) files into structured data.
 * LRC format: [mm:ss.xx] Lyric text
 *
 * @module lib/lrc/parser
 */

import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface LrcLine {
  time: number; // Milliseconds from start
  text: string;
}

export interface LrcMetadata {
  title?: string;
  artist?: string;
  album?: string;
  author?: string;
  length?: number; // Length in milliseconds
  offset?: number; // Offset in milliseconds
  by?: string;
  re?: string;
  ve?: string;
}

export interface LrcFile {
  metadata: LrcMetadata;
  lines: LrcLine[];
}

// ============================================================================
// Regex Patterns
// ============================================================================

// LRC time tag pattern: [mm:ss.xx] or [mm:ss.xxx]
const TIME_TAG_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

// LRC metadata tag pattern: [key:value]
const METADATA_TAG_REGEX = /\[([a-z]+):([^\]]+)\]/i;

// Known metadata keys
const METADATA_KEYS = [
  "ti",
  "title",
  "ar",
  "artist",
  "al",
  "album",
  "au",
  "author",
  "length",
  "offset",
  "by",
  "re",
  "ve",
];

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse LRC time tag to milliseconds
 * @param tag - Time tag string (e.g., "[01:23.45]")
 * @returns Time in milliseconds
 */
export function parseTimeTag(tag: string): number {
  const match = tag.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
  if (!match) {
    throw new Error(`Invalid time tag: ${tag}`);
  }

  const minutes = match[1] ?? "0";
  const seconds = match[2] ?? "0";
  const centiseconds = match[3] ?? "0";
  const ms =
    parseInt(minutes, 10) * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(centiseconds.padEnd(3, "0"), 10);

  return ms;
}

/**
 * Convert milliseconds to LRC time tag
 * @param ms - Time in milliseconds
 * @returns LRC time tag string (e.g., "[01:23.450]")
 */
export function msToTimeTag(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");
  const formattedMs = Math.floor(milliseconds / 10).toString().padStart(2, "0");

  return `[${formattedMinutes}:${formattedSeconds}.${formattedMs}]`;
}

/**
 * Parse LRC file content
 * @param content - LRC file content as string
 * @returns Parsed LRC file with metadata and lines
 */
export function parseLRC(content: string): LrcFile {
  const lines = content.split("\n");
  const metadata: LrcMetadata = {};
  const lrcLines: LrcLine[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue; // Skip empty lines
    }

    // Check for metadata tags
    const metaMatch = trimmedLine.match(METADATA_TAG_REGEX);
    if (metaMatch) {
      const key = metaMatch[1] ?? "";
      const value = metaMatch[2] ?? "";
      const normalizedKey = normalizeMetadataKey(key);

      if (METADATA_KEYS.includes(normalizedKey) || METADATA_KEYS.includes(key)) {
        if (normalizedKey === "length") {
          metadata[normalizedKey] = parseLength(value);
        } else if (normalizedKey === "offset") {
          metadata[normalizedKey] = parseInt(value, 10);
        } else {
          (metadata as Record<string, unknown>)[normalizedKey] = value;
        }
      }
      continue;
    }

    // Parse lyric lines with time tags
    const timeTags = [...trimmedLine.matchAll(TIME_TAG_REGEX)];

    if (timeTags.length > 0) {
      // Get the text after all time tags
      const lastTag = timeTags[timeTags.length - 1]!;
      const text = trimmedLine.slice((lastTag.index ?? 0) + lastTag[0].length).trim();

      // Each time tag creates a separate line pointing to the same text
      for (const tag of timeTags) {
        try {
          const time = parseTimeTag(tag[0]);
          lrcLines.push({ time, text });
        } catch {
          // Skip invalid time tags
          continue;
        }
      }
    }
  }

  // Sort lines by time
  lrcLines.sort((a, b) => a.time - b.time);

  return {
    metadata,
    lines: lrcLines,
  };
}

/**
 * Serialize LRC file to string
 * @param lrc - Parsed LRC file
 * @returns LRC file content as string
 */
export function serializeLRC(lrc: LrcFile): string {
  const lines: string[] = [];

  // Add metadata tags first
  const metadata = lrc.metadata;

  if (metadata.title) {
    lines.push(`[ti:${metadata.title}]`);
  }
  if (metadata.artist) {
    lines.push(`[ar:${metadata.artist}]`);
  }
  if (metadata.album) {
    lines.push(`[al:${metadata.album}]`);
  }
  if (metadata.author) {
    lines.push(`[au:${metadata.author}]`);
  }
  if (metadata.length) {
    lines.push(`[length:${formatLength(metadata.length)}]`);
  }
  if (metadata.offset && metadata.offset !== 0) {
    lines.push(`[offset:${metadata.offset}]`);
  }
  if (metadata.by) {
    lines.push(`[by:${metadata.by}]`);
  }
  if (metadata.re) {
    lines.push(`[re:${metadata.re}]`);
  }
  if (metadata.ve) {
    lines.push(`[ve:${metadata.ve}]`);
  }

  // Add lyric lines
  for (const lrcLine of lrc.lines) {
    const timeTag = msToTimeTag(lrcLine.time);
    lines.push(`${timeTag}${lrcLine.text}`);
  }

  return lines.join("\n");
}

/**
 * Convert LRC lines to simple lyrics array
 * @param lines - LRC lines
 * @returns Array of lyric texts
 */
export function lrcLinesToLyrics(lines: LrcLine[]): string[] {
  return lines.map((line) => line.text);
}

/**
 * Convert LRC lines to timestamps array
 * @param lines - LRC lines
 * @returns Array of timestamps in milliseconds
 */
export function lrcLinesToTimestamps(lines: LrcLine[]): number[] {
  return lines.map((line) => line.time);
}

/**
 * Convert lyrics and timestamps to LRC lines
 * @param lyrics - Array of lyric texts
 * @param timestamps - Array of timestamps in milliseconds
 * @returns LRC lines
 */
export function toLrcLines(lyrics: string[], timestamps?: number[]): LrcLine[] {
  return lyrics.map((text, index) => ({
    text,
    time: timestamps?.[index] ?? index * 5000, // Default 5 seconds per line
  }));
}

// ============================================================================
// Metadata Helper Functions
// ============================================================================

/**
 * Normalize metadata key to standard format
 */
function normalizeMetadataKey(key: string): string {
  const normalized = key.toLowerCase();
  const keyMap: Record<string, string> = {
    ti: "title",
    ar: "artist",
    al: "album",
    au: "author",
    by: "by",
    re: "re",
    ve: "ve",
  };

  return keyMap[normalized] || normalized;
}

/**
 * Parse length string to milliseconds
 * Supports formats: "mm:ss", "mm:ss.xxx", or milliseconds
 */
function parseLength(value: string): number {
  // Check if it's in mm:ss format
  const match = value.match(/^(\d+):(\d+)(\.(\d+))?$/);
  if (match) {
    const minutes = parseInt(match[1] ?? "0", 10);
    const seconds = parseInt(match[2] ?? "0", 10);
    const ms = match[4] ? parseInt(match[4].padEnd(3, "0"), 10) : 0;
    return minutes * 60000 + seconds * 1000 + ms;
  }

  // Try parsing as milliseconds
  const parsed = parseInt(value, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return 0;
}

/**
 * Format milliseconds to length string
 */
function formatLength(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate LRC file content
 */
export const lrcFileSchema = z.object({
  metadata: z.object({
    title: z.string().optional(),
    artist: z.string().optional(),
    album: z.string().optional(),
    author: z.string().optional(),
    length: z.number().optional(),
    offset: z.number().optional(),
    by: z.string().optional(),
    re: z.string().optional(),
    ve: z.string().optional(),
  }),
  lines: z.array(
    z.object({
      time: z.number().nonnegative(),
      text: z.string(),
    })
  ),
});

/**
 * Check if a string is valid LRC content
 */
export function isValidLRC(content: string): boolean {
  try {
    const parsed = parseLRC(content);
    return parsed.lines.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find the line index for a given time
 * @param lines - LRC lines
 * @param time - Time in milliseconds
 * @returns Index of the line that should be displayed at the given time
 */
export function findLineAtTime(lines: LrcLine[], time: number): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && line.time <= time) {
      return i;
    }
  }
  return 0;
}

/**
 * Get the time range for a line
 * @param lines - LRC lines
 * @param index - Line index
 * @returns Start and end time for the line
 */
export function getLineTimeRange(
  lines: LrcLine[],
  index: number
): { start: number; end: number } {
  const start = lines[index]?.time ?? 0;
  const end = lines[index + 1]?.time ?? start + 5000; // Default 5 seconds
  return { start, end };
}

/**
 * Merge overlapping or adjacent LRC lines
 * @param lines - LRC lines
 * @param threshold - Threshold in milliseconds to consider lines as duplicates
 * @returns Merged LRC lines
 */
export function mergeDuplicateLines(
  lines: LrcLine[],
  threshold = 100
): LrcLine[] {
  const firstLine = lines[0];
  if (!firstLine) {
    return [];
  }

  const merged: LrcLine[] = [firstLine];

  for (let i = 1; i < lines.length; i++) {
    const lastLine = merged[merged.length - 1]!;
    const currentLine = lines[i];

    // Check if lines are close together and have the same text
    if (
      currentLine &&
      currentLine.time - lastLine.time <= threshold &&
      currentLine.text === lastLine.text
    ) {
      // Merge by updating the time
      lastLine.time = Math.min(lastLine.time, currentLine.time);
    } else if (currentLine) {
      merged.push(currentLine);
    }
  }

  return merged;
}
