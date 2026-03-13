// Package handler 定義 HTTP 請求處理器。
// 此檔案負責播放清單 API 的 HTTP 處理。
package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// PlaylistServicer 定義 Playlist handler 所需的播放清單服務介面，便於測試時替換為 mock
type PlaylistServicer interface {
	List(ctx context.Context, params dto.PlaylistListParams) (*dto.PlaylistListResponse, error)
	Create(ctx context.Context, req dto.CreatePlaylistRequest, userID uuid.UUID) (*dto.PlaylistResponse, error)
}

// Playlist 播放清單 HTTP handler
type Playlist struct {
	svc PlaylistServicer
}

// NewPlaylist 建立 Playlist handler（使用具體的 *service.PlaylistService）
func NewPlaylist(svc *service.PlaylistService) *Playlist {
	return &Playlist{svc: svc}
}

// NewPlaylistWithService 建立 Playlist handler，接受 PlaylistServicer 介面（便於測試注入 mock）
func NewPlaylistWithService(svc PlaylistServicer) *Playlist {
	return &Playlist{svc: svc}
}

// List GET /api/playlists — 取得播放清單列表（分頁）
func (h *Playlist) List(w http.ResponseWriter, r *http.Request) {
	params := dto.PlaylistListParams{
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
	if v := r.URL.Query().Get("userId"); v != "" {
		params.UserID = &v
	}

	// 若未提供 userId query param，優先使用已認證使用者 ID
	if params.UserID == nil {
		if uid := auth.UserIDFromContext(r.Context()); uid != nil {
			uidStr := uid.String()
			params.UserID = &uidStr
		}
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch playlists", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// Create POST /api/playlists — 建立播放清單
func (h *Playlist) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreatePlaylistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "PLAYLIST_INVALID_FORMAT", "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// 驗證必填欄位
	if req.Name == "" {
		writeError(w, "PLAYLIST_INVALID_FORMAT", "Name is required", http.StatusBadRequest)
		return
	}
	if len(req.SongIDs) == 0 {
		writeError(w, "PLAYLIST_INVALID_FORMAT", "At least one songId is required", http.StatusBadRequest)
		return
	}

	// 優先使用已認證使用者 ID，未認證時退回 DemoUserID
	userID := service.DemoUserID
	if uid := auth.UserIDFromContext(r.Context()); uid != nil {
		userID = *uid
	}

	playlistResp, err := h.svc.Create(r.Context(), req, userID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to create playlist", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, playlistResp)
}
