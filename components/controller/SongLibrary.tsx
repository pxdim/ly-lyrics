/**
 * SongLibrary — 歌曲庫面板
 *
 * 包含歌曲搜尋、排序（FR1.7）、新增（搜尋歌詞/手動輸入/匯入 LRC）、
 * 歌曲列表（選曲/刪除/匯出 LRC）。
 * 使用 ConfirmDialog 取代原生 confirm() 呼叫。
 */

"use client";

import { useEffect, useState, useCallback, useMemo, type FC } from "react";
import dynamic from "next/dynamic";
import { useLyricsStore } from "@/lib/store";
import { fetchSongs, deleteSong, type ClientSong } from "@/lib/api/songs";
import type { AddSongTab } from "@/components/controller/AddSongModal";
import { LrcDropZone } from "@/components/lrc/LrcDropZone";
import { generateLrcContent, downloadLrcFile } from "@/lib/lrc/export";
import { Download, ArrowUpDown } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  sortSongs,
  type SortField,
  type SortOrder,
} from "@/lib/utils/song-sort";

// AddSongModal 攜帶 LyricsSearchPanel → opencc-js 繁簡字典（5.5MB）
// 只在使用者點擊「新增歌曲」時載入
const AddSongModal = dynamic(
  () => import("@/components/controller/AddSongModal").then((m) => ({ default: m.AddSongModal })),
  { ssr: false },
);

/**
 * 排序模式循環：關閉 → 歌名升冪 → 歌名降冪 → 歌手升冪 → 歌手降冪 → 關閉
 */
type SortMode =
  | "off"
  | "title-asc"
  | "title-desc"
  | "artist-asc"
  | "artist-desc";

const SORT_CYCLE: SortMode[] = [
  "off",
  "title-asc",
  "title-desc",
  "artist-asc",
  "artist-desc",
];

/** 排序模式對應的顯示文字 */
const SORT_LABELS: Record<SortMode, string> = {
  off: "",
  "title-asc": "歌名 A-Z",
  "title-desc": "歌名 Z-A",
  "artist-asc": "歌手 A-Z",
  "artist-desc": "歌手 Z-A",
};

/** 解析排序模式為 field + order */
function parseSortMode(
  mode: SortMode,
): { field: SortField; order: SortOrder } | null {
  if (mode === "off") return null;
  const [field, order] = mode.split("-") as [SortField, SortOrder];
  return { field, order };
}

export const SongLibrary: FC = () => {
  const [songs, setSongs] = useState<ClientSong[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<AddSongTab>("search");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("off");

  // ConfirmDialog 狀態（取代原生 confirm()）
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    songId?: string;
  }>({ open: false });

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

  // 排序後的歌曲列表（memoized）
  const displaySongs = useMemo(() => {
    const parsed = parseSortMode(sortMode);
    if (!parsed) return songs;
    return sortSongs(songs, parsed.field, parsed.order);
  }, [songs, sortMode]);

  // 循環切換排序模式
  const handleCycleSort = useCallback(() => {
    setSortMode((prev) => {
      const currentIdx = SORT_CYCLE.indexOf(prev);
      const nextIdx = (currentIdx + 1) % SORT_CYCLE.length;
      return SORT_CYCLE[nextIdx] ?? "off";
    });
  }, []);

  const handleSelectSong = (song: ClientSong) => {
    setCurrentSong(song as Parameters<typeof setCurrentSong>[0]);
  };

  // 請求刪除：開啟 ConfirmDialog
  const handleRequestDelete = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, songId });
  };

  // 確認刪除
  const handleConfirmDelete = async () => {
    const songId = deleteConfirm.songId;
    setDeleteConfirm({ open: false });
    if (!songId) return;

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
      {/* 標題列 + 新增按鈕 */}
      <div className="px-4 py-2 border-b border-border-dim shrink-0 space-y-2">
        <span className="text-[11px] font-mono text-text-muted">
          {songs.length} TRACKS
        </span>
        <div className="flex gap-1.5">
          {(
            [
              {
                key: "search" as AddSongTab,
                icon: "🔍",
                label: "搜尋歌詞",
              },
              {
                key: "manual" as AddSongTab,
                icon: "✏️",
                label: "手動輸入",
              },
              {
                key: "lrc" as AddSongTab,
                icon: "📄",
                label: "匯入 LRC",
              },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => {
                setAddModalTab(btn.key);
                setShowAddModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-border-dim text-[11px] text-text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors font-mono"
            >
              <span>{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 搜尋 + 排序 */}
      <div className="px-3 py-2 border-b border-border-dim shrink-0">
        <div className="flex gap-1.5 items-center">
          <div className="relative flex-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋歌曲..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border-dim text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none"
            />
          </div>
          {/* 排序切換按鈕（FR1.7） */}
          <button
            type="button"
            aria-label="排序方式"
            onClick={handleCycleSort}
            className={`flex items-center gap-1 px-2 py-1.5 border text-[11px] font-mono transition-colors shrink-0 ${
              sortMode === "off"
                ? "border-border-dim text-text-muted hover:text-primary hover:border-primary/40"
                : "border-primary/40 text-primary bg-primary/5"
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortMode !== "off" && (
              <span>{SORT_LABELS[sortMode]}</span>
            )}
          </button>
        </div>
      </div>

      {/* LRC 匯入拖放區 */}
      <div className="px-3 py-2 border-b border-border-dim shrink-0">
        <LrcDropZone onImportSuccess={() => loadSongs(search)} />
      </div>

      {/* 歌曲列表 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-[12px] text-text-muted font-mono">
            LOADING...
          </div>
        ) : songs.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-text-muted font-mono">
            {search ? "NO RESULTS" : "EMPTY"}
          </div>
        ) : (
          displaySongs.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => handleSelectSong(song)}
                className={`group flex items-center gap-3 px-4 py-2.5 border-b border-border-dim/50 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-elevated text-text-primary border-l-2 border-l-primary relative"
                    : "hover:bg-elevated/50 text-text-muted hover:text-text-primary"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-full bg-primary/5 pointer-events-none" />
                )}
                <span className="font-mono text-[11px] w-5 shrink-0 text-right">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {isActive ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-primary shrink-0"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-text-muted shrink-0"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                )}
                <div className="flex-1 min-w-0 relative z-10">
                  <p
                    data-testid="song-title"
                    className={`truncate text-[13px] ${isActive ? "font-semibold" : ""}`}
                  >
                    {song.title}
                  </p>
                  {song.artist && (
                    <p className="text-[11px] text-text-muted truncate">
                      {song.artist}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 relative z-10">
                  <span className="font-mono text-[10px] text-text-muted">
                    {song.lyrics.length}L
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const content = generateLrcContent(
                        song.title,
                        song.artist ?? null,
                        song.lyrics,
                        song.lrcTimestamps,
                      );
                      downloadLrcFile(content, song.title);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary transition-all"
                    type="button"
                    title="匯出 LRC"
                  >
                    <Download className="w-[11px] h-[11px]" />
                  </button>
                  <button
                    onClick={(e) => handleRequestDelete(e, song.id)}
                    disabled={deletingId === song.id}
                    className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                    type="button"
                    title="刪除歌曲"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddSongModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSongAdded={() => loadSongs(search)}
        initialTab={addModalTab}
      />

      {/* 刪除歌曲確認對話框 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="確認刪除"
        message="確定要刪除這首歌曲嗎？此操作無法復原。"
        variant="destructive"
        confirmText="刪除"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </>
  );
};
