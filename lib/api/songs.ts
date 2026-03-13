/**
 * 客戶端 Song API 包裝器
 *
 * 透過 fetch() 呼叫 /api/songs 端點，避免客戶端元件直接導入 server-only 模組。
 *
 * @module lib/api/songs
 */

// ============================================================================
// 客戶端安全的 Song 型別（JSON 序列化後 Date 變成 string）
// ============================================================================

export interface ClientSong {
  id: string;
  title: string;
  artist?: string;
  lyrics: string[];
  lrcTimestamps?: number[];
  language?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SongListResult {
  data: ClientSong[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// API 呼叫
// ============================================================================

/**
 * 取得歌曲列表
 */
export async function fetchSongs(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<SongListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  if (params?.search) searchParams.set("search", params.search);

  const queryString = searchParams.toString();
  const url = `/api/songs${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch songs" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 取得單首歌曲
 */
export async function fetchSongById(id: string): Promise<ClientSong> {
  const response = await fetch(`/api/songs/${encodeURIComponent(id)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch song" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 建立新歌曲
 */
export async function createSong(data: {
  title: string;
  artist?: string;
  lyrics: string[];
  language?: string;
}): Promise<ClientSong> {
  const response = await fetch("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "建立歌曲失敗" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 更新歌曲
 */
export async function updateSong(
  id: string,
  data: Partial<{ title: string; artist: string; lyrics: string[]; language: string }>
): Promise<ClientSong> {
  const response = await fetch(`/api/songs/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "更新歌曲失敗" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 刪除歌曲
 */
export async function deleteSong(id: string): Promise<void> {
  const response = await fetch(`/api/songs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "刪除歌曲失敗" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }
}
