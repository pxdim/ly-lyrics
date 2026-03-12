/**
 * WebSocket API Route
 *
 * Next.js 15 API route for WebSocket/Socket.IO connections.
 *
 * Note: Socket.IO requires a dedicated HTTP server. In Next.js App Router,
 * we use a custom server approach for WebSocket connections.
 *
 * This file documents the WebSocket API. Actual implementation is in
 * the custom server setup (see next.config.ts and server.ts).
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// WebSocket endpoint information
export async function GET(_request: NextRequest) {
  const wsUrl = process.env["WEBSOCKET_URL"] || "ws://localhost:3001";

  return NextResponse.json({
    message: "WebSocket server for real-time lyrics synchronization",
    version: "1.0.0",
    endpoints: {
      websocket: wsUrl,
      documentation: "/api/ws/docs",
    },
    events: {
      clientToServer: [
        "join_session",
        "change_line",
        "next_line",
        "prev_line",
        "set_song",
        "update_settings",
        "set_playing",
      ],
      serverToClient: [
        "session_state",
        "line_changed",
        "song_changed",
        "settings_updated",
        "playing_changed",
        "client_joined",
        "client_left",
        "error",
      ],
    },
    usage: {
      join_session: {
        description: "Join a synchronization session",
        payload: {
          sessionId: "string (required)",
          role: "'controller' | 'display' | 'admin' (required)",
          userId: "string (optional)",
        },
      },
      change_line: {
        description: "Change the current lyric line",
        payload: {
          lineIndex: "number (required, >= 0)",
        },
      },
    },
  });
}
