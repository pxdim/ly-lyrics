/**
 * 播放列表重新排序 Hook
 *
 * 處理 optimistic update 與 API 持久化邏輯。
 * 排序失敗時自動回滾至原始順序。
 */

import { useMemo, useCallback } from "react";
import { updatePlaylist } from "@/lib/api/playlists";
import type { ClientPlaylist } from "@/lib/api/playlists";
import type { ClientSong } from "@/lib/api/songs";

interface UsePlaylistReorderOptions {
  /** 當前選取的播放清單（null 表示未選取） */
  playlist: ClientPlaylist | null;
  /** 所有可用歌曲（用於從 songIds 解析為 ClientSong） */
  allSongs: ClientSong[];
  /** 更新播放清單狀態的 setter */
  setPlaylist: (playlist: ClientPlaylist) => void;
}

interface UsePlaylistReorderResult {
  /** 已解析為 ClientSong 並依播放清單順序排列的歌曲 */
  orderedSongs: ClientSong[];
  /** 拖曳排序完成後呼叫，傳入新順序的歌曲陣列 */
  handleReorder: (reorderedSongs: ClientSong[]) => void;
}

export function usePlaylistReorder({
  playlist,
  allSongs,
  setPlaylist,
}: UsePlaylistReorderOptions): UsePlaylistReorderResult {
  // 將 songIds 解析為 ClientSong 物件，過濾掉找不到的歌曲
  const orderedSongs = useMemo(() => {
    if (!playlist) return [];
    return playlist.songIds
      .map((id) => allSongs.find((s) => s.id === id))
      .filter((s): s is ClientSong => s !== undefined);
  }, [playlist, allSongs]);

  const handleReorder = useCallback(
    (reorderedSongs: ClientSong[]) => {
      if (!playlist) return;

      const newSongIds = reorderedSongs.map((s) => s.id);
      const originalPlaylist = playlist;

      // Optimistic update：立即更新 UI
      setPlaylist({
        ...playlist,
        songIds: newSongIds,
      });

      // 呼叫 API 持久化
      updatePlaylist(playlist.id, { songIds: newSongIds }).catch(() => {
        // API 失敗時回滾
        setPlaylist(originalPlaylist);
      });
    },
    [playlist, setPlaylist]
  );

  return { orderedSongs, handleReorder };
}
