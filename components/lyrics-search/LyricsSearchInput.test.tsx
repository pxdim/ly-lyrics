/**
 * LyricsSearchInput 元件測試
 *
 * 測試搜尋輸入框的渲染、搜尋類型切換、debounce 行為、
 * Enter 立即搜尋、歌手欄位顯示/隱藏、按鈕狀態。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LyricsSearchInput } from "./LyricsSearchInput";

describe("LyricsSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  it("renders search type radio buttons", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    expect(screen.getByLabelText("歌曲名")).toBeInTheDocument();
    expect(screen.getByLabelText("歌手")).toBeInTheDocument();
    expect(screen.getByLabelText("歌詞")).toBeInTheDocument();
  });

  it("renders search input with default title placeholder", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText("輸入歌曲名稱...")).toBeInTheDocument();
  });

  it("renders search button", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    // 有搜尋按鈕（含 emoji）
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows artist field by default (title mode)", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText("輸入歌手名稱（選填）...")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 搜尋類型切換
  // --------------------------------------------------------------------------

  it("changes placeholder when search type changes to artist", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByLabelText("歌手"));
    expect(screen.getByPlaceholderText("輸入歌手名稱...")).toBeInTheDocument();
  });

  it("hides artist field when search type is artist", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByLabelText("歌手"));
    expect(screen.queryByPlaceholderText("輸入歌手名稱（選填）...")).not.toBeInTheDocument();
  });

  it("shows artist field when search type is lyrics", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    fireEvent.click(screen.getByLabelText("歌詞"));
    expect(screen.getByPlaceholderText("輸入歌手名稱（選填）...")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Debounce 搜尋
  // --------------------------------------------------------------------------

  it("does not trigger search immediately on input", () => {
    const onSearch = vi.fn();
    render(<LyricsSearchInput onSearch={onSearch} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText("輸入歌曲名稱..."), {
      target: { value: "Amazing Grace" },
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("triggers search after 500ms debounce", () => {
    const onSearch = vi.fn();
    render(<LyricsSearchInput onSearch={onSearch} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText("輸入歌曲名稱..."), {
      target: { value: "Amazing Grace" },
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith({
      query: "Amazing Grace",
      searchType: "title",
    });
  });

  it("does not trigger search when query is less than 2 characters", () => {
    const onSearch = vi.fn();
    render(<LyricsSearchInput onSearch={onSearch} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText("輸入歌曲名稱..."), {
      target: { value: "A" },
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Enter 立即搜尋
  // --------------------------------------------------------------------------

  it("triggers search immediately on Enter key", () => {
    const onSearch = vi.fn();
    render(<LyricsSearchInput onSearch={onSearch} isLoading={false} />);
    const input = screen.getByPlaceholderText("輸入歌曲名稱...");

    fireEvent.change(input, { target: { value: "Amazing Grace" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalledOnce();
  });

  it("does not trigger search on Enter when query too short", () => {
    const onSearch = vi.fn();
    render(<LyricsSearchInput onSearch={onSearch} isLoading={false} />);
    const input = screen.getByPlaceholderText("輸入歌曲名稱...");

    fireEvent.change(input, { target: { value: "A" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 手動搜尋按鈕
  // --------------------------------------------------------------------------

  it("disables search button when query is too short", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={false} />);
    // 搜尋按鈕（type="button"）
    const buttons = screen.getAllByRole("button");
    const searchBtn = buttons[0]!;
    expect(searchBtn).toBeDisabled();
  });

  it("disables search button when isLoading is true", () => {
    render(<LyricsSearchInput onSearch={vi.fn()} isLoading={true} />);
    const buttons = screen.getAllByRole("button");
    const searchBtn = buttons[0]!;
    expect(searchBtn).toBeDisabled();
  });

  // --------------------------------------------------------------------------
  // 含歌手名的搜尋
  // --------------------------------------------------------------------------

  it("includes artist in search request when artist field is filled", () => {
    const onSearch = vi.fn();
    render(<LyricsSearchInput onSearch={onSearch} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText("輸入歌曲名稱..."), {
      target: { value: "Amazing Grace" },
    });
    fireEvent.change(screen.getByPlaceholderText("輸入歌手名稱（選填）..."), {
      target: { value: "Chris Tomlin" },
    });

    // 用 Enter 觸發
    fireEvent.keyDown(screen.getByPlaceholderText("輸入歌手名稱（選填）..."), {
      key: "Enter",
    });

    expect(onSearch).toHaveBeenCalledWith({
      query: "Amazing Grace",
      searchType: "title",
      artist: "Chris Tomlin",
    });
  });
});
