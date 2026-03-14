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
	name      string
	results   []provider.LyricsResult
	err       error
	delay     time.Duration
	lyricsMap map[string]*provider.LyricsResult
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
		name: "genius",
		err:  errors.New("API error"),
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
