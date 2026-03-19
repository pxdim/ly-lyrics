/**
 * LyricsSearchResults 元件測試
 *
 * 測試搜尋結果列表的三種狀態（loading、empty、results）
 * 以及結果數量、逾時來源提示和選取互動。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LyricsSearchResults } from "./LyricsSearchResults";
import type {
  LyricsSearchResponse,
  LyricsSearchResultItem,
} from "@/lib/api/lyrics-search";

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

// ============================================================================
// 測試輔助
// ============================================================================

function createResultItem(overrides: Partial<LyricsSearchResultItem> = {}): LyricsSearchResultItem {
  return {
    id: "r-1",
    title: "Test Song",
    artist: "Test Artist",
    source: "lrclib",
    confidence: "high",
    hasSyncedLyrics: true,
    hasPlainLyrics: true,
    isSimplified: false,
    isAiGenerated: false,
    ...overrides,
  };
}

function createResponse(overrides: Partial<LyricsSearchResponse> = {}): LyricsSearchResponse {
  return {
    results: [createResultItem()],
    totalResults: 1,
    sources: { lrclib: { status: "ok", count: 1, latencyMs: 100 } },
    ...overrides,
  };
}

// ============================================================================
// 測試
// ============================================================================

describe("LyricsSearchResults", () => {
  // --------------------------------------------------------------------------
  // loading 狀態
  // --------------------------------------------------------------------------

  it("shows loading text when isLoading is true", () => {
    render(
      <LyricsSearchResults response={null} isLoading={true} onSelect={vi.fn()} />
    );
    expect(screen.getByText("搜尋中...")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // null response（初始狀態）
  // --------------------------------------------------------------------------

  it("renders nothing when response is null and not loading", () => {
    const { container } = render(
      <LyricsSearchResults response={null} isLoading={false} onSelect={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  // --------------------------------------------------------------------------
  // 空結果
  // --------------------------------------------------------------------------

  it("shows empty message when totalResults is 0", () => {
    const emptyResponse = createResponse({ results: [], totalResults: 0 });
    render(
      <LyricsSearchResults response={emptyResponse} isLoading={false} onSelect={vi.fn()} />
    );
    expect(screen.getByText("找不到結果，請嘗試其他關鍵字")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 有結果
  // --------------------------------------------------------------------------

  it("displays total result count", () => {
    const response = createResponse({
      results: [createResultItem({ id: "1" }), createResultItem({ id: "2" })],
      totalResults: 2,
    });
    render(
      <LyricsSearchResults response={response} isLoading={false} onSelect={vi.fn()} />
    );
    expect(screen.getByText(/2 筆/)).toBeInTheDocument();
  });

  it("renders a card for each result item", () => {
    const response = createResponse({
      results: [
        createResultItem({ id: "1", title: "Song A" }),
        createResultItem({ id: "2", title: "Song B" }),
      ],
      totalResults: 2,
    });
    render(
      <LyricsSearchResults response={response} isLoading={false} onSelect={vi.fn()} />
    );
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
  });

  it("calls onSelect when a result card is clicked", () => {
    const onSelect = vi.fn();
    const item = createResultItem({ id: "click-me", title: "Click Me" });
    const response = createResponse({ results: [item], totalResults: 1 });
    render(
      <LyricsSearchResults response={response} isLoading={false} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText("Click Me"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  // --------------------------------------------------------------------------
  // 逾時來源提示
  // --------------------------------------------------------------------------

  it("shows timeout source names when sources have timeout status", () => {
    const response = createResponse({
      sources: {
        lrclib: { status: "ok", count: 1, latencyMs: 100 },
        "lrcapi-kugou": { status: "timeout", count: 0, latencyMs: 5000 },
      },
    });
    render(
      <LyricsSearchResults response={response} isLoading={false} onSelect={vi.fn()} />
    );
    expect(screen.getByText(/逾時/)).toBeInTheDocument();
    expect(screen.getByText(/lrcapi-kugou/)).toBeInTheDocument();
  });

  it("does not show timeout warning when all sources are ok", () => {
    const response = createResponse({
      sources: {
        lrclib: { status: "ok", count: 1, latencyMs: 100 },
      },
    });
    render(
      <LyricsSearchResults response={response} isLoading={false} onSelect={vi.fn()} />
    );
    expect(screen.queryByText(/逾時/)).not.toBeInTheDocument();
  });
});
