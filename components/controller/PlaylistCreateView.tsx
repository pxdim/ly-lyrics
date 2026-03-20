/**
 * PlaylistCreateView — 建立播放清單畫面
 *
 * 提供名稱輸入與歌曲多選列表，完成後建立新的播放清單。
 */

"use client";

import type { FC } from "react";
import type { ClientSong } from "@/lib/api/songs";
import { useTranslations } from "next-intl";

/** PlaylistCreateView 的 Props 介面 */
export interface PlaylistCreateViewProps {
  /** 所有可選歌曲 */
  allSongs: ClientSong[];
  /** 播放清單名稱 */
  newName: string;
  /** 更新播放清單名稱的回呼 */
  onNewNameChange: (name: string) => void;
  /** 已選取的歌曲 ID 集合 */
  selectedSongIds: Set<string>;
  /** 切換歌曲選取狀態的回呼 */
  onToggleSong: (songId: string) => void;
  /** 是否正在建立中 */
  creating: boolean;
  /** 點選建立按鈕時的回呼 */
  onCreate: () => void;
  /** 點選返回按鈕時的回呼 */
  onBack: () => void;
}

export const PlaylistCreateView: FC<PlaylistCreateViewProps> = ({
  allSongs,
  newName,
  onNewNameChange,
  selectedSongIds,
  onToggleSong,
  creating,
  onCreate,
  onBack,
}) => {
  const t = useTranslations("controller.playlist");
  const tc = useTranslations("common");

  return (
    <>
      {/* 返回 + 標題 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-dim shrink-0">
        <button
          onClick={onBack}
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
          {t("newPlaylist")}
        </span>
      </div>

      {/* 名稱輸入 */}
      <div className="px-3 py-2 border-b border-border-dim shrink-0">
        <input
          type="text"
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          placeholder={t("playlistNamePlaceholder")}
          className="w-full px-3 py-1.5 bg-surface border border-border-dim text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none"
          autoFocus
        />
      </div>

      {/* 選擇歌曲提示 */}
      <div className="px-3 py-1.5 border-b border-border-dim shrink-0">
        <span className="text-[10px] font-mono text-text-muted">
          {t("selectSongs")} ({selectedSongIds.size} {tc("selected")})
        </span>
      </div>

      {/* 歌曲多選列表 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {allSongs.map((song) => {
          const isSelected = selectedSongIds.has(song.id);
          return (
            <div
              key={song.id}
              onClick={() => onToggleSong(song.id)}
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
          onClick={onCreate}
          disabled={
            creating || !newName.trim() || selectedSongIds.size === 0
          }
          className="w-full py-2 bg-primary text-surface font-mono text-[12px] tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          type="button"
        >
          {creating ? t("creating") : t("createPlaylist")}
        </button>
      </div>
    </>
  );
};
