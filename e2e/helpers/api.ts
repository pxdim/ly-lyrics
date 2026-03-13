/**
 * E2E 測試用 API 輔助函式
 * 直接呼叫 Go backend API 進行歌曲 CRUD 操作
 */

const API_BASE = "http://localhost:8080";

interface SeedSongInput {
  title: string;
  artist?: string;
  lyrics: string[];
  language?: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  language: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface SongListResponse {
  data: Song[];
  total: number;
}

/**
 * 建立（seed）一首歌曲
 */
export async function seedSong(
  token: string,
  input: SeedSongInput
): Promise<Song> {
  const res = await fetch(`${API_BASE}/api/songs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: input.title,
      artist: input.artist ?? "測試歌手",
      lyrics: input.lyrics,
      language: input.language ?? "zh-TW",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `建立歌曲失敗 (${res.status}): ${body}`
    );
  }

  return res.json();
}

/**
 * 列出使用者的所有歌曲
 */
export async function listSongs(token: string): Promise<SongListResponse> {
  const res = await fetch(`${API_BASE}/api/songs`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `列出歌曲失敗 (${res.status}): ${body}`
    );
  }

  return res.json();
}

/**
 * 刪除指定歌曲
 */
export async function deleteSong(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/songs/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `刪除歌曲失敗 (${res.status}): ${body}`
    );
  }
}

/**
 * 清除使用者的所有歌曲（用於測試前後清理）
 */
export async function cleanupSongs(token: string): Promise<void> {
  const { data: songs } = await listSongs(token);

  for (const song of songs) {
    await deleteSong(token, song.id);
  }
}
