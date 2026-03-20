/**
 * LibraryPanel 元件測試
 *
 * 歌曲庫面板，包含 Songs / Playlists 兩個分頁切換。
 *
 * 測試內容：
 * 1. 渲染兩個分頁按鈕（Songs / Playlists）
 * 2. 預設啟用 Songs 分頁
 * 3. 預設顯示 SongLibrary 元件
 * 4. 點擊 Playlists 分頁切換顯示 PlaylistPanel
 * 5. 點擊 Songs 分頁切換回 SongLibrary
 * 6. 分頁按鈕具有正確的 type="button" 屬性
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// 模擬 SongLibrary 元件
vi.mock("./SongLibrary", () => ({
  SongLibrary: () => <div data-testid="song-library">SongLibrary</div>,
}));

// 模擬 next/dynamic — PlaylistPanel 使用動態載入
vi.mock("next/dynamic", () => ({
  default: (_loader: () => Promise<{ default: React.ComponentType }>) => {
    // 回傳一個簡單元件，模擬動態載入後的結果
    const Component = () => (
      <div data-testid="playlist-panel">PlaylistPanel</div>
    );
    Component.displayName = "DynamicPlaylistPanel";
    return Component;
  },
}));

import { LibraryPanel } from "./LibraryPanel";

describe("LibraryPanel", () => {
  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("基本渲染", () => {
    it("渲染 Songs 和 Playlists 兩個分頁按鈕", () => {
      render(<LibraryPanel />);
      expect(screen.getByText("Songs")).toBeInTheDocument();
      expect(screen.getByText("Playlists")).toBeInTheDocument();
    });

    it("預設啟用 Songs 分頁（具有 primary 樣式）", () => {
      render(<LibraryPanel />);
      const songsButton = screen.getByText("Songs");
      expect(songsButton.className).toContain("text-primary");
      expect(songsButton.className).toContain("border-primary");
    });

    it("預設顯示 SongLibrary 元件", () => {
      render(<LibraryPanel />);
      expect(screen.getByTestId("song-library")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-panel")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 分頁切換
  // --------------------------------------------------------------------------

  describe("分頁切換", () => {
    it("點擊 Playlists 分頁後顯示 PlaylistPanel", () => {
      render(<LibraryPanel />);

      fireEvent.click(screen.getByText("Playlists"));

      expect(screen.getByTestId("playlist-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("song-library")).not.toBeInTheDocument();
    });

    it("點擊 Playlists 後再點擊 Songs 可切換回 SongLibrary", () => {
      render(<LibraryPanel />);

      // 先切換到 Playlists
      fireEvent.click(screen.getByText("Playlists"));
      expect(screen.getByTestId("playlist-panel")).toBeInTheDocument();

      // 再切回 Songs
      fireEvent.click(screen.getByText("Songs"));
      expect(screen.getByTestId("song-library")).toBeInTheDocument();
      expect(screen.queryByTestId("playlist-panel")).not.toBeInTheDocument();
    });

    it("切換分頁時，啟用分頁具有 primary 樣式，非啟用分頁無 primary 樣式", () => {
      render(<LibraryPanel />);

      // 切換到 Playlists
      fireEvent.click(screen.getByText("Playlists"));
      const playlistsButton = screen.getByText("Playlists");
      const songsButton = screen.getByText("Songs");

      expect(playlistsButton.className).toContain("text-primary");
      expect(playlistsButton.className).toContain("border-primary");
      // 非啟用分頁應使用 text-text-muted 而非 text-primary
      expect(songsButton.className).toContain("text-text-muted");
      expect(songsButton.className).toContain("border-transparent");
    });
  });

  // --------------------------------------------------------------------------
  // 按鈕屬性
  // --------------------------------------------------------------------------

  describe("按鈕屬性", () => {
    it("所有分頁按鈕具有 type=\"button\" 屬性", () => {
      render(<LibraryPanel />);
      const songsButton = screen.getByText("Songs");
      const playlistsButton = screen.getByText("Playlists");

      expect(songsButton).toHaveAttribute("type", "button");
      expect(playlistsButton).toHaveAttribute("type", "button");
    });
  });
});
