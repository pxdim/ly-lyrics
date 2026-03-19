/**
 * LyricsResultCard 元件測試
 *
 * 測試結果卡片的渲染、歌曲資訊顯示、標記（時間戳、簡體、AI 生成）和點擊行為。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LyricsResultCard } from "./LyricsResultCard";
import type { LyricsSearchResultItem } from "@/lib/api/lyrics-search";

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

// ============================================================================
// 測試輔助
// ============================================================================

/** 建立基礎搜尋結果 */
function createResult(overrides: Partial<LyricsSearchResultItem> = {}): LyricsSearchResultItem {
  return {
    id: "test-1",
    title: "Amazing Grace",
    artist: "John Newton",
    source: "lrclib",
    confidence: "high",
    hasSyncedLyrics: true,
    hasPlainLyrics: true,
    isSimplified: false,
    isAiGenerated: false,
    ...overrides,
  };
}

// ============================================================================
// 測試
// ============================================================================

describe("LyricsResultCard", () => {
  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  it("renders song title and artist", () => {
    render(<LyricsResultCard result={createResult()} onClick={vi.fn()} />);
    expect(screen.getByText("Amazing Grace")).toBeInTheDocument();
    expect(screen.getByText("John Newton")).toBeInTheDocument();
  });

  it("renders as a button element", () => {
    render(<LyricsResultCard result={createResult()} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 來源顯示名稱
  // --------------------------------------------------------------------------

  it("displays mapped source label for lrclib", () => {
    render(<LyricsResultCard result={createResult({ source: "lrclib" })} onClick={vi.fn()} />);
    expect(screen.getByText("LRClib")).toBeInTheDocument();
  });

  it("displays mapped source label for lrcapi-kugou", () => {
    render(<LyricsResultCard result={createResult({ source: "lrcapi-kugou" })} onClick={vi.fn()} />);
    expect(screen.getByText("酷狗")).toBeInTheDocument();
  });

  it("displays mapped source label for lrcapi-netease", () => {
    render(<LyricsResultCard result={createResult({ source: "lrcapi-netease" })} onClick={vi.fn()} />);
    expect(screen.getByText("網易雲")).toBeInTheDocument();
  });

  it("falls back to raw source name for unknown sources", () => {
    render(<LyricsResultCard result={createResult({ source: "unknown-src" })} onClick={vi.fn()} />);
    expect(screen.getByText("unknown-src")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 時間戳 / 純文字 / 僅資訊 標記
  // --------------------------------------------------------------------------

  it("shows synced lyrics badge when hasSyncedLyrics is true", () => {
    render(<LyricsResultCard result={createResult({ hasSyncedLyrics: true })} onClick={vi.fn()} />);
    expect(screen.getByText(/有時間戳/)).toBeInTheDocument();
  });

  it("shows plain text badge when only hasPlainLyrics is true", () => {
    render(
      <LyricsResultCard
        result={createResult({ hasSyncedLyrics: false, hasPlainLyrics: true })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText(/純文字/)).toBeInTheDocument();
  });

  it("shows info-only badge when no lyrics available", () => {
    render(
      <LyricsResultCard
        result={createResult({ hasSyncedLyrics: false, hasPlainLyrics: false })}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText(/僅資訊/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 其他標記
  // --------------------------------------------------------------------------

  it("shows simplified Chinese badge when isSimplified is true", () => {
    render(<LyricsResultCard result={createResult({ isSimplified: true })} onClick={vi.fn()} />);
    expect(screen.getByText("簡")).toBeInTheDocument();
  });

  it("does not show simplified badge when isSimplified is false", () => {
    render(<LyricsResultCard result={createResult({ isSimplified: false })} onClick={vi.fn()} />);
    expect(screen.queryByText("簡")).not.toBeInTheDocument();
  });

  it("shows AI generated badge when isAiGenerated is true", () => {
    render(<LyricsResultCard result={createResult({ isAiGenerated: true })} onClick={vi.fn()} />);
    expect(screen.getByText(/AI 生成/)).toBeInTheDocument();
  });

  it("shows duration when provided", () => {
    render(<LyricsResultCard result={createResult({ duration: 185 })} onClick={vi.fn()} />);
    // 185 秒 = 3:05
    expect(screen.getByText("3:05")).toBeInTheDocument();
  });

  it("shows similarity ratio when provided", () => {
    render(<LyricsResultCard result={createResult({ ratio: 0.87 })} onClick={vi.fn()} />);
    expect(screen.getByText(/相似度 87%/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 可信度標記
  // --------------------------------------------------------------------------

  it("renders confidence dot with correct color for high confidence", () => {
    const { container } = render(
      <LyricsResultCard result={createResult({ confidence: "high" })} onClick={vi.fn()} />
    );
    const dot = container.querySelector(".bg-green-400");
    expect(dot).toBeInTheDocument();
  });

  it("renders confidence dot with correct color for medium confidence", () => {
    const { container } = render(
      <LyricsResultCard result={createResult({ confidence: "medium" })} onClick={vi.fn()} />
    );
    const dot = container.querySelector(".bg-yellow-400");
    expect(dot).toBeInTheDocument();
  });

  it("renders confidence dot with correct color for low confidence", () => {
    const { container } = render(
      <LyricsResultCard result={createResult({ confidence: "low" })} onClick={vi.fn()} />
    );
    const dot = container.querySelector(".bg-orange-400");
    expect(dot).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 使用者互動
  // --------------------------------------------------------------------------

  it("calls onClick with result when clicked", () => {
    const onClick = vi.fn();
    const result = createResult();
    render(<LyricsResultCard result={result} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledWith(result);
  });
});
