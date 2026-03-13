/**
 * LRC Parser 單元測試
 *
 * 測試 LRC 解析器的所有公開函式：解析時間戳、反序列化、序列化、行搜尋等。
 */

import { describe, it, expect } from "vitest";
import {
  parseTimeTag,
  msToTimeTag,
  parseLRC,
  serializeLRC,
  lrcLinesToLyrics,
  lrcLinesToTimestamps,
  toLrcLines,
  isValidLRC,
  findLineAtTime,
  getLineTimeRange,
  mergeDuplicateLines,
  type LrcLine,
  type LrcFile,
} from "./parser";

// ============================================================================
// parseTimeTag
// ============================================================================

describe("parseTimeTag", () => {
  it("解析標準 [mm:ss.xx] 格式", () => {
    expect(parseTimeTag("[01:23.45]")).toBe(83450);
  });

  it("解析 [mm:ss.xxx] 三位毫秒格式", () => {
    expect(parseTimeTag("[01:23.456]")).toBe(83456);
  });

  it("解析 [00:00.00] 零值", () => {
    expect(parseTimeTag("[00:00.00]")).toBe(0);
  });

  it("解析大時間值 [99:59.99]", () => {
    expect(parseTimeTag("[99:59.99]")).toBe(99 * 60000 + 59 * 1000 + 990);
  });

  it("無效時間戳拋出 Error", () => {
    expect(() => parseTimeTag("invalid")).toThrow("Invalid time tag");
    expect(() => parseTimeTag("[abc]")).toThrow("Invalid time tag");
  });
});

// ============================================================================
// msToTimeTag
// ============================================================================

describe("msToTimeTag", () => {
  it("將毫秒轉為 [mm:ss.xx]", () => {
    expect(msToTimeTag(83450)).toBe("[01:23.45]");
  });

  it("零值", () => {
    expect(msToTimeTag(0)).toBe("[00:00.00]");
  });

  it("不足一分鐘", () => {
    expect(msToTimeTag(5000)).toBe("[00:05.00]");
  });

  it("精確到十毫秒", () => {
    expect(msToTimeTag(1230)).toBe("[00:01.23]");
  });
});

// ============================================================================
// parseLRC
// ============================================================================

describe("parseLRC", () => {
  it("解析基本歌詞", () => {
    const content = "[00:05.00]第一行\n[00:10.00]第二行\n[00:15.00]第三行";
    const result = parseLRC(content);

    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]).toEqual({ time: 5000, text: "第一行" });
    expect(result.lines[1]).toEqual({ time: 10000, text: "第二行" });
    expect(result.lines[2]).toEqual({ time: 15000, text: "第三行" });
  });

  it("解析 metadata", () => {
    const content = "[ti:測試歌曲]\n[ar:測試歌手]\n[al:測試專輯]\n[00:05.00]歌詞";
    const result = parseLRC(content);

    expect(result.metadata.title).toBe("測試歌曲");
    expect(result.metadata.artist).toBe("測試歌手");
    expect(result.metadata.album).toBe("測試專輯");
    expect(result.lines).toHaveLength(1);
  });

  it("解析 offset metadata", () => {
    const content = "[offset:500]\n[00:05.00]歌詞";
    const result = parseLRC(content);
    expect(result.metadata.offset).toBe(500);
  });

  it("解析 length metadata（mm:ss 格式）", () => {
    const content = "[length:3:45]\n[00:05.00]歌詞";
    const result = parseLRC(content);
    expect(result.metadata.length).toBe(3 * 60000 + 45 * 1000);
  });

  it("按時間排序歌詞行", () => {
    const content = "[00:15.00]第三行\n[00:05.00]第一行\n[00:10.00]第二行";
    const result = parseLRC(content);

    expect(result.lines[0]?.text).toBe("第一行");
    expect(result.lines[1]?.text).toBe("第二行");
    expect(result.lines[2]?.text).toBe("第三行");
  });

  it("略過空行", () => {
    const content = "[00:05.00]第一行\n\n\n[00:10.00]第二行";
    const result = parseLRC(content);
    expect(result.lines).toHaveLength(2);
  });

  it("處理多重時間戳（同一行多個 tag）", () => {
    const content = "[00:05.00][00:25.00]重複段落";
    const result = parseLRC(content);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.text).toBe("重複段落");
    expect(result.lines[1]?.text).toBe("重複段落");
  });

  it("空內容回傳空結果", () => {
    const result = parseLRC("");
    expect(result.lines).toHaveLength(0);
    expect(result.metadata).toEqual({});
  });
});

// ============================================================================
// serializeLRC
// ============================================================================

describe("serializeLRC", () => {
  it("序列化基本歌詞", () => {
    const lrc: LrcFile = {
      metadata: {},
      lines: [
        { time: 5000, text: "第一行" },
        { time: 10000, text: "第二行" },
      ],
    };
    const result = serializeLRC(lrc);
    expect(result).toBe("[00:05.00]第一行\n[00:10.00]第二行");
  });

  it("包含 metadata", () => {
    const lrc: LrcFile = {
      metadata: { title: "測試", artist: "歌手" },
      lines: [{ time: 0, text: "歌詞" }],
    };
    const result = serializeLRC(lrc);
    expect(result).toContain("[ti:測試]");
    expect(result).toContain("[ar:歌手]");
    expect(result).toContain("[00:00.00]歌詞");
  });

  it("parseLRC → serializeLRC 往返一致性", () => {
    const original = "[00:05.00]第一行\n[00:10.00]第二行";
    const parsed = parseLRC(original);
    const serialized = serializeLRC(parsed);
    expect(serialized).toBe(original);
  });
});

// ============================================================================
// 輔助函式
// ============================================================================

describe("lrcLinesToLyrics", () => {
  it("提取歌詞文字陣列", () => {
    const lines: LrcLine[] = [
      { time: 0, text: "A" },
      { time: 1000, text: "B" },
    ];
    expect(lrcLinesToLyrics(lines)).toEqual(["A", "B"]);
  });
});

describe("lrcLinesToTimestamps", () => {
  it("提取時間戳陣列", () => {
    const lines: LrcLine[] = [
      { time: 5000, text: "A" },
      { time: 10000, text: "B" },
    ];
    expect(lrcLinesToTimestamps(lines)).toEqual([5000, 10000]);
  });
});

describe("toLrcLines", () => {
  it("帶時間戳轉換", () => {
    const result = toLrcLines(["A", "B"], [1000, 2000]);
    expect(result).toEqual([
      { text: "A", time: 1000 },
      { text: "B", time: 2000 },
    ]);
  });

  it("無時間戳時預設 5 秒間隔", () => {
    const result = toLrcLines(["A", "B", "C"]);
    expect(result[0]?.time).toBe(0);
    expect(result[1]?.time).toBe(5000);
    expect(result[2]?.time).toBe(10000);
  });
});

describe("isValidLRC", () => {
  it("有效 LRC 回傳 true", () => {
    expect(isValidLRC("[00:05.00]歌詞")).toBe(true);
  });

  it("無時間戳回傳 false", () => {
    expect(isValidLRC("純文字")).toBe(false);
  });

  it("空字串回傳 false", () => {
    expect(isValidLRC("")).toBe(false);
  });
});

// ============================================================================
// findLineAtTime / getLineTimeRange
// ============================================================================

describe("findLineAtTime", () => {
  const lines: LrcLine[] = [
    { time: 0, text: "A" },
    { time: 5000, text: "B" },
    { time: 10000, text: "C" },
  ];

  it("精確時間點", () => {
    expect(findLineAtTime(lines, 5000)).toBe(1);
  });

  it("時間點在兩行之間", () => {
    expect(findLineAtTime(lines, 7500)).toBe(1);
  });

  it("時間點在第一行之前", () => {
    expect(findLineAtTime(lines, -1)).toBe(0);
  });

  it("時間點在最後一行之後", () => {
    expect(findLineAtTime(lines, 99999)).toBe(2);
  });
});

describe("getLineTimeRange", () => {
  const lines: LrcLine[] = [
    { time: 0, text: "A" },
    { time: 5000, text: "B" },
    { time: 10000, text: "C" },
  ];

  it("中間行的時間範圍", () => {
    expect(getLineTimeRange(lines, 1)).toEqual({ start: 5000, end: 10000 });
  });

  it("最後一行預設 +5 秒", () => {
    expect(getLineTimeRange(lines, 2)).toEqual({ start: 10000, end: 15000 });
  });
});

// ============================================================================
// mergeDuplicateLines
// ============================================================================

describe("mergeDuplicateLines", () => {
  it("合併相同文字的相鄰行", () => {
    const lines: LrcLine[] = [
      { time: 1000, text: "重複" },
      { time: 1050, text: "重複" },
      { time: 5000, text: "不同" },
    ];
    const result = mergeDuplicateLines(lines, 100);
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe("重複");
    expect(result[1]?.text).toBe("不同");
  });

  it("不合併間隔超過閾值的行", () => {
    const lines: LrcLine[] = [
      { time: 1000, text: "重複" },
      { time: 5000, text: "重複" },
    ];
    const result = mergeDuplicateLines(lines, 100);
    expect(result).toHaveLength(2);
  });

  it("空陣列回傳空陣列", () => {
    expect(mergeDuplicateLines([])).toEqual([]);
  });
});
