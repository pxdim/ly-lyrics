// Package handler 定義 HTTP 請求處理器。
// 此檔案負責 LRC 歌詞檔案匯入匯出端點。
package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// LRC 歌詞檔案匯入匯出 HTTP handler
type LRC struct {
	songSvc SongServicer
}

// NewLRC 建立 LRC handler（使用具體的 *service.SongService）
func NewLRC(songSvc *service.SongService) *LRC {
	return &LRC{songSvc: songSvc}
}

// NewLRCWithService 建立 LRC handler，接受 SongServicer 介面（便於測試注入 mock）
func NewLRCWithService(songSvc SongServicer) *LRC {
	return &LRC{songSvc: songSvc}
}

// Export GET /api/songs/{id}/export — 匯出歌曲為 LRC 格式
func (h *LRC) Export(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid song ID format", http.StatusBadRequest)
		return
	}

	songResp, err := h.songSvc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch song", http.StatusInternalServerError)
		return
	}
	if songResp == nil {
		writeError(w, "SONG_NOT_FOUND", "Song not found", http.StatusNotFound)
		return
	}

	// 組建 LrcFile
	lrc := buildLrcFileFromSong(songResp)

	// 序列化為 LRC 字串
	lrcContent := service.SerializeLRC(lrc)

	// 產生檔案名稱
	filename := sanitizeFilename(songResp.Title) + ".lrc"

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(lrcContent))
}

// importRequest 匯入 LRC 的 JSON 請求格式
type importRequest struct {
	LrcContent string `json:"lrcContent"`
}

// Import POST /api/songs/{id}/import — 匯入 LRC 歌詞至指定歌曲
func (h *LRC) Import(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, "SONG_INVALID_FORMAT", "Invalid song ID format", http.StatusBadRequest)
		return
	}

	// 確認歌曲存在
	existing, err := h.songSvc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch song", http.StatusInternalServerError)
		return
	}
	if existing == nil {
		writeError(w, "SONG_NOT_FOUND", "Song not found", http.StatusNotFound)
		return
	}

	// 讀取 LRC 內容
	var req importRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "LRC_INVALID_FORMAT", "Invalid JSON format", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.LrcContent) == "" {
		writeError(w, "LRC_INVALID_FORMAT", "lrcContent is required", http.StatusBadRequest)
		return
	}

	// 解析 LRC
	lrc := service.ParseLRC(req.LrcContent)

	// 提取歌詞文字與時間戳
	lyrics := make([]string, len(lrc.Lines))
	timestamps := make([]float64, len(lrc.Lines))
	for i, line := range lrc.Lines {
		lyrics[i] = line.Text
		timestamps[i] = float64(line.Time)
	}

	// 組建更新請求
	updateReq := dto.UpdateSongRequest{
		Lyrics:        lyrics,
		LrcTimestamps: timestamps,
	}

	// 若 LRC 元資料包含標題或歌手，一併更新
	if lrc.Metadata.Title != "" {
		updateReq.Title = &lrc.Metadata.Title
	}
	if lrc.Metadata.Artist != "" {
		updateReq.Artist = &lrc.Metadata.Artist
	}

	// 取得操作者 ID，未認證時使用 DemoUserID
	userID := service.DemoUserID
	if uid := auth.UserIDFromContext(r.Context()); uid != nil {
		userID = *uid
	}

	songResp, err := h.songSvc.Update(r.Context(), id, updateReq, userID)
	if err != nil {
		if errors.Is(err, service.ErrForbidden) {
			writeError(w, "SONG_FORBIDDEN", "You do not have permission to update this song", http.StatusForbidden)
			return
		}
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to update song", http.StatusInternalServerError)
		return
	}
	if songResp == nil {
		writeError(w, "SONG_NOT_FOUND", "Song not found", http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, songResp)
}

// buildLrcFileFromSong 從歌曲資料建構 LrcFile
func buildLrcFileFromSong(song *dto.SongResponse) *service.LrcFile {
	lrc := &service.LrcFile{
		Metadata: service.LrcMetadata{
			Title: song.Title,
		},
	}

	if song.Artist != nil {
		lrc.Metadata.Artist = *song.Artist
	}

	// 組合歌詞行
	for i, text := range song.Lyrics {
		line := service.LrcLine{
			Text: text,
		}
		// 若有對應的時間戳，使用時間戳
		if i < len(song.LrcTimestamps) {
			line.Time = int(song.LrcTimestamps[i])
		}
		lrc.Lines = append(lrc.Lines, line)
	}

	return lrc
}

// sanitizeFilename 清理檔案名稱，移除不安全字元
func sanitizeFilename(name string) string {
	// 替換常見不安全字元
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
	)
	result := replacer.Replace(name)
	result = strings.TrimSpace(result)
	if result == "" {
		return "export"
	}
	return result
}
