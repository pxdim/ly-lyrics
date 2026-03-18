/**
 * SortableSongItem 元件測試
 *
 * 測試可拖曳歌曲項目的渲染、拖曳手柄、選取互動。
 * 拖曳行為依賴 DndContext，此處聚焦 UI 渲染與回呼。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortableSongItem } from "./SortableSongItem";

// Mock @dnd-kit/sortable — 拖曳整合由 SortablePlaylist 測試覆蓋
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: vi.fn(() => ({
    attributes: { role: "button", tabIndex: 0 },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn((val: unknown) => (val ? "translate3d(0px, 10px, 0)" : undefined)),
    },
  },
}));

import { useSortable } from "@dnd-kit/sortable";

const mockUseSortable = vi.mocked(useSortable);

// ============================================================================
// 測試輔助
// ============================================================================

const baseSong = {
  id: "song-1",
  title: "測試歌曲",
  artist: "測試歌手",
  lyrics: ["第一句", "第二句"],
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

describe("SortableSongItem", () => {
  it("renders song title and artist", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={false} onSelect={onSelect} />
    );

    expect(screen.getByText("測試歌曲")).toBeTruthy();
    expect(screen.getByText("測試歌手")).toBeTruthy();
  });

  it("renders index number with zero-padded format", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={2} isActive={false} onSelect={onSelect} />
    );

    expect(screen.getByText("03")).toBeTruthy();
  });

  it("renders lyrics count", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={false} onSelect={onSelect} />
    );

    expect(screen.getByText("2L")).toBeTruthy();
  });

  it("renders drag handle with grip icon", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={false} onSelect={onSelect} />
    );

    const handle = screen.getByTestId("drag-handle");
    expect(handle).toBeTruthy();
  });

  it("calls onSelect when song area is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={false} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByTestId("song-select-area"));
    expect(onSelect).toHaveBeenCalledWith("song-1");
  });

  it("applies active styles when isActive is true", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={true} onSelect={onSelect} />
    );

    const container = screen.getByTestId("sortable-song-item");
    expect(container.className).toContain("bg-elevated");
    expect(container.className).toContain("border-l-primary");
  });

  it("applies default styles when isActive is false", () => {
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={false} onSelect={onSelect} />
    );

    const container = screen.getByTestId("sortable-song-item");
    expect(container.className).not.toContain("border-l-primary");
  });

  it("applies dragging styles when isDragging is true", () => {
    mockUseSortable.mockReturnValue({
      attributes: { role: "button", tabIndex: 0 },
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
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
    } as unknown as ReturnType<typeof useSortable>);

    const onSelect = vi.fn();
    render(
      <SortableSongItem song={baseSong} index={0} isActive={false} onSelect={onSelect} />
    );

    const container = screen.getByTestId("sortable-song-item");
    expect(container.className).toContain("opacity-50");
  });

  it("renders without artist when artist is undefined", () => {
    const { artist: _, ...songWithoutArtist } = baseSong;
    const onSelect = vi.fn();
    render(
      <SortableSongItem song={songWithoutArtist} index={0} isActive={false} onSelect={onSelect} />
    );

    expect(screen.getByText("測試歌曲")).toBeTruthy();
    expect(screen.queryByText("測試歌手")).toBeNull();
  });
});
