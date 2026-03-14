/**
 * LRC 匯出邏輯單元測試
 *
 * 測試 generateLrcContent 的各種輸入情境。
 * downloadLrcFile 涉及 DOM 操作，在 Task 1 中不測試（屬於整合層）。
 */

import { describe, it, expect } from "vitest";
import { generateLrcContent } from "./export";

// ============================================================================
// generateLrcContent
// ============================================================================

describe("generateLrcContent", () => {
  it("帶時間戳時產生正確的 LRC 格式", () => {
    const result = generateLrcContent(
      "測試歌曲",
      "測試歌手",
      ["第一行", "第二行", "第三行"],
      [5000, 10000, 15000]
    );

    expect(result).toContain("[ti:測試歌曲]");
    expect(result).toContain("[ar:測試歌手]");
    expect(result).toContain("[00:05.00]第一行");
    expect(result).toContain("[00:10.00]第二行");
    expect(result).toContain("[00:15.00]第三行");
  });

  it("無時間戳時使用預設 5 秒間隔", () => {
    const result = generateLrcContent(
      "無時間戳歌曲",
      null,
      ["A", "B", "C"]
    );

    expect(result).toContain("[ti:無時間戳歌曲]");
    // artist 為 null 時不應包含 [ar:] tag
    expect(result).not.toContain("[ar:");
    // 預設間隔：0, 5000, 10000
    expect(result).toContain("[00:00.00]A");
    expect(result).toContain("[00:05.00]B");
    expect(result).toContain("[00:10.00]C");
  });

  it("帶 title 和 artist metadata", () => {
    const result = generateLrcContent(
      "My Song",
      "My Artist",
      ["Hello"]
    );

    const lines = result.split("\n");
    // metadata 在歌詞之前
    expect(lines[0]).toBe("[ti:My Song]");
    expect(lines[1]).toBe("[ar:My Artist]");
    // 歌詞在 metadata 之後
    expect(lines[2]).toContain("Hello");
  });

  it("空歌詞陣列時只產生 metadata", () => {
    const result = generateLrcContent("Empty", "Artist", []);

    expect(result).toContain("[ti:Empty]");
    expect(result).toContain("[ar:Artist]");
    // 沒有歌詞行（[mm:ss.xx] 開頭的行）
    const lrcLinePattern = /\[\d{2}:\d{2}\.\d{2}\]/;
    const lines = result.split("\n");
    const lrcLines = lines.filter((l) => lrcLinePattern.test(l));
    expect(lrcLines).toHaveLength(0);
  });

  it("artist 為 null 時不包含 artist metadata", () => {
    const result = generateLrcContent("Solo", null, ["歌詞"]);

    expect(result).toContain("[ti:Solo]");
    expect(result).not.toContain("[ar:");
  });
});
