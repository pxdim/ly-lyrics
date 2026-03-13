/**
 * 客戶端 Playlist API 包裝器
 *
 * 透過 fetch() 呼叫 /api/playlists 端點。
 * API 合約與 Go backend dto.PlaylistResponse 完全一致。
 *
 * @module lib/api/playlists
 */

// ============================================================================
// 型別定義（對應 Go dto.PlaylistResponse）
// ============================================================================

export interface ClientPlaylist {
  id: string;
  name: string;
  songIds: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistListResult {
  data: ClientPlaylist[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// API 呼叫
// ============================================================================

/**
 * 取得播放清單列表
 */
export async function fetchPlaylists(params?: {
  limit?: number;
  offset?: number;
}): Promise<PlaylistListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

  const queryString = searchParams.toString();
  const url = `/api/playlists${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch playlists" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 建立播放清單
 */
export async function createPlaylist(data: {
  name: string;
  songIds: string[];
}): Promise<ClientPlaylist> {
  const response = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "建立播放清單失敗" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 更新播放清單（名稱及/或歌曲列表）
 */
export async function updatePlaylist(
  id: string,
  data: { name?: string; songIds?: string[] }
): Promise<ClientPlaylist> {
  const response = await fetch(`/api/playlists/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "更新播放清單失敗" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 刪除播放清單
 */
export async function deletePlaylist(id: string): Promise<void> {
  const response = await fetch(`/api/playlists/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "刪除播放清單失敗" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }
}
