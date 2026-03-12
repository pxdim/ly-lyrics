// ============================================
// LY - 歌詞顯示系統 核心型別定義
// ============================================

// ============================================
// Song Types
// ============================================

export interface Song {
  id: string;
  title: string;
  artist?: string;
  lyrics: string[]; // Array of lyric lines (one line per element)
  lrcTimestamps?: number[]; // Optional LRC timestamps in milliseconds
  language?: string; // zh-TW, en-US, etc.
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSongInput {
  title: string;
  artist?: string;
  lyrics: string[]; // One line per element
  lrcTimestamps?: number[];
  language?: string;
}

export interface UpdateSongInput {
  id: string;
  title?: string;
  artist?: string;
  lyrics?: string[];
  lrcTimestamps?: number[];
  language?: string;
}

// ============================================
// Playlist Types
// ============================================

export interface Playlist {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  songs: PlaylistSong[];
}

export interface PlaylistSong {
  id: string;
  playlistId: string;
  songId: string;
  orderIndex: number;
  song?: Song; // Populated when joined
}

export interface CreatePlaylistInput {
  name: string;
  songIds?: string[]; // Optional: initial songs
}

export interface UpdatePlaylistInput {
  id: string;
  name?: string;
  songIds?: string[]; // Reorder/replace songs
}

// ============================================
// Session Types
// ============================================

export interface SessionState {
  sessionId: string;
  currentSong: Song | null;
  currentLineIndex: number;
  connectedClients: number;
  isAiListening: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface SessionClient {
  id: string;
  sessionId: string;
  clientType: "controller" | "display";
  connectedAt: Date;
  lastSeen: Date;
}

// ============================================
// Display Settings Types
// ============================================

export type Theme = "light" | "dark" | "auto";
export type FontSize = 16 | 18 | 20 | 24 | 32 | 40 | 48 | 64;

export interface DisplaySettings {
  displayLines: number; // 1-10
  theme: Theme;
  fontSize: FontSize;
  fontFamily: string;
  showBackground: boolean;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  autoScroll: boolean;
  scrollDuration: number; // ms
  enableAnimation: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  displayLines: 4,
  theme: "dark",
  fontSize: 32,
  fontFamily: "Inter",
  showBackground: true,
  backgroundColor: "#000000",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

// ============================================
// Connection Status Types
// ============================================

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  sessionId: string | null;
  connectedDisplays: number;
  isController: boolean;
  error?: string;
}

// ============================================
// AI Listening Types
// ============================================

export interface AiListeningState {
  isActive: boolean;
  confidence: number; // 0-1
  lastMatchedLine: number | null;
  lastUpdateTime: Date;
  apiProvider: "gemini" | "whisper" | "local";
}

export interface AudioInput {
  mediaStream: MediaStream | null;
  isRecording: boolean;
  volume: number; // 0-1
}

// ============================================
// WebSocket Message Types
// ============================================

export type WebSocketMessageType =
  | "join_session"
  | "leave_session"
  | "line_changed"
  | "song_changed"
  | "settings_updated"
  | "session_state"
  | "client_connected"
  | "client_disconnected"
  | "ai_listening_toggle"
  | "error";

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: number;
  senderId?: string;
}

// Client → Server messages
export interface JoinSessionPayload {
  sessionId: string;
  clientType: "controller" | "display";
}

export interface LineChangedPayload {
  lineIndex: number;
  animate?: boolean;
}

export interface SongChangedPayload {
  songId: string;
  song: Song;
}

export interface SettingsUpdatedPayload {
  settings: Partial<DisplaySettings>;
}

export interface AiListeningTogglePayload {
  isActive: boolean;
}

// Server → Client messages
export interface SessionStatePayload {
  currentSong: Song | null;
  currentLineIndex: number;
  connectedClients: number;
  isAiListening: boolean;
}

export interface ClientConnectedPayload {
  clientId: string;
  clientType: "controller" | "display";
  totalClients: number;
}

export interface ClientDisconnectedPayload {
  clientId: string;
  clientType: "controller" | "display";
  totalClients: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// API Response Types
// ============================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Error Types
// ============================================

export class LyricsError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public technicalMessage?: string,
  ) {
    super(userMessage);
    this.name = "LyricsError";
  }
}

export const ERROR_CODES = {
  // Song errors
  SONG_NOT_FOUND: "SONG_NOT_FOUND",
  SONG_INVALID_FORMAT: "SONG_INVALID_FORMAT",
  SONG_EMPTY_LYRICS: "SONG_EMPTY_LYRICS",

  // Playlist errors
  PLAYLIST_NOT_FOUND: "PLAYLIST_NOT_FOUND",
  PLAYLIST_EMPTY: "PLAYLIST_EMPTY",

  // Session errors
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_INVALID_CODE: "SESSION_INVALID_CODE",
  SESSION_FULL: "SESSION_FULL",

  // WebSocket errors
  WEBSOCKET_DISCONNECTED: "WS_DISCONNECTED",
  WEBSOCKET_CONNECTION_FAILED: "WS_CONNECTION_FAILED",

  // AI errors
  AI_API_FAILED: "AI_API_FAILED",
  AI_NO_AUDIO_INPUT: "AI_NO_AUDIO_INPUT",
  AI_LOW_CONFIDENCE: "AI_LOW_CONFIDENCE",

  // Auth errors
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================
// NDI Output Types
// ============================================

export interface NdiOutputSettings {
  enabled: boolean;
  width: number;
  height: number;
  frameRate: 30 | 60;
  alphaChannel: boolean; // Transparency for Resolume
}

export const DEFAULT_NDI_SETTINGS: NdiOutputSettings = {
  enabled: false,
  width: 1920,
  height: 1080,
  frameRate: 30,
  alphaChannel: true,
};

// ============================================
// User Settings Types
// ============================================

export interface UserSettings {
  id: string;
  userId: string;
  displaySettings: DisplaySettings;
  ndiSettings: NdiOutputSettings;
  defaultSessionCode?: string;
  autoReconnect: boolean;
}

// ============================================
// Utility Types
// ============================================

export type WithId<T> = T & { id: string };
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type MaybePromise<T> = T | Promise<T>;

// Type guard for API responses
export function isApiSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiError<T>(
  response: ApiResponse<T>,
): response is ApiErrorResponse {
  return response.success === false;
}
