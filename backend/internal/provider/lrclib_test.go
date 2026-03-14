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
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/search", r.URL.Path)
		assert.Equal(t, "告白氣球", r.URL.Query().Get("track_name"))
		assert.Equal(t, "周杰倫", r.URL.Query().Get("artist_name"))

		results := []map[string]any{
			{
				"id":           12345,
				"trackName":    "告白氣球",
				"artistName":   "周杰倫",
				"albumName":    "周杰倫的床邊故事",
				"duration":     215,
				"syncedLyrics": "[00:00.00]告白氣球",
				"plainLyrics":  "告白氣球",
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
		results := make([]map[string]any, 15)
		for i := range results {
			results[i] = map[string]any{
				"id":         i + 1,
				"trackName":  "Song",
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
