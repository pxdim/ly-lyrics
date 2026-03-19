/**
 * LibraryPanel — 歌曲庫面板（含 Songs / Playlists 分頁切換）
 *
 * 左欄主元件，以 Tab 切換歌曲列表（SongLibrary）和播放清單（PlaylistPanel）。
 */

"use client";

import { useState, type FC } from "react";
import dynamic from "next/dynamic";
import { SongLibrary } from "./SongLibrary";

// PlaylistPanel 攜帶 @dnd-kit（拖曳排序），僅在切換到 Playlists tab 時載入
const PlaylistPanel = dynamic(
  () => import("./PlaylistPanel").then((m) => ({ default: m.PlaylistPanel })),
  { ssr: false, loading: () => <div className="flex-1 animate-pulse bg-surface" /> },
);

/** 分頁類型 */
type LibraryTab = "songs" | "playlists";

export const LibraryPanel: FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>("songs");

  return (
    <div className="h-full flex flex-col border-r border-border-dim bg-surface">
      {/* Tab 切換 */}
      <div className="flex border-b border-border-dim bg-elevated shrink-0">
        {(["songs", "playlists"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[11px] font-mono tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === tab
                ? "text-primary border-primary bg-primary/5"
                : "text-text-muted border-transparent hover:text-text-primary hover:bg-elevated/80"
            }`}
            type="button"
          >
            {tab === "songs" ? "Songs" : "Playlists"}
          </button>
        ))}
      </div>

      {/* Tab 內容 */}
      {activeTab === "songs" ? <SongLibrary /> : <PlaylistPanel />}
    </div>
  );
};
