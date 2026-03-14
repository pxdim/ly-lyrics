// Package handler_test 歌詞搜尋 handler 測試。
package handler_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
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
			ID:          "lrclib-1",
			Title:       "Song A",
			PlainLyrics: "Hello world",
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
