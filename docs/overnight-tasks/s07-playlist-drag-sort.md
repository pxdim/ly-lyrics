# S07: 播放列表拖曳排序

## 目標
讓使用者可以在 Controller 的播放列表中拖曳歌曲來重新排序。

## 參考檔案（請先讀取）
- `app/controller/page.tsx` — Controller 頁面，找到播放列表渲染區域（搜尋 "playlist" 或 "PlaylistSong"）
- `lib/api/playlists.ts` — 播放列表 API（updatePlaylist）
- `package.json` — 確認現有依賴

## 安裝依賴
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## 新建檔案
- `components/playlist/SortablePlaylist.tsx` — 可排序播放列表元件
- `components/playlist/SortableSongItem.tsx` — 單首可拖曳歌曲項目

## 修改檔案
- `app/controller/page.tsx` — 用 SortablePlaylist 取代現有靜態列表

## 實作細節

### @dnd-kit 整合模式
```tsx
// SortablePlaylist.tsx
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

interface Song {
  id: string;
  title: string;
  artist?: string;
}

interface SortablePlaylistProps {
  songs: Song[];
  onReorder: (songs: Song[]) => void;
  onSelect: (songId: string) => void;
}

export function SortablePlaylist({ songs, onReorder, onSelect }: SortablePlaylistProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songs.findIndex(s => s.id === active.id);
    const newIndex = songs.findIndex(s => s.id === over.id);
    const reordered = arrayMove(songs, oldIndex, newIndex);
    onReorder(reordered);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {songs.map(song => (
          <SortableSongItem key={song.id} song={song} onSelect={onSelect} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### SortableSongItem
```tsx
// SortableSongItem.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export function SortableSongItem({ song, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 ...dark-tech-style...">
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-500" />
      </button>
      <button onClick={() => onSelect(song.id)} className="flex-1 text-left">
        {song.title}
      </button>
    </div>
  );
}
```

### 排序持久化
重新排序後，呼叫 `updatePlaylist()` API 更新歌曲順序。
使用 optimistic update（先更新 UI，再發 API request）。

## 驗收標準
- [ ] @dnd-kit 安裝成功
- [ ] 播放列表歌曲可拖曳排序
- [ ] 拖曳時有視覺回饋（transform 動畫）
- [ ] 拖曳手柄明確（GripVertical icon）
- [ ] 排序後發送 API 更新
- [ ] npm run build 通過
- [ ] npx vitest run 通過

## Commit
```
feat(playlist): add drag-and-drop song reordering with @dnd-kit
```
