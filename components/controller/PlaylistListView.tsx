/**
 * PlaylistListView — 播放清單列表主畫面
 *
 * 顯示所有播放清單，支援點選進入詳情、新增播放清單。
 */

"use client";

import type { FC } from "react";
import type { ClientPlaylist } from "@/lib/api/playlists";
import { useTranslations } from "next-intl";

/** PlaylistListView 的 Props 介面 */
export interface PlaylistListViewProps {
  /** 所有播放清單 */
  playlists: ClientPlaylist[];
  /** 是否正在載入 */
  isLoading: boolean;
  /** 點選播放清單時的回呼 */
  onSelectPlaylist: (playlist: ClientPlaylist) => void;
  /** 點選新增按鈕時的回呼 */
  onShowCreate: () => void;
}

export const PlaylistListView: FC<PlaylistListViewProps> = ({
  playlists,
  isLoading,
  onSelectPlaylist,
  onShowCreate,
}) => {
  const t = useTranslations("controller.playlist");
  const tc = useTranslations("common");

  return (
    <>
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-dim shrink-0">
        <span className="text-[11px] font-mono text-text-muted">
          {playlists.length} {tc("lists")}
        </span>
        <button
          onClick={onShowCreate}
          className="text-text-muted hover:text-text-primary transition-colors"
          type="button"
          title={t("newPlaylist")}
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
          <div className="p-4 text-center text-[12px] text-text-muted font-mono uppercase">
            {tc("loading")}
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
              {t("noPlaylists")}
            </p>
            <button
              onClick={onShowCreate}
              className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
              type="button"
            >
              {t("createFirst")}
            </button>
          </div>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
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
                  {pl.songIds.length} {tc("tracks")}
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
