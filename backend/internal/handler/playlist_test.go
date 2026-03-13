// Package handler_test 測試播放清單相關 HTTP handlers。
package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
)

// ────────────────────────────────────────────────────────────
// Mock PlaylistService
// ────────────────────────────────────────────────────────────

// mockPlaylistService 實作 handler.PlaylistServicer 介面，用於測試隔離
type mockPlaylistService struct {
	// List 的預設回傳值
	listResp *dto.PlaylistListResponse
	listErr  error

	// Create 的預設回傳值
	createResp *dto.PlaylistResponse
	createErr  error
}

func (m *mockPlaylistService) List(_ context.Context, _ dto.PlaylistListParams) (*dto.PlaylistListResponse, error) {
	return m.listResp, m.listErr
}

func (m *mockPlaylistService) Create(_ context.Context, _ dto.CreatePlaylistRequest, _ uuid.UUID) (*dto.PlaylistResponse, error) {
	return m.createResp, m.createErr
}

// ────────────────────────────────────────────────────────────
// 測試輔助函式
// ────────────────────────────────────────────────────────────

// newTestPlaylist 建立用於測試的 PlaylistResponse
func newTestPlaylist() *dto.PlaylistResponse {
	return &dto.PlaylistResponse{
		ID:        uuid.New(),
		Name:      "Test Playlist",
		SongIDs:   []uuid.UUID{uuid.MustParse("22222222-2222-2222-2222-222222222222")},
		UserID:    uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// ────────────────────────────────────────────────────────────
// List 測試
// ────────────────────────────────────────────────────────────

func TestPlaylistList_Default(t *testing.T) {
	playlist := newTestPlaylist()
	listResp := &dto.PlaylistListResponse{
		Data:   []dto.PlaylistResponse{*playlist},
		Total:  1,
		Limit:  20,
		Offset: 0,
	}
	mock := &mockPlaylistService{listResp: listResp}
	h := handler.NewPlaylistWithService(mock)

	req := httptest.NewRequest("GET", "/api/playlists", nil)
	rr := executeRequest(h.List, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.PlaylistListResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, 1, len(resp.Data))
	assert.Equal(t, "Test Playlist", resp.Data[0].Name)
}

// ────────────────────────────────────────────────────────────
// Create 測試
// ────────────────────────────────────────────────────────────

func TestPlaylistCreate_ValidData(t *testing.T) {
	playlist := newTestPlaylist()
	mock := &mockPlaylistService{createResp: playlist}
	h := handler.NewPlaylistWithService(mock)

	req := newRequest(t, "POST", "/api/playlists", dto.CreatePlaylistRequest{
		Name:    "My Playlist",
		SongIDs: []uuid.UUID{uuid.MustParse("22222222-2222-2222-2222-222222222222")},
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusCreated)
	var resp dto.PlaylistResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, playlist.Name, resp.Name)
}

func TestPlaylistCreate_MissingName(t *testing.T) {
	mock := &mockPlaylistService{}
	h := handler.NewPlaylistWithService(mock)

	req := newRequest(t, "POST", "/api/playlists", map[string]any{
		"songIds": []string{"22222222-2222-2222-2222-222222222222"},
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "PLAYLIST_INVALID_FORMAT")
}

func TestPlaylistCreate_MissingSongIDs(t *testing.T) {
	mock := &mockPlaylistService{}
	h := handler.NewPlaylistWithService(mock)

	req := newRequest(t, "POST", "/api/playlists", map[string]any{
		"name":    "Empty Playlist",
		"songIds": []string{},
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "PLAYLIST_INVALID_FORMAT")
}
