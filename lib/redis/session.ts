/**
 * Redis Session Manager
 *
 * Session management for WebSocket synchronization using Redis.
 * Stores session state, client connections, and provides pub/sub for real-time updates.
 *
 * @module lib/redis/session
 */

import type { Song, DisplaySettings } from "@/lib/websocket/client";
import { redisGet, redisSet, redisDel, redisSAdd, redisSMembers } from "./client";

// ============================================================================
// Types
// ============================================================================

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

export interface ClientInfo {
  clientId: string;
  role: "controller" | "display" | "admin";
  userId: string | null;
  joinedAt: number;
}

// ============================================================================
// Constants
// ============================================================================

const SESSION_PREFIX = "session:";
const SESSION_CLIENTS_PREFIX = "session:clients:";
const SESSION_TTL = 3600; // 1 hour in seconds

// ============================================================================
// Session CRUD Operations
// ============================================================================

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<SessionState | null> {
  return await redisGet<SessionState>(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Create a new session
 */
export async function createSession(
  sessionId: string,
  initialState: Partial<Omit<SessionState, "sessionId" | "createdAt" | "updatedAt">> = {}
): Promise<SessionState> {
  const now = Date.now();

  const session: SessionState = {
    sessionId,
    currentSong: null,
    currentLineIndex: 0,
    isPlaying: false,
    settings: {
      displayLines: 4,
      fontSize: 24,
      fontFamily: "Inter",
      theme: "dark",
      showBackground: true,
      backgroundColor: "#000000",
      textColor: "#ffffff",
      highlightColor: "#0ea5e9",
      autoScroll: true,
      scrollDuration: 300,
      enableAnimation: true,
    },
    controllerCount: 0,
    displayCount: 0,
    createdAt: now,
    updatedAt: now,
    ...initialState,
  };

  await redisSet(`${SESSION_PREFIX}${sessionId}`, session, SESSION_TTL);

  return session;
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Omit<SessionState, "sessionId" | "createdAt" | "updatedAt">>
): Promise<SessionState | null> {
  const current = await getSession(sessionId);

  if (!current) {
    return null;
  }

  const updated: SessionState = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  await redisSet(`${SESSION_PREFIX}${sessionId}`, updated, SESSION_TTL);

  return updated;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  // Delete session state
  await redisDel(`${SESSION_PREFIX}${sessionId}`);

  // Delete clients set
  await redisDel(`${SESSION_CLIENTS_PREFIX}${sessionId}`);

  return true;
}

// ============================================================================
// Session Client Management
// ============================================================================

/**
 * Add a client to a session
 */
export async function addClientToSession(
  sessionId: string,
  clientInfo: ClientInfo
): Promise<void> {
  const clientsKey = `${SESSION_CLIENTS_PREFIX}${sessionId}`;

  // Add to clients set (store as JSON)
  await redisSAdd(clientsKey, JSON.stringify(clientInfo));

  // Update session counts
  const session = await getSession(sessionId);
  if (session) {
    const controllerCount = await getClientCountByRole(sessionId, "controller");
    const displayCount = await getClientCountByRole(sessionId, "display");

    await updateSession(sessionId, {
      controllerCount,
      displayCount,
    });
  }
}

/**
 * Remove a client from a session
 */
export async function removeClientFromSession(
  sessionId: string,
  clientId: string
): Promise<void> {
  const clientsKey = `${SESSION_CLIENTS_PREFIX}${sessionId}`;

  // Get all clients and filter out the one to remove
  const clients = await getSessionClients(sessionId);
  const updatedClients = clients.filter((c) => c.clientId !== clientId);

  // Delete and re-add all clients
  await redisDel(clientsKey);
  for (const client of updatedClients) {
    await redisSAdd(clientsKey, JSON.stringify(client));
  }

  // Update session counts
  const session = await getSession(sessionId);
  if (session) {
    const controllerCount = await getClientCountByRole(sessionId, "controller");
    const displayCount = await getClientCountByRole(sessionId, "display");

    await updateSession(sessionId, {
      controllerCount,
      displayCount,
    });
  }

  // Clean up session if no clients left
  if (updatedClients.length === 0) {
    await deleteSession(sessionId);
  }
}

/**
 * Get all clients in a session
 */
export async function getSessionClients(sessionId: string): Promise<ClientInfo[]> {
  const clientsKey = `${SESSION_CLIENTS_PREFIX}${sessionId}`;
  const members = await redisSMembers(clientsKey);

  return members.map((member) => JSON.parse(member) as ClientInfo);
}

/**
 * Get client count by role in a session
 */
async function getClientCountByRole(
  sessionId: string,
  role: "controller" | "display" | "admin"
): Promise<number> {
  const clients = await getSessionClients(sessionId);
  return clients.filter((c) => c.role === role).length;
}

/**
 * Check if a client is in a session
 */
export async function isClientInSession(
  sessionId: string,
  clientId: string
): Promise<boolean> {
  const clientsKey = `${SESSION_CLIENTS_PREFIX}${sessionId}`;
  const members = await redisSMembers(clientsKey);

  return members.some((member) => {
    const client = JSON.parse(member) as ClientInfo;
    return client.clientId === clientId;
  });
}

// ============================================================================
// Session State Updates
// ============================================================================

/**
 * Update current song in session
 */
export async function updateSessionSong(
  sessionId: string,
  song: Song | null
): Promise<SessionState | null> {
  return await updateSession(sessionId, {
    currentSong: song,
    currentLineIndex: 0,
  });
}

/**
 * Update current line index in session
 */
export async function updateSessionLine(
  sessionId: string,
  lineIndex: number
): Promise<SessionState | null> {
  return await updateSession(sessionId, {
    currentLineIndex: lineIndex,
  });
}

/**
 * Increment/decrement line index
 */
export async function nextLine(sessionId: string): Promise<SessionState | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  const nextIndex = Math.min(
    session.currentLineIndex + 1,
    session.currentSong?.lyrics?.length ?? 0
  );

  return await updateSession(sessionId, {
    currentLineIndex: nextIndex,
  });
}

/**
 * Decrement line index
 */
export async function prevLine(sessionId: string): Promise<SessionState | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  const prevIndex = Math.max(session.currentLineIndex - 1, 0);

  return await updateSession(sessionId, {
    currentLineIndex: prevIndex,
  });
}

/**
 * Update playing state
 */
export async function updateSessionPlaying(
  sessionId: string,
  isPlaying: boolean
): Promise<SessionState | null> {
  return await updateSession(sessionId, {
    isPlaying,
  });
}

/**
 * Update session settings
 */
export async function updateSessionSettings(
  sessionId: string,
  settings: Partial<DisplaySettings>
): Promise<SessionState | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  return await updateSession(sessionId, {
    settings: {
      ...session.settings,
      ...settings,
    },
  });
}

// ============================================================================
// Session Discovery
// ============================================================================

/**
 * Get all active session IDs
 */
export async function getActiveSessionIds(): Promise<string[]> {
  // This would require SCAN operation for production
  // For now, return empty array as we track sessions via Socket.IO rooms
  return [];
}

// ============================================================================
// Session Validation
// ============================================================================

/**
 * Check if a session exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  return session !== null;
}

/**
 * Validate session access
 */
export async function canAccessSession(
  _sessionId: string,
  _userId: string | null
): Promise<boolean> {
  // 目前允許存取任何 session
  // 未來可能需要檢查使用者是否擁有該 session
  return true;
}
