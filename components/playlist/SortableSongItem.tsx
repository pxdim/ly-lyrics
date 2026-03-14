/**
 * 可拖曳歌曲項目元件
 *
 * 使用 @dnd-kit/sortable 提供拖曳排序能力。
 * 拖曳手柄（GripVertical）與歌曲選取區域分離，
 * 避免拖曳操作與點擊選曲互相干擾。
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ClientSong } from "@/lib/api/songs";

interface SortableSongItemProps {
  /** 歌曲資料 */
  song: ClientSong;
  /** 列表索引（從 0 開始，顯示時 +1） */
  index: number;
  /** 是否為當前播放中的歌曲 */
  isActive: boolean;
  /** 點擊選取歌曲的回呼 */
  onSelect: (songId: string) => void;
}

export function SortableSongItem({ song, index, isActive, onSelect }: SortableSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="sortable-song-item"
      className={`group flex items-center gap-2 px-3 py-2.5 border-b border-[#2A2D35]/50 transition-colors ${
        isDragging
          ? "opacity-50 bg-[#16181D] z-50"
          : isActive
            ? "bg-[#16181D] text-[#E4E7EB] border-l-2 border-l-primary relative"
            : "hover:bg-[#16181D]/50 text-[#6B7280] hover:text-[#E4E7EB]"
      }`}
    >
      {/* 背景高亮（當前播放中） */}
      {isActive && !isDragging && (
        <div className="absolute inset-y-0 left-0 w-full bg-primary/5 pointer-events-none" />
      )}

      {/* 拖曳手柄 */}
      <button
        {...attributes}
        {...listeners}
        data-testid="drag-handle"
        className="cursor-grab active:cursor-grabbing p-0.5 text-[#6B7280] hover:text-[#E4E7EB] transition-colors shrink-0 touch-none"
        type="button"
        aria-label="拖曳排序"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* GripVertical 圖示 */}
          <circle cx="9" cy="5" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="19" r="1" fill="currentColor" />
          <circle cx="15" cy="5" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="19" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* 歌曲選取區域 */}
      <div
        data-testid="song-select-area"
        onClick={() => onSelect(song.id)}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
      >
        {/* 序號 */}
        <span className="font-mono text-[11px] w-5 shrink-0 text-right">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* 播放/音符圖示 */}
        {isActive ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary shrink-0">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B7280] shrink-0">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        )}

        {/* 歌曲資訊 */}
        <div className="flex-1 min-w-0 relative z-10">
          <p className={`truncate text-[13px] ${isActive ? "font-semibold" : ""}`}>{song.title}</p>
          {song.artist && <p className="text-[11px] text-[#6B7280] truncate">{song.artist}</p>}
        </div>

        {/* 歌詞行數 */}
        <span className="font-mono text-[10px] text-[#6B7280] shrink-0">{song.lyrics.length}L</span>
      </div>
    </div>
  );
}
