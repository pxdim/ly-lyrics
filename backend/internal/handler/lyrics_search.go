// Package handler 定義 HTTP 請求處理器。
// 此檔案負責歌詞搜尋 API 的 HTTP 處理。
package handler

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// LyricsSearchServicer 定義歌詞搜尋 handler 所需的服務介面，便於測試時替換為 mock
type LyricsSearchServicer interface {
	Search(ctx context.Context, req dto.LyricsSearchRequest) (*dto.LyricsSearchResponse, error)
	GetLyrics(ctx context.Context, id string) (*dto.LyricsDetailResponse, error)
}

// LyricsSearch 歌詞搜尋 HTTP handler
type LyricsSearch struct {
	svc LyricsSearchServicer
}

// NewLyricsSearch 建立 LyricsSearch handler（使用具體的 *service.LyricsSearchService）
func NewLyricsSearch(svc *service.LyricsSearchService) *LyricsSearch {
	return &LyricsSearch{svc: svc}
}

// NewLyricsSearchWithService 建立 LyricsSearch handler，接受介面（便於測試注入 mock）
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
