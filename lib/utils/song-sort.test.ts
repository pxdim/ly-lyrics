/**
 * song-sort 排序工具測試
 *
 * 測試歌曲列表按歌名或歌手排序功能（FR1.7）
 */

import { describe, it, expect } from "vitest";
import { sortSongs } from "./song-sort";

// 測試用歌曲資料
const mockSongs = [
  { id: "1", title: "Bless the Lord", artist: "Matt Redman", lyrics: [] },
  { id: "2", title: "Amazing Grace", artist: "John Newton", lyrics: [] },
  { id: "3", title: "Cornerstone", artist: "Hillsong", lyrics: [] },
];

describe("sortSongs", () => {
  describe("按歌名排序", () => {
    it("按歌名升冪排序", () => {
      const result = sortSongs(mockSongs, "title", "asc");
      expect(result.map((s) => s.title)).toEqual([
        "Amazing Grace",
        "Bless the Lord",
        "Cornerstone",
      ]);
    });

    it("按歌名降冪排序", () => {
      const result = sortSongs(mockSongs, "title", "desc");
      expect(result.map((s) => s.title)).toEqual([
        "Cornerstone",
        "Bless the Lord",
        "Amazing Grace",
      ]);
    });
  });

  describe("按歌手排序", () => {
    it("按歌手升冪排序", () => {
      const result = sortSongs(mockSongs, "artist", "asc");
      expect(result.map((s) => s.artist)).toEqual([
        "Hillsong",
        "John Newton",
        "Matt Redman",
      ]);
    });

    it("按歌手降冪排序", () => {
      const result = sortSongs(mockSongs, "artist", "desc");
      expect(result.map((s) => s.artist)).toEqual([
        "Matt Redman",
        "John Newton",
        "Hillsong",
      ]);
    });
  });

  describe("邊界情況", () => {
    it("空陣列回傳空陣列", () => {
      expect(sortSongs([], "title", "asc")).toEqual([]);
    });

    it("單一元素回傳原陣列", () => {
      const single = [mockSongs[0]!];
      const result = sortSongs(single, "title", "asc");
      expect(result).toEqual(single);
    });

    it("不修改原始陣列", () => {
      const original = [...mockSongs];
      sortSongs(original, "title", "asc");
      expect(original.map((s) => s.title)).toEqual([
        "Bless the Lord",
        "Amazing Grace",
        "Cornerstone",
      ]);
    });

    it("大小寫不敏感排序", () => {
      const songs = [
        { id: "1", title: "zebra", artist: "", lyrics: [] },
        { id: "2", title: "Alpha", artist: "", lyrics: [] },
      ];
      const result = sortSongs(songs, "title", "asc");
      expect(result.map((s) => s.title)).toEqual(["Alpha", "zebra"]);
    });

    it("artist 欄位為 undefined 時排在最前面", () => {
      const songs = [
        { id: "1", title: "Song A", artist: "Zed", lyrics: [] },
        { id: "2", title: "Song B", lyrics: [] },
        { id: "3", title: "Song C", artist: "Alpha", lyrics: [] },
      ];
      const result = sortSongs(songs, "artist", "asc");
      // undefined → 空字串 → 排最前
      expect(result.map((s) => s.id)).toEqual(["2", "3", "1"]);
    });

    it("中文歌名排序使用 locale-aware 比較", () => {
      const songs = [
        { id: "1", title: "奇異恩典", artist: "", lyrics: [] },
        { id: "2", title: "大山為我挪開", artist: "", lyrics: [] },
      ];
      // 只確認回傳長度正確且不拋錯
      const result = sortSongs(songs, "title", "asc");
      expect(result).toHaveLength(2);
    });
  });
});
