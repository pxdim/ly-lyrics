/**
 * LrcDropZone 元件測試
 *
 * 測試拖放上傳元件的渲染狀態、檔案選取互動、成功/錯誤回饋。
 * 核心邏輯已在 lib/lrc/import.test.ts 中覆蓋，此處聚焦 UI 行為。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LrcDropZone } from "./LrcDropZone";
import type { LrcImportResult } from "@/lib/lrc/import";
import type { ClientSong } from "@/lib/api/songs";

// Mock processLrcFile — 核心邏輯已獨立測試
vi.mock("@/lib/lrc/import", () => ({
  processLrcFile: vi.fn(),
  LrcImportError: class LrcImportError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "LrcImportError";
    }
  },
}));

import { processLrcFile, LrcImportError } from "@/lib/lrc/import";

const mockProcessLrcFile = vi.mocked(processLrcFile);

// ============================================================================
// 測試輔助
// ============================================================================

/** 建立模擬的成功結果 */
function createSuccessResult(title: string, lyricsCount: number): LrcImportResult {
  return {
    song: { id: "test-id", title, lyrics: [], userId: "u", createdAt: "", updatedAt: "" } as ClientSong,
    title,
    lyricsCount,
    hasTimestamps: true,
  };
}

/** 透過隱藏 file input 觸發檔案選取 */
function selectFile(filename: string): void {
  const input = screen.getByTestId("lrc-file-input") as HTMLInputElement;
  const file = new File(["content"], filename, { type: "text/plain" });
  fireEvent.change(input, { target: { files: [file] } });
}

// ============================================================================
// 測試
// ============================================================================

describe("LrcDropZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 初始渲染
  // --------------------------------------------------------------------------

  it("渲染 idle 狀態的拖放提示文字", () => {
    render(<LrcDropZone />);
    expect(screen.getByText("拖放 .lrc 匯入")).toBeTruthy();
  });

  it("包含接受 .lrc 的隱藏 file input", () => {
    render(<LrcDropZone />);
    const input = screen.getByTestId("lrc-file-input") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".lrc");
    expect(input.className).toContain("hidden");
  });

  // --------------------------------------------------------------------------
  // 成功流程
  // --------------------------------------------------------------------------

  it("成功匯入後顯示歌名確認訊息", async () => {
    mockProcessLrcFile.mockResolvedValue(createSuccessResult("好歌", 5));

    render(<LrcDropZone />);
    selectFile("好歌.lrc");

    await waitFor(() => {
      expect(screen.getByText(/已成功匯入「好歌」/)).toBeTruthy();
    });
  });

  it("成功匯入後呼叫 onImportSuccess 回呼", async () => {
    mockProcessLrcFile.mockResolvedValue(createSuccessResult("新歌", 3));
    const onImportSuccess = vi.fn();

    render(<LrcDropZone onImportSuccess={onImportSuccess} />);
    selectFile("新歌.lrc");

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalledOnce();
    });
  });

  // --------------------------------------------------------------------------
  // 錯誤處理
  // --------------------------------------------------------------------------

  it("匯入失敗時顯示錯誤訊息", async () => {
    mockProcessLrcFile.mockRejectedValue(
      new LrcImportError("請上傳 .lrc 格式的檔案")
    );

    render(<LrcDropZone />);
    selectFile("bad.txt");

    await waitFor(() => {
      expect(screen.getByText("請上傳 .lrc 格式的檔案")).toBeTruthy();
    });
  });

  it("displays generic Error message for non-LrcImportError failures", async () => {
    mockProcessLrcFile.mockRejectedValue(new Error("網路異常"));

    render(<LrcDropZone />);
    selectFile("test.lrc");

    await waitFor(() => {
      expect(screen.getByText("網路異常")).toBeTruthy();
    });
  });

  it("displays fallback message for non-Error exceptions", async () => {
    mockProcessLrcFile.mockRejectedValue("unknown error");

    render(<LrcDropZone />);
    selectFile("test.lrc");

    await waitFor(() => {
      expect(screen.getByText("匯入失敗")).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // 載入中狀態
  // --------------------------------------------------------------------------

  it("shows parsing state while processing file", async () => {
    // 使用一個永不 resolve 的 Promise 來觀察 parsing 狀態
    let resolvePromise: (value: LrcImportResult) => void;
    mockProcessLrcFile.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<LrcDropZone />);
    selectFile("test.lrc");

    expect(screen.getByText("解析中...")).toBeTruthy();

    // 完成以避免懸掛
    resolvePromise!(createSuccessResult("test", 1));
    await waitFor(() => {
      expect(screen.getByText(/已成功匯入/)).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // 拖放事件
  // --------------------------------------------------------------------------

  it("applies drag-over styling on dragEnter and removes on dragLeave", () => {
    render(<LrcDropZone />);
    const zone = screen.getByTestId("lrc-drop-zone");

    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(zone.className).toContain("border-cyan-400");

    fireEvent.dragLeave(zone, { dataTransfer: { files: [] } });
    expect(zone.className).not.toContain("border-cyan-400");
  });

  it("handles file drop event", async () => {
    mockProcessLrcFile.mockResolvedValue(createSuccessResult("拖放歌", 10));

    render(<LrcDropZone />);
    const zone = screen.getByTestId("lrc-drop-zone");

    const file = new File(["content"], "drag.lrc", { type: "text/plain" });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/已成功匯入「拖放歌」/)).toBeTruthy();
    });
    expect(mockProcessLrcFile).toHaveBeenCalledWith(file);
  });

  // --------------------------------------------------------------------------
  // 點擊與鍵盤
  // --------------------------------------------------------------------------

  it("has role=button and tabIndex for keyboard access", () => {
    render(<LrcDropZone />);
    const zone = screen.getByTestId("lrc-drop-zone");
    expect(zone.getAttribute("role")).toBe("button");
    expect(zone.getAttribute("tabindex")).toBe("0");
  });

  it("triggers file input click on Enter key", () => {
    render(<LrcDropZone />);
    const zone = screen.getByTestId("lrc-drop-zone");
    const input = screen.getByTestId("lrc-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(zone, { key: "Enter" });
    // keyDown 觸發 handleClick + jsdom 的 button role 預設行為可能額外觸發 click
    expect(clickSpy).toHaveBeenCalled();
  });

  it("triggers file input click on Space key", () => {
    render(<LrcDropZone />);
    const zone = screen.getByTestId("lrc-drop-zone");
    const input = screen.getByTestId("lrc-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(zone, { key: " " });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("displays success message with lyrics count", async () => {
    mockProcessLrcFile.mockResolvedValue(createSuccessResult("歌曲X", 42));

    render(<LrcDropZone />);
    selectFile("test.lrc");

    await waitFor(() => {
      expect(screen.getByText(/42 行/)).toBeTruthy();
    });
  });
});
