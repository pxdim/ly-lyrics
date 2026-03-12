/**
 * WebSocket Server for Real-time Synchronization
 *
 * Handles real-time communication between controller and display clients.
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { z } from "zod";

// ============================================================================
// Types & Schemas
// ============================================================================

export type ClientRole = "controller" | "display" | "admin";

export interface ClientSession {
  id: string;
  role: ClientRole;
  userId?: string;
  joinedAt: Date;
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

export interface DisplaySettings {
  displayLines: number;
  fontSize: number;
  fontFamily: string;
  theme: "light" | "dark";
  showBackground: boolean;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  autoScroll: boolean;
  scrollDuration: number;
  enableAnimation: boolean;
}

// ============================================================================
// Event Schemas
// ============================================================================

const JoinSessionSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(["controller", "display", "admin"]),
  userId: z.string().optional(),
});

const ChangeLineSchema = z.object({
  lineIndex: z.number().int().min(0),
});

const SetSongSchema = z.object({
  songId: z.string().uuid(),
});

const UpdateSettingsSchema = z.object({
  displayLines: z.number().int().min(1).max(10).optional(),
  fontSize: z.number().int().min(12).max(72).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  showBackground: z.boolean().optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  autoScroll: z.boolean().optional(),
  scrollDuration: z.number().int().min(100).max(1000).optional(),
  enableAnimation: z.boolean().optional(),
});

// ============================================================================
// WebSocket Server Class
// ============================================================================

export class WebSocketServer {
  private io: SocketIOServer;
  private sessions: Map<string, SessionState> = new Map();
  private clients: Map<string, ClientSession> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      console.log(`[WS] Client connected: ${socket.id}`);

      // Handle session join
      socket.on("join_session", (data) => {
        this.handleJoinSession(socket, data);
      });

      // Handle line changes
      socket.on("change_line", (data) => {
        this.handleChangeLine(socket, data);
      });

      // Handle next/prev line
      socket.on("next_line", () => {
        this.handleNextLine(socket);
      });

      socket.on("prev_line", () => {
        this.handlePrevLine(socket);
      });

      // Handle song change
      socket.on("set_song", (data) => {
        this.handleSetSong(socket, data);
      });

      // Handle settings update
      socket.on("update_settings", (data) => {
        this.handleUpdateSettings(socket, data);
      });

      // Handle play/pause
      socket.on("set_playing", (data) => {
        this.handleSetPlaying(socket, data);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      // Error handling
      socket.on("error", (error) => {
        console.error(`[WS] Socket error for ${socket.id}:`, error);
      });
    });
  }

  private handleJoinSession(socket: any, data: unknown): void {
    try {
      const parsed = JoinSessionSchema.parse(data);
      const { sessionId, role, userId } = parsed;

      // Initialize session if not exists
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, {
          sessionId,
          currentSong: null,
          currentLineIndex: 0,
          isPlaying: false,
          settings: this.getDefaultSettings(),
          controllerCount: 0,
          displayCount: 0,
        });
      }

      const session = this.sessions.get(sessionId)!;

      // Join the socket room
      socket.join(sessionId);

      // Register client
      const clientSessionBase: Omit<ClientSession, "userId"> = {
        id: socket.id,
        role,
        joinedAt: new Date(),
      };
      const clientSession = userId
        ? ({ ...clientSessionBase, userId } as ClientSession)
        : (clientSessionBase as ClientSession);
      this.clients.set(socket.id, clientSession);

      // Update session counts
      if (role === "controller") {
        session.controllerCount++;
      } else if (role === "display") {
        session.displayCount++;
      }

      console.log(
        `[WS] Client ${socket.id} joined session ${sessionId} as ${role}`
      );

      // Send current state to the new client
      socket.emit("session_state", session);

      // Notify others in the session
      this.io.to(sessionId).emit("client_joined", {
        clientId: socket.id,
        role,
        controllerCount: session.controllerCount,
        displayCount: session.displayCount,
      });
    } catch (error) {
      console.error("[WS] Error in join_session:", error);
      socket.emit("error", {
        message: "Failed to join session",
        details: error instanceof z.ZodError ? (error as z.ZodError).issues : undefined,
      });
    }
  }

  private handleChangeLine(socket: any, data: unknown): void {
    try {
      const parsed = ChangeLineSchema.parse(data);
      const clientSession = this.clients.get(socket.id);

      if (!clientSession) {
        socket.emit("error", { message: "Not in a session" });
        return;
      }

      const session = this.sessions.get(clientSession.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      // Only controllers can change line
      if (clientSession.role !== "controller") {
        socket.emit("error", { message: "Only controllers can change line" });
        return;
      }

      session.currentLineIndex = parsed.lineIndex;

      // Broadcast to all clients in the session
      this.io.to(clientSession.id).emit("line_changed", {
        lineIndex: session.currentLineIndex,
        timestamp: Date.now(),
      });

      console.log(
        `[WS] Line changed to ${parsed.lineIndex} in session ${clientSession.id}`
      );
    } catch (error) {
      console.error("[WS] Error in change_line:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private handleNextLine(socket: any): void {
    const clientSession = this.clients.get(socket.id);

    if (!clientSession || clientSession.role !== "controller") {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    const session = this.sessions.get(clientSession.id);
    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    const maxIndex = session.currentSong
      ? session.currentSong.lyrics.length - 1
      : 0;
    const newIndex = Math.min(session.currentLineIndex + 1, maxIndex);

    session.currentLineIndex = newIndex;

    this.io.to(clientSession.id).emit("line_changed", {
      lineIndex: session.currentLineIndex,
      timestamp: Date.now(),
    });
  }

  private handlePrevLine(socket: any): void {
    const clientSession = this.clients.get(socket.id);

    if (!clientSession || clientSession.role !== "controller") {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    const session = this.sessions.get(clientSession.id);
    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    const newIndex = Math.max(session.currentLineIndex - 1, 0);

    session.currentLineIndex = newIndex;

    this.io.to(clientSession.id).emit("line_changed", {
      lineIndex: session.currentLineIndex,
      timestamp: Date.now(),
    });
  }

  private handleSetSong(socket: any, data: unknown): void {
    try {
      const parsed = SetSongSchema.parse(data);
      const clientSession = this.clients.get(socket.id);

      if (!clientSession || clientSession.role !== "controller") {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const session = this.sessions.get(clientSession.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      // In real implementation, fetch song from database
      // For now, just acknowledge
      this.io.to(clientSession.id).emit("song_changed", {
        songId: parsed.songId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[WS] Error in set_song:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private handleUpdateSettings(socket: any, data: unknown): void {
    try {
      const parsed = UpdateSettingsSchema.parse(data);
      const clientSession = this.clients.get(socket.id);

      if (!clientSession || clientSession.role !== "controller") {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const session = this.sessions.get(clientSession.id);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      // Update settings (only override provided properties)
      type DisplaySettingsKey = keyof DisplaySettings;
      const keys = Object.keys(parsed) as Array<DisplaySettingsKey>;
      for (const key of keys) {
        const value = (parsed as Record<string, unknown>)[key];
        if (value !== undefined) {
          (session.settings as unknown as Record<string, unknown>)[key] = value;
        }
      }

      // Broadcast to all clients
      this.io.to(clientSession.id).emit("settings_updated", {
        settings: session.settings,
        timestamp: Date.now(),
      });

      console.log(
        `[WS] Settings updated in session ${clientSession.id}`
      );
    } catch (error) {
      console.error("[WS] Error in update_settings:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private handleSetPlaying(socket: any, data: { isPlaying: boolean }): void {
    const clientSession = this.clients.get(socket.id);

    if (!clientSession || clientSession.role !== "controller") {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    const session = this.sessions.get(clientSession.id);
    if (!session) {
      socket.emit("error", { message: "Session not found" });
      return;
    }

    session.isPlaying = data.isPlaying;

    this.io.to(clientSession.id).emit("playing_changed", {
      isPlaying: session.isPlaying,
      timestamp: Date.now(),
    });
  }

  private handleDisconnect(socket: any): void {
    const clientSession = this.clients.get(socket.id);

    if (clientSession) {
      const session = this.sessions.get(clientSession.id);

      if (session) {
        // Update counts
        if (clientSession.role === "controller") {
          session.controllerCount = Math.max(0, session.controllerCount - 1);
        } else if (clientSession.role === "display") {
          session.displayCount = Math.max(0, session.displayCount - 1);
        }

        // Notify others
        this.io.to(clientSession.id).emit("client_left", {
          clientId: socket.id,
          role: clientSession.role,
          controllerCount: session.controllerCount,
          displayCount: session.displayCount,
        });

        console.log(
          `[WS] Client ${socket.id} left session ${clientSession.id}`
        );
      }

      this.clients.delete(socket.id);
    }

    console.log(`[WS] Client disconnected: ${socket.id}`);
  }

  private getDefaultSettings(): DisplaySettings {
    return {
      displayLines: 4,
      fontSize: 32,
      fontFamily: "Inter",
      theme: "dark",
      showBackground: true,
      backgroundColor: "#000000",
      textColor: "#ffffff",
      highlightColor: "#0ea5e9",
      autoScroll: true,
      scrollDuration: 300,
      enableAnimation: true,
    };
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Get current session state
   */
  public getSessionState(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  public getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Broadcast to a specific session
   */
  public broadcastToSession(
    sessionId: string,
    event: string,
    data: unknown
  ): void {
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Get connected clients count
   */
  public getClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Close the WebSocket server
   */
  public close(): void {
    this.io.close();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let wsServerInstance: WebSocketServer | null = null;

export function initWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  if (!wsServerInstance) {
    wsServerInstance = new WebSocketServer(httpServer);
  }
  return wsServerInstance;
}

export function getWebSocketServer(): WebSocketServer | null {
  return wsServerInstance;
}
