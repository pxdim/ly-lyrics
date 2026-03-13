// Package service 測試歌曲服務的業務邏輯。
// 純函式（entSongToDTO）可直接測試；需要 Ent Client 的方法標記為整合測試。
package service

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// entSongToDTO 純函式測試
// ─────────────────────────────────────────────────────────────────────────────

func TestEntSongToDTO_BasicFields(t *testing.T) {
	t.Parallel()

	now := time.Now()
	artist := "測試藝人"
	lang := "zh"
	songID := uuid.New()
	userID := uuid.New()

	songEntity := &ent.Song{
		ID:        songID,
		Title:     "測試歌曲",
		Artist:    &artist,
		Lyrics:    `["第一行","第二行","第三行"]`,
		Language:  &lang,
		UserID:    userID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	resp := entSongToDTO(songEntity)

	assert.Equal(t, songID, resp.ID)
	assert.Equal(t, "測試歌曲", resp.Title)
	require.NotNil(t, resp.Artist)
	assert.Equal(t, "測試藝人", *resp.Artist)
	assert.Equal(t, []string{"第一行", "第二行", "第三行"}, resp.Lyrics)
	require.NotNil(t, resp.Language)
	assert.Equal(t, "zh", *resp.Language)
	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, now, resp.CreatedAt)
	assert.Equal(t, now, resp.UpdatedAt)
}

func TestEntSongToDTO_NullableFieldsNil(t *testing.T) {
	t.Parallel()

	songEntity := &ent.Song{
		ID:        uuid.New(),
		Title:     "無可選欄位",
		Artist:    nil,
		Lyrics:    `["歌詞"]`,
		Language:  nil,
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	resp := entSongToDTO(songEntity)

	assert.Nil(t, resp.Artist, "Artist 應為 nil")
	assert.Nil(t, resp.Language, "Language 應為 nil")
	assert.Equal(t, []string{"歌詞"}, resp.Lyrics)
}

func TestEntSongToDTO_WithLrcTimestamps(t *testing.T) {
	t.Parallel()

	timestamps := `[0.0, 5.5, 12.0]`
	songEntity := &ent.Song{
		ID:            uuid.New(),
		Title:         "帶時間戳記",
		Lyrics:        `["行一","行二","行三"]`,
		LrcTimestamps: &timestamps,
		UserID:        uuid.New(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	resp := entSongToDTO(songEntity)

	require.NotNil(t, resp.LrcTimestamps)
	assert.Equal(t, []float64{0.0, 5.5, 12.0}, resp.LrcTimestamps)
}

func TestEntSongToDTO_EmptyLrcTimestamps(t *testing.T) {
	t.Parallel()

	// LrcTimestamps 為 nil（未設定）
	songEntity := &ent.Song{
		ID:            uuid.New(),
		Title:         "無時間戳記",
		Lyrics:        `["歌詞"]`,
		LrcTimestamps: nil,
		UserID:        uuid.New(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	resp := entSongToDTO(songEntity)

	assert.Nil(t, resp.LrcTimestamps, "LrcTimestamps 應為 nil")
}

func TestEntSongToDTO_EmptyStringLrcTimestamps(t *testing.T) {
	t.Parallel()

	// LrcTimestamps 為空字串（資料庫可能存空字串）
	empty := ""
	songEntity := &ent.Song{
		ID:            uuid.New(),
		Title:         "空字串時間戳記",
		Lyrics:        `["歌詞"]`,
		LrcTimestamps: &empty,
		UserID:        uuid.New(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	resp := entSongToDTO(songEntity)

	assert.Nil(t, resp.LrcTimestamps, "空字串 LrcTimestamps 應為 nil")
}

func TestEntSongToDTO_InvalidLyricsJSON(t *testing.T) {
	t.Parallel()

	// Lyrics 為無效 JSON 時，應回傳 nil lyrics 而非 panic
	songEntity := &ent.Song{
		ID:        uuid.New(),
		Title:     "無效 JSON",
		Lyrics:    `not valid json`,
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	resp := entSongToDTO(songEntity)

	assert.Nil(t, resp.Lyrics, "無效 JSON 的 Lyrics 應為 nil")
	assert.Equal(t, "無效 JSON", resp.Title)
}

func TestEntSongToDTO_EmptyLyricsArray(t *testing.T) {
	t.Parallel()

	songEntity := &ent.Song{
		ID:        uuid.New(),
		Title:     "空歌詞陣列",
		Lyrics:    `[]`,
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	resp := entSongToDTO(songEntity)

	require.NotNil(t, resp.Lyrics)
	assert.Empty(t, resp.Lyrics, "空陣列的 Lyrics 長度應為 0")
}

// ─────────────────────────────────────────────────────────────────────────────
// SongService CRUD 方法（需要 Ent Client + 資料庫的整合測試骨架）
// ─────────────────────────────────────────────────────────────────────────────

func TestSongService_List(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSongService_GetByID(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSongService_Create(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSongService_Update(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSongService_Delete(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}
