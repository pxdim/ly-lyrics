package provider

import (
	"context"
	"sync"
	"time"
)

// LyricsResult 統一的歌詞搜尋結果
type LyricsResult struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Artist          string   `json:"artist"`
	Album           string   `json:"album,omitempty"`
	Source          string   `json:"source"`
	Confidence      string   `json:"confidence"`
	HasSyncedLyrics bool     `json:"hasSyncedLyrics"`
	HasPlainLyrics  bool     `json:"hasPlainLyrics"`
	SyncedLyrics    string   `json:"syncedLyrics,omitempty"`
	PlainLyrics     string   `json:"plainLyrics,omitempty"`
	Duration        *int     `json:"duration,omitempty"`
	Ratio           *float64 `json:"ratio,omitempty"`
	CoverURL        *string  `json:"coverUrl,omitempty"`
	IsSimplified    bool     `json:"isSimplified"`
	IsAiGenerated   bool     `json:"isAiGenerated"`
}

// SearchRequest 搜尋請求參數
type SearchRequest struct {
	Query      string
	SearchType string // "title", "artist", "lyrics"
	Artist     string
	Limit      int
}

// Provider 歌詞來源提供者介面
type Provider interface {
	// Search 搜尋歌詞候選清單
	Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error)
	// GetLyrics 取得完整歌詞（by ID）
	GetLyrics(ctx context.Context, id string) (*LyricsResult, error)
	// Name 來源名稱
	Name() string
}

// ── TTL Cache（供 LrcApi / Gemini 使用）──────────────────

type cacheEntry struct {
	result    *LyricsResult
	expiresAt time.Time
}

// TTLCache 帶過期時間的 in-memory 快取
type TTLCache struct {
	data sync.Map
	ttl  time.Duration
	stop chan struct{}
}

// NewTTLCache 建立新的 TTL 快取，啟動背景清理 goroutine
func NewTTLCache(ttl time.Duration) *TTLCache {
	c := &TTLCache{
		ttl:  ttl,
		stop: make(chan struct{}),
	}
	go c.cleanup()
	return c
}

// Set 寫入快取
func (c *TTLCache) Set(key string, result *LyricsResult) {
	c.data.Store(key, cacheEntry{
		result:    result,
		expiresAt: time.Now().Add(c.ttl),
	})
}

// Get 讀取快取，過期自動刪除
func (c *TTLCache) Get(key string) (*LyricsResult, bool) {
	v, ok := c.data.Load(key)
	if !ok {
		return nil, false
	}
	entry := v.(cacheEntry)
	if time.Now().After(entry.expiresAt) {
		c.data.Delete(key)
		return nil, false
	}
	return entry.result, true
}

// Stop 停止背景清理 goroutine
func (c *TTLCache) Stop() {
	close(c.stop)
}

// cleanup 每 5 分鐘清理過期項目
func (c *TTLCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			now := time.Now()
			c.data.Range(func(key, value any) bool {
				if entry, ok := value.(cacheEntry); ok && now.After(entry.expiresAt) {
					c.data.Delete(key)
				}
				return true
			})
		case <-c.stop:
			return
		}
	}
}
