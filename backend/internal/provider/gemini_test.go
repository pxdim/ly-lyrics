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

func TestGemini_Name(t *testing.T) {
	p := provider.NewGemini(&http.Client{}, "key", "")
	assert.Equal(t, "gemini", p.Name())
}

func TestGemini_Search_APIKeyInHeader(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 驗證 API Key 透過 header 傳遞
		assert.Equal(t, "test-key", r.Header.Get("x-goog-api-key"), "API key 應透過 x-goog-api-key header 傳遞")
		// 驗證 URL 中不包含 API Key
		assert.False(t, strings.Contains(r.URL.String(), "test-key"), "URL 不應包含 API key")

		resp := map[string]any{
			"candidates": []map[string]any{
				{
					"content": map[string]any{
						"parts": []map[string]any{
							{"text": `[{"title":"Test","artist":"Artist","lyrics":"test lyrics"}]`},
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
		Query:      "Test",
		SearchType: "title",
		Limit:      10,
	})

	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "Test", results[0].Title)
}

func TestGemini_Search(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Contains(t, r.URL.Path, "/v1beta/models/gemini-2.0-flash:generateContent")
		// 驗證 API Key 透過 header 傳遞，不在 URL 中
		assert.Equal(t, "test-key", r.Header.Get("x-goog-api-key"), "API key 應透過 x-goog-api-key header 傳遞")
		assert.False(t, strings.Contains(r.URL.String(), "test-key"), "URL 不應包含 API key")

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
