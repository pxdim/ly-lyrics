// Package handler 定義 HTTP 請求處理器。
// 此檔案負責歌曲 CRUD API 的 HTTP 處理。
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// Song 歌曲 HTTP handler
type Song struct {
	svc *service.SongService
}

// NewSong 建立 Song handler
func NewSong(svc *service.SongService) *Song {
	return &Song{svc: svc}
}

// List GET /api/songs — 取得歌曲列表（分頁 + 搜尋）
func (h *Song) List(w http.ResponseWriter, r *http.Request) {
	params := dto.SongListParams{
		Limit:  20,
		Offset: 0,
	}

	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			params.Limit = n
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			params.Offset = n
		}
	}
	if v := r.URL.Query().Get("search"); v != "" {
		params.Search = &v
	}
	if v := r.URL.Query().Get("userId"); v != "" {
		params.UserID = &v
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch songs", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// Create POST /api/songs — 建立歌曲
func (h *Song) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateSongRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// 驗證必填欄位
	if req.Title == "" || len(req.Lyrics) == 0 {
		writeError(w, "SONG_INVALID_FORMAT", "Title and lyrics are required", http.StatusBadRequest)
		return
	}

	songResp, err := h.svc.Create(r.Context(), req)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to create song", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, songResp)
}

// Get GET /api/songs/{id} — 取得單一歌曲
func (h *Song) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid song ID format", http.StatusBadRequest)
		return
	}

	songResp, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch song", http.StatusInternalServerError)
		return
	}
	if songResp == nil {
		writeError(w, "SONG_NOT_FOUND", "Song not found", http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, songResp)
}

// Update PUT /api/songs/{id} — 更新歌曲
func (h *Song) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid song ID format", http.StatusBadRequest)
		return
	}

	var req dto.UpdateSongRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid JSON format", http.StatusBadRequest)
		return
	}

	songResp, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to update song", http.StatusInternalServerError)
		return
	}
	if songResp == nil {
		writeError(w, "SONG_NOT_FOUND", "Song not found", http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, songResp)
}

// Delete DELETE /api/songs/{id} — 刪除歌曲
func (h *Song) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid song ID format", http.StatusBadRequest)
		return
	}

	// 先取得歌曲資料以便回傳
	songResp, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch song", http.StatusInternalServerError)
		return
	}
	if songResp == nil {
		writeError(w, "SONG_NOT_FOUND", "Song not found", http.StatusNotFound)
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to delete song", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success":     true,
		"deletedSong": songResp,
	})
}
