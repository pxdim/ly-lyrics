/**
 * SortablePlaylist 元件測試
 *
 * 測試排序容器的渲染、拖曳排序邏輯、回呼行為。
 * 排序邏輯（arrayMove）為核心行為，需獨立驗證。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortablePlaylist } from "./SortablePlaylist";
import type { ClientSong } from "@/lib/api/songs";

// Mock @dnd-kit — 自行觸發 onDragEnd 來測試排序邏輯
let capturedOnDragEnd: ((event: { active: { id: string }; over: { id: string } | null }) => void) | null = null;

vi.mock("@dnd-kit/core", () => ({
  DndContext: vi.fn(({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: typeof capturedOnDragEnd }) => {
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  }),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  )),
  verticalListSortingStrategy: "vertical",
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  useSortable: vi.fn(() => ({
    attributes: { role: "button", tabIndex: 0 },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
    setActivatorNodeRef: vi.fn(),
    over: null,
    active: null,
    activeIndex: -1,
    overIndex: -1,
    index: 0,
    isSorting: false,
    items: [],
    newIndex: 0,
    rect: { current: null },
    node: { current: null },
    data: { sortable: { containerId: "", index: 0, items: [] }, current: { sortable: { containerId: "", index: 0, items: [] } } },
    isOver: false,
    disabled: { draggable: false, droppable: false },
  })),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => undefined),
    },
  },
}));

// ============================================================================
// 測試輔助
// ============================================================================

function createSong(id: string, title: string): ClientSong {
  return {
    id,
    title,
    lyrics: ["歌詞"],
    userId: "u1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  };
}

const songs: ClientSong[] = [
  createSong("s1", "歌曲一"),
  createSong("s2", "歌曲二"),
  createSong("s3", "歌曲三"),
];

describe("SortablePlaylist", () => {
  beforeEach(() => {
    capturedOnDragEnd = null;
  });

  it("renders all songs", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={songs} currentSongId={null} onReorder={onReorder} onSelect={onSelect} />
    );

    expect(screen.getByText("歌曲一")).toBeTruthy();
    expect(screen.getByText("歌曲二")).toBeTruthy();
    expect(screen.getByText("歌曲三")).toBeTruthy();
  });

  it("wraps songs in DndContext and SortableContext", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={songs} currentSongId={null} onReorder={onReorder} onSelect={onSelect} />
    );

    expect(screen.getByTestId("dnd-context")).toBeTruthy();
    expect(screen.getByTestId("sortable-context")).toBeTruthy();
  });

  it("calls onReorder with reordered songs when drag ends", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={songs} currentSongId={null} onReorder={onReorder} onSelect={onSelect} />
    );

    // 模擬將 s1 拖到 s3 的位置
    capturedOnDragEnd?.({ active: { id: "s1" }, over: { id: "s3" } });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const reordered = onReorder.mock.calls[0]![0] as ClientSong[];
    expect(reordered.map((s) => s.id)).toEqual(["s2", "s3", "s1"]);
  });

  it("does not call onReorder when over is null (dropped outside)", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={songs} currentSongId={null} onReorder={onReorder} onSelect={onSelect} />
    );

    capturedOnDragEnd?.({ active: { id: "s1" }, over: null });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does not call onReorder when dropped on same position", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={songs} currentSongId={null} onReorder={onReorder} onSelect={onSelect} />
    );

    capturedOnDragEnd?.({ active: { id: "s2" }, over: { id: "s2" } });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("renders empty state when songs array is empty", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={[]} currentSongId={null} onReorder={onReorder} onSelect={onSelect} />
    );

    expect(screen.getByText("NO SONGS FOUND")).toBeTruthy();
  });

  it("passes currentSongId to determine active state", () => {
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    render(
      <SortablePlaylist songs={songs} currentSongId="s2" onReorder={onReorder} onSelect={onSelect} />
    );

    // 所有歌曲都應渲染
    expect(screen.getByText("歌曲一")).toBeTruthy();
    expect(screen.getByText("歌曲二")).toBeTruthy();
  });
});
