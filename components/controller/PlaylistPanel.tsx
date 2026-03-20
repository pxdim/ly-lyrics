/**
 * PlaylistPanel — 播放清單管理面板
 *
 * 組合層：管理狀態與 API 呼叫，將 UI 委派給子元件。
 * 包含三個視圖：播放清單列表、建立新清單、清單詳情。
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
import { usePlaylistReorder } from "@/lib/hooks/usePlaylistReorder";
import { logger } from "@/lib/utils/logger";
import { PlaylistListView } from "./PlaylistListView";
import { PlaylistCreateView } from "./PlaylistCreateView";
import { PlaylistDetailView } from "./PlaylistDetailView";

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
      logger.error("載入播放清單失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllSongs = useCallback(async () => {
    try {
      const result = await fetchSongs({ limit: 200 });
      setAllSongs(result.data);
    } catch (err) {
      logger.error("載入歌曲失敗:", err);
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
      logger.error("建立播放清單失敗:", err);
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
  const handleSelectSongFromPlaylist = (songId: string) => {
    const song = allSongs.find((s) => s.id === songId);
    if (song) {
      setCurrentSong(song as Parameters<typeof setCurrentSong>[0]);
    }
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
      logger.error("重命名播放清單失敗:", err);
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
      logger.error("刪除播放清單失敗:", err);
    }
  };

  // 建立畫面返回
  const handleCreateBack = () => {
    setShowCreate(false);
    setSelectedSongIds(new Set());
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
      <PlaylistDetailView
        playlist={selectedPlaylist}
        orderedSongs={orderedSongs}
        currentSongId={currentSong?.id ?? null}
        editingName={editingName}
        onEditingNameChange={setEditingName}
        onRename={handleRename}
        deleteConfirm={deleteConfirm}
        onDeleteConfirmChange={setDeleteConfirm}
        onConfirmDelete={handleConfirmDeletePlaylist}
        onReorder={handleReorder}
        onSelectSong={handleSelectSongFromPlaylist}
        onBack={handleBack}
      />
    );
  }

  // ── 建立播放清單畫面 ──
  if (showCreate) {
    return (
      <PlaylistCreateView
        allSongs={allSongs}
        newName={newName}
        onNewNameChange={setNewName}
        selectedSongIds={selectedSongIds}
        onToggleSong={toggleSongSelection}
        creating={creating}
        onCreate={handleCreate}
        onBack={handleCreateBack}
      />
    );
  }

  // ── 播放清單列表主畫面 ──
  return (
    <PlaylistListView
      playlists={playlists}
      isLoading={isLoading}
      onSelectPlaylist={handleSelectPlaylist}
      onShowCreate={() => setShowCreate(true)}
    />
  );
};
