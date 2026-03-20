/**
 * PlaylistDetailView — 播放清單歌曲詳情畫面
 *
 * 顯示播放清單中的歌曲列表，支援拖曳排序、重命名、刪除。
 * 使用 SortablePlaylist 元件實現拖曳排序。
 */

"use client";

import type { FC } from "react";
import type { ClientPlaylist } from "@/lib/api/playlists";
import type { ClientSong } from "@/lib/api/songs";
import { SortablePlaylist } from "@/components/playlist/SortablePlaylist";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

/** PlaylistDetailView 的 Props 介面 */
export interface PlaylistDetailViewProps {
  /** 目前選取的播放清單 */
  playlist: ClientPlaylist;
  /** 排序後的歌曲列表 */
  orderedSongs: ClientSong[];
  /** 目前正在播放的歌曲 ID */
  currentSongId: string | null;
  /** 重命名中的名稱，null 表示未在編輯 */
  editingName: string | null;
  /** 設定重命名名稱的回呼 */
  onEditingNameChange: (name: string | null) => void;
  /** 確認重命名的回呼 */
  onRename: () => void;
  /** 是否顯示刪除確認對話框 */
  deleteConfirm: boolean;
  /** 設定刪除確認對話框顯示狀態的回呼 */
  onDeleteConfirmChange: (open: boolean) => void;
  /** 確認刪除播放清單的回呼 */
  onConfirmDelete: () => void;
  /** 拖曳排序的回呼 */
  onReorder: (songs: ClientSong[]) => void;
  /** 選取歌曲的回呼 */
  onSelectSong: (songId: string) => void;
  /** 返回播放清單列表的回呼 */
  onBack: () => void;
}

export const PlaylistDetailView: FC<PlaylistDetailViewProps> = ({
  playlist,
  orderedSongs,
  currentSongId,
  editingName,
  onEditingNameChange,
  onRename,
  deleteConfirm,
  onDeleteConfirmChange,
  onConfirmDelete,
  onReorder,
  onSelectSong,
  onBack,
}) => {
  const t = useTranslations("controller.playlist");
  const tc = useTranslations("common");

  return (
    <>
      {/* 返回 + 標題 + 操作 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-dim shrink-0">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors p-1"
          type="button"
          title={t("backToPlaylists")}
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
              onChange={(e) => onEditingNameChange(e.target.value)}
              onBlur={onRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename();
                if (e.key === "Escape") onEditingNameChange(null);
              }}
              className="w-full px-1 py-0.5 bg-surface border border-primary/50 text-[13px] text-text-primary focus:outline-none font-body rounded-none"
              autoFocus
            />
          ) : (
            <p
              className="text-[13px] font-semibold text-text-primary truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => onEditingNameChange(playlist.name)}
              title={t("clickToRename")}
            >
              {playlist.name}
            </p>
          )}
          <p className="text-[10px] font-mono text-text-muted">
            {orderedSongs.length} {tc("tracks")}
          </p>
        </div>
        <button
          onClick={() => onDeleteConfirmChange(true)}
          className="text-text-muted hover:text-red-400 transition-colors p-1 shrink-0"
          type="button"
          title={t("deletePlaylist")}
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
          currentSongId={currentSongId}
          onReorder={onReorder}
          onSelect={onSelectSong}
        />
      </div>

      {/* 刪除播放清單確認對話框 */}
      <ConfirmDialog
        open={deleteConfirm}
        title={t("confirmDeleteTitle")}
        message={t("confirmDeleteMessage")}
        variant="destructive"
        confirmText={tc("delete")}
        onConfirm={onConfirmDelete}
        onCancel={() => onDeleteConfirmChange(false)}
      />
    </>
  );
};
