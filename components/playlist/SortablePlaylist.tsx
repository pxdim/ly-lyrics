/**
 * 可排序播放列表容器元件
 *
 * 使用 @dnd-kit 提供拖曳排序功能。
 * 負責管理 DndContext 和 SortableContext，
 * 將排序結果透過 onReorder 回呼傳出。
 */

"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableSongItem } from "./SortableSongItem";
import type { ClientSong } from "@/lib/api/songs";

interface SortablePlaylistProps {
  /** 歌曲列表（已依播放清單順序排列） */
  songs: ClientSong[];
  /** 當前播放歌曲的 ID（用於高亮顯示） */
  currentSongId: string | null;
  /** 排序完成回呼，傳回新順序的歌曲陣列 */
  onReorder: (songs: ClientSong[]) => void;
  /** 選取歌曲回呼 */
  onSelect: (songId: string) => void;
}

export function SortablePlaylist({
  songs,
  currentSongId,
  onReorder,
  onSelect,
}: SortablePlaylistProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(songs, oldIndex, newIndex);
    onReorder(reordered);
  };

  if (songs.length === 0) {
    return (
      <div className="p-4 text-center text-[12px] text-[#6B7280] font-mono">
        NO SONGS FOUND
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={songs.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        {songs.map((song, idx) => (
          <SortableSongItem
            key={song.id}
            song={song}
            index={idx}
            isActive={currentSongId === song.id}
            onSelect={onSelect}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
