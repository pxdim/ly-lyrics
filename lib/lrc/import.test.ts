/**
 * LRC 匯入邏輯單元測試
 *
 * 測試 processLrcFile 的檔案驗證、LRC 解析、API 呼叫等完整流程。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createSong — 外部 API 依賴
vi.mock("@/lib/api/songs", () => ({
  createSong: vi.fn(),
}));

import { createSong } from "@/lib/api/songs";
import type { ClientSong } from "@/lib/api/songs";

const mockCreateSong = vi.mocked(createSong);

// 匯入待測模組（在 mock 之後）
import { processLrcFile, LrcImportError } from "./import";

// ============================================================================
// 測試輔助
// ============================================================================

/** 建立模擬 File 物件 */
function createTestFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

/** 完整 LRC 範例 */
const SAMPLE_LRC = `[ti:測試歌曲]
[ar:測試歌手]
[00:05.00]第一行
[00:10.00]第二行
[00:15.00]第三行`;

/** 無 metadata 的 LRC */
const BARE_LRC = `[00:05.00]歌詞一
[00:10.00]歌詞二`;

/** 只有 title 無 artist 的 LRC */
const TITLE_ONLY_LRC = `[ti:純歌詞]
[00:05.00]一行歌詞`;

/** Mock API 回應 */
const MOCK_SONG: ClientSong = {
  id: "song-uuid-001",
  title: "測試歌曲",
  artist: "測試歌手",
  lyrics: ["第一行", "第二行", "第三行"],
  lrcTimestamps: [5000, 10000, 15000],
  userId: "user-uuid-001",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// ============================================================================
// 測試
// ============================================================================

describe("processLrcFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSong.mockResolvedValue(MOCK_SONG);
  });

  // --------------------------------------------------------------------------
  // 檔案驗證
  // --------------------------------------------------------------------------

  it("拒絕非 .lrc 副檔名的檔案", async () => {
    const file = createTestFile("song.txt", "some content");

    await expect(processLrcFile(file)).rejects.toThrow(LrcImportError);
    await expect(processLrcFile(file)).rejects.toThrow("請上傳 .lrc 格式的檔案");
    expect(mockCreateSong).not.toHaveBeenCalled();
  });

  it("拒絕沒有歌詞內容的 LRC 檔案", async () => {
    const file = createTestFile("empty.lrc", "[ti:空歌曲]\n[ar:無名]");

    await expect(processLrcFile(file)).rejects.toThrow(LrcImportError);
    await expect(processLrcFile(file)).rejects.toThrow("LRC 檔案中沒有歌詞內容");
    expect(mockCreateSong).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 正常解析
  // --------------------------------------------------------------------------

  it("成功解析含完整 metadata 的 LRC 檔案並呼叫 createSong", async () => {
    const file = createTestFile("song.lrc", SAMPLE_LRC);
    const result = await processLrcFile(file);

    // 驗證回傳結果
    expect(result.title).toBe("測試歌曲");
    expect(result.lyricsCount).toBe(3);
    expect(result.hasTimestamps).toBe(true);
    expect(result.song).toBe(MOCK_SONG);

    // 驗證 createSong 被正確呼叫
    expect(mockCreateSong).toHaveBeenCalledOnce();
    expect(mockCreateSong).toHaveBeenCalledWith({
      title: "測試歌曲",
      artist: "測試歌手",
      lyrics: ["第一行", "第二行", "第三行"],
      lrcTimestamps: [5000, 10000, 15000],
    });
  });

  // --------------------------------------------------------------------------
  // Metadata 提取 / Fallback
  // --------------------------------------------------------------------------

  it("無 title metadata 時使用檔名（去除 .lrc 副檔名）", async () => {
    const file = createTestFile("我的歌曲.lrc", BARE_LRC);
    const result = await processLrcFile(file);

    expect(result.title).toBe("我的歌曲");
    expect(mockCreateSong).toHaveBeenCalledWith(
      expect.objectContaining({ title: "我的歌曲" })
    );
  });

  it("無 artist metadata 時不傳 artist 屬性", async () => {
    const file = createTestFile("song.lrc", TITLE_ONLY_LRC);
    await processLrcFile(file);

    const callArg = mockCreateSong.mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    expect("artist" in callArg!).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 錯誤傳遞
  // --------------------------------------------------------------------------

  it("傳遞 createSong API 錯誤", async () => {
    mockCreateSong.mockRejectedValue(new Error("建立歌曲失敗"));
    const file = createTestFile("song.lrc", SAMPLE_LRC);

    await expect(processLrcFile(file)).rejects.toThrow("建立歌曲失敗");
  });
});
