# 歌詞搜尋整合 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作多來源歌詞搜尋功能，讓使用者在現場活動中快速搜尋並匯入歌詞到歌單。

**Architecture:** Go 後端新增 Provider 介面 + 聚合服務，以 goroutine 並行呼叫 LRClib / LrcApi / Genius / Gemini 四個來源。前端 AddSongModal 改為 Tab 切換（搜尋 / 手動 / LRC 匯入），搜尋結果可預覽並匯入。

**Tech Stack:** Go (chi v5, goroutine, sync.Map), TypeScript (Next.js 15, React 19, opencc-js), Vitest

**Spec:** `docs/specs/2026-03-14-lyrics-search-integration-design.md`

---

## File Structure

### Go 後端（新增）

| 動作 | 檔案 | 職責 |
|------|------|------|
| Create | `backend/internal/provider/provider.go` | Provider 介面 + LyricsResult + SearchRequest + TTL Cache |
| Create | `backend/internal/provider/provider_test.go` | Cache 單元測試 |
| Create | `backend/internal/provider/lrclib.go` | LRClib provider 實作 |
| Create | `backend/internal/provider/lrclib_test.go` | LRClib 測試（httptest mock） |
| Create | `backend/internal/provider/lrcapi.go` | LrcApi provider 實作（含 cache） |
| Create | `backend/internal/provider/lrcapi_test.go` | LrcApi 測試 |
| Create | `backend/internal/provider/genius.go` | Genius provider 實作 |
| Create | `backend/internal/provider/genius_test.go` | Genius 測試 |
| Create | `backend/internal/provider/gemini.go` | Gemini provider 實作（含 cache） |
| Create | `backend/internal/provider/gemini_test.go` | Gemini 測試 |
| Create | `backend/internal/dto/lyrics_search.go` | 歌詞搜尋 Request/Response DTO |
| Create | `backend/internal/service/lyrics_search.go` | 聚合搜尋服務 |
| Create | `backend/internal/service/lyrics_search_test.go` | 聚合服務測試 |
| Create | `backend/internal/handler/lyrics_search.go` | HTTP handler |
| Create | `backend/internal/handler/lyrics_search_test.go` | Handler 測試 |
| Modify | `backend/internal/config/config.go` | 新增 4 個 env var 欄位 |
| Modify | `backend/internal/server/server.go` | Provider 組裝 + 服務初始化 |
| Modify | `backend/internal/server/routes.go` | 註冊歌詞搜尋路由 |
| Modify | `backend/internal/validator/validator.go` | 新增 `oneof` 錯誤訊息 |

### 前端（新增）

| 動作 | 檔案 | 職責 |
|------|------|------|
| Create | `lib/api/lyrics-search.ts` | 歌詞搜尋 API 客戶端 |
| Create | `lib/api/lyrics-search.test.ts` | API 客戶端測試 |
| Create | `lib/utils/chinese-converter.ts` | OpenCC 簡繁轉換封裝 |
| Create | `lib/utils/chinese-converter.test.ts` | 轉換測試 |
| Create | `components/lyrics-search/LyricsSearchInput.tsx` | 搜尋輸入框 + 類型切換 |
| Create | `components/lyrics-search/LyricsResultCard.tsx` | 單筆結果卡片 |
| Create | `components/lyrics-search/LyricsSearchResults.tsx` | 候選清單 |
| Create | `components/lyrics-search/LyricsSearchPanel.tsx` | 搜尋面板（組合元件） |
| Create | `components/lyrics-search/LyricsPreviewModal.tsx` | 歌詞預覽 Modal |
| Create | `components/lyrics-search/SimplifiedToggle.tsx` | 簡繁轉換開關 |
| Modify | `components/controller/AddSongModal.tsx` | Tab 切換改造 |

---

## Chunk 1: Go 後端基礎建設

### Task 1: Provider 介面與資料結構

**Files:**
- Create: `backend/internal/provider/provider.go`
- Test: `backend/internal/provider/provider_test.go`

- [ ] **Step 1: 建立 provider 目錄並寫 Cache 測試**

```go
// backend/internal/provider/provider_test.go
package provider_test

import (
	"testing"
	"time"

	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCache_SetAndGet(t *testing.T) {
	c := provider.NewTTLCache(1 * time.Minute)
	defer c.Stop()

	result := &provider.LyricsResult{
		ID:    "test-1",
		Title: "Test Song",
	}
	c.Set("test-1", result)

	got, ok := c.Get("test-1")
	require.True(t, ok, "快取應該命中")
	assert.Equal(t, "Test Song", got.Title)
}

func TestCache_ExpiredEntry(t *testing.T) {
	c := provider.NewTTLCache(1 * time.Millisecond)
	defer c.Stop()

	c.Set("test-1", &provider.LyricsResult{ID: "test-1"})
	time.Sleep(5 * time.Millisecond)

	_, ok := c.Get("test-1")
	assert.False(t, ok, "過期項目應回傳 false")
}

func TestCache_Miss(t *testing.T) {
	c := provider.NewTTLCache(1 * time.Minute)
	defer c.Stop()

	_, ok := c.Get("nonexistent")
	assert.False(t, ok, "不存在的項目應回傳 false")
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestCache`
Expected: FAIL — package/types 不存在

- [ ] **Step 3: 實作 provider.go（介面 + 資料結構 + Cache）**

```go
// backend/internal/provider/provider.go
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
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestCache`
Expected: PASS（3 個測試）

- [ ] **Step 5: Commit**

```bash
git add backend/internal/provider/provider.go backend/internal/provider/provider_test.go
git commit -m "feat(provider): add Provider interface, LyricsResult struct, and TTLCache"
```

---

### Task 2: 歌詞搜尋 DTO

**Files:**
- Create: `backend/internal/dto/lyrics_search.go`

- [ ] **Step 1: 寫 DTO 結構**

此為純資料結構定義，不需要獨立測試（會被 handler 測試覆蓋）。

```go
// backend/internal/dto/lyrics_search.go
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
	Results      []LyricsSearchResultItem  `json:"results"`
	Sources      map[string]SourceStatus   `json:"sources"`
	TotalResults int                       `json:"totalResults"`
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/internal/dto/lyrics_search.go
git commit -m "feat(dto): add lyrics search request/response DTOs"
```

---

### Task 3: Config 新增環境變數

**Files:**
- Modify: `backend/internal/config/config.go`

- [ ] **Step 1: 新增 4 個選填欄位**

在 `Config` struct 的 `DeepgramAPIKey` 欄位後新增：

```go
// LrcApiURL LrcApi Docker 內網地址（選填，未設定時停用 LrcApi）
LrcApiURL string `env:"LRCAPI_URL" envDefault:""`
// LrcApiAuthKey LrcApi 認證 Key（選填）
LrcApiAuthKey string `env:"LRCAPI_AUTH_KEY" envDefault:""`
// GeniusAPIToken Genius API Token（選填，未設定時停用 Genius）
GeniusAPIToken string `env:"GENIUS_API_TOKEN" envDefault:""`
// GeminiAPIKey Gemini API Key（選填，未設定時停用 Gemini）
GeminiAPIKey string `env:"GEMINI_API_KEY" envDefault:""`
```

- [ ] **Step 2: 確認編譯通過**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go build ./...`
Expected: 成功

- [ ] **Step 3: Commit**

```bash
git add backend/internal/config/config.go
git commit -m "feat(config): add lyrics search provider env vars (LRCAPI, Genius, Gemini)"
```

---

### Task 4: Validator 新增 oneof 訊息

**Files:**
- Modify: `backend/internal/validator/validator.go`

- [ ] **Step 1: 在 msgForTag switch 中新增 oneof case**

在 `case "len":` 之前新增：

```go
case "oneof":
	return fmt.Sprintf("must be one of: %s", fe.Param())
```

- [ ] **Step 2: 確認編譯通過**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go build ./...`
Expected: 成功

- [ ] **Step 3: Commit**

```bash
git add backend/internal/validator/validator.go
git commit -m "feat(validator): add oneof validation error message"
```

---

## Chunk 2: LRClib Provider

### Task 5: LRClib Provider

**Files:**
- Create: `backend/internal/provider/lrclib.go`
- Create: `backend/internal/provider/lrclib_test.go`

- [ ] **Step 1: 寫 LRClib 測試**

```go
// backend/internal/provider/lrclib_test.go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLRClib_Name(t *testing.T) {
	p := provider.NewLRClib(&http.Client{}, "")
	assert.Equal(t, "lrclib", p.Name())
}

func TestLRClib_Search_ByTitle(t *testing.T) {
	// 模擬 LRClib API 回應
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/search", r.URL.Path)
		assert.Equal(t, "告白氣球", r.URL.Query().Get("track_name"))
		assert.Equal(t, "周杰倫", r.URL.Query().Get("artist_name"))

		results := []map[string]any{
			{
				"id":            12345,
				"trackName":     "告白氣球",
				"artistName":    "周杰倫",
				"albumName":     "周杰倫的床邊故事",
				"duration":      215,
				"syncedLyrics":  "[00:00.00]告白氣球",
				"plainLyrics":   "告白氣球",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}))
	defer server.Close()

	p := provider.NewLRClib(&http.Client{}, server.URL)
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "告白氣球",
		SearchType: "title",
		Artist:     "周杰倫",
		Limit:      10,
	})

	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "lrclib-12345", results[0].ID)
	assert.Equal(t, "告白氣球", results[0].Title)
	assert.Equal(t, "周杰倫", results[0].Artist)
	assert.Equal(t, "high", results[0].Confidence)
	assert.True(t, results[0].HasSyncedLyrics)
	assert.True(t, results[0].HasPlainLyrics)
	assert.False(t, results[0].IsSimplified)
}

func TestLRClib_Search_ByLyrics(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/search", r.URL.Path)
		assert.Equal(t, "塞納河畔", r.URL.Query().Get("q"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]any{})
	}))
	defer server.Close()

	p := provider.NewLRClib(&http.Client{}, server.URL)
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "塞納河畔",
		SearchType: "lyrics",
		Limit:      10,
	})

	require.NoError(t, err)
	assert.Empty(t, results)
}

func TestLRClib_Search_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	p := provider.NewLRClib(&http.Client{}, server.URL)
	_, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "test",
		SearchType: "title",
		Limit:      10,
	})

	assert.Error(t, err)
}

func TestLRClib_Search_LimitResults(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		// 回傳 15 筆
		results := make([]map[string]any, 15)
		for i := range results {
			results[i] = map[string]any{
				"id":        i + 1,
				"trackName": "Song",
				"artistName": "Artist",
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}))
	defer server.Close()

	p := provider.NewLRClib(&http.Client{}, server.URL)
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "Song",
		SearchType: "title",
		Limit:      10,
	})

	require.NoError(t, err)
	assert.Len(t, results, 10, "應限制在 10 筆")
}

func TestLRClib_GetLyrics(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/get/12345", r.URL.Path)

		result := map[string]any{
			"id":           12345,
			"trackName":    "告白氣球",
			"artistName":   "周杰倫",
			"albumName":    "周杰倫的床邊故事",
			"syncedLyrics": "[00:00.00]告白氣球\n[00:12.34]塞納河畔",
			"plainLyrics":  "告白氣球\n塞納河畔",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}))
	defer server.Close()

	p := provider.NewLRClib(&http.Client{}, server.URL)
	result, err := p.GetLyrics(context.Background(), "lrclib-12345")

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "告白氣球", result.Title)
	assert.Contains(t, result.SyncedLyrics, "[00:00.00]")
	assert.Contains(t, result.PlainLyrics, "塞納河畔")
}

func TestLRClib_GetLyrics_InvalidID(t *testing.T) {
	p := provider.NewLRClib(&http.Client{}, "http://localhost")
	_, err := p.GetLyrics(context.Background(), "genius-123")
	assert.Error(t, err, "非 lrclib 前綴應回傳錯誤")
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestLRClib`
Expected: FAIL — `NewLRClib` 不存在

- [ ] **Step 3: 實作 LRClib provider**

```go
// backend/internal/provider/lrclib.go
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

func (l *LRClib) Name() string { return "lrclib" }

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

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	if len(raw) > limit {
		raw = raw[:limit]
	}

	results := make([]LyricsResult, 0, len(raw))
	for _, r := range raw {
		dur := int(r.Duration)
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
		if dur > 0 {
			result.Duration = &dur
		}
		results = append(results, result)
	}
	return results, nil
}

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
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestLRClib`
Expected: PASS（6 個測試）

- [ ] **Step 5: 執行全部 provider 測試確認仍綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v`
Expected: PASS（所有 9 個測試）

- [ ] **Step 6: Commit**

```bash
git add backend/internal/provider/lrclib.go backend/internal/provider/lrclib_test.go
git commit -m "feat(provider): implement LRClib provider with search and get-by-ID"
```

---

## Chunk 3: LrcApi Provider

### Task 6: LrcApi Provider（含 in-memory cache）

**Files:**
- Create: `backend/internal/provider/lrcapi.go`
- Create: `backend/internal/provider/lrcapi_test.go`

LrcApi 特殊之處：搜尋結果已包含完整歌詞，需在 Search 階段快取到 TTLCache，GetLyrics 直接從 cache 取得。

- [ ] **Step 1: 寫 LrcApi 測試**

```go
// backend/internal/provider/lrcapi_test.go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLrcApi_Name(t *testing.T) {
	p := provider.NewLrcApi(&http.Client{}, "http://localhost:28883", "")
	assert.Equal(t, "lrcapi", p.Name())
}

func TestLrcApi_Search_ByTitle(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api", r.URL.Path)
		assert.Equal(t, "告白氣球", r.URL.Query().Get("title"))
		assert.Equal(t, "周杰倫", r.URL.Query().Get("artist"))

		// LrcApi 回傳格式：陣列，每個元素含 lyrics + source
		results := []map[string]any{
			{
				"title":  "告白气球",
				"artist": "周杰伦",
				"lyrics": "[00:00.00]告白气球\n[00:12.34]塞纳河畔",
				"source": "netease",
				"ratio":  0.98,
				"cover":  "https://example.com/cover.jpg",
			},
			{
				"title":  "告白气球",
				"artist": "周杰伦",
				"lyrics": "[00:00.00]告白气球",
				"source": "kugou",
				"ratio":  0.95,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}))
	defer server.Close()

	p := provider.NewLrcApi(&http.Client{}, server.URL, "")
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "告白氣球",
		SearchType: "title",
		Artist:     "周杰倫",
		Limit:      10,
	})

	require.NoError(t, err)
	require.Len(t, results, 2)
	assert.Equal(t, "告白气球", results[0].Title)
	assert.Equal(t, "lrcapi-netease", results[0].Source)
	assert.Equal(t, "high", results[0].Confidence)
	assert.True(t, results[0].HasSyncedLyrics)
	assert.True(t, results[0].IsSimplified)
	assert.NotNil(t, results[0].Ratio)
	assert.InDelta(t, 0.98, *results[0].Ratio, 0.001)
}

func TestLrcApi_GetLyrics_FromCache(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		results := []map[string]any{
			{
				"title":  "測試歌曲",
				"artist": "測試歌手",
				"lyrics": "[00:00.00]第一行\n[00:05.00]第二行",
				"source": "netease",
				"ratio":  0.99,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}))
	defer server.Close()

	p := provider.NewLrcApi(&http.Client{}, server.URL, "")

	// 先搜尋（觸發快取）
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "測試歌曲", SearchType: "title", Limit: 10,
	})
	require.NoError(t, err)
	require.Len(t, results, 1)

	// 用搜尋結果的 ID 取得歌詞
	detail, err := p.GetLyrics(context.Background(), results[0].ID)
	require.NoError(t, err)
	require.NotNil(t, detail)
	assert.Equal(t, "測試歌曲", detail.Title)
	assert.Contains(t, detail.SyncedLyrics, "[00:00.00]")
}

func TestLrcApi_GetLyrics_CacheMiss(t *testing.T) {
	p := provider.NewLrcApi(&http.Client{}, "http://localhost:28883", "")
	_, err := p.GetLyrics(context.Background(), "lrcapi-netease-nonexistent")
	assert.Error(t, err, "快取未命中應回傳錯誤")
}

func TestLrcApi_Search_WithAuthKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer my-secret", r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]any{})
	}))
	defer server.Close()

	p := provider.NewLrcApi(&http.Client{}, server.URL, "my-secret")
	_, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "test", SearchType: "title", Limit: 10,
	})
	require.NoError(t, err)
}

func TestLrcApi_Search_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	p := provider.NewLrcApi(&http.Client{}, server.URL, "")
	_, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "test", SearchType: "title", Limit: 10,
	})
	assert.Error(t, err)
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestLrcApi`
Expected: FAIL — `NewLrcApi` 不存在

- [ ] **Step 3: 實作 LrcApi provider**

```go
// backend/internal/provider/lrcapi.go
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
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestLrcApi`
Expected: PASS（5 個測試）

- [ ] **Step 5: Commit**

```bash
git add backend/internal/provider/lrcapi.go backend/internal/provider/lrcapi_test.go
git commit -m "feat(provider): implement LrcApi provider with in-memory cache"
```

---

## Chunk 4: Genius + Gemini Providers

### Task 7: Genius Provider

**Files:**
- Create: `backend/internal/provider/genius.go`
- Create: `backend/internal/provider/genius_test.go`

- [ ] **Step 1: 寫 Genius 測試**

```go
// backend/internal/provider/genius_test.go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenius_Name(t *testing.T) {
	p := provider.NewGenius(&http.Client{}, "token", "")
	assert.Equal(t, "genius", p.Name())
}

func TestGenius_Search(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 驗證 Authorization header
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		assert.Equal(t, "/api/search", r.URL.Path)
		assert.Equal(t, "告白氣球 周杰倫", r.URL.Query().Get("q"))

		resp := map[string]any{
			"response": map[string]any{
				"hits": []map[string]any{
					{
						"type": "song",
						"result": map[string]any{
							"id":             678,
							"title":          "告白氣球 (Confession Balloon)",
							"artist_names":   "Jay Chou",
							"header_image_url": "https://images.genius.com/cover.jpg",
						},
					},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	p := provider.NewGenius(&http.Client{}, "test-token", server.URL)
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "告白氣球",
		SearchType: "title",
		Artist:     "周杰倫",
		Limit:      10,
	})

	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "genius-678", results[0].ID)
	assert.Equal(t, "告白氣球 (Confession Balloon)", results[0].Title)
	assert.Equal(t, "Jay Chou", results[0].Artist)
	assert.Equal(t, "medium", results[0].Confidence)
	assert.False(t, results[0].HasSyncedLyrics)
	assert.False(t, results[0].HasPlainLyrics, "Genius API 不直接回傳歌詞文字")
}

func TestGenius_GetLyrics(t *testing.T) {
	// 注意：Genius API 不直接回傳歌詞文字，需透過 song.url 存取網頁。
	// GetLyrics 回傳歌曲元資料（title, artist, album），
	// plainLyrics 設為提示訊息引導使用者至 Genius 網頁。
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/songs/678", r.URL.Path)

		resp := map[string]any{
			"response": map[string]any{
				"song": map[string]any{
					"id":           678,
					"title":        "告白氣球",
					"artist_names": "Jay Chou",
					"url":          "https://genius.com/Jay-chou-confession-balloon-lyrics",
					"album": map[string]any{
						"name": "Jay Chou's Bedtime Stories",
					},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	p := provider.NewGenius(&http.Client{}, "test-token", server.URL)
	result, err := p.GetLyrics(context.Background(), "genius-678")

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "告白氣球", result.Title)
	assert.Equal(t, "Jay Chou", result.Artist)
	assert.Equal(t, "Jay Chou's Bedtime Stories", result.Album)
}

func TestGenius_GetLyrics_InvalidID(t *testing.T) {
	p := provider.NewGenius(&http.Client{}, "token", "")
	_, err := p.GetLyrics(context.Background(), "lrclib-123")
	assert.Error(t, err)
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestGenius`
Expected: FAIL — `NewGenius` 不存在

- [ ] **Step 3: 實作 Genius provider**

```go
// backend/internal/provider/genius.go
package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

const geniusDefaultBaseURL = "https://api.genius.com"

// Genius Genius.com 歌詞提供者
type Genius struct {
	client  *http.Client
	token   string
	baseURL string
}

// NewGenius 建立 Genius provider
func NewGenius(client *http.Client, token, baseURL string) *Genius {
	if baseURL == "" {
		baseURL = geniusDefaultBaseURL
	}
	return &Genius{client: client, token: token, baseURL: baseURL}
}

func (g *Genius) Name() string { return "genius" }

func (g *Genius) Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error) {
	q := req.Query
	if req.SearchType == "title" && req.Artist != "" {
		q = req.Query + " " + req.Artist
	}

	reqURL := fmt.Sprintf("%s/api/search?%s", g.baseURL, url.Values{"q": {q}}.Encode())
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("genius: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+g.token)

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("genius: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("genius: HTTP %d", resp.StatusCode)
	}

	var body struct {
		Response struct {
			Hits []struct {
				Type   string `json:"type"`
				Result struct {
					ID             int    `json:"id"`
					Title          string `json:"title"`
					ArtistNames    string `json:"artist_names"`
					HeaderImageURL string `json:"header_image_url"`
				} `json:"result"`
			} `json:"hits"`
		} `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("genius: 解碼失敗: %w", err)
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	var results []LyricsResult
	for _, hit := range body.Response.Hits {
		if hit.Type != "song" {
			continue
		}
		if len(results) >= limit {
			break
		}
		var coverURL *string
		if hit.Result.HeaderImageURL != "" {
			coverURL = &hit.Result.HeaderImageURL
		}
		results = append(results, LyricsResult{
			ID:              fmt.Sprintf("genius-%d", hit.Result.ID),
			Title:           hit.Result.Title,
			Artist:          hit.Result.ArtistNames,
			Source:          "genius",
			Confidence:      "medium",
			HasSyncedLyrics: false,
			HasPlainLyrics:  false, // Genius API 不直接回傳歌詞，需網頁 scraping
			CoverURL:        coverURL,
			IsSimplified:    false,
			IsAiGenerated:   false,
		})
	}
	return results, nil
}

// GetLyrics 取得 Genius 歌曲元資料。
// 注意：Genius API 不直接回傳歌詞文字（歌詞受版權保護，需存取網頁）。
// 此方法回傳歌曲的 title/artist/album 元資料。
// 未來可考慮新增網頁 scraping 取得歌詞。
func (g *Genius) GetLyrics(ctx context.Context, id string) (*LyricsResult, error) {
	if !strings.HasPrefix(id, "genius-") {
		return nil, fmt.Errorf("genius: 無效的 ID 前綴: %s", id)
	}
	rawID := strings.TrimPrefix(id, "genius-")

	reqURL := fmt.Sprintf("%s/api/songs/%s", g.baseURL, rawID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("genius: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+g.token)

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("genius: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("genius: HTTP %d", resp.StatusCode)
	}

	var body struct {
		Response struct {
			Song struct {
				ID          int    `json:"id"`
				Title       string `json:"title"`
				ArtistNames string `json:"artist_names"`
				URL         string `json:"url"`
				Album       *struct {
					Name string `json:"name"`
				} `json:"album"`
			} `json:"song"`
		} `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("genius: 解碼失敗: %w", err)
	}

	song := body.Response.Song
	result := &LyricsResult{
		ID:         id,
		Title:      song.Title,
		Artist:     song.ArtistNames,
		Source:     "genius",
		Confidence: "medium",
	}
	if song.Album != nil {
		result.Album = song.Album.Name
	}

	return result, nil
}
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestGenius`
Expected: PASS（4 個測試）

- [ ] **Step 5: Commit**

```bash
git add backend/internal/provider/genius.go backend/internal/provider/genius_test.go
git commit -m "feat(provider): implement Genius provider with search and get-by-ID"
```

---

### Task 8: Gemini Provider（含 cache + 條件觸發）

**Files:**
- Create: `backend/internal/provider/gemini.go`
- Create: `backend/internal/provider/gemini_test.go`

注意：Gemini 的條件觸發邏輯（<3 筆結果才呼叫）在 LyricsSearchService 層處理，不在 Provider 內。

- [ ] **Step 1: 寫 Gemini 測試**

```go
// backend/internal/provider/gemini_test.go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGemini_Name(t *testing.T) {
	p := provider.NewGemini(&http.Client{}, "key", "")
	assert.Equal(t, "gemini", p.Name())
}

func TestGemini_Search(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Contains(t, r.URL.Path, "/v1beta/models/gemini-2.0-flash:generateContent")

		// 模擬 Gemini 回應（JSON 格式的歌詞搜尋結果）
		resp := map[string]any{
			"candidates": []map[string]any{
				{
					"content": map[string]any{
						"parts": []map[string]any{
							{
								"text": `[{"title":"告白氣球","artist":"周杰倫","lyrics":"告白氣球\n塞納河畔 左岸的咖啡"}]`,
							},
						},
					},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	p := provider.NewGemini(&http.Client{}, "test-key", server.URL)
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query:      "告白氣球",
		SearchType: "title",
		Artist:     "周杰倫",
		Limit:      10,
	})

	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Contains(t, results[0].ID, "gemini-")
	assert.Equal(t, "告白氣球", results[0].Title)
	assert.Equal(t, "gemini", results[0].Source)
	assert.Equal(t, "low", results[0].Confidence)
	assert.True(t, results[0].IsAiGenerated)
}

func TestGemini_GetLyrics_FromCache(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		resp := map[string]any{
			"candidates": []map[string]any{
				{
					"content": map[string]any{
						"parts": []map[string]any{
							{"text": `[{"title":"Test","artist":"Artist","lyrics":"Line 1\nLine 2"}]`},
						},
					},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	p := provider.NewGemini(&http.Client{}, "key", server.URL)

	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "Test", SearchType: "title", Limit: 10,
	})
	require.NoError(t, err)
	require.Len(t, results, 1)

	detail, err := p.GetLyrics(context.Background(), results[0].ID)
	require.NoError(t, err)
	require.NotNil(t, detail)
	assert.Equal(t, "Test", detail.Title)
	assert.Contains(t, detail.PlainLyrics, "Line 1")
}

func TestGemini_GetLyrics_CacheMiss(t *testing.T) {
	p := provider.NewGemini(&http.Client{}, "key", "")
	_, err := p.GetLyrics(context.Background(), "gemini-nonexistent")
	assert.Error(t, err)
}

func TestGemini_Search_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	p := provider.NewGemini(&http.Client{}, "key", server.URL)
	_, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "test", SearchType: "title", Limit: 10,
	})
	assert.Error(t, err)
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestGemini`
Expected: FAIL — `NewGemini` 不存在

- [ ] **Step 3: 實作 Gemini provider**

```go
// backend/internal/provider/gemini.go
package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

const geminiDefaultBaseURL = "https://generativelanguage.googleapis.com"

// geminiLyricsResult Gemini 回傳的歌詞結構
type geminiLyricsResult struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Lyrics string `json:"lyrics"`
}

// Gemini Google Gemini AI 歌詞提供者
type Gemini struct {
	client  *http.Client
	apiKey  string
	baseURL string
	cache   *TTLCache
}

// NewGemini 建立 Gemini provider
func NewGemini(client *http.Client, apiKey, baseURL string) *Gemini {
	if baseURL == "" {
		baseURL = geminiDefaultBaseURL
	}
	return &Gemini{
		client:  client,
		apiKey:  apiKey,
		baseURL: baseURL,
		cache:   NewTTLCache(10 * time.Minute),
	}
}

func (g *Gemini) Name() string { return "gemini" }

func (g *Gemini) Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error) {
	prompt := g.buildPrompt(req)

	reqBody := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]any{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]any{
			"temperature":     0.1,
			"responseMimeType": "text/plain",
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("gemini: 序列化請求失敗: %w", err)
	}

	reqURL := fmt.Sprintf("%s/v1beta/models/gemini-2.0-flash:generateContent?key=%s", g.baseURL, g.apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("gemini: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini: HTTP %d", resp.StatusCode)
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, fmt.Errorf("gemini: 解碼失敗: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, nil
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text
	// 嘗試解析 JSON 陣列
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var parsed []geminiLyricsResult
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, nil // AI 回傳格式異常時不報錯，回傳空結果
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	if len(parsed) > limit {
		parsed = parsed[:limit]
	}

	results := make([]LyricsResult, 0, len(parsed))
	for _, p := range parsed {
		id := fmt.Sprintf("gemini-%s", uuid.New().String()[:8])
		result := LyricsResult{
			ID:              id,
			Title:           p.Title,
			Artist:          p.Artist,
			Source:          "gemini",
			Confidence:      "low",
			HasSyncedLyrics: false,
			HasPlainLyrics:  p.Lyrics != "",
			PlainLyrics:     p.Lyrics,
			IsSimplified:    false,
			IsAiGenerated:   true,
		}
		results = append(results, result)
		g.cache.Set(id, &result)
	}
	return results, nil
}

// Close 停止內部快取清理 goroutine
func (g *Gemini) Close() { g.cache.Stop() }

func (g *Gemini) GetLyrics(_ context.Context, id string) (*LyricsResult, error) {
	result, ok := g.cache.Get(id)
	if !ok {
		return nil, fmt.Errorf("gemini: 快取未命中，ID=%s（需重新搜尋）", id)
	}
	return result, nil
}

func (g *Gemini) buildPrompt(req SearchRequest) string {
	var sb strings.Builder
	sb.WriteString("你是歌詞搜尋助手。請以 JSON 陣列格式回傳歌詞搜尋結果。\n")
	sb.WriteString("每個結果包含 title、artist、lyrics 三個欄位。\n")
	sb.WriteString("只回傳 JSON，不要其他文字。最多回傳 3 首歌。\n\n")

	switch req.SearchType {
	case "title":
		sb.WriteString(fmt.Sprintf("搜尋歌曲「%s」的歌詞", req.Query))
		if req.Artist != "" {
			sb.WriteString(fmt.Sprintf("，歌手是「%s」", req.Artist))
		}
	case "artist":
		sb.WriteString(fmt.Sprintf("搜尋歌手「%s」的熱門歌曲歌詞", req.Query))
	case "lyrics":
		sb.WriteString(fmt.Sprintf("搜尋包含歌詞片段「%s」的歌曲", req.Query))
		if req.Artist != "" {
			sb.WriteString(fmt.Sprintf("，歌手可能是「%s」", req.Artist))
		}
	}

	return sb.String()
}
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v -run TestGemini`
Expected: PASS（5 個測試）

- [ ] **Step 5: 執行全部 provider 測試**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/provider/... -v`
Expected: PASS（所有測試）

- [ ] **Step 6: Commit**

```bash
git add backend/internal/provider/gemini.go backend/internal/provider/gemini_test.go
git commit -m "feat(provider): implement Gemini provider with AI search and cache"
```

---

## Chunk 5: 聚合搜尋服務

### Task 9: LyricsSearchService

**Files:**
- Create: `backend/internal/service/lyrics_search.go`
- Create: `backend/internal/service/lyrics_search_test.go`

核心邏輯：goroutine 並行呼叫所有 providers、全局 8 秒超時、Gemini 條件觸發（<3 筆才呼叫）、結果排序。

- [ ] **Step 1: 寫聚合服務測試**

```go
// backend/internal/service/lyrics_search_test.go
package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/raymondchen/ly-backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockProvider 測試用 mock provider
type mockProvider struct {
	name       string
	results    []provider.LyricsResult
	err        error
	delay      time.Duration
	lyricsMap  map[string]*provider.LyricsResult
}

func (m *mockProvider) Name() string { return m.name }

func (m *mockProvider) Search(ctx context.Context, _ provider.SearchRequest) ([]provider.LyricsResult, error) {
	if m.delay > 0 {
		select {
		case <-time.After(m.delay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	return m.results, m.err
}

func (m *mockProvider) GetLyrics(_ context.Context, id string) (*provider.LyricsResult, error) {
	if m.lyricsMap != nil {
		if r, ok := m.lyricsMap[id]; ok {
			return r, nil
		}
	}
	return nil, errors.New("not found")
}

func TestLyricsSearch_MergesResults(t *testing.T) {
	p1 := &mockProvider{
		name: "lrclib",
		results: []provider.LyricsResult{
			{ID: "lrclib-1", Title: "Song A", Confidence: "high", HasSyncedLyrics: true},
		},
	}
	p2 := &mockProvider{
		name: "genius",
		results: []provider.LyricsResult{
			{ID: "genius-1", Title: "Song A", Confidence: "medium"},
		},
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1, p2}, nil, 8*time.Second)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song A", SearchType: "title",
	})

	require.NoError(t, err)
	assert.Equal(t, 2, resp.TotalResults)
	assert.Equal(t, "lrclib-1", resp.Results[0].ID, "high confidence 應排在前面")
	assert.Equal(t, "ok", resp.Sources["lrclib"].Status)
	assert.Equal(t, "ok", resp.Sources["genius"].Status)
}

func TestLyricsSearch_ProviderError_DoesNotBlock(t *testing.T) {
	p1 := &mockProvider{
		name: "lrclib",
		results: []provider.LyricsResult{
			{ID: "lrclib-1", Title: "Song", Confidence: "high"},
		},
	}
	p2 := &mockProvider{
		name:    "genius",
		err:     errors.New("API error"),
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1, p2}, nil, 8*time.Second)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})

	require.NoError(t, err)
	assert.Equal(t, 1, resp.TotalResults)
	assert.Equal(t, "error", resp.Sources["genius"].Status)
}

func TestLyricsSearch_ProviderTimeout(t *testing.T) {
	p1 := &mockProvider{
		name:    "lrclib",
		results: []provider.LyricsResult{{ID: "lrclib-1", Confidence: "high"}},
	}
	slowProvider := &mockProvider{
		name:  "genius",
		delay: 5 * time.Second,
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1, slowProvider}, nil, 100*time.Millisecond)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})

	require.NoError(t, err)
	assert.Equal(t, 1, resp.TotalResults, "超時的 provider 結果不應被包含")
	assert.Contains(t, resp.Sources["genius"].Status, "timeout")
}

func TestLyricsSearch_GeminiConditionalTrigger_Skipped(t *testing.T) {
	// 前三個 provider 有足夠結果（>=3），Gemini 應被跳過
	p1 := &mockProvider{
		name: "lrclib",
		results: []provider.LyricsResult{
			{ID: "lrclib-1", Confidence: "high"},
			{ID: "lrclib-2", Confidence: "high"},
			{ID: "lrclib-3", Confidence: "high"},
		},
	}
	gemini := &mockProvider{
		name: "gemini",
		results: []provider.LyricsResult{
			{ID: "gemini-1", Confidence: "low"},
		},
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1}, gemini, 8*time.Second)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})

	require.NoError(t, err)
	assert.Equal(t, 3, resp.TotalResults, "Gemini 不應被呼叫")
	assert.Equal(t, "skipped", resp.Sources["gemini"].Status)
}

func TestLyricsSearch_GeminiConditionalTrigger_Triggered(t *testing.T) {
	// 前面 provider 結果 <3，Gemini 應被觸發
	p1 := &mockProvider{
		name: "lrclib",
		results: []provider.LyricsResult{
			{ID: "lrclib-1", Confidence: "high"},
		},
	}
	gemini := &mockProvider{
		name: "gemini",
		results: []provider.LyricsResult{
			{ID: "gemini-1", Title: "AI Song", Confidence: "low", IsAiGenerated: true},
		},
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1}, gemini, 8*time.Second)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})

	require.NoError(t, err)
	assert.Equal(t, 2, resp.TotalResults, "Gemini 結果應被包含")
	assert.Equal(t, "ok", resp.Sources["gemini"].Status)
}

func TestLyricsSearch_SortOrder(t *testing.T) {
	// 測試排序：confidence (high > medium > low)，同 confidence 時 hasSyncedLyrics 優先
	p1 := &mockProvider{
		name: "test",
		results: []provider.LyricsResult{
			{ID: "3", Confidence: "low", Source: "gemini"},
			{ID: "1", Confidence: "high", HasSyncedLyrics: true, Source: "lrclib"},
			{ID: "2", Confidence: "high", HasSyncedLyrics: false, Source: "genius"},
			{ID: "4", Confidence: "medium", Source: "lrcapi-netease"},
		},
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1}, nil, 8*time.Second)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})

	require.NoError(t, err)
	require.Len(t, resp.Results, 4)
	assert.Equal(t, "1", resp.Results[0].ID, "high + synced 應排第一")
	assert.Equal(t, "2", resp.Results[1].ID, "high + no synced 應排第二")
	assert.Equal(t, "4", resp.Results[2].ID, "medium 應排第三")
	assert.Equal(t, "3", resp.Results[3].ID, "low 應排最後")
}

func TestLyricsSearch_GetLyrics(t *testing.T) {
	lyResult := &provider.LyricsResult{
		ID: "lrclib-1", Title: "Song", PlainLyrics: "Hello world",
	}
	p1 := &mockProvider{
		name:      "lrclib",
		lyricsMap: map[string]*provider.LyricsResult{"lrclib-1": lyResult},
	}

	svc := service.NewLyricsSearchService([]provider.Provider{p1}, nil, 8*time.Second)
	resp, err := svc.GetLyrics(context.Background(), "lrclib-1")

	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, "Song", resp.Title)
}

func TestLyricsSearch_GetLyrics_UnknownPrefix(t *testing.T) {
	svc := service.NewLyricsSearchService(nil, nil, 8*time.Second)
	_, err := svc.GetLyrics(context.Background(), "unknown-123")
	assert.Error(t, err)
}

func TestLyricsSearch_EmptyProviders(t *testing.T) {
	svc := service.NewLyricsSearchService(nil, nil, 8*time.Second)
	resp, err := svc.Search(context.Background(), dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})

	require.NoError(t, err)
	assert.Equal(t, 0, resp.TotalResults)
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/service/... -v -run TestLyricsSearch`
Expected: FAIL — `NewLyricsSearchService` 不存在

- [ ] **Step 3: 實作 LyricsSearchService**

```go
// backend/internal/service/lyrics_search.go
package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/provider"
)

// providerResult 單一 provider 的搜尋結果
type providerResult struct {
	source  string
	results []provider.LyricsResult
	err     error
	latency time.Duration
}

// LyricsSearchService 聚合歌詞搜尋服務
type LyricsSearchService struct {
	providers []provider.Provider
	gemini    provider.Provider // 條件觸發的 Gemini provider（可為 nil）
	timeout   time.Duration
}

// NewLyricsSearchService 建立聚合搜尋服務
// gemini 為條件觸發 provider（結果 <3 筆時才呼叫），可為 nil
func NewLyricsSearchService(providers []provider.Provider, gemini provider.Provider, timeout time.Duration) *LyricsSearchService {
	return &LyricsSearchService{
		providers: providers,
		gemini:    gemini,
		timeout:   timeout,
	}
}

// Search 並行搜尋所有 providers 並合併結果
func (s *LyricsSearchService) Search(ctx context.Context, req dto.LyricsSearchRequest) (*dto.LyricsSearchResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	searchReq := provider.SearchRequest{
		Query:      req.Query,
		SearchType: req.SearchType,
		Artist:     req.Artist,
		Limit:      10,
	}

	// 階段一：並行呼叫非 Gemini providers
	var wg sync.WaitGroup
	resultsCh := make(chan providerResult, len(s.providers))

	for _, p := range s.providers {
		wg.Add(1)
		go func(p provider.Provider) {
			defer wg.Done()
			start := time.Now()
			results, err := p.Search(ctx, searchReq)
			resultsCh <- providerResult{
				source:  p.Name(),
				results: results,
				err:     err,
				latency: time.Since(start),
			}
		}(p)
	}

	go func() { wg.Wait(); close(resultsCh) }()

	// 收集結果
	var allResults []provider.LyricsResult
	sources := make(map[string]dto.SourceStatus)

	for pr := range resultsCh {
		if pr.err != nil {
			status := "error"
			if ctx.Err() != nil {
				status = "timeout"
			}
			sources[pr.source] = dto.SourceStatus{
				Status:    status,
				Count:     0,
				LatencyMs: pr.latency.Milliseconds(),
			}
			continue
		}
		sources[pr.source] = dto.SourceStatus{
			Status:    "ok",
			Count:     len(pr.results),
			LatencyMs: pr.latency.Milliseconds(),
		}
		allResults = append(allResults, pr.results...)
	}

	// 階段二：Gemini 條件觸發
	if s.gemini != nil {
		if len(allResults) < 3 {
			start := time.Now()
			geminiResults, err := s.gemini.Search(ctx, searchReq)
			latency := time.Since(start)
			if err != nil {
				status := "error"
				if ctx.Err() != nil {
					status = "timeout"
				}
				sources[s.gemini.Name()] = dto.SourceStatus{
					Status: status, LatencyMs: latency.Milliseconds(),
				}
			} else {
				sources[s.gemini.Name()] = dto.SourceStatus{
					Status:    "ok",
					Count:     len(geminiResults),
					LatencyMs: latency.Milliseconds(),
				}
				allResults = append(allResults, geminiResults...)
			}
		} else {
			sources[s.gemini.Name()] = dto.SourceStatus{
				Status: "skipped", Count: 0, LatencyMs: 0,
			}
		}
	}

	// 排序
	sortResults(allResults)

	// 上限 50 筆
	if len(allResults) > 50 {
		allResults = allResults[:50]
	}

	// 轉換為 DTO
	items := make([]dto.LyricsSearchResultItem, len(allResults))
	for i, r := range allResults {
		items[i] = dto.LyricsSearchResultItem{
			ID:              r.ID,
			Title:           r.Title,
			Artist:          r.Artist,
			Album:           r.Album,
			Source:          r.Source,
			Confidence:      r.Confidence,
			HasSyncedLyrics: r.HasSyncedLyrics,
			HasPlainLyrics:  r.HasPlainLyrics,
			Duration:        r.Duration,
			Ratio:           r.Ratio,
			CoverURL:        r.CoverURL,
			IsSimplified:    r.IsSimplified,
			IsAiGenerated:   r.IsAiGenerated,
		}
	}

	return &dto.LyricsSearchResponse{
		Results:      items,
		Sources:      sources,
		TotalResults: len(items),
	}, nil
}

// GetLyrics 根據 ID 前綴路由到對應的 provider
func (s *LyricsSearchService) GetLyrics(ctx context.Context, id string) (*dto.LyricsDetailResponse, error) {
	p := s.findProviderByID(id)
	if p == nil {
		return nil, fmt.Errorf("無法識別歌詞來源: %s", id)
	}

	result, err := p.GetLyrics(ctx, id)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	return &dto.LyricsDetailResponse{
		ID:           result.ID,
		Title:        result.Title,
		Artist:       result.Artist,
		Album:        result.Album,
		Source:       result.Source,
		SyncedLyrics: result.SyncedLyrics,
		PlainLyrics:  result.PlainLyrics,
		IsSimplified: result.IsSimplified,
	}, nil
}

func (s *LyricsSearchService) findProviderByID(id string) provider.Provider {
	prefixMap := map[string]string{
		"lrclib": "lrclib",
		"lrcapi": "lrcapi",
		"genius": "genius",
		"gemini": "gemini",
	}

	for prefix, name := range prefixMap {
		if strings.HasPrefix(id, prefix+"-") {
			for _, p := range s.providers {
				if p.Name() == name {
					return p
				}
			}
			if s.gemini != nil && s.gemini.Name() == name {
				return s.gemini
			}
		}
	}
	return nil
}

// confidenceOrder 可信度排序權重
var confidenceOrder = map[string]int{
	"high":   0,
	"medium": 1,
	"low":    2,
}

// sourceOrder 來源優先級
var sourceOrder = map[string]int{
	"lrclib":         0,
	"lrcapi-kugou":   1,
	"lrcapi-netease": 1,
	"lrcapi-migu":    1,
	"genius":         2,
	"gemini":         3,
}

func sortResults(results []provider.LyricsResult) {
	sort.SliceStable(results, func(i, j int) bool {
		ci, cj := confidenceOrder[results[i].Confidence], confidenceOrder[results[j].Confidence]
		if ci != cj {
			return ci < cj
		}
		// 同 confidence 時，有時間戳的排前面
		if results[i].HasSyncedLyrics != results[j].HasSyncedLyrics {
			return results[i].HasSyncedLyrics
		}
		// 來源優先級
		si := sourceOrder[results[i].Source]
		sj := sourceOrder[results[j].Source]
		return si < sj
	})
}
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/service/... -v -run TestLyricsSearch`
Expected: PASS（9 個測試）

- [ ] **Step 5: Commit**

```bash
git add backend/internal/service/lyrics_search.go backend/internal/service/lyrics_search_test.go
git commit -m "feat(service): implement LyricsSearchService with parallel aggregation and Gemini conditional trigger"
```

---

## Chunk 6: HTTP Handler + 路由整合

### Task 10: LyricsSearch Handler

**Files:**
- Create: `backend/internal/handler/lyrics_search.go`
- Create: `backend/internal/handler/lyrics_search_test.go`

- [ ] **Step 1: 寫 Handler 測試**

```go
// backend/internal/handler/lyrics_search_test.go
package handler_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockLyricsSearchService 實作 handler.LyricsSearchServicer 介面
type mockLyricsSearchService struct {
	searchResp    *dto.LyricsSearchResponse
	searchErr     error
	getLyricsResp *dto.LyricsDetailResponse
	getLyricsErr  error
}

func (m *mockLyricsSearchService) Search(_ context.Context, _ dto.LyricsSearchRequest) (*dto.LyricsSearchResponse, error) {
	return m.searchResp, m.searchErr
}

func (m *mockLyricsSearchService) GetLyrics(_ context.Context, _ string) (*dto.LyricsDetailResponse, error) {
	return m.getLyricsResp, m.getLyricsErr
}

func TestLyricsSearch_Search_Success(t *testing.T) {
	mock := &mockLyricsSearchService{
		searchResp: &dto.LyricsSearchResponse{
			Results: []dto.LyricsSearchResultItem{
				{ID: "lrclib-1", Title: "Song A", Confidence: "high"},
			},
			Sources:      map[string]dto.SourceStatus{"lrclib": {Status: "ok", Count: 1}},
			TotalResults: 1,
		},
	}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "POST", "/api/lyrics/search", dto.LyricsSearchRequest{
		Query: "Song A", SearchType: "title",
	})
	rr := executeRequest(h.Search, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.LyricsSearchResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, 1, resp.TotalResults)
	assert.Equal(t, "lrclib-1", resp.Results[0].ID)
}

func TestLyricsSearch_Search_ValidationError(t *testing.T) {
	mock := &mockLyricsSearchService{}
	h := handler.NewLyricsSearchWithService(mock)

	// 缺少 query
	req := newRequest(t, "POST", "/api/lyrics/search", map[string]any{
		"searchType": "title",
	})
	rr := executeRequest(h.Search, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestLyricsSearch_Search_InvalidSearchType(t *testing.T) {
	mock := &mockLyricsSearchService{}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "POST", "/api/lyrics/search", map[string]any{
		"query":      "test",
		"searchType": "invalid",
	})
	rr := executeRequest(h.Search, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestLyricsSearch_Search_ServiceError(t *testing.T) {
	mock := &mockLyricsSearchService{
		searchErr: errors.New("service error"),
	}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "POST", "/api/lyrics/search", dto.LyricsSearchRequest{
		Query: "Song", SearchType: "title",
	})
	rr := executeRequest(h.Search, req)

	assertStatus(t, rr, http.StatusInternalServerError)
}

func TestLyricsSearch_Search_NonJSONBody(t *testing.T) {
	mock := &mockLyricsSearchService{}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "POST", "/api/lyrics/search", nil)
	rr := executeRequest(h.Search, req)

	assertStatus(t, rr, http.StatusBadRequest)
}

func TestLyricsSearch_GetLyrics_Success(t *testing.T) {
	mock := &mockLyricsSearchService{
		getLyricsResp: &dto.LyricsDetailResponse{
			ID:           "lrclib-1",
			Title:        "Song A",
			PlainLyrics:  "Hello world",
		},
	}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "GET", "/api/lyrics/search/lrclib-1", nil)
	rr := executeWithChi(t, "GET", "/api/lyrics/search/{id}", "/api/lyrics/search/lrclib-1", h.GetLyrics, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.LyricsDetailResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, "Song A", resp.Title)
}

func TestLyricsSearch_GetLyrics_NotFound(t *testing.T) {
	mock := &mockLyricsSearchService{
		getLyricsResp: nil,
	}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "GET", "/api/lyrics/search/lrclib-999", nil)
	rr := executeWithChi(t, "GET", "/api/lyrics/search/{id}", "/api/lyrics/search/lrclib-999", h.GetLyrics, req)

	assertStatus(t, rr, http.StatusNotFound)
}

func TestLyricsSearch_GetLyrics_ServiceError(t *testing.T) {
	mock := &mockLyricsSearchService{
		getLyricsErr: errors.New("cache miss"),
	}
	h := handler.NewLyricsSearchWithService(mock)

	req := newRequest(t, "GET", "/api/lyrics/search/gemini-abc", nil)
	rr := executeWithChi(t, "GET", "/api/lyrics/search/{id}", "/api/lyrics/search/gemini-abc", h.GetLyrics, req)

	assertStatus(t, rr, http.StatusInternalServerError)
}
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/handler/... -v -run TestLyricsSearch`
Expected: FAIL — `NewLyricsSearchWithService` 不存在

- [ ] **Step 3: 實作 Handler**

```go
// backend/internal/handler/lyrics_search.go
package handler

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// LyricsSearchServicer 歌詞搜尋服務介面
type LyricsSearchServicer interface {
	Search(ctx context.Context, req dto.LyricsSearchRequest) (*dto.LyricsSearchResponse, error)
	GetLyrics(ctx context.Context, id string) (*dto.LyricsDetailResponse, error)
}

// LyricsSearch 歌詞搜尋 HTTP handler
type LyricsSearch struct {
	svc LyricsSearchServicer
}

// NewLyricsSearch 建立 handler（使用具體的 *service.LyricsSearchService）
func NewLyricsSearch(svc *service.LyricsSearchService) *LyricsSearch {
	return &LyricsSearch{svc: svc}
}

// NewLyricsSearchWithService 建立 handler，接受介面（便於測試注入 mock）
func NewLyricsSearchWithService(svc LyricsSearchServicer) *LyricsSearch {
	return &LyricsSearch{svc: svc}
}

// Search POST /api/lyrics/search — 搜尋歌詞
func (h *LyricsSearch) Search(w http.ResponseWriter, r *http.Request) {
	var req dto.LyricsSearchRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	resp, err := h.svc.Search(r.Context(), req)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to search lyrics", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// GetLyrics GET /api/lyrics/search/{id} — 取得完整歌詞
func (h *LyricsSearch) GetLyrics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, "VALIDATION_ERROR", "id is required", http.StatusBadRequest)
		return
	}

	resp, err := h.svc.GetLyrics(r.Context(), id)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to get lyrics", http.StatusInternalServerError)
		return
	}
	if resp == nil {
		writeError(w, "LYRICS_NOT_FOUND", "Lyrics not found", http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./internal/handler/... -v -run TestLyricsSearch`
Expected: PASS（8 個測試）

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handler/lyrics_search.go backend/internal/handler/lyrics_search_test.go
git commit -m "feat(handler): implement LyricsSearch handler with search and get-lyrics endpoints"
```

---

### Task 11: 路由與 Server 整合

**Files:**
- Modify: `backend/internal/server/server.go`
- Modify: `backend/internal/server/routes.go`

- [ ] **Step 1: 修改 server.go — 新增 provider 組裝與服務初始化**

在 `server.go` 的 `New()` 函式中，WebSocket 區塊之後、`s.setupMiddleware()` 之前，新增：

```go
// 歌詞搜尋 — 根據環境變數動態組裝 providers
httpClient := &http.Client{Timeout: 10 * time.Second}
var lyricsProviders []provider.Provider
lyricsProviders = append(lyricsProviders, provider.NewLRClib(httpClient, ""))
if cfg.LrcApiURL != "" {
	lyricsProviders = append(lyricsProviders, provider.NewLrcApi(httpClient, cfg.LrcApiURL, cfg.LrcApiAuthKey))
}
if cfg.GeniusAPIToken != "" {
	lyricsProviders = append(lyricsProviders, provider.NewGenius(httpClient, cfg.GeniusAPIToken, ""))
}
var geminiProvider provider.Provider
if cfg.GeminiAPIKey != "" {
	geminiProvider = provider.NewGemini(httpClient, cfg.GeminiAPIKey, "")
}
s.lyricsSearchSvc = service.NewLyricsSearchService(lyricsProviders, geminiProvider, 8*time.Second)
```

在 `Server` struct 中新增欄位：`lyricsSearchSvc *service.LyricsSearchService`

新增 import：
```go
"github.com/raymondchen/ly-backend/internal/provider"
```

- [ ] **Step 2: 修改 routes.go — 註冊歌詞搜尋路由**

在 OptionalAuth group 內（`r.Route("/api/settings", ...)` 之後）新增：

```go
// 歌詞搜尋
lyricsSearchHandler := handler.NewLyricsSearch(s.lyricsSearchSvc)
r.Route("/api/lyrics", func(r chi.Router) {
	r.Post("/search", lyricsSearchHandler.Search)
	r.Get("/search/{id}", lyricsSearchHandler.GetLyrics)
})
```

- [ ] **Step 3: 確認編譯通過**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go build ./...`
Expected: 成功

- [ ] **Step 4: 執行全部後端測試**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./... -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/server/server.go backend/internal/server/routes.go
git commit -m "feat(server): wire up lyrics search providers, service, and routes"
```

---

## Chunk 7: 前端基礎建設

### Task 12: 安裝 opencc-js 依賴

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安裝 opencc-js**

Run: `cd /Users/raymondchen/Desktop/LY && npm install opencc-js`

- [ ] **Step 2: 確認安裝成功**

Run: `cd /Users/raymondchen/Desktop/LY && node -e "const OpenCC = require('opencc-js'); console.log('OK')"`
Expected: OK

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add opencc-js for simplified/traditional Chinese conversion"
```

---

### Task 13: 簡繁轉換工具

**Files:**
- Create: `lib/utils/chinese-converter.ts`
- Create: `lib/utils/chinese-converter.test.ts`

- [ ] **Step 1: 寫轉換測試**

```typescript
// lib/utils/chinese-converter.test.ts
import { describe, it, expect } from "vitest";
import { convertToTraditional } from "./chinese-converter";

describe("chinese-converter", () => {
  describe("convertToTraditional", () => {
    it("將簡體轉為繁體", () => {
      const result = convertToTraditional("告白气球");
      expect(result).toBe("告白氣球");
    });

    it("繁體文字不變", () => {
      const result = convertToTraditional("告白氣球");
      expect(result).toBe("告白氣球");
    });

    it("英文文字不變", () => {
      const result = convertToTraditional("Hello World");
      expect(result).toBe("Hello World");
    });

    it("空字串不變", () => {
      const result = convertToTraditional("");
      expect(result).toBe("");
    });

    it("混合中英文正確轉換", () => {
      const result = convertToTraditional("[00:00.00]塞纳河畔 左岸的咖啡");
      expect(result).toContain("塞納河畔");
    });
  });
});
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY && npx vitest run lib/utils/chinese-converter.test.ts`
Expected: FAIL — module 不存在

- [ ] **Step 3: 實作轉換工具**

```typescript
// lib/utils/chinese-converter.ts
import * as OpenCC from "opencc-js";

// 建立簡體→繁體轉換器（模組級別單例）
const s2tConverter = OpenCC.Converter({ from: "cn", to: "tw" });

/**
 * 將簡體中文轉換為繁體中文
 */
export function convertToTraditional(text: string): string {
  if (!text) return text;
  return s2tConverter(text);
}
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY && npx vitest run lib/utils/chinese-converter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils/chinese-converter.ts lib/utils/chinese-converter.test.ts
git commit -m "feat(utils): add chinese-converter with opencc-js for s2t conversion"
```

---

### Task 14: 歌詞搜尋 API 客戶端

**Files:**
- Create: `lib/api/lyrics-search.ts`
- Create: `lib/api/lyrics-search.test.ts`

- [ ] **Step 1: 寫 API 客戶端測試**

```typescript
// lib/api/lyrics-search.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchLyrics, getLyricsDetail } from "./lyrics-search";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("lyrics-search API", () => {
  describe("searchLyrics", () => {
    it("發送正確的搜尋請求", async () => {
      const mockResponse = {
        results: [{ id: "lrclib-1", title: "Song A" }],
        sources: { lrclib: { status: "ok", count: 1, latencyMs: 100 } },
        totalResults: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchLyrics({
        query: "Song A",
        searchType: "title",
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/lyrics/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Song A", searchType: "title" }),
        signal: undefined,
      });
      expect(result.totalResults).toBe(1);
    });

    it("支援 AbortController signal", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [], sources: {}, totalResults: 0 }),
      });

      const controller = new AbortController();
      await searchLyrics(
        { query: "test", searchType: "title" },
        controller.signal
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/lyrics/search",
        expect.objectContaining({ signal: controller.signal })
      );
    });

    it("HTTP 錯誤拋出 Error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });

      await expect(
        searchLyrics({ query: "test", searchType: "title" })
      ).rejects.toThrow("Server error");
    });
  });

  describe("getLyricsDetail", () => {
    it("發送正確的 GET 請求", async () => {
      const mockDetail = {
        id: "lrclib-1",
        title: "Song A",
        plainLyrics: "Hello",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDetail),
      });

      const result = await getLyricsDetail("lrclib-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/lyrics/search/lrclib-1"
      );
      expect(result.title).toBe("Song A");
    });

    it("ID 包含特殊字元時正確編碼", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "lrcapi-netease-8a3f" }),
      });

      await getLyricsDetail("lrcapi-netease-8a3f");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/lyrics/search/lrcapi-netease-8a3f"
      );
    });
  });
});
```

- [ ] **Step 2: 執行測試確認紅燈**

Run: `cd /Users/raymondchen/Desktop/LY && npx vitest run lib/api/lyrics-search.test.ts`
Expected: FAIL — module 不存在

- [ ] **Step 3: 實作 API 客戶端**

```typescript
// lib/api/lyrics-search.ts

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
  const response = await fetch("/api/lyrics/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "搜尋歌詞失敗" } }));
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
    const error = await response.json().catch(() => ({ error: { message: "取得歌詞失敗" } }));
    throw new Error(error.error?.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}
```

- [ ] **Step 4: 執行測試確認綠燈**

Run: `cd /Users/raymondchen/Desktop/LY && npx vitest run lib/api/lyrics-search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/api/lyrics-search.ts lib/api/lyrics-search.test.ts
git commit -m "feat(api): add lyrics search API client with TypeScript types"
```

---

## Chunk 8: 前端搜尋 UI 元件

### Task 15: LyricsResultCard 元件

**Files:**
- Create: `components/lyrics-search/LyricsResultCard.tsx`

單筆搜尋結果卡片，顯示可信度標記、歌名、歌手、來源、同步標記。

- [ ] **Step 1: 實作 LyricsResultCard**

```tsx
// components/lyrics-search/LyricsResultCard.tsx
"use client";

import { type FC } from "react";
import type { LyricsSearchResultItem } from "@/lib/api/lyrics-search";

// 可信度標記顏色
const confidenceColors: Record<string, string> = {
  high: "text-green-400",
  medium: "text-yellow-400",
  low: "text-orange-400",
};

const confidenceDots: Record<string, string> = {
  high: "bg-green-400",
  medium: "bg-yellow-400",
  low: "bg-orange-400",
};

// 來源顯示名稱
function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    lrclib: "LRClib",
    "lrcapi-kugou": "酷狗",
    "lrcapi-netease": "網易雲",
    "lrcapi-migu": "咪咕",
    genius: "Genius",
    gemini: "AI 搜尋",
  };
  return map[source] ?? source;
}

interface LyricsResultCardProps {
  result: LyricsSearchResultItem;
  onClick: (result: LyricsSearchResultItem) => void;
}

export const LyricsResultCard: FC<LyricsResultCardProps> = ({ result, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(result)}
      className="w-full text-left px-4 py-3 border border-[#2A2D35] hover:bg-[#1E2028] hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* 歌名 + 歌手 */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${confidenceDots[result.confidence]}`} />
            <span className="text-[13px] text-[#E4E7EB] font-medium truncate">
              {result.title}
            </span>
            <span className="text-[12px] text-[#6B7280]">—</span>
            <span className="text-[12px] text-[#9CA3AF] truncate">
              {result.artist}
            </span>
          </div>
          {/* 來源 + 標記 */}
          <div className="flex items-center gap-2 mt-1 ml-4">
            <span className="text-[11px] text-[#6B7280] font-mono">
              {sourceLabel(result.source)}
            </span>
            {result.hasSyncedLyrics && (
              <span className="text-[11px] text-primary/70">⏱ 有時間戳</span>
            )}
            {!result.hasSyncedLyrics && result.hasPlainLyrics && (
              <span className="text-[11px] text-[#6B7280]">📝 純文字</span>
            )}
            {result.duration && (
              <span className="text-[11px] text-[#6B7280]">
                {Math.floor(result.duration / 60)}:{String(result.duration % 60).padStart(2, "0")}
              </span>
            )}
            {result.ratio != null && (
              <span className="text-[11px] text-[#6B7280]">
                相似度 {Math.round(result.ratio * 100)}%
              </span>
            )}
            {result.isAiGenerated && (
              <span className="text-[11px] text-orange-400/70">🤖 AI 生成</span>
            )}
          </div>
        </div>
        {/* 簡體標記 */}
        {result.isSimplified && (
          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono">
            簡
          </span>
        )}
      </div>
    </button>
  );
};
```

- [ ] **Step 2: 確認編譯通過**

Run: `cd /Users/raymondchen/Desktop/LY && npx tsc --noEmit --strict components/lyrics-search/LyricsResultCard.tsx 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/lyrics-search/LyricsResultCard.tsx
git commit -m "feat(ui): add LyricsResultCard component"
```

---

### Task 16: LyricsSearchInput 元件

**Files:**
- Create: `components/lyrics-search/LyricsSearchInput.tsx`

搜尋輸入框 + 搜尋類型切換（Radio）+ debounce。

- [ ] **Step 1: 實作 LyricsSearchInput**

```tsx
// components/lyrics-search/LyricsSearchInput.tsx
"use client";

import { type FC, useState, useRef, useEffect, useCallback } from "react";
import type { LyricsSearchRequest } from "@/lib/api/lyrics-search";

type SearchType = "title" | "artist" | "lyrics";

const searchTypeConfig: Record<SearchType, { label: string; placeholder: string; showArtist: boolean }> = {
  title:  { label: "歌曲名", placeholder: "輸入歌曲名稱...",   showArtist: true },
  artist: { label: "歌手",   placeholder: "輸入歌手名稱...",   showArtist: false },
  lyrics: { label: "歌詞",   placeholder: "輸入歌詞片段...",   showArtist: true },
};

interface LyricsSearchInputProps {
  onSearch: (req: LyricsSearchRequest) => void;
  isLoading: boolean;
}

export const LyricsSearchInput: FC<LyricsSearchInputProps> = ({ onSearch, isLoading }) => {
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const config = searchTypeConfig[searchType];

  // 自動聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerSearch = useCallback((q: string, a: string, st: SearchType) => {
    if (q.trim().length < 2) return;
    const req: LyricsSearchRequest = { query: q.trim(), searchType: st };
    if (a.trim() && searchTypeConfig[st].showArtist) {
      req.artist = a.trim();
    }
    onSearch(req);
  }, [onSearch]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSearch(value, artist, searchType);
    }, 500);
  };

  const handleManualSearch = () => {
    triggerSearch(query, artist, searchType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      triggerSearch(query, artist, searchType);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-[#090A0C] border border-[#2A2D35] text-[13px] text-[#E4E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none";

  return (
    <div className="space-y-3">
      {/* 搜尋類型 Radio */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] text-[#6B7280] font-mono uppercase tracking-wider">搜尋類型:</span>
        {(Object.keys(searchTypeConfig) as SearchType[]).map((type_) => (
          <label key={type_} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value={type_}
              checked={searchType === type_}
              onChange={() => setSearchType(type_)}
              className="accent-primary"
            />
            <span className={`text-[12px] ${searchType === type_ ? "text-primary" : "text-[#9CA3AF]"}`}>
              {searchTypeConfig[type_].label}
            </span>
          </label>
        ))}
      </div>

      {/* 主搜尋框 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={config.placeholder}
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={handleManualSearch}
          disabled={isLoading || query.trim().length < 2}
          className="px-3 py-2 bg-primary/10 border border-primary/40 text-primary text-[13px] font-mono hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "⏳" : "🔍"}
        </button>
      </div>

      {/* 歌手欄位（title 和 lyrics 模式顯示） */}
      {config.showArtist && (
        <div>
          <label className="block font-mono text-[11px] text-[#6B7280] uppercase tracking-wider mb-1">
            Artist (optional)
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入歌手名稱（選填）..."
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/lyrics-search/LyricsSearchInput.tsx
git commit -m "feat(ui): add LyricsSearchInput component with debounce and search type toggle"
```

---

### Task 17: SimplifiedToggle + LyricsPreviewModal

**Files:**
- Create: `components/lyrics-search/SimplifiedToggle.tsx`
- Create: `components/lyrics-search/LyricsPreviewModal.tsx`

- [ ] **Step 1: 實作 SimplifiedToggle**

```tsx
// components/lyrics-search/SimplifiedToggle.tsx
"use client";

import { type FC } from "react";

interface SimplifiedToggleProps {
  isTraditional: boolean;
  onToggle: () => void;
}

export const SimplifiedToggle: FC<SimplifiedToggleProps> = ({ isTraditional, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 text-[12px] font-mono border transition-colors ${
        isTraditional
          ? "bg-primary/10 border-primary/40 text-primary"
          : "bg-transparent border-[#2A2D35] text-[#6B7280] hover:border-primary/30"
      }`}
    >
      🔄 {isTraditional ? "顯示原文" : "轉繁體"}
    </button>
  );
};
```

- [ ] **Step 2: 實作 LyricsPreviewModal**

```tsx
// components/lyrics-search/LyricsPreviewModal.tsx
"use client";

import { type FC, useState, useEffect, useCallback } from "react";
import type { LyricsDetailResponse } from "@/lib/api/lyrics-search";
import { convertToTraditional } from "@/lib/utils/chinese-converter";
import { SimplifiedToggle } from "./SimplifiedToggle";

interface LyricsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lyrics: LyricsDetailResponse | null;
  isLoading: boolean;
  onImport: (lyrics: LyricsDetailResponse, convertToTrad: boolean) => void;
}

export const LyricsPreviewModal: FC<LyricsPreviewModalProps> = ({
  isOpen,
  onClose,
  lyrics,
  isLoading,
  onImport,
}) => {
  const [isTraditional, setIsTraditional] = useState(false);

  // 重置切換狀態
  useEffect(() => {
    if (isOpen) setIsTraditional(false);
  }, [isOpen]);

  // ESC 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const displayLyrics = useCallback(() => {
    if (!lyrics) return "";
    const text = lyrics.syncedLyrics || lyrics.plainLyrics || "";
    return isTraditional ? convertToTraditional(text) : text;
  }, [lyrics, isTraditional]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 bg-[#16181D] border border-[#2A2D35] max-h-[85vh] flex flex-col overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2D35] bg-[#090A0C]">
          <span className="font-mono text-[13px] font-semibold uppercase tracking-wider text-primary">
            歌詞預覽
          </span>
          <button onClick={onClose} type="button" className="p-1.5 border border-[#2A2D35] hover:bg-primary/10 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B7280]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#6B7280] text-[13px] font-mono">
            載入中...
          </div>
        ) : lyrics ? (
          <>
            {/* 歌曲資訊 */}
            <div className="px-5 py-3 border-b border-[#2A2D35]">
              <div className="text-[14px] text-[#E4E7EB] font-medium">
                {isTraditional ? convertToTraditional(lyrics.title) : lyrics.title}
                <span className="text-[#6B7280] mx-2">—</span>
                {isTraditional ? convertToTraditional(lyrics.artist) : lyrics.artist}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-[#6B7280] font-mono">來源：{lyrics.source}</span>
                {lyrics.syncedLyrics && <span className="text-[11px] text-primary/70">⏱ 有時間戳</span>}
                {lyrics.isSimplified && (
                  <SimplifiedToggle isTraditional={isTraditional} onToggle={() => setIsTraditional(!isTraditional)} />
                )}
              </div>
            </div>

            {/* 歌詞內容 */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <pre className="text-[13px] text-[#C9CDD3] font-body whitespace-pre-wrap leading-relaxed">
                {displayLyrics()}
              </pre>
            </div>

            {/* 按鈕列 */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2A2D35] bg-[#090A0C]/50">
              <button onClick={onClose} type="button" className="px-4 py-2 border border-[#2A2D35] text-[13px] text-[#6B7280] hover:bg-[#16181D] transition-colors font-mono">
                取消
              </button>
              <button
                type="button"
                onClick={() => onImport(lyrics, isTraditional)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/40 text-[13px] text-primary font-semibold hover:bg-primary/20 transition-colors font-mono"
              >
                ✅ 匯入到歌單
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-[#6B7280] text-[13px] font-mono">
            無歌詞資料
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add components/lyrics-search/SimplifiedToggle.tsx components/lyrics-search/LyricsPreviewModal.tsx
git commit -m "feat(ui): add SimplifiedToggle and LyricsPreviewModal components"
```

---

### Task 18: LyricsSearchResults + LyricsSearchPanel

**Files:**
- Create: `components/lyrics-search/LyricsSearchResults.tsx`
- Create: `components/lyrics-search/LyricsSearchPanel.tsx`

- [ ] **Step 1: 實作 LyricsSearchResults**

```tsx
// components/lyrics-search/LyricsSearchResults.tsx
"use client";

import { type FC } from "react";
import type { LyricsSearchResultItem, LyricsSearchResponse } from "@/lib/api/lyrics-search";
import { LyricsResultCard } from "./LyricsResultCard";

interface LyricsSearchResultsProps {
  response: LyricsSearchResponse | null;
  isLoading: boolean;
  onSelect: (result: LyricsSearchResultItem) => void;
}

export const LyricsSearchResults: FC<LyricsSearchResultsProps> = ({
  response,
  isLoading,
  onSelect,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-[#6B7280] text-[13px] font-mono">
        搜尋中...
      </div>
    );
  }

  if (!response) return null;

  if (response.totalResults === 0) {
    return (
      <div className="text-center py-8 text-[#6B7280] text-[13px] font-mono">
        找不到結果，請嘗試其他關鍵字
      </div>
    );
  }

  // 載入中的來源提示
  const pendingSources = Object.entries(response.sources)
    .filter(([, s]) => s.status === "timeout")
    .map(([name]) => name);

  return (
    <div>
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-[11px] text-[#6B7280] font-mono">
          搜尋結果（{response.totalResults} 筆）
        </span>
        {pendingSources.length > 0 && (
          <span className="text-[11px] text-yellow-400/70 font-mono">
            逾時: {pendingSources.join(", ")} ⏳
          </span>
        )}
      </div>
      <div className="space-y-1">
        {response.results.map((result) => (
          <LyricsResultCard key={result.id} result={result} onClick={onSelect} />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 實作 LyricsSearchPanel（組合元件）**

```tsx
// components/lyrics-search/LyricsSearchPanel.tsx
"use client";

import { type FC, useState, useRef, useCallback } from "react";
import type {
  LyricsSearchRequest,
  LyricsSearchResponse,
  LyricsSearchResultItem,
  LyricsDetailResponse,
} from "@/lib/api/lyrics-search";
import { searchLyrics, getLyricsDetail } from "@/lib/api/lyrics-search";
import { convertToTraditional } from "@/lib/utils/chinese-converter";
import { createSong } from "@/lib/api/songs";
import { LyricsSearchInput } from "./LyricsSearchInput";
import { LyricsSearchResults } from "./LyricsSearchResults";
import { LyricsPreviewModal } from "./LyricsPreviewModal";

interface LyricsSearchPanelProps {
  onSongAdded: () => void;
  onClose: () => void;
}

export const LyricsSearchPanel: FC<LyricsSearchPanelProps> = ({ onSongAdded, onClose }) => {
  const [searchResponse, setSearchResponse] = useState<LyricsSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 預覽 Modal 狀態
  const [previewLyrics, setPreviewLyrics] = useState<LyricsDetailResponse | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  const abortRef = useRef<AbortController>();

  const handleSearch = useCallback(async (req: LyricsSearchRequest) => {
    // 取消上一次未完成的搜尋
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setError(null);

    try {
      const resp = await searchLyrics(req, controller.signal);
      setSearchResponse(resp);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "搜尋失敗");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectResult = useCallback(async (result: LyricsSearchResultItem) => {
    setIsPreviewOpen(true);
    setIsLoadingLyrics(true);
    setPreviewLyrics(null);

    try {
      const detail = await getLyricsDetail(result.id);
      setPreviewLyrics(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得歌詞失敗");
      setIsPreviewOpen(false);
    } finally {
      setIsLoadingLyrics(false);
    }
  }, []);

  const handleImport = useCallback(async (lyrics: LyricsDetailResponse, convertToTrad: boolean) => {
    try {
      const lyricsText = lyrics.syncedLyrics || lyrics.plainLyrics || "";
      const text = convertToTrad ? convertToTraditional(lyricsText) : lyricsText;

      // 解析歌詞行
      const lines = text.split("\n").filter((line) => line.trim());
      const lyricsArr: string[] = [];
      const timestamps: number[] = [];

      for (const line of lines) {
        const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
        if (match) {
          const mins = parseInt(match[1], 10);
          const secs = parseInt(match[2], 10);
          const ms = parseInt(match[3].padEnd(3, "0"), 10);
          timestamps.push(mins * 60 + secs + ms / 1000);
          lyricsArr.push(match[4] || "");
        } else {
          lyricsArr.push(line);
        }
      }

      const title = convertToTrad ? convertToTraditional(lyrics.title) : lyrics.title;
      const artist = convertToTrad ? convertToTraditional(lyrics.artist) : lyrics.artist;

      await createSong({
        title,
        artist,
        lyrics: lyricsArr,
        ...(timestamps.length === lyricsArr.length ? { lrcTimestamps: timestamps } : {}),
      });

      setIsPreviewOpen(false);
      onSongAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    }
  }, [onSongAdded, onClose]);

  return (
    <div className="space-y-4">
      <LyricsSearchInput onSearch={handleSearch} isLoading={isSearching} />

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-[13px] text-red-400 font-mono">
          {error}
        </div>
      )}

      <LyricsSearchResults
        response={searchResponse}
        isLoading={isSearching}
        onSelect={handleSelectResult}
      />

      <LyricsPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        lyrics={previewLyrics}
        isLoading={isLoadingLyrics}
        onImport={handleImport}
      />
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add components/lyrics-search/LyricsSearchResults.tsx components/lyrics-search/LyricsSearchPanel.tsx
git commit -m "feat(ui): add LyricsSearchResults and LyricsSearchPanel components"
```

---

### Task 19: AddSongModal Tab 改造

**Files:**
- Modify: `components/controller/AddSongModal.tsx`

將 AddSongModal 改為 3 個 Tab：搜尋歌詞（預設）/ 手動輸入 / 匯入 LRC。

- [ ] **Step 1: 修改 AddSongModal.tsx**

主要變更：
1. 新增 `activeTab` state（`"search" | "manual" | "lrc"`）
2. 標題列下方新增 Tab 切換按鈕列
3. 搜尋 Tab 渲染 `<LyricsSearchPanel />`
4. 手動輸入 Tab 保留原有表單
5. LRC Tab 整合既有 `<LrcDropZone />`（需確認其 import 路徑）
6. 所有既有功能不受影響

```tsx
// 在 import 區新增
import { LyricsSearchPanel } from "@/components/lyrics-search/LyricsSearchPanel";
import { LrcDropZone } from "@/components/lrc/LrcDropZone";

// 在元件內新增 state
const [activeTab, setActiveTab] = useState<"search" | "manual" | "lrc">("search");

// 在標題列與表單之間插入 Tab 切換列
// Tab 定義
const tabs = [
  { key: "search" as const, label: "🔍 搜尋歌詞" },
  { key: "manual" as const, label: "✏️ 手動輸入" },
  { key: "lrc"    as const, label: "📄 匯入 LRC" },
];
```

Tab 切換列的 JSX：

```tsx
<div className="flex border-b border-[#2A2D35]">
  {tabs.map((tab) => (
    <button
      key={tab.key}
      type="button"
      onClick={() => setActiveTab(tab.key)}
      className={`flex-1 px-4 py-2.5 text-[12px] font-mono transition-colors ${
        activeTab === tab.key
          ? "text-primary border-b-2 border-primary bg-primary/5"
          : "text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[#1E2028]"
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

Tab 內容切換：

```tsx
<div className="p-5">
  {activeTab === "search" && (
    <LyricsSearchPanel onSongAdded={onSongAdded} onClose={onClose} />
  )}
  {activeTab === "manual" && (
    /* 原有的手動輸入表單 */
  )}
  {activeTab === "lrc" && (
    <LrcDropZone onImportSuccess={() => { onSongAdded(); onClose(); }} />
  )}
</div>
```

開啟 Modal 時重置 Tab：
```tsx
useEffect(() => {
  if (isOpen) {
    setActiveTab("search"); // 預設開啟搜尋 Tab
    // ...原有的 reset 邏輯
  }
}, [isOpen]);
```

- [ ] **Step 2: 確認編譯通過**

Run: `cd /Users/raymondchen/Desktop/LY && npx tsc --noEmit`

- [ ] **Step 3: 執行前端測試**

Run: `cd /Users/raymondchen/Desktop/LY && npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/controller/AddSongModal.tsx
git commit -m "feat(ui): convert AddSongModal to tabbed layout with lyrics search tab"
```

---

### Task 20: 整合驗證

- [ ] **Step 1: 執行全部後端測試**

Run: `cd /Users/raymondchen/Desktop/LY/backend && go test ./... -v`
Expected: PASS

- [ ] **Step 2: 執行全部前端測試**

Run: `cd /Users/raymondchen/Desktop/LY && npx vitest run`
Expected: PASS

- [ ] **Step 3: 確認 TypeScript 編譯**

Run: `cd /Users/raymondchen/Desktop/LY && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 4: 最終 Commit**

```bash
git add -A
git commit -m "feat(lyrics-search): complete multi-source lyrics search integration"
```
