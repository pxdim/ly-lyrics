/**
 * 歌曲排序工具函式（FR1.7）
 *
 * 支援按歌名（title）或歌手（artist）升冪/降冪排序。
 * 使用 localeCompare 進行大小寫不敏感且支援中文的排序。
 */

/** 可排序欄位 */
export type SortField = "title" | "artist";

/** 排序方向 */
export type SortOrder = "asc" | "desc";

/**
 * 排序歌曲列表
 *
 * @param songs - 歌曲陣列
 * @param field - 排序欄位（title 或 artist）
 * @param order - 排序方向（asc 或 desc）
 * @returns 排序後的新陣列（不修改原陣列）
 */
export function sortSongs<T extends { title: string; artist?: string }>(
  songs: T[],
  field: SortField,
  order: SortOrder,
): T[] {
  return [...songs].sort((a, b) => {
    const aVal = (field === "title" ? a.title : a.artist ?? "").toLowerCase();
    const bVal = (field === "title" ? b.title : b.artist ?? "").toLowerCase();
    const cmp = aVal.localeCompare(bVal, "zh-Hant");
    return order === "asc" ? cmp : -cmp;
  });
}
