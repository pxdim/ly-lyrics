/**
 * WebSocket Server for Real-time Synchronization
 *
 * Handles real-time communication between controller and display clients.
 * Enhanced with Redis for persistent session state across server restarts.
 *
 * @module lib/websocket/server
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { z } from "zod";
import {
  getSession,
  createSession,
  updateSessionSong,
  updateSessionLine,
  nextLine as redisNextLine,
  prevLine as redisPrevLine,
  updateSessionPlaying,
  updateSessionSettings,
  addClientToSession,
  removeClientFromSession,
  getSessionClients,
  sessionExists,
} from "@/lib/redis/session";
import { getSongById } from "@/lib/services/songService";

// ============================================================================
// Types & Schemas
// ============================================================================

export type ClientRole = "controller" | "display" | "admin";

export interface ClientSession {
  id: string;
  sessionId: string;
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
  createdAt: number;
  updatedAt: number;
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
  theme: "light" | "dark" | "transparent";
  showBackground: boolean;
  backgroundColor: string | null;
  textColor: string | null;
  highlightColor: string | null;
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
  fontFamily: z.string().optional(),
  theme: z.enum(["light", "dark", "transparent"]).optional(),
  showBackground: z.boolean().optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  autoScroll: z.boolean().optional(),
  scrollDuration: z.number().int().min(100).max(1000).optional(),
  enableAnimation: z.boolean().optional(),
});

const SetPlayingSchema = z.object({
  isPlaying: z.boolean(),
});

// ============================================================================
// WebSocket Server Class
// ============================================================================

export class WebSocketServer {
  private io: SocketIOServer;
  // Local tracking of socket -> session mapping for quick lookups
  private socketSessions: Map<string, ClientSession> = new Map();

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

  private async handleJoinSession(socket: any, data: unknown): Promise<void> {
    try {
      const parsed = JoinSessionSchema.parse(data);
      const { sessionId, role, userId } = parsed;

      // Get or create session from Redis
      let session = await getSession(sessionId);

      if (!session) {
        session = await createSession(sessionId);
        console.log(`[WS] Created new session: ${sessionId}`);
      }

      // Join the socket room
      socket.join(sessionId);

      // Register client in Redis
      await addClientToSession(sessionId, {
        clientId: socket.id,
        role,
        userId: userId || null,
        joinedAt: Date.now(),
      });

      // Track locally for quick disconnect handling
      const clientSession: ClientSession = {
        id: socket.id,
        sessionId,
        role,
        userId,
        joinedAt: new Date(),
      };
      this.socketSessions.set(socket.id, clientSession);

      console.log(
        `[WS] Client ${socket.id} joined session ${sessionId} as ${role}`
      );

      // Send current state to the new client
      socket.emit("session_state", session);

      // Get updated client counts
      const updatedSession = await getSession(sessionId);

      // Notify others in the session
      this.io.to(sessionId).emit("client_joined", {
        clientId: socket.id,
        role,
        controllerCount: updatedSession?.controllerCount ?? 0,
        displayCount: updatedSession?.displayCount ?? 0,
      });
    } catch (error) {
      console.error("[WS] Error in join_session:", error);
      socket.emit("error", {
        message: "Failed to join session",
        details: error instanceof z.ZodError ? error.issues : undefined,
      });
    }
  }

  private async handleChangeLine(socket: any, data: unknown): Promise<void> {
    try {
      const parsed = ChangeLineSchema.parse(data);
      const clientSession = this.socketSessions.get(socket.id);

      if (!clientSession) {
        socket.emit("error", { message: "Not in a session" });
        return;
      }

      // Only controllers can change line
      if (clientSession.role !== "controller") {
        socket.emit("error", { message: "Only controllers can change line" });
        return;
      }

      // Update in Redis
      const updatedSession = await updateSessionLine(
        clientSession.sessionId,
        parsed.lineIndex
      );

      if (updatedSession) {
        // Broadcast to all clients in the session
        this.io.to(clientSession.sessionId).emit("line_changed", {
          lineIndex: updatedSession.currentLineIndex,
          timestamp: Date.now(),
        });

        console.log(
          `[WS] Line changed to ${parsed.lineIndex} in session ${clientSession.sessionId}`
        );
      } else {
        socket.emit("error", { message: "Session not found" });
      }
    } catch (error) {
      console.error("[WS] Error in change_line:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private async handleNextLine(socket: any): Promise<void> {
    const clientSession = this.socketSessions.get(socket.id);

    if (!clientSession || clientSession.role !== "controller") {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    const updatedSession = await redisNextLine(clientSession.sessionId);

    if (updatedSession) {
      this.io.to(clientSession.sessionId).emit("line_changed", {
        lineIndex: updatedSession.currentLineIndex,
        timestamp: Date.now(),
      });
    } else {
      socket.emit("error", { message: "Session not found" });
    }
  }

  private async handlePrevLine(socket: any): Promise<void> {
    const clientSession = this.socketSessions.get(socket.id);

    if (!clientSession || clientSession.role !== "controller") {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    const updatedSession = await redisPrevLine(clientSession.sessionId);

    if (updatedSession) {
      this.io.to(clientSession.sessionId).emit("line_changed", {
        lineIndex: updatedSession.currentLineIndex,
        timestamp: Date.now(),
      });
    } else {
      socket.emit("error", { message: "Session not found" });
    }
  }

  private async handleSetSong(socket: any, data: unknown): Promise<void> {
    try {
      const parsed = SetSongSchema.parse(data);
      const clientSession = this.socketSessions.get(socket.id);

      if (!clientSession || clientSession.role !== "controller") {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      // Fetch song from database
      const song = await getSongById(parsed.songId);

      if (!song) {
        socket.emit("error", { message: "Song not found" });
        return;
      }

      // Update in Redis
      const updatedSession = await updateSessionSong(clientSession.sessionId, song);

      if (updatedSession) {
        // Broadcast to all clients in the session
        this.io.to(clientSession.sessionId).emit("song_changed", {
          songId: parsed.songId,
          song: updatedSession.currentSong,
          timestamp: Date.now(),
        });

        console.log(
          `[WS] Song changed to ${song.title} in session ${clientSession.sessionId}`
        );
      } else {
        socket.emit("error", { message: "Session not found" });
      }
    } catch (error) {
      console.error("[WS] Error in set_song:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private async handleUpdateSettings(socket: any, data: unknown): Promise<void> {
    try {
      const parsed = UpdateSettingsSchema.parse(data);
      const clientSession = this.socketSessions.get(socket.id);

      if (!clientSession || clientSession.role !== "controller") {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      // Update in Redis
      const updatedSession = await updateSessionSettings(
        clientSession.sessionId,
        parsed
      );

      if (updatedSession) {
        // Broadcast to all clients
        this.io.to(clientSession.sessionId).emit("settings_updated", {
          settings: updatedSession.settings,
          timestamp: Date.now(),
        });

        console.log(
          `[WS] Settings updated in session ${clientSession.sessionId}`
        );
      } else {
        socket.emit("error", { message: "Session not found" });
      }
    } catch (error) {
      console.error("[WS] Error in update_settings:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private async handleSetPlaying(socket: any, data: unknown): Promise<void> {
    try {
      const parsed = SetPlayingSchema.parse(data);
      const clientSession = this.socketSessions.get(socket.id);

      if (!clientSession || clientSession.role !== "controller") {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      // Update in Redis
      const updatedSession = await updateSessionPlaying(
        clientSession.sessionId,
        parsed.isPlaying
      );

      if (updatedSession) {
        this.io.to(clientSession.sessionId).emit("playing_changed", {
          isPlaying: updatedSession.isPlaying,
          timestamp: Date.now(),
        });
      } else {
        socket.emit("error", { message: "Session not found" });
      }
    } catch (error) {
      console.error("[WS] Error in set_playing:", error);
      socket.emit("error", { message: "Invalid request" });
    }
  }

  private async handleDisconnect(socket: any): Promise<void> {
    const clientSession = this.socketSessions.get(socket.id);

    if (clientSession) {
      // Remove from Redis
      await removeClientFromSession(clientSession.sessionId, socket.id);

      // Get updated session
      const updatedSession = await getSession(clientSession.sessionId);

      if (updatedSession) {
        // Notify others
        this.io.to(clientSession.sessionId).emit("client_left", {
          clientId: socket.id,
          role: clientSession.role,
          controllerCount: updatedSession.controllerCount,
          displayCount: updatedSession.displayCount,
        });

        console.log(
          `[WS] Client ${socket.id} left session ${clientSession.sessionId}`
        );
      }

      // Leave the room
      socket.leave(clientSession.sessionId);
      this.socketSessions.delete(socket.id);
    }

    console.log(`[WS] Client disconnected: ${socket.id}`);
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Get current session state from Redis
   */
  public async getSessionState(sessionId: string): Promise<SessionState | null> {
    return await getSession(sessionId);
  }

  /**
   * Get clients in a session
   */
  public async getSessionClients(sessionId: string): Promise<any[]> {
    return await getSessionClients(sessionId);
  }

  /**
   * Check if session exists
   */
  public async hasSession(sessionId: string): Promise<boolean> {
    return await sessionExists(sessionId);
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
   * Get connected clients count (local only)
   */
  public getClientsCount(): number {
    return this.socketSessions.size;
  }

  /**
   * Get all local socket sessions
   */
  public getLocalSessions(): ClientSession[] {
    return Array.from(this.socketSessions.values());
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
