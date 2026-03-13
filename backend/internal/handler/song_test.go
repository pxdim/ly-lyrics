// Package handler_test 測試歌曲相關 HTTP handlers。
package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ────────────────────────────────────────────────────────────
// Mock SongService
// ────────────────────────────────────────────────────────────

// mockSongService 實作 handler.SongServicer 介面，用於測試隔離
type mockSongService struct {
	// List 的預設回傳值
	listResp *dto.SongListResponse
	listErr  error

	// GetByID 的預設回傳值
	getResp *dto.SongResponse
	getErr  error

	// Create 的預設回傳值
	createResp *dto.SongResponse
	createErr  error

	// Update 的預設回傳值
	updateResp *dto.SongResponse
	updateErr  error

	// Delete 的預設回傳值
	deleteErr error
}

func (m *mockSongService) List(_ context.Context, _ dto.SongListParams) (*dto.SongListResponse, error) {
	return m.listResp, m.listErr
}

func (m *mockSongService) GetByID(_ context.Context, _ uuid.UUID) (*dto.SongResponse, error) {
	return m.getResp, m.getErr
}

func (m *mockSongService) Create(_ context.Context, _ dto.CreateSongRequest, _ uuid.UUID) (*dto.SongResponse, error) {
	return m.createResp, m.createErr
}

func (m *mockSongService) Update(_ context.Context, _ uuid.UUID, _ dto.UpdateSongRequest) (*dto.SongResponse, error) {
	return m.updateResp, m.updateErr
}

func (m *mockSongService) Delete(_ context.Context, _ uuid.UUID) error {
	return m.deleteErr
}

// ────────────────────────────────────────────────────────────
// 測試輔助函式
// ────────────────────────────────────────────────────────────

// newTestSong 建立用於測試的 SongResponse
func newTestSong() *dto.SongResponse {
	artist := "Test Artist"
	return &dto.SongResponse{
		ID:        uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Title:     "Test Song",
		Artist:    &artist,
		Lyrics:    []string{"line 1", "line 2"},
		UserID:    uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// newTestSongListResponse 建立用於測試的 SongListResponse
func newTestSongListResponse(songs []dto.SongResponse) *dto.SongListResponse {
	return &dto.SongListResponse{
		Data:   songs,
		Total:  len(songs),
		Limit:  20,
		Offset: 0,
	}
}

// ────────────────────────────────────────────────────────────
// List 測試
// ────────────────────────────────────────────────────────────

func TestSongList_DefaultPagination(t *testing.T) {
	song := newTestSong()
	listResp := newTestSongListResponse([]dto.SongResponse{*song})
	mock := &mockSongService{listResp: listResp}
	h := handler.NewSongWithService(mock)

	req := httptest.NewRequest("GET", "/api/songs", nil)
	rr := executeRequest(h.List, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SongListResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, 1, len(resp.Data), "應回傳 1 首歌曲")
	assert.Equal(t, 1, resp.Total)
	assert.Equal(t, 20, resp.Limit, "預設 limit 應為 20")
	assert.Equal(t, 0, resp.Offset, "預設 offset 應為 0")
}

func TestSongList_CustomPagination(t *testing.T) {
	listResp := &dto.SongListResponse{
		Data:   []dto.SongResponse{},
		Total:  0,
		Limit:  5,
		Offset: 10,
	}
	mock := &mockSongService{listResp: listResp}
	h := handler.NewSongWithService(mock)

	req := httptest.NewRequest("GET", "/api/songs?limit=5&offset=10", nil)
	rr := executeRequest(h.List, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SongListResponse
	decodeJSON(t, rr, &resp)
	// limit 與 offset 由 mock 決定，僅確認 200
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestSongList_SearchKeyword(t *testing.T) {
	song := newTestSong()
	listResp := newTestSongListResponse([]dto.SongResponse{*song})
	mock := &mockSongService{listResp: listResp}
	h := handler.NewSongWithService(mock)

	req := httptest.NewRequest("GET", "/api/songs?search=Test", nil)
	rr := executeRequest(h.List, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SongListResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, 1, len(resp.Data))
}

// ────────────────────────────────────────────────────────────
// Create 測試
// ────────────────────────────────────────────────────────────

func TestSongCreate_CompleteData(t *testing.T) {
	artist := "Test Artist"
	song := &dto.SongResponse{
		ID:        uuid.New(),
		Title:     "New Song",
		Artist:    &artist,
		Lyrics:    []string{"verse 1", "chorus"},
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	mock := &mockSongService{createResp: song}
	h := handler.NewSongWithService(mock)

	req := newRequest(t, "POST", "/api/songs", dto.CreateSongRequest{
		Title:  "New Song",
		Artist: &artist,
		Lyrics: []string{"verse 1", "chorus"},
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusCreated)
	var resp dto.SongResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, "New Song", resp.Title)
}

func TestSongCreate_MissingTitle(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewSongWithService(mock)

	req := newRequest(t, "POST", "/api/songs", map[string]any{
		"lyrics": []string{"line 1"},
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestSongCreate_EmptyLyricsArray(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewSongWithService(mock)

	req := newRequest(t, "POST", "/api/songs", map[string]any{
		"title":  "Test Song",
		"lyrics": []string{},
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestSongCreate_NonJSONBody(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewSongWithService(mock)

	req := httptest.NewRequest("POST", "/api/songs", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusBadRequest)
}

func TestSongCreate_WithLrcTimestamps(t *testing.T) {
	timestamps := []float64{0.0, 5.5, 12.0}
	song := &dto.SongResponse{
		ID:            uuid.New(),
		Title:         "Timestamped Song",
		Lyrics:        []string{"line 1", "line 2", "line 3"},
		LrcTimestamps: timestamps,
		UserID:        uuid.New(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	mock := &mockSongService{createResp: song}
	h := handler.NewSongWithService(mock)

	req := newRequest(t, "POST", "/api/songs", dto.CreateSongRequest{
		Title:         "Timestamped Song",
		Lyrics:        []string{"line 1", "line 2", "line 3"},
		LrcTimestamps: timestamps,
	})
	rr := executeRequest(h.Create, req)

	assertStatus(t, rr, http.StatusCreated)
	var resp dto.SongResponse
	decodeJSON(t, rr, &resp)
	require.NotNil(t, resp.LrcTimestamps, "回應應包含 lrcTimestamps")
	assert.Equal(t, timestamps, resp.LrcTimestamps)
}

// ────────────────────────────────────────────────────────────
// Get 測試
// ────────────────────────────────────────────────────────────

func TestSongGet_ExistingID(t *testing.T) {
	song := newTestSong()
	mock := &mockSongService{getResp: song}
	h := handler.NewSongWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := httptest.NewRequest("GET", "/api/songs/"+songID, nil)
	rr := executeWithChi(t, "GET", "/api/songs/{id}", "/api/songs/"+songID, h.Get, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SongResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, song.Title, resp.Title)
}

func TestSongGet_NonExistentID(t *testing.T) {
	// GetByID 回傳 nil（找不到）
	mock := &mockSongService{getResp: nil}
	h := handler.NewSongWithService(mock)

	songID := "99999999-9999-9999-9999-999999999999"
	req := httptest.NewRequest("GET", "/api/songs/"+songID, nil)
	rr := executeWithChi(t, "GET", "/api/songs/{id}", "/api/songs/"+songID, h.Get, req)

	assertStatus(t, rr, http.StatusNotFound)
	assertErrorCode(t, rr, "SONG_NOT_FOUND")
}

func TestSongGet_InvalidUUID(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewSongWithService(mock)

	req := httptest.NewRequest("GET", "/api/songs/not-a-uuid", nil)
	rr := executeWithChi(t, "GET", "/api/songs/{id}", "/api/songs/not-a-uuid", h.Get, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "SONG_INVALID_FORMAT")
}

// ────────────────────────────────────────────────────────────
// Update 測試
// ────────────────────────────────────────────────────────────

func TestSongUpdate_UpdateTitle(t *testing.T) {
	newTitle := "Updated Title"
	updated := newTestSong()
	updated.Title = newTitle
	mock := &mockSongService{updateResp: updated}
	h := handler.NewSongWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := newRequest(t, "PUT", "/api/songs/"+songID, dto.UpdateSongRequest{
		Title: &newTitle,
	})
	rr := executeWithChi(t, "PUT", "/api/songs/{id}", "/api/songs/"+songID, h.Update, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SongResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, newTitle, resp.Title)
}

func TestSongUpdate_NonExistentID(t *testing.T) {
	// Update 回傳 nil（找不到）
	mock := &mockSongService{updateResp: nil}
	h := handler.NewSongWithService(mock)

	newTitle := "Updated"
	songID := "99999999-9999-9999-9999-999999999999"
	req := newRequest(t, "PUT", "/api/songs/"+songID, dto.UpdateSongRequest{
		Title: &newTitle,
	})
	rr := executeWithChi(t, "PUT", "/api/songs/{id}", "/api/songs/"+songID, h.Update, req)

	assertStatus(t, rr, http.StatusNotFound)
	assertErrorCode(t, rr, "SONG_NOT_FOUND")
}

func TestSongUpdate_NonJSONBody(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewSongWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := httptest.NewRequest("PUT", "/api/songs/"+songID, strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	rr := executeWithChi(t, "PUT", "/api/songs/{id}", "/api/songs/"+songID, h.Update, req)

	assertStatus(t, rr, http.StatusBadRequest)
}

// ────────────────────────────────────────────────────────────
// Delete 測試
// ────────────────────────────────────────────────────────────

func TestSongDelete_ExistingID(t *testing.T) {
	song := newTestSong()
	// GetByID 回傳歌曲，Delete 成功
	mock := &mockSongService{getResp: song, deleteErr: nil}
	h := handler.NewSongWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := httptest.NewRequest("DELETE", "/api/songs/"+songID, nil)
	rr := executeWithChi(t, "DELETE", "/api/songs/{id}", "/api/songs/"+songID, h.Delete, req)

	assertStatus(t, rr, http.StatusOK)
	var resp map[string]any
	decodeJSON(t, rr, &resp)
	assert.Equal(t, true, resp["success"])
	assert.NotNil(t, resp["deletedSong"], "回應應包含 deletedSong")
}

func TestSongDelete_NonExistentID(t *testing.T) {
	// GetByID 回傳 nil（找不到）
	mock := &mockSongService{getResp: nil}
	h := handler.NewSongWithService(mock)

	songID := "99999999-9999-9999-9999-999999999999"
	req := httptest.NewRequest("DELETE", "/api/songs/"+songID, nil)
	rr := executeWithChi(t, "DELETE", "/api/songs/{id}", "/api/songs/"+songID, h.Delete, req)

	assertStatus(t, rr, http.StatusNotFound)
	assertErrorCode(t, rr, "SONG_NOT_FOUND")
}

func TestSongDelete_InvalidUUID(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewSongWithService(mock)

	req := httptest.NewRequest("DELETE", "/api/songs/not-a-uuid", nil)
	rr := executeWithChi(t, "DELETE", "/api/songs/{id}", "/api/songs/not-a-uuid", h.Delete, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "SONG_INVALID_FORMAT")
}
