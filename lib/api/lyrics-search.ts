// ============================================================================
// 歌詞搜尋 API 型別
// ============================================================================

export interface LyricsSearchRequest {
  query: string;
  searchType: "title" | "artist" | "lyrics";
  artist?: string;
}

export interface LyricsSearchResultItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  source: string;
  confidence: "high" | "medium" | "low";
  hasSyncedLyrics: boolean;
  hasPlainLyrics: boolean;
  duration?: number;
  ratio?: number;
  coverUrl?: string;
  isSimplified: boolean;
  isAiGenerated: boolean;
}

export interface SourceStatus {
  status: "ok" | "error" | "timeout" | "skipped";
  count: number;
  latencyMs: number;
}

export interface LyricsSearchResponse {
  results: LyricsSearchResultItem[];
  sources: Record<string, SourceStatus>;
  totalResults: number;
}

export interface LyricsDetailResponse {
  id: string;
  title: string;
  artist: string;
  album?: string;
  source: string;
  syncedLyrics?: string;
  plainLyrics?: string;
  isSimplified: boolean;
}

// ============================================================================
// API 呼叫
// ============================================================================

/**
 * 搜尋歌詞
 */
export async function searchLyrics(
  req: LyricsSearchRequest,
  signal?: AbortSignal
): Promise<LyricsSearchResponse> {
  // signal 為 undefined 時保留 key 以符合呼叫方預期，使用型別斷言繞過 exactOptionalPropertyTypes
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  } as RequestInit;
  const response = await fetch("/api/lyrics/search", init);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "搜尋歌詞失敗" } }));
    throw new Error(error.error?.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 取得完整歌詞
 */
export async function getLyricsDetail(
  id: string
): Promise<LyricsDetailResponse> {
  const response = await fetch(
    `/api/lyrics/search/${encodeURIComponent(id)}`
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "取得歌詞失敗" } }));
    throw new Error(error.error?.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}
