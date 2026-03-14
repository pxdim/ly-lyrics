package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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
		assert.Equal(t, "/jsonapi", r.URL.Path)
		assert.Equal(t, "告白氣球", r.URL.Query().Get("title"))
		assert.Equal(t, "周杰倫", r.URL.Query().Get("artist"))

		// HisAtri 真實回應格式：無 source / ratio 欄位
		results := []map[string]any{
			{
				"title":  "告白气球",
				"artist": "周杰伦",
				"album":  "周杰伦的床边故事",
				"lyrics": "[00:00.00]告白气球\n[00:12.34]塞纳河畔",
				"cover":  "https://example.com/cover.jpg",
				"id":     "abc123",
			},
			{
				"title":  "告白气球",
				"artist": "周杰伦",
				"lyrics": "[00:00.00]告白气球",
				"id":     "def456",
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
	assert.Equal(t, "周杰伦的床边故事", results[0].Album)
	assert.Equal(t, "lrcapi", results[0].Source)
	assert.Equal(t, "high", results[0].Confidence)
	assert.True(t, results[0].HasSyncedLyrics)
	assert.True(t, results[0].IsSimplified)
	assert.True(t, strings.HasPrefix(results[0].ID, "lrcapi-"))
}

func TestLrcApi_GetLyrics_FromCache(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		results := []map[string]any{
			{
				"title":  "測試歌曲",
				"artist": "測試歌手",
				"lyrics": "[00:00.00]第一行\n[00:05.00]第二行",
				"id":     "abc123",
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

func TestLrcApi_Search_LrcField(t *testing.T) {
	// 公開 API (api.lrc.cx) 使用 lrc 欄位而非 lyrics
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		results := []map[string]any{
			{
				"title":  "光辉岁月",
				"artist": "Beyond",
				"album":  "命运派对",
				"lrc":    "[00:28.740]鐘聲響起歸家的信號\n[00:33.129]在他生命裏 彷彿帶點唏噓",
				"cover":  "https://example.com/cover.jpg",
				"id":     "pub123",
			},
			{
				"title":  "光辉岁月",
				"artist": "Beyond",
				"id":     "pub456",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}))
	defer server.Close()

	p := provider.NewLrcApi(&http.Client{}, server.URL, "")
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "光辉岁月", SearchType: "title", Artist: "Beyond", Limit: 10,
	})

	require.NoError(t, err)
	require.Len(t, results, 1, "無歌詞的結果應被過濾")
	assert.Equal(t, "光辉岁月", results[0].Title)
	assert.True(t, results[0].HasSyncedLyrics)
	assert.Contains(t, results[0].SyncedLyrics, "[00:28.740]")
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

func TestLrcApi_Search_PlainLyricsNoSync(t *testing.T) {
	// 測試：歌詞不含時間戳時，SyncedLyrics 應為空字串
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		results := []map[string]any{
			{
				"title":  "測試純文字",
				"artist": "測試歌手",
				"lyrics": "第一行歌詞\n第二行歌詞\n第三行歌詞",
				"id":     "plain123",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}))
	defer server.Close()

	p := provider.NewLrcApi(&http.Client{}, server.URL, "")
	results, err := p.Search(context.Background(), provider.SearchRequest{
		Query: "測試", SearchType: "title", Limit: 10,
	})

	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.False(t, results[0].HasSyncedLyrics)
	assert.Empty(t, results[0].SyncedLyrics, "純文字歌詞不應填入 SyncedLyrics")
	assert.NotEmpty(t, results[0].PlainLyrics)
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
