/**
 * 原生 WebSocket 客戶端（取代 Socket.IO）
 *
 * 實作與 WSClient 相同的公開介面，使用原生 WebSocket 連接 Go backend。
 * 透過環境變數 NEXT_PUBLIC_USE_NATIVE_WS=true 切換。
 */

import type { ClientRole, DisplaySettings, ServerToClientEvents } from "./types";

// ============================================================================
// Types
// ============================================================================

interface WSMessage {
  type: string;
  payload?: unknown;
}

type EventCallback = (...args: never[]) => void;

// ============================================================================
// NativeWSClient
// ============================================================================

export class NativeWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 5000;
  private shouldReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSessionId: string | null = null;
  private lastRole: ClientRole | null = null;
  private lastUserId: string | undefined;

  constructor(url?: string) {
    this.url =
      url ||
      process.env["NEXT_PUBLIC_GO_WS_URL"] ||
      "ws://localhost:8080/ws";
  }

  // ============================================================================
  // 連線管理
  // ============================================================================

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);
    this.shouldReconnect = true;

    this.ws.onopen = () => {
      console.log("[NativeWS] Connected to server");
      this.reconnectAttempts = 0;
      // 重新連線後自動重新加入先前的 session
      if (this.currentSessionId && this.lastRole) {
        this.joinSession(this.currentSessionId, this.lastRole, this.lastUserId);
      }
    };

    this.ws.onclose = () => {
      console.log("[NativeWS] Disconnected");
      if (this.shouldReconnect) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = () => {
      console.error("[NativeWS] Connection error");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data as string);
        this.emit(msg.type, msg.payload);
      } catch {
        console.error("[NativeWS] Failed to parse message");
      }
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.currentSessionId = null;
    this.lastRole = null;
    this.lastUserId = undefined;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  // ============================================================================
  // 訊息發送
  // ============================================================================

  private send(type: string, payload?: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[NativeWS] Not connected, message dropped:", type);
      return;
    }
    const msg: WSMessage = { type };
    if (payload !== undefined) {
      msg.payload = payload;
    }
    this.ws.send(JSON.stringify(msg));
  }

  // ============================================================================
  // Session 操作（與 WSClient 介面一致）
  // ============================================================================

  joinSession(sessionId: string, role: ClientRole, userId?: string): void {
    this.currentSessionId = sessionId;
    this.lastRole = role;
    this.lastUserId = userId;
    const payload: { sessionId: string; role: ClientRole; userId?: string } = {
      sessionId,
      role,
    };
    if (userId !== undefined) {
      payload.userId = userId;
    }
    this.send("join_session", payload);
  }

  leaveSession(): void {
    this.currentSessionId = null;
    this.lastRole = null;
    this.lastUserId = undefined;
    this.send("leave_session");
  }

  changeLine(lineIndex: number): void {
    this.send("change_line", { lineIndex });
  }

  nextLine(): void {
    this.send("next_line");
  }

  prevLine(): void {
    this.send("prev_line");
  }

  setSong(songId: string): void {
    this.send("set_song", { songId });
  }

  updateSettings(settings: Partial<DisplaySettings>): void {
    this.send("update_settings", settings);
  }

  setPlaying(isPlaying: boolean): void {
    this.send("set_playing", { isPlaying });
  }

  // ============================================================================
  // 事件監聽
  // ============================================================================

  on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback as EventCallback);
    } else {
      this.listeners.delete(event);
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private emit(event: string, data: unknown): void {
    this.listeners
      .get(event)
      ?.forEach((cb) => (cb as (data: unknown) => void)(data));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[NativeWS] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(
        `[NativeWS] Reconnecting (attempt ${this.reconnectAttempts})...`
      );
      this.connect();
    }, delay);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let nativeWSClientInstance: NativeWSClient | null = null;

export function initNativeWSClient(url?: string): NativeWSClient {
  if (!nativeWSClientInstance) {
    nativeWSClientInstance = new NativeWSClient(url);
    nativeWSClientInstance.connect();
  }
  return nativeWSClientInstance;
}

export function getNativeWSClient(): NativeWSClient | null {
  return nativeWSClientInstance;
}

// ============================================================================
// 相容性輔助函式（取代舊 Socket.IO client 的對外介面）
// ============================================================================

/**
 * 建立原生 WebSocket client（使用 Go backend）
 */
export function createWSClient(url?: string): NativeWSClient {
  return initNativeWSClient(url);
}

/**
 * 取得當前的 WebSocket client
 */
export function getActiveWSClient(): NativeWSClient | null {
  return getNativeWSClient();
}
