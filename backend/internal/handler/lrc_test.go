// Package handler_test 測試 LRC 歌詞檔案匯入匯出 HTTP handlers。
package handler_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
)

// 注意：mockSongService 已在 song_test.go 中定義，此處直接複用

// ────────────────────────────────────────────────────────────
// Export 測試
// ────────────────────────────────────────────────────────────

func TestLRCExport_ExistingSong(t *testing.T) {
	song := newTestSong()
	mock := &mockSongService{getResp: song}
	h := handler.NewLRCWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := httptest.NewRequest("GET", "/api/songs/"+songID+"/export", nil)
	rr := executeWithChi(t, "GET", "/api/songs/{id}/export", "/api/songs/"+songID+"/export", h.Export, req)

	assertStatus(t, rr, http.StatusOK)
	// 確認回應為 LRC 文字格式
	assert.Contains(t, rr.Header().Get("Content-Type"), "text/plain")
	assert.Contains(t, rr.Header().Get("Content-Disposition"), ".lrc")
	// 確認 LRC 內容包含歌曲標題標籤
	body := rr.Body.String()
	assert.Contains(t, body, "[ti:")
}

func TestLRCExport_NonExistentSong(t *testing.T) {
	// GetByID 回傳 nil（找不到）
	mock := &mockSongService{getResp: nil}
	h := handler.NewLRCWithService(mock)

	songID := "99999999-9999-9999-9999-999999999999"
	req := httptest.NewRequest("GET", "/api/songs/"+songID+"/export", nil)
	rr := executeWithChi(t, "GET", "/api/songs/{id}/export", "/api/songs/"+songID+"/export", h.Export, req)

	assertStatus(t, rr, http.StatusNotFound)
	assertErrorCode(t, rr, "SONG_NOT_FOUND")
}

func TestLRCExport_InvalidUUID(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewLRCWithService(mock)

	req := httptest.NewRequest("GET", "/api/songs/not-a-uuid/export", nil)
	rr := executeWithChi(t, "GET", "/api/songs/{id}/export", "/api/songs/not-a-uuid/export", h.Export, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "SONG_INVALID_FORMAT")
}

// ────────────────────────────────────────────────────────────
// Import 測試
// ────────────────────────────────────────────────────────────

func TestLRCImport_ValidContent(t *testing.T) {
	existing := newTestSong()
	updated := newTestSong()
	updated.Title = "Imported Song"
	updated.Lyrics = []string{"first line", "second line"}
	// 第一次 GetByID 確認歌曲存在，第二次在 Update 後不需要，mock 只需設 getResp
	mock := &mockSongService{getResp: existing, updateResp: updated}
	h := handler.NewLRCWithService(mock)

	lrcContent := "[ti:Imported Song]\n[00:00.00]first line\n[00:05.00]second line\n"
	songID := "22222222-2222-2222-2222-222222222222"
	req := newRequest(t, "POST", "/api/songs/"+songID+"/import", map[string]string{
		"lrcContent": lrcContent,
	})
	rr := executeWithChi(t, "POST", "/api/songs/{id}/import", "/api/songs/"+songID+"/import", h.Import, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SongResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, updated.Title, resp.Title)
}

func TestLRCImport_NonExistentSong(t *testing.T) {
	// GetByID 回傳 nil（找不到）
	mock := &mockSongService{getResp: nil}
	h := handler.NewLRCWithService(mock)

	songID := "99999999-9999-9999-9999-999999999999"
	req := newRequest(t, "POST", "/api/songs/"+songID+"/import", map[string]string{
		"lrcContent": "[00:00.00]test line\n",
	})
	rr := executeWithChi(t, "POST", "/api/songs/{id}/import", "/api/songs/"+songID+"/import", h.Import, req)

	assertStatus(t, rr, http.StatusNotFound)
	assertErrorCode(t, rr, "SONG_NOT_FOUND")
}

func TestLRCImport_EmptyContent(t *testing.T) {
	existing := newTestSong()
	mock := &mockSongService{getResp: existing}
	h := handler.NewLRCWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := newRequest(t, "POST", "/api/songs/"+songID+"/import", map[string]string{
		"lrcContent": "   ", // 僅空白，應被拒絕
	})
	rr := executeWithChi(t, "POST", "/api/songs/{id}/import", "/api/songs/"+songID+"/import", h.Import, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "LRC_INVALID_FORMAT")
}

func TestLRCImport_NonJSONBody(t *testing.T) {
	existing := newTestSong()
	mock := &mockSongService{getResp: existing}
	h := handler.NewLRCWithService(mock)

	songID := "22222222-2222-2222-2222-222222222222"
	req := httptest.NewRequest("POST", "/api/songs/"+songID+"/import", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	rr := executeWithChi(t, "POST", "/api/songs/{id}/import", "/api/songs/"+songID+"/import", h.Import, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "LRC_INVALID_FORMAT")
}

func TestLRCImport_InvalidUUID(t *testing.T) {
	mock := &mockSongService{}
	h := handler.NewLRCWithService(mock)

	req := newRequest(t, "POST", "/api/songs/not-a-uuid/import", map[string]string{
		"lrcContent": "[00:00.00]test\n",
	})
	rr := executeWithChi(t, "POST", "/api/songs/{id}/import", "/api/songs/not-a-uuid/import", h.Import, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "SONG_INVALID_FORMAT")
}
