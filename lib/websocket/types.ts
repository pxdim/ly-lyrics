/**
 * WebSocket 共用型別定義
 *
 * 集中管理 WebSocket 客戶端所需的所有型別，
 * 供 native-client.ts 及 store 等模組共用。
 */

// ============================================================================
// 角色型別
// ============================================================================

export type ClientRole = "controller" | "display" | "admin";

// ============================================================================
// 顯示設定
// ============================================================================

export interface DisplaySettings {
  displayLines: number;
  fontSize: number;
  fontFamily: string;
  lineSpacing: number; // 行距倍率，0.0-2.0，gap = fontSize * lineSpacing
  theme: "light" | "dark" | "transparent";
  showBackground: boolean;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  autoScroll: boolean;
  scrollDuration: number;
  enableAnimation: boolean;
}

// ============================================================================
// 歌曲與 Session 狀態
// ============================================================================

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

export interface SessionState {
  sessionId: string;
  currentSong: Song | null;
  currentLineIndex: number;
  isPlaying: boolean;
  settings: DisplaySettings;
  controllerCount: number;
  displayCount: number;
}

// ============================================================================
// WebSocket 事件型別
// ============================================================================

export interface ServerToClientEvents {
  session_state: (state: SessionState) => void;
  line_changed: (data: { lineIndex: number; timestamp: number }) => void;
  song_changed: (data: { songId: string; song: Song | null; timestamp: number }) => void;
  settings_updated: (data: { settings: DisplaySettings; timestamp: number }) => void;
  playing_changed: (data: { isPlaying: boolean; timestamp: number }) => void;
  client_joined: (data: {
    clientId: string;
    role: ClientRole;
    controllerCount: number;
    displayCount: number;
  }) => void;
  client_left: (data: {
    clientId: string;
    role: ClientRole;
    controllerCount: number;
    displayCount: number;
  }) => void;
  error: (data: { message: string; details?: unknown }) => void;
}

export interface ClientToServerEvents {
  join_session: (data: {
    sessionId: string;
    role: ClientRole;
    userId?: string;
  }) => void;
  change_line: (data: { lineIndex: number }) => void;
  next_line: () => void;
  prev_line: () => void;
  set_song: (data: { songId: string }) => void;
  update_settings: (data: Partial<DisplaySettings>) => void;
  set_playing: (data: { isPlaying: boolean }) => void;
}
