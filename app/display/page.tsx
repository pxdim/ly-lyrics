/**
 * Display Page
 *
 * Lyrics display for secondary screens/projectors.
 * Receives real-time updates via WebSocket from controller.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Check } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { LyricsDisplay } from "@/components/lyrics/LyricsDisplay";
import { LyricsControl } from "@/components/lyrics/LyricsControl";

/**
 * Suspense 外層包裝（Next.js 15 要求 useSearchParams 必須在 Suspense 內使用）
 */
export default function DisplayPageWrapper() {
  return (
    <Suspense fallback={<DisplayLoading />}>
      <DisplayPage />
    </Suspense>
  );
}

function DisplayLoading() {
  return (
    <div className="fixed inset-0 bg-void flex items-center justify-center">
      <div className="text-primary font-heading text-2xl animate-pulse">LY</div>
    </div>
  );
}

function DisplayPage() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get("code")?.toUpperCase().slice(0, 6) ?? "";

  const [connectionCode, setConnectionCode] = useState(urlCode);
  const [isConnected, setIsConnected] = useState(false);
  const connect = useLyricsStore((state) => state.connect);
  const disconnect = useLyricsStore((state) => state.disconnect);
  const joinSession = useLyricsStore((state) => state.joinSession);
  const leaveSession = useLyricsStore((state) => state.leaveSession);
  const currentSong = useLyricsStore((state) => state.currentSong);

  // 連線並加入 session — 當輸入完 6 碼同步碼後觸發（含 URL ?code= 自動連線）
  useEffect(() => {
    if (connectionCode.length === 6) {
      connect();
      // 使用同步碼作為 sessionId，以 display 角色加入
      joinSession(connectionCode, "display");
      setIsConnected(true);
    }
    // connect/joinSession 是穩定的 Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connection Screen
  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />

        <div className="text-center space-y-12 max-w-md relative z-10 p-8">
          {/* Logo */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-elevated border-2 border-primary/30 rounded-3xl shadow-glow-lg">
              <h1 className="text-6xl font-heading font-bold text-primary tracking-wider">
                LY
              </h1>
            </div>
            <p className="text-xl font-body text-text-muted tracking-wide">
              歌詞顯示系統
            </p>
            <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          {/* Connection Input */}
          <div className="space-y-6">
            <p className="font-body text-text-muted">
              輸入控制器顯示的同步碼以連接
            </p>

            <div className="relative">
              <input
                type="text"
                value={connectionCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 6);
                  setConnectionCode(value);
                }}
                placeholder="______"
                className="w-full px-6 py-5 text-4xl font-mono text-center bg-elevated text-primary rounded-2xl border-2 border-primary/30 focus:outline-none focus:border-primary focus:shadow-glow-md transition-all tracking-[0.5em] placeholder:text-primary/20"
                maxLength={6}
                autoFocus
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Link2 className="w-5 h-5 text-primary/50" strokeWidth={1.5} />
              </div>
            </div>

            {/* 當碼不足 6 位時顯示提示；碼完整時顯示連接狀態 */}
            {connectionCode.length < 6 && connectionCode.length > 0 && (
              <p className="text-[13px] font-mono text-primary/50">
                {connectionCode.length}/6
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="text-left bg-elevated border border-border-dim rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border-dim">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Check className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <p className="font-heading font-semibold text-text-primary">快速連接步驟</p>
            </div>
            <ol className="list-decimal list-inside space-y-3 font-body text-sm text-text-muted">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">1.</span>
                <span>開啟控制台頁面</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">2.</span>
                <span>點擊頂部狀態列的房間碼複製</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">3.</span>
                <span>在上方輸入框貼上 6 碼同步碼</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">4.</span>
                <span>輸入完畢自動連線</span>
              </li>
            </ol>
            <p className="text-xs text-text-muted/60 pt-2 border-t border-border-dim">
              或直接使用控制台的「複製連結」功能，在瀏覽器開啟即自動連線
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected - Display Lyrics
  return (
    <div className="relative min-h-screen w-full bg-void">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-20 pointer-events-none" />

      {/* Main Lyrics Display */}
      <LyricsDisplay />

      {/* Floating Controls */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <LyricsControl compact={true} position="floating" />
      </div>

      {/* Song Info Overlay (top left, fades out) */}
      {currentSong && (
        <div className="fixed top-6 left-6 animate-[fade-out_3s_ease-out_forwards] z-40">
          <div className="bg-elevated/80 backdrop-blur-md rounded-xl px-6 py-3 border border-border-dim shadow-glow-sm">
            <p className="font-heading font-semibold text-primary">{currentSong.title}</p>
            {currentSong.artist && (
              <p className="font-body text-sm text-text-muted">{currentSong.artist}</p>
            )}
          </div>
        </div>
      )}

      {/* Connection Status Indicator (top right) */}
      <div className="fixed top-6 right-6 z-40">
        <div className="flex items-center gap-3 bg-elevated/80 backdrop-blur-md rounded-full px-5 py-2 border border-accent/30 shadow-glow-accent">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
          <span className="font-body text-xs font-medium text-accent">已連接</span>
        </div>
      </div>
    </div>
  );
}
