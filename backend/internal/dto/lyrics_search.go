package dto

// LyricsSearchRequest 歌詞搜尋請求
type LyricsSearchRequest struct {
	Query      string `json:"query" validate:"required,min=1,max=200"`
	SearchType string `json:"searchType" validate:"required,oneof=title artist lyrics"`
	Artist     string `json:"artist,omitempty" validate:"omitempty,max=200"`
}

// LyricsSearchResultItem 單筆搜尋結果
type LyricsSearchResultItem struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Artist          string   `json:"artist"`
	Album           string   `json:"album,omitempty"`
	Source          string   `json:"source"`
	Confidence      string   `json:"confidence"`
	HasSyncedLyrics bool     `json:"hasSyncedLyrics"`
	HasPlainLyrics  bool     `json:"hasPlainLyrics"`
	Duration        *int     `json:"duration"`
	Ratio           *float64 `json:"ratio"`
	CoverURL        *string  `json:"coverUrl"`
	IsSimplified    bool     `json:"isSimplified"`
	IsAiGenerated   bool     `json:"isAiGenerated"`
}

// SourceStatus 單一來源的狀態
type SourceStatus struct {
	Status    string `json:"status"`    // "ok", "error", "timeout", "skipped"
	Count     int    `json:"count"`
	LatencyMs int64  `json:"latencyMs"`
}

// LyricsSearchResponse 搜尋回應
type LyricsSearchResponse struct {
	Results      []LyricsSearchResultItem `json:"results"`
	Sources      map[string]SourceStatus  `json:"sources"`
	TotalResults int                      `json:"totalResults"`
}

// LyricsDetailResponse 歌詞詳情回應
type LyricsDetailResponse struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Artist       string `json:"artist"`
	Album        string `json:"album,omitempty"`
	Source       string `json:"source"`
	SyncedLyrics string `json:"syncedLyrics,omitempty"`
	PlainLyrics  string `json:"plainLyrics,omitempty"`
	IsSimplified bool   `json:"isSimplified"`
}
