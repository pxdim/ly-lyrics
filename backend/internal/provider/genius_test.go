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
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		assert.Equal(t, "/api/search", r.URL.Path)
		assert.Equal(t, "告白氣球 周杰倫", r.URL.Query().Get("q"))

		resp := map[string]any{
			"response": map[string]any{
				"hits": []map[string]any{
					{
						"type": "song",
						"result": map[string]any{
							"id":               678,
							"title":            "告白氣球 (Confession Balloon)",
							"artist_names":     "Jay Chou",
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
