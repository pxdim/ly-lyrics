/**
 * Display Page
 *
 * Lyrics display for secondary screens/projectors.
 * Receives real-time updates via WebSocket from controller.
 */

"use client";

import { useEffect, useState } from "react";
import { useLyricsStore } from "@/lib/store";
import { LyricsDisplay } from "@/components/lyrics/LyricsDisplay";
import { LyricsControl } from "@/components/lyrics/LyricsControl";

export default function DisplayPage() {
  const [connectionCode, setConnectionCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const { connect, disconnect, currentSong } = useLyricsStore();

  // Handle connection
  useEffect(() => {
    if (connectionCode.length === 6) {
      // Simulate connection - in production, this would validate via WebSocket
      setIsConnected(true);
      connect();
    }
  }, [connectionCode, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Connection Screen
  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center space-y-8 max-w-md">
          {/* Logo */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary-500">LY</h1>
            <p className="text-xl text-muted-foreground">歌詞顯示系統</p>
          </div>

          {/* Connection Input */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              輸入控制器顯示的同步碼以連接
            </p>
            <input
              type="text"
              value={connectionCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().slice(0, 6);
                setConnectionCode(value);
              }}
              placeholder="XXXXXX"
              className="w-full px-6 py-4 text-3xl font-mono text-center bg-gray-900 text-white rounded-xl border-2 border-primary-600 focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary/20 transition-all"
              maxLength={6}
              autoFocus
            />

            {/* Quick connect button (for demo) */}
            <button
              onClick={() => setConnectionCode("DEMO01")}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              連接
            </button>
          </div>

          {/* Instructions */}
          <div className="text-left space-y-2 text-sm text-muted-foreground bg-gray-900/50 rounded-lg p-4">
            <p className="font-medium text-foreground">快速連接步驟:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>在控制器上選擇歌曲</li>
              <li>複製控制器顯示的同步碼</li>
              <li>在上方輸入框輸入同步碼</li>
              <li>點擊連接按鈕</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Connected - Display Lyrics
  return (
    <div className="relative min-h-screen w-full">
      {/* Main Lyrics Display */}
      <LyricsDisplay />

      {/* Floating Controls */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <LyricsControl compact={true} position="floating" />
      </div>

      {/* Song Info Overlay (top left, fades out) */}
      {currentSong && (
        <div className="fixed top-4 left-4 animate-[fade-out_3s_ease-out_forwards]">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-white font-medium">{currentSong.title}</p>
            {currentSong.artist && (
              <p className="text-sm text-white/70">{currentSong.artist}</p>
            )}
          </div>
        </div>
      )}

      {/* Connection Status Indicator (top right) */}
      <div className="fixed top-4 right-4">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white/70">已連接</span>
        </div>
      </div>
    </div>
  );
}
