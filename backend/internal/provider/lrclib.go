package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

const lrclibDefaultBaseURL = "https://lrclib.net"

// lrclibResult LRClib API 回應結構
type lrclibResult struct {
	ID           int     `json:"id"`
	TrackName    string  `json:"trackName"`
	ArtistName   string  `json:"artistName"`
	AlbumName    string  `json:"albumName"`
	Duration     float64 `json:"duration"`
	SyncedLyrics *string `json:"syncedLyrics"`
	PlainLyrics  *string `json:"plainLyrics"`
}

// LRClib LRClib.net 歌詞提供者
type LRClib struct {
	client  *http.Client
	baseURL string
}

// NewLRClib 建立 LRClib provider
// baseURL 為空時使用預設 https://lrclib.net
func NewLRClib(client *http.Client, baseURL string) *LRClib {
	if baseURL == "" {
		baseURL = lrclibDefaultBaseURL
	}
	return &LRClib{client: client, baseURL: baseURL}
}

// Name 回傳提供者名稱
func (l *LRClib) Name() string { return "lrclib" }

// Search 依條件搜尋歌詞候選清單
func (l *LRClib) Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error) {
	params := url.Values{}

	switch req.SearchType {
	case "title":
		params.Set("track_name", req.Query)
		if req.Artist != "" {
			params.Set("artist_name", req.Artist)
		}
	case "artist":
		params.Set("artist_name", req.Query)
	case "lyrics":
		params.Set("q", req.Query)
	}

	reqURL := fmt.Sprintf("%s/api/search?%s", l.baseURL, params.Encode())
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("lrclib: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("User-Agent", "LY Lyrics System v1.0")

	resp, err := l.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("lrclib: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("lrclib: HTTP %d", resp.StatusCode)
	}

	var raw []lrclibResult
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("lrclib: 解碼失敗: %w", err)
	}

	// 限制回傳筆數
	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	if len(raw) > limit {
		raw = raw[:limit]
	}

	results := make([]LyricsResult, 0, len(raw))
	for _, r := range raw {
		result := LyricsResult{
			ID:              fmt.Sprintf("lrclib-%d", r.ID),
			Title:           r.TrackName,
			Artist:          r.ArtistName,
			Album:           r.AlbumName,
			Source:          "lrclib",
			Confidence:      "high",
			HasSyncedLyrics: r.SyncedLyrics != nil && *r.SyncedLyrics != "",
			HasPlainLyrics:  r.PlainLyrics != nil && *r.PlainLyrics != "",
			IsSimplified:    false,
			IsAiGenerated:   false,
		}
		if dur := int(r.Duration); dur > 0 {
			result.Duration = &dur
		}
		results = append(results, result)
	}
	return results, nil
}

// GetLyrics 以 ID 取得完整歌詞內容
func (l *LRClib) GetLyrics(ctx context.Context, id string) (*LyricsResult, error) {
	if !strings.HasPrefix(id, "lrclib-") {
		return nil, fmt.Errorf("lrclib: 無效的 ID 前綴: %s", id)
	}
	rawID := strings.TrimPrefix(id, "lrclib-")

	reqURL := fmt.Sprintf("%s/api/get/%s", l.baseURL, rawID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("lrclib: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("User-Agent", "LY Lyrics System v1.0")

	resp, err := l.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("lrclib: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("lrclib: HTTP %d", resp.StatusCode)
	}

	var raw lrclibResult
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("lrclib: 解碼失敗: %w", err)
	}

	result := &LyricsResult{
		ID:           id,
		Title:        raw.TrackName,
		Artist:       raw.ArtistName,
		Album:        raw.AlbumName,
		Source:       "lrclib",
		Confidence:   "high",
		IsSimplified: false,
	}
	if raw.SyncedLyrics != nil {
		result.SyncedLyrics = *raw.SyncedLyrics
		result.HasSyncedLyrics = *raw.SyncedLyrics != ""
	}
	if raw.PlainLyrics != nil {
		result.PlainLyrics = *raw.PlainLyrics
		result.HasPlainLyrics = *raw.PlainLyrics != ""
	}

	return result, nil
}
