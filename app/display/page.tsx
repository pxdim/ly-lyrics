/**
 * Display Page
 *
 * Lyrics display for secondary screens/projectors.
 * Receives real-time updates via WebSocket from controller.
 * Design System v2.0 - Dark Tech Edition
 * 所有 UI 字串透過 next-intl useTranslations 取得。
 */

"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLyricsStore } from "@/lib/store";
import { LyricsDisplay } from "@/components/lyrics/LyricsDisplay";
import { LyricsControl } from "@/components/lyrics/LyricsControl";
import { ConnectionStatusBar } from "@/components/display/ConnectionStatusBar";
import { ConnectionIndicator } from "@/components/display/ConnectionIndicator";

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
  const t = useTranslations("display");
  const tc = useTranslations("common");
  const urlCode = searchParams.get("code")?.toUpperCase().slice(0, 6) ?? "";
  // Clean Output 模式：供 OBS/Resolume/VJ 軟體擷取，純黑背景 + 歌詞文字，無 UI chrome
  const isCleanOutput = searchParams.get("mode") === "clean";

  // 優先 URL 參數，其次 sessionStorage 記住的上次房間碼
  const initialCode = urlCode || (typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem("ly_display_code") ?? ""
    : "");
  const [connectionCode, setConnectionCode] = useState(initialCode);
  // 語意：是否已嘗試連線（輸入了 6 碼同步碼）。不代表 WebSocket 真正 connected，
  // 真正的連線狀態由 Zustand store 的 connectionState 管理。
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);
  const connect = useLyricsStore((state) => state.connect);
  const disconnect = useLyricsStore((state) => state.disconnect);
  const joinSession = useLyricsStore((state) => state.joinSession);
  const leaveSession = useLyricsStore((state) => state.leaveSession);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const connectionState = useLyricsStore((state) => state.connectionState);

  // 全螢幕模式
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FULLSCREEN_IDLE_TIMEOUT = 3000;

  // iOS Safari 不支援 Fullscreen API → 隱藏全螢幕按鈕
  const supportsFullscreen = typeof document !== "undefined" &&
    (!!document.documentElement.requestFullscreen ||
     !!(document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen);

  // 全螢幕切換（含 Safari 相容）
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    }
  }, []);

  // 監聽 fullscreenchange 同步 React 狀態
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // F 鍵快捷鍵
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  // 全螢幕自動隱藏控制列
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    // 進入全螢幕時先顯示，然後啟動隱藏計時
    setShowControls(true);
    const startHideTimer = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowControls(false), FULLSCREEN_IDLE_TIMEOUT);
    };
    startHideTimer();

    const handleMouseMove = () => {
      setShowControls(true);
      startHideTimer();
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen]);

  // 連線並加入 session — 當輸入完 6 碼同步碼後觸發（含 URL ?code= 自動連線）
  useEffect(() => {
    if (connectionCode.length === 6) {
      // 記住此房間碼，下次重新整理時自動回填
      sessionStorage.setItem("ly_display_code", connectionCode);
      connect();
      // 使用同步碼作為 sessionId，以 display 角色加入
      joinSession(connectionCode, "display");
      setHasAttemptedConnection(true);
    }
    // connect/joinSession 是穩定的 Zustand action，加入 deps 是安全的
  }, [connectionCode, connect, joinSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
      disconnect();
    };
    // leaveSession/disconnect 是穩定的 Zustand action
  }, [leaveSession, disconnect]);

  // Clean Output 未嘗試連線：純黑等待畫面，不顯示同步碼輸入 UI（觀眾不應看到技術介面）
  if (!hasAttemptedConnection && isCleanOutput) {
    return <div className="fixed inset-0" style={{ background: "#000000" }} />;
  }

  // Clean Output 已嘗試連線：純黑背景 + LyricsDisplay，無任何 UI chrome
  // 規格：即使 connectionState 為 disconnected / reconnecting，
  // Clean Output 模式仍只顯示歌詞（靜止在最後一次同步位置），不顯示任何重連 UI
  if (hasAttemptedConnection && isCleanOutput) {
    return (
      <div className="fixed inset-0 w-full h-full" style={{ background: "#000000" }}>
        <LyricsDisplay />
      </div>
    );
  }

  // 一般模式 — 尚未嘗試連線：顯示同步碼輸入畫面
  if (!hasAttemptedConnection) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />

        <div className="text-center space-y-6 sm:space-y-8 md:space-y-12 max-w-sm sm:max-w-md relative z-10 p-4 sm:p-6 md:p-8">
          {/* Logo */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 bg-elevated border-2 border-primary/30 rounded-3xl shadow-glow-lg">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-primary tracking-wider">
                {tc("appName")}
              </h1>
            </div>
            <p className="text-xl font-body text-text-muted tracking-wide">
              {tc("lyricsSystem")}
            </p>
            <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          {/* Connection Input */}
          <div className="space-y-6">
            <p className="font-body text-text-muted">
              {t("enterCode")}
            </p>

            <div className="relative">
              <input
                type="text"
                value={connectionCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 6);
                  setConnectionCode(value);
                }}
                placeholder={t("codePlaceholder")}
                className="w-full px-6 py-5 text-2xl sm:text-3xl md:text-4xl font-mono text-center bg-elevated text-primary rounded-2xl border-2 border-primary/30 focus:outline-none focus:border-primary focus:shadow-glow-md transition-all tracking-[0.5em] placeholder:text-primary/20"
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
              <p className="font-heading font-semibold text-text-primary">{t("quickStepsTitle")}</p>
            </div>
            <ol className="list-decimal list-inside space-y-3 font-body text-sm text-text-muted">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">1.</span>
                <span>{t("step1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">2.</span>
                <span>{t("step2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">3.</span>
                <span>{t("step3")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">4.</span>
                <span>{t("step4")}</span>
              </li>
            </ol>
            <p className="text-xs text-text-muted/60 pt-2 border-t border-border-dim">
              {t("directLinkHint")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected - Display Lyrics
  return (
    <div className="relative min-h-screen w-full bg-void">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-20 pointer-events-none" />

      {/* 背景光暈 */}
      <div className="glow-orb-primary" style={{ top: '-10%', left: '-5%' }} />
      <div className="glow-orb-secondary" style={{ bottom: '-10%', right: '-5%' }} />

      {/* Disconnect/Reconnect Status Banner */}
      <ConnectionStatusBar />

      {/* Main Lyrics Display */}
      <div style={{ opacity: connectionState === "disconnected" ? 0.5 : 1, transition: "opacity 300ms ease" }}>
        <LyricsDisplay />
      </div>

      {/* Floating Controls — 全螢幕時自動隱藏 */}
      <div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        <LyricsControl
          compact={true}
          position="floating"
          isFullscreen={isFullscreen}
          onToggleFullscreen={supportsFullscreen ? toggleFullscreen : undefined}
        />
      </div>

      {/* Song Info Overlay (top left, fades out) */}
      {currentSong && (
        <div className="fixed top-6 left-6 animate-fade-out-slow z-40">
          <div className="bg-elevated/80 backdrop-blur-md rounded-xl px-6 py-3 border border-border-dim shadow-glow-sm">
            <p className="font-heading font-semibold text-primary">{currentSong.title}</p>
            {currentSong.artist && (
              <p className="font-body text-sm text-text-muted">{currentSong.artist}</p>
            )}
          </div>
        </div>
      )}

      {/* Connection Status Indicator (top right) — 全螢幕時自動隱藏 */}
      <div
        className="fixed top-6 right-6 z-40 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        <ConnectionIndicator />
      </div>
    </div>
  );
}
