/**
 * WebSocket Client for Real-time Synchronization
 *
 * Client-side utilities for connecting to the WebSocket server
 * and handling real-time updates.
 */

import { io, Socket } from "socket.io-client";

// ============================================================================
// Types
// ============================================================================

export type ClientRole = "controller" | "display" | "admin";

export interface DisplaySettings {
  displayLines: number;
  fontSize: number;
  fontFamily: string;
  theme: "light" | "dark" | "transparent";
  showBackground: boolean;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  autoScroll: boolean;
  scrollDuration: number;
  enableAnimation: boolean;
}

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
// Event Types
// ============================================================================

export interface ServerToClientEvents {
  session_state: (state: SessionState) => void;
  line_changed: (data: { lineIndex: number; timestamp: number }) => void;
  song_changed: (data: { songId: string; timestamp: number }) => void;
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

// ============================================================================
// WebSocket Client Class
// ============================================================================

export class WSClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private currentSessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private url: string = process.env["NEXT_PUBLIC_WS_URL"] || "http://localhost:3000") {}

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.warn("[WS] Already connected");
      return;
    }

    this.socket = io(this.url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[WS] Connected to server");
      this.reconnectAttempts = 0;

      // Rejoin session if we were in one
      if (this.currentSessionId) {
        // Session info is lost on reconnect, need to rejoin
        // The application should handle this by calling joinSession again
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);

      if (reason === "io server disconnect") {
        // Server disconnected us, don't reconnect automatically
        this.socket?.disconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WS] Connection error:", error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[WS] Max reconnection attempts reached");
        this.socket?.disconnect();
      }
    });

    this.socket.on("error", (data) => {
      console.error("[WS] Server error:", data);
    });
  }

  /**
   * Join a synchronization session
   */
  joinSession(
    sessionId: string,
    role: ClientRole,
    userId?: string
  ): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.currentSessionId = sessionId;
    const payload: { sessionId: string; role: ClientRole; userId?: string } = { sessionId, role };
    if (userId !== undefined) {
      payload.userId = userId;
    }
    this.socket.emit("join_session", payload);
  }

  /**
   * Leave the current session
   */
  leaveSession(): void {
    this.currentSessionId = null;
    // Socket.IO handles leaving rooms automatically on disconnect
  }

  /**
   * Change the current lyric line
   */
  changeLine(lineIndex: number): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.socket.emit("change_line", { lineIndex });
  }

  /**
   * Move to the next line
   */
  nextLine(): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.socket.emit("next_line");
  }

  /**
   * Move to the previous line
   */
  prevLine(): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.socket.emit("prev_line");
  }

  /**
   * Set the current song
   */
  setSong(songId: string): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.socket.emit("set_song", { songId });
  }

  /**
   * Update display settings
   */
  updateSettings(settings: Partial<DisplaySettings>): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.socket.emit("update_settings", settings);
  }

  /**
   * Set playing state
   */
  setPlaying(isPlaying: boolean): void {
    if (!this.socket?.connected) {
      console.error("[WS] Not connected to server");
      return;
    }

    this.socket.emit("set_playing", { isPlaying });
  }

  /**
   * Register event listener
   */
  on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    this.socket?.on(event, callback as never);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ): void {
    if (callback) {
      this.socket?.off(event, callback as never);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.currentSessionId = null;
    this.socket?.disconnect();
    this.socket = null;
  }
}

// ============================================================================
// Feature Flag: 原生 WebSocket（Go backend）vs Socket.IO（Node.js backend）
// ============================================================================

import { NativeWSClient, initNativeWSClient, getNativeWSClient } from "./native-client";

const USE_NATIVE_WS = process.env["NEXT_PUBLIC_USE_NATIVE_WS"] === "true";

/**
 * 根據 feature flag 建立對應的 WebSocket client
 */
export function createWSClient(url?: string): WSClient | NativeWSClient {
  if (USE_NATIVE_WS) {
    return initNativeWSClient(url);
  }
  return initWSClient(url);
}

/**
 * 取得當前的 WebSocket client（無論類型）
 */
export function getActiveWSClient(): WSClient | NativeWSClient | null {
  if (USE_NATIVE_WS) {
    return getNativeWSClient();
  }
  return getWSClient();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let wsClientInstance: WSClient | null = null;

export function initWSClient(url?: string): WSClient {
  if (!wsClientInstance) {
    wsClientInstance = new WSClient(url);
    wsClientInstance.connect();
  }
  return wsClientInstance;
}

export function getWSClient(): WSClient | null {
  return wsClientInstance;
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for WebSocket connection
 *
 * @example
 * ```tsx
 * const { isConnected, joinSession, changeLine, on } = useWebSocket();
 *
 * useEffect(() => {
 *   on("line_changed", ({ lineIndex }) => {
 *     console.log("Line changed to:", lineIndex);
 *   });
 * }, []);
 * ```
 */
export function useWebSocket() {
  const client = getWSClient();

  return {
    isConnected: client?.isConnected() ?? false,
    sessionId: client?.getSessionId() ?? null,

    // Methods
    joinSession: (sessionId: string, role: ClientRole, userId?: string) =>
      client?.joinSession(sessionId, role, userId),
    leaveSession: () => client?.leaveSession(),
    changeLine: (lineIndex: number) => client?.changeLine(lineIndex),
    nextLine: () => client?.nextLine(),
    prevLine: () => client?.prevLine(),
    setSong: (songId: string) => client?.setSong(songId),
    updateSettings: (settings: Partial<DisplaySettings>) =>
      client?.updateSettings(settings),
    setPlaying: (isPlaying: boolean) => client?.setPlaying(isPlaying),
    on: <K extends keyof ServerToClientEvents>(
      event: K,
      callback: ServerToClientEvents[K]
    ) => client?.on(event, callback as never),
    off: <K extends keyof ServerToClientEvents>(
      event: K,
      callback?: ServerToClientEvents[K]
    ) => client?.off(event, callback as never),
    disconnect: () => client?.disconnect(),
  };
}
