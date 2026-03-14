package provider

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// lrcTimestampRegex 匹配 LRC 時間戳格式 [MM:SS.ms]
var lrcTimestampRegex = regexp.MustCompile(`\[\d{2}:\d{2}\.\d{2,3}\]`)

// stripLRCTimestamps 移除 LRC 時間戳，保留歌詞文字
func stripLRCTimestamps(text string) string {
	return lrcTimestampRegex.ReplaceAllString(text, "")
}

// lrcapiResult LrcApi 回應結構
type lrcapiResult struct {
	Title  string   `json:"title"`
	Artist string   `json:"artist"`
	Lyrics string   `json:"lyrics"`
	Source string   `json:"source"` // "kugou", "netease", "migu"
	Ratio  *float64 `json:"ratio"`
	Cover  *string  `json:"cover"`
}

// LrcApi HisAtri/LrcApi 歌詞提供者
type LrcApi struct {
	client  *http.Client
	baseURL string
	authKey string
	cache   *TTLCache
}

// NewLrcApi 建立 LrcApi provider
func NewLrcApi(client *http.Client, baseURL, authKey string) *LrcApi {
	return &LrcApi{
		client:  client,
		baseURL: strings.TrimRight(baseURL, "/"),
		authKey: authKey,
		cache:   NewTTLCache(10 * time.Minute),
	}
}

func (l *LrcApi) Name() string { return "lrcapi" }

func (l *LrcApi) Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error) {
	params := url.Values{}

	switch req.SearchType {
	case "title":
		params.Set("title", req.Query)
		if req.Artist != "" {
			params.Set("artist", req.Artist)
		}
	case "artist":
		params.Set("artist", req.Query)
	case "lyrics":
		params.Set("title", req.Query)
	}

	reqURL := fmt.Sprintf("%s/api?%s", l.baseURL, params.Encode())
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("lrcapi: 建立請求失敗: %w", err)
	}
	if l.authKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+l.authKey)
	}

	resp, err := l.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("lrcapi: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("lrcapi: HTTP %d", resp.StatusCode)
	}

	var raw []lrcapiResult
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("lrcapi: 解碼失敗: %w", err)
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	if len(raw) > limit {
		raw = raw[:limit]
	}

	results := make([]LyricsResult, 0, len(raw))
	for _, r := range raw {
		// 用內容 MD5 產生唯一 ID
		hash := fmt.Sprintf("%x", md5.Sum([]byte(r.Title+r.Artist+r.Source+r.Lyrics)))
		id := fmt.Sprintf("lrcapi-%s-%s", r.Source, hash[:8])

		hasSynced := lrcTimestampRegex.MatchString(r.Lyrics)
		plainLyrics := r.Lyrics
		if hasSynced {
			plainLyrics = stripLRCTimestamps(r.Lyrics)
		}
		result := LyricsResult{
			ID:              id,
			Title:           r.Title,
			Artist:          r.Artist,
			Source:          fmt.Sprintf("lrcapi-%s", r.Source),
			Confidence:      "high",
			HasSyncedLyrics: hasSynced,
			HasPlainLyrics:  r.Lyrics != "",
			SyncedLyrics:    r.Lyrics,
			PlainLyrics:     plainLyrics,
			Ratio:           r.Ratio,
			CoverURL:        r.Cover,
			IsSimplified:    true,
			IsAiGenerated:   false,
		}
		results = append(results, result)

		// 快取完整結果
		l.cache.Set(id, &result)
	}
	return results, nil
}

// Close 停止內部快取清理 goroutine
func (l *LrcApi) Close() { l.cache.Stop() }

func (l *LrcApi) GetLyrics(_ context.Context, id string) (*LyricsResult, error) {
	result, ok := l.cache.Get(id)
	if !ok {
		return nil, fmt.Errorf("lrcapi: 快取未命中，ID=%s（需重新搜尋）", id)
	}
	return result, nil
}
