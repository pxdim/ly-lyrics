/**
 * PlaylistPanel — 播放清單管理面板
 *
 * 包含播放清單列表、建立新清單（選擇歌曲）、清單詳情（重命名/刪除/拖曳排序）。
 * 使用 SortablePlaylist 元件支援拖曳排序。
 * 使用 ConfirmDialog 取代原生 confirm() 呼叫。
 */

"use client";

import { useEffect, useState, useCallback, type FC } from "react";
import { useLyricsStore } from "@/lib/store";
import { fetchSongs, type ClientSong } from "@/lib/api/songs";
import {
  fetchPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  type ClientPlaylist,
} from "@/lib/api/playlists";
import { SortablePlaylist } from "@/components/playlist/SortablePlaylist";
import { usePlaylistReorder } from "@/lib/hooks/usePlaylistReorder";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export const PlaylistPanel: FC = () => {
  const [playlists, setPlaylists] = useState<ClientPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<ClientPlaylist | null>(null);

  // 載入所有歌曲（用於建立播放清單時的歌曲選擇 + 載入播放清單歌曲）
  const [allSongs, setAllSongs] = useState<ClientSong[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(
    new Set(),
  );

  const setCurrentSong = useLyricsStore((state) => state.setCurrentSong);
  const currentSong = useLyricsStore((state) => state.currentSong);

  // 重命名
  const [editingName, setEditingName] = useState<string | null>(null);

  // ConfirmDialog 狀態（取代原生 confirm()）
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const loadPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await fetchPlaylists({ limit: 100 });
      setPlaylists(result.data);
    } catch (err) {
      console.error("載入播放清單失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllSongs = useCallback(async () => {
    try {
      const result = await fetchSongs({ limit: 200 });
      setAllSongs(result.data);
    } catch (err) {
      console.error("載入歌曲失敗:", err);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
    loadAllSongs();
  }, [loadPlaylists, loadAllSongs]);

  // 建立播放清單
  const handleCreate = async () => {
    if (!newName.trim() || selectedSongIds.size === 0) return;
    setCreating(true);
    try {
      await createPlaylist({
        name: newName.trim(),
        songIds: Array.from(selectedSongIds),
      });
      setNewName("");
      setSelectedSongIds(new Set());
      setShowCreate(false);
      await loadPlaylists();
    } catch (err) {
      console.error("建立播放清單失敗:", err);
    } finally {
      setCreating(false);
    }
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  };

  // 選取播放清單 → 顯示其歌曲
  const handleSelectPlaylist = (pl: ClientPlaylist) => {
    setSelectedPlaylist(pl);
    setShowCreate(false);
  };

  // 從播放清單中選曲
  const handleSelectSongFromPlaylist = (song: ClientSong) => {
    setCurrentSong(song as Parameters<typeof setCurrentSong>[0]);
  };

  // 返回播放清單列表
  const handleBack = () => {
    setSelectedPlaylist(null);
    setEditingName(null);
  };

  const handleRename = async () => {
    if (!selectedPlaylist || editingName === null || !editingName.trim()) return;
    try {
      const updated = await updatePlaylist(selectedPlaylist.id, {
        name: editingName.trim(),
      });
      setSelectedPlaylist(updated);
      setEditingName(null);
      await loadPlaylists();
    } catch (err) {
      console.error("重命名播放清單失敗:", err);
    }
  };

  // 確認刪除播放清單
  const handleConfirmDeletePlaylist = async () => {
    setDeleteConfirm(false);
    if (!selectedPlaylist) return;
    try {
      await deletePlaylist(selectedPlaylist.id);
      setSelectedPlaylist(null);
      await loadPlaylists();
    } catch (err) {
      console.error("刪除播放清單失敗:", err);
    }
  };

  // 拖曳排序 hook（在 selectedPlaylist 判斷之前呼叫，遵守 React hooks 規則）
  const { orderedSongs, handleReorder } = usePlaylistReorder({
    playlist: selectedPlaylist,
    allSongs,
    setPlaylist: setSelectedPlaylist,
  });

  // ── 播放清單歌曲詳情畫面 ──
  if (selectedPlaylist) {
    return (
      <>
        {/* 返回 + 標題 + 操作 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-dim shrink-0">
          <button
            onClick={handleBack}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            type="button"
            title="返回播放清單"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            {editingName !== null ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setEditingName(null);
                }}
                className="w-full px-1 py-0.5 bg-surface border border-primary/50 text-[13px] text-text-primary focus:outline-none font-body rounded-none"
                autoFocus
              />
            ) : (
              <p
                className="text-[13px] font-semibold text-text-primary truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditingName(selectedPlaylist.name)}
                title="點擊重命名"
              >
                {selectedPlaylist.name}
              </p>
            )}
            <p className="text-[10px] font-mono text-text-muted">
              {orderedSongs.length} TRACKS
            </p>
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-text-muted hover:text-red-400 transition-colors p-1 shrink-0"
            type="button"
            title="刪除播放清單"
          >
            <svg
              width="14"
              height="14"
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

        {/* 可拖曳排序歌曲列表 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <SortablePlaylist
            songs={orderedSongs}
            currentSongId={currentSong?.id ?? null}
            onReorder={handleReorder}
            onSelect={(songId) => {
              const song = allSongs.find((s) => s.id === songId);
              if (song) handleSelectSongFromPlaylist(song);
            }}
          />
        </div>

        {/* 刪除播放清單確認對話框 */}
        <ConfirmDialog
          open={deleteConfirm}
          title="確認刪除"
          message="確定要刪除此播放清單嗎？此操作無法復原。"
          variant="destructive"
          confirmText="刪除"
          onConfirm={handleConfirmDeletePlaylist}
          onCancel={() => setDeleteConfirm(false)}
        />
      </>
    );
  }

  // ── 建立播放清單畫面 ──
  if (showCreate) {
    return (
      <>
        {/* 返回 + 標題 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-dim shrink-0">
          <button
            onClick={() => {
              setShowCreate(false);
              setSelectedSongIds(new Set());
            }}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            type="button"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-text-primary">
            新增播放清單
          </span>
        </div>

        {/* 名稱輸入 */}
        <div className="px-3 py-2 border-b border-border-dim shrink-0">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="播放清單名稱..."
            className="w-full px-3 py-1.5 bg-surface border border-border-dim text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none"
            autoFocus
          />
        </div>

        {/* 選擇歌曲提示 */}
        <div className="px-3 py-1.5 border-b border-border-dim shrink-0">
          <span className="text-[10px] font-mono text-text-muted">
            選擇歌曲 ({selectedSongIds.size} SELECTED)
          </span>
        </div>

        {/* 歌曲多選列表 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {allSongs.map((song) => {
            const isSelected = selectedSongIds.has(song.id);
            return (
              <div
                key={song.id}
                onClick={() => toggleSongSelection(song.id)}
                className={`flex items-center gap-3 px-4 py-2 border-b border-border-dim/50 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-text-primary"
                    : "hover:bg-elevated/50 text-text-muted hover:text-text-primary"
                }`}
              >
                <div
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-border-dim"
                  }`}
                >
                  {isSelected && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="hsl(var(--color-surface))"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px]">{song.title}</p>
                  {song.artist && (
                    <p className="text-[11px] text-text-muted truncate">
                      {song.artist}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 建立按鈕 */}
        <div className="p-3 border-t border-border-dim shrink-0">
          <button
            onClick={handleCreate}
            disabled={
              creating || !newName.trim() || selectedSongIds.size === 0
            }
            className="w-full py-2 bg-primary text-surface font-mono text-[12px] tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            type="button"
          >
            {creating ? "CREATING..." : "CREATE PLAYLIST"}
          </button>
        </div>
      </>
    );
  }

  // ── 播放清單列表主畫面 ──
  return (
    <>
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-dim shrink-0">
        <span className="text-[11px] font-mono text-text-muted">
          {playlists.length} LISTS
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="text-text-muted hover:text-text-primary transition-colors"
          type="button"
          title="新增播放清單"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 播放清單列表 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-[12px] text-text-muted font-mono">
            LOADING...
          </div>
        ) : playlists.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="mx-auto text-border-dim"
            >
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
            <p className="font-mono text-[12px] text-text-muted">
              NO PLAYLISTS
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
              type="button"
            >
              + CREATE FIRST
            </button>
          </div>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => handleSelectPlaylist(pl)}
              className="group flex items-center gap-3 px-4 py-3 border-b border-border-dim/50 cursor-pointer transition-colors hover:bg-elevated/50 text-text-muted hover:text-text-primary"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px]">{pl.name}</p>
                <p className="text-[10px] font-mono text-text-muted">
                  {pl.songIds.length} tracks
                </p>
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))
        )}
      </div>
    </>
  );
};
