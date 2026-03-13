/**
 * 演出控制台
 *
 * 三欄式專業控制面板：歌曲庫 | 歌詞預覽 | 快速設定
 * 所有演出流程相關功能集中在同一頁面。
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  Music,
  Wifi,
  WifiOff,
  Monitor,
  Users,
  ChevronUp,
  ChevronDown,
  Palette,
  Settings,
} from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { fetchSongs, deleteSong, type ClientSong } from "@/lib/api/songs";
import { AddSongModal } from "@/components/controller/AddSongModal";

// ============================================================================
// 主頁面
// ============================================================================

export default function ControllerPage() {
  const connect = useLyricsStore((state) => state.connect);
  const disconnect = useLyricsStore((state) => state.disconnect);

  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex flex-col bg-void text-text-primary overflow-hidden">
      <StatusBar />
      <div className="flex-1 flex min-h-0">
        <SongLibrary />
        <LyricsPanel />
        <QuickSettings />
      </div>
      <ControlBar />
    </div>
  );
}

// ============================================================================
// 頂部狀態列
// ============================================================================

function StatusBar() {
  const isConnected = useLyricsStore((state) => state.isConnected);
  const controllerCount = useLyricsStore((state) => state.controllerCount);
  const displayCount = useLyricsStore((state) => state.displayCount);
  const currentSong = useLyricsStore((state) => state.currentSong);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border-dim shrink-0">
      {/* 左：標題 */}
      <div className="flex items-center gap-2">
        <Music size={16} className="text-primary" />
        <span className="font-heading text-sm font-bold tracking-wider text-primary">
          LY 演出控制台
        </span>
      </div>

      {/* 中：當前歌曲 */}
      <div className="flex items-center gap-2 text-xs font-body text-text-muted">
        {currentSong ? (
          <>
            <span className="text-text-primary font-semibold">{currentSong.title}</span>
            {currentSong.artist && (
              <span className="text-text-dim">— {currentSong.artist}</span>
            )}
          </>
        ) : (
          <span className="text-text-dim">未選擇歌曲</span>
        )}
      </div>

      {/* 右：連線狀態 */}
      <div className="flex items-center gap-4 text-xs font-body">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi size={12} className="text-accent" />
          ) : (
            <WifiOff size={12} className="text-red-400" />
          )}
          <span className={isConnected ? "text-accent" : "text-red-400"}>
            {isConnected ? "已連線" : "離線"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Monitor size={12} />
          <span>{controllerCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Users size={12} />
          <span>{displayCount}</span>
        </div>
        {/* 同步碼 */}
        <div className="font-mono text-xs text-primary font-bold tracking-widest px-2 py-0.5 bg-primary/10 border border-primary/20 rounded">
          {currentSong?.id.slice(-6).toUpperCase() || "------"}
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// 左欄：歌曲庫
// ============================================================================

function SongLibrary() {
  const [songs, setSongs] = useState<ClientSong[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentSong = useLyricsStore((state) => state.currentSong);
  const setCurrentSong = useLyricsStore((state) => state.setCurrentSong);

  const loadSongs = useCallback(async (searchQuery?: string) => {
    try {
      setIsLoading(true);
      const params: { limit: number; search?: string } = { limit: 100 };
      if (searchQuery) params.search = searchQuery;
      const result = await fetchSongs(params);
      setSongs(result.data);
    } catch (err) {
      console.error("載入歌曲失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  // 搜尋防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSongs(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadSongs]);

  const handleSelectSong = (song: ClientSong) => {
    // 使用 as 轉型，ClientSong 與 Song 結構相同
    setCurrentSong(song as Parameters<typeof setCurrentSong>[0]);
  };

  const handleDeleteSong = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    if (!confirm("確定要刪除這首歌曲嗎？")) return;

    setDeletingId(songId);
    try {
      await deleteSong(songId);
      if (currentSong?.id === songId) {
        setCurrentSong(null);
      }
      await loadSongs(search);
    } catch (err) {
      console.error("刪除歌曲失敗:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <aside className="w-[280px] shrink-0 flex flex-col bg-surface border-r border-border-dim">
        {/* 搜尋 + 新增 */}
        <div className="p-3 space-y-2 border-b border-border-dim">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋歌曲..."
              className="w-full pl-8 pr-3 py-1.5 bg-void/50 border border-border-dim rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-primary/40 transition-colors font-body"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-xs text-primary font-semibold hover:bg-primary/20 transition-colors font-body"
            type="button"
          >
            <Plus size={13} />
            新增歌曲
          </button>
        </div>

        {/* 歌曲列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-text-dim font-body">載入中...</div>
          ) : songs.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-dim font-body">
              {search ? "找不到歌曲" : "尚無歌曲"}
            </div>
          ) : (
            songs.map((song) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer border-l-2 transition-colors ${
                    isActive
                      ? "bg-primary/10 border-primary text-text-primary"
                      : "border-transparent hover:bg-elevated text-text-muted hover:text-text-primary"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate font-body">
                      {song.title}
                    </div>
                    {song.artist && (
                      <div className="text-[10px] text-text-dim truncate font-body">
                        {song.artist}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-text-dim font-mono">
                      {song.lyrics.length}行
                    </span>
                    <button
                      onClick={(e) => handleDeleteSong(e, song.id)}
                      disabled={deletingId === song.id}
                      className="p-1 rounded hover:bg-red-500/20 transition-colors"
                      type="button"
                      title="刪除歌曲"
                    >
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 歌曲數量 */}
        <div className="px-3 py-1.5 border-t border-border-dim text-[10px] text-text-dim font-body">
          共 {songs.length} 首歌曲
        </div>
      </aside>

      <AddSongModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSongAdded={() => loadSongs(search)}
      />
    </>
  );
}

// ============================================================================
// 中欄：歌詞面板（全部歌詞 + 點擊跳轉）
// ============================================================================

function LyricsPanel() {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const jumpToLine = useLyricsStore((state) => state.jumpToLine);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const displaySettings = useLyricsStore((state) => state.displaySettings);

  const activeLineRef = useRef<HTMLDivElement>(null);

  // 自動滾動到當前行
  useEffect(() => {
    if (activeLineRef.current && displaySettings.autoScroll) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, displaySettings.autoScroll]);

  if (!currentSong || lyrics.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center bg-void/50">
        <div className="text-center space-y-2">
          <Music size={32} className="mx-auto text-text-dim opacity-30" />
          <p className="font-heading text-sm text-text-dim tracking-wider">
            未選擇歌曲
          </p>
          <p className="font-body text-xs text-text-dim opacity-60">
            從左側歌曲庫選擇一首歌曲開始
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-void/30">
      {/* 歌曲標題 */}
      <div className="px-4 py-2 border-b border-border-dim bg-surface/50 shrink-0">
        <div className="flex items-center gap-2">
          <Music size={14} className="text-primary shrink-0" />
          <span className="font-body text-sm font-semibold text-text-primary truncate">
            {currentSong.title}
          </span>
          {currentSong.artist && (
            <span className="font-body text-xs text-text-dim truncate">
              — {currentSong.artist}
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] text-text-dim shrink-0">
            {lyrics.length} 行
          </span>
        </div>
      </div>

      {/* 歌詞列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {lyrics.map((line, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : undefined}
              onClick={() => jumpToLine(idx)}
              className={`flex items-start gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                isActive
                  ? "bg-primary/10 shadow-glow-sm"
                  : "hover:bg-elevated/50"
              }`}
            >
              {/* 行號 */}
              <span
                className={`shrink-0 w-7 text-right font-mono text-[10px] leading-5 ${
                  isActive ? "text-primary font-bold" : "text-text-dim"
                }`}
              >
                {idx + 1}
              </span>

              {/* 歌詞文字 */}
              <span
                className={`flex-1 text-sm leading-5 font-body transition-all duration-150 ${
                  isActive
                    ? "font-bold"
                    : "text-text-muted"
                }`}
                style={isActive ? { color: displaySettings.highlightColor } : undefined}
              >
                {line || "(空行)"}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ============================================================================
// 右欄：快速設定
// ============================================================================

const HIGHLIGHT_COLORS = [
  { value: "#00D9FF", label: "藍" },
  { value: "#A855F7", label: "紫" },
  { value: "#00FF88", label: "綠" },
  { value: "#FF3366", label: "粉" },
  { value: "#FFB800", label: "金" },
  { value: "#FF6B00", label: "橘" },
] as const;

function QuickSettings() {
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const updateDisplaySettings = useLyricsStore((state) => state.updateDisplaySettings);

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-surface border-l border-border-dim overflow-y-auto">
      {/* 標題 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-dim">
        <Settings size={13} className="text-primary" />
        <span className="font-heading text-[11px] font-semibold uppercase tracking-wider text-primary">
          顯示設定
        </span>
      </div>

      <div className="p-3 space-y-4 text-xs">
        {/* 顯示行數 */}
        <SettingRow label="顯示行數" value={displaySettings.displayLines}>
          <input
            type="range"
            min={1}
            max={10}
            value={displaySettings.displayLines}
            onChange={(e) => updateDisplaySettings({ displayLines: parseInt(e.target.value, 10) })}
            className="w-full h-1 rounded bg-primary/20 accent-primary cursor-pointer"
          />
        </SettingRow>

        {/* 字體大小 */}
        <SettingRow label="字體大小" value={`${displaySettings.fontSize}px`}>
          <input
            type="range"
            min={16}
            max={64}
            step={2}
            value={displaySettings.fontSize}
            onChange={(e) => updateDisplaySettings({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full h-1 rounded bg-primary/20 accent-primary cursor-pointer"
          />
        </SettingRow>

        {/* 高亮色 */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Palette size={11} className="text-text-muted" />
            <span className="font-body text-[11px] text-text-muted uppercase tracking-wider">
              高亮色
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => updateDisplaySettings({ highlightColor: color.value })}
                className={`w-full aspect-square rounded-md transition-all ${
                  displaySettings.highlightColor === color.value
                    ? "ring-2 ring-offset-1 ring-offset-surface scale-110"
                    : "hover:scale-105 opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: color.value,
                  "--tw-ring-color": color.value,
                } as React.CSSProperties}
                type="button"
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* 主題 */}
        <div>
          <span className="block font-body text-[11px] text-text-muted uppercase tracking-wider mb-2">
            主題
          </span>
          <div className="flex gap-1">
            {(["dark", "light"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateDisplaySettings({ theme })}
                className={`flex-1 py-1 rounded text-[11px] font-body transition-colors ${
                  displaySettings.theme === theme
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-void/50 text-text-dim border border-border-dim hover:border-primary/20"
                }`}
                type="button"
              >
                {theme === "dark" ? "深色" : "淺色"}
              </button>
            ))}
          </div>
        </div>

        {/* 開關選項 */}
        <div className="space-y-2">
          <ToggleRow
            label="背景顯示"
            checked={displaySettings.showBackground}
            onChange={(v) => updateDisplaySettings({ showBackground: v })}
          />
          <ToggleRow
            label="自動滾動"
            checked={displaySettings.autoScroll}
            onChange={(v) => updateDisplaySettings({ autoScroll: v })}
          />
          <ToggleRow
            label="動畫效果"
            checked={displaySettings.enableAnimation}
            onChange={(v) => updateDisplaySettings({ enableAnimation: v })}
          />
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// 底部控制列
// ============================================================================

function ControlBar() {
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const lyrics = useLyricsStore((state) => state.lyrics);
  const nextLine = useLyricsStore((state) => state.nextLine);
  const prevLine = useLyricsStore((state) => state.prevLine);

  const totalLines = lyrics.length;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalLines - 1;

  // 鍵盤快捷鍵：方向鍵控制上下句
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (canGoPrev) prevLine();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        if (canGoNext) nextLine();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoPrev, canGoNext, prevLine, nextLine]);

  if (totalLines === 0) {
    return (
      <footer className="flex items-center justify-center px-4 py-2.5 bg-surface border-t border-border-dim shrink-0">
        <span className="text-xs text-text-dim font-body">選擇歌曲以啟用控制</span>
      </footer>
    );
  }

  return (
    <footer className="flex items-center justify-center gap-6 px-4 py-2 bg-surface border-t border-border-dim shrink-0">
      {/* 上一句 */}
      <button
        onClick={prevLine}
        disabled={!canGoPrev}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-dim text-xs font-body hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        type="button"
        title="上一句 (↑)"
      >
        <ChevronUp size={14} />
        上一句
      </button>

      {/* 進度 */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-primary font-bold">
          {currentIndex + 1}
        </span>
        <div className="w-32 h-1 bg-void rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-200"
            style={{ width: `${((currentIndex + 1) / totalLines) * 100}%` }}
          />
        </div>
        <span className="font-mono text-sm text-text-dim">
          {totalLines}
        </span>
      </div>

      {/* 下一句 */}
      <button
        onClick={nextLine}
        disabled={!canGoNext}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-xs text-primary font-semibold font-body hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        type="button"
        title="下一句 (↓)"
      >
        下一句
        <ChevronDown size={14} />
      </button>
    </footer>
  );
}

// ============================================================================
// 共用小元件
// ============================================================================

function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string | number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-body text-[11px] text-text-muted uppercase tracking-wider">
          {label}
        </span>
        <span className="font-mono text-[11px] text-primary font-semibold">{value}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="font-body text-[11px] text-text-muted group-hover:text-text-primary transition-colors">
        {label}
      </span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-7 h-4 rounded-full transition-colors cursor-pointer flex items-center ${
          checked ? "bg-primary/40" : "bg-void"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full transition-all ${
            checked ? "translate-x-3.5 bg-primary" : "translate-x-0.5 bg-text-dim"
          }`}
        />
      </div>
    </label>
  );
}
