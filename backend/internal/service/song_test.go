// Package service 測試歌曲服務的業務邏輯。
// 純函式（entSongToDTO）可直接測試；CRUD 方法使用 SQLite in-memory 整合測試。
package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
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
// SongService CRUD 整合測試（SQLite in-memory）
// ─────────────────────────────────────────────────────────────────────────────

// createTestSong 建立測試用歌曲並回傳 SongResponse
func createTestSong(t *testing.T, svc *SongService, title string, userID uuid.UUID) *dto.SongResponse {
	t.Helper()
	artist := "測試藝人"
	lang := "zh"
	resp, err := svc.Create(context.Background(), dto.CreateSongRequest{
		Title:    title,
		Artist:   &artist,
		Lyrics:   []string{"第一行", "第二行"},
		Language: &lang,
	}, userID)
	require.NoError(t, err)
	require.NotNil(t, resp)
	return resp
}

func TestSongService_Create(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSongService(client)
	ctx := context.Background()

	t.Run("建立歌曲成功", func(t *testing.T) {
		artist := "藝人A"
		lang := "zh"
		req := dto.CreateSongRequest{
			Title:    "測試歌曲",
			Artist:   &artist,
			Lyrics:   []string{"第一行", "第二行", "第三行"},
			Language: &lang,
		}
		resp, err := svc.Create(ctx, req, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)

		assert.Equal(t, "測試歌曲", resp.Title)
		require.NotNil(t, resp.Artist)
		assert.Equal(t, "藝人A", *resp.Artist)
		assert.Equal(t, []string{"第一行", "第二行", "第三行"}, resp.Lyrics)
		require.NotNil(t, resp.Language)
		assert.Equal(t, "zh", *resp.Language)
		assert.Equal(t, DemoUserID, resp.UserID)
		assert.NotEqual(t, uuid.Nil, resp.ID)
	})

	t.Run("建立歌曲含 LRC 時間戳記", func(t *testing.T) {
		req := dto.CreateSongRequest{
			Title:         "帶時間戳記",
			Lyrics:        []string{"行一", "行二"},
			LrcTimestamps: []float64{0.0, 5.5},
		}
		resp, err := svc.Create(ctx, req, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, []float64{0.0, 5.5}, resp.LrcTimestamps)
	})

	t.Run("建立歌曲無可選欄位", func(t *testing.T) {
		req := dto.CreateSongRequest{
			Title:  "只有標題",
			Lyrics: []string{"歌詞"},
		}
		resp, err := svc.Create(ctx, req, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Nil(t, resp.Artist)
		assert.Nil(t, resp.Language)
		assert.Nil(t, resp.LrcTimestamps)
	})
}

func TestSongService_GetByID(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSongService(client)
	ctx := context.Background()

	t.Run("取得存在的歌曲", func(t *testing.T) {
		created := createTestSong(t, svc, "可查詢歌曲", DemoUserID)

		resp, err := svc.GetByID(ctx, created.ID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, created.ID, resp.ID)
		assert.Equal(t, "可查詢歌曲", resp.Title)
	})

	t.Run("取得不存在的歌曲回傳 nil", func(t *testing.T) {
		resp, err := svc.GetByID(ctx, uuid.New())
		assert.NoError(t, err)
		assert.Nil(t, resp, "不存在的 ID 應回傳 nil")
	})
}

func TestSongService_List(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSongService(client)
	ctx := context.Background()

	// 建立 3 首歌曲
	createTestSong(t, svc, "歌曲A", DemoUserID)
	createTestSong(t, svc, "歌曲B", DemoUserID)
	createTestSong(t, svc, "歌曲C", DemoUserID)

	t.Run("列表分頁", func(t *testing.T) {
		userIDStr := DemoUserID.String()
		resp, err := svc.List(ctx, dto.SongListParams{
			Limit:  2,
			Offset: 0,
			UserID: &userIDStr,
		})
		require.NoError(t, err)
		assert.Equal(t, 3, resp.Total, "總數應為 3")
		assert.Len(t, resp.Data, 2, "分頁限制 2 筆")
		assert.Equal(t, 2, resp.Limit)
		assert.Equal(t, 0, resp.Offset)
	})

	t.Run("列表搜尋過濾", func(t *testing.T) {
		search := "歌曲A"
		userIDStr := DemoUserID.String()
		resp, err := svc.List(ctx, dto.SongListParams{
			Limit:  10,
			Offset: 0,
			Search: &search,
			UserID: &userIDStr,
		})
		require.NoError(t, err)
		assert.Equal(t, 1, resp.Total, "搜尋 '歌曲A' 應只有 1 筆")
		require.Len(t, resp.Data, 1)
		assert.Equal(t, "歌曲A", resp.Data[0].Title)
	})

	t.Run("列表 offset 超出範圍回傳空資料", func(t *testing.T) {
		userIDStr := DemoUserID.String()
		resp, err := svc.List(ctx, dto.SongListParams{
			Limit:  10,
			Offset: 100,
			UserID: &userIDStr,
		})
		require.NoError(t, err)
		assert.Equal(t, 3, resp.Total, "總數不受 offset 影響")
		assert.Empty(t, resp.Data, "offset 超出範圍時資料應為空")
	})
}

func TestSongService_Update(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSongService(client)
	ctx := context.Background()

	t.Run("更新標題", func(t *testing.T) {
		created := createTestSong(t, svc, "原始標題", DemoUserID)

		newTitle := "新標題"
		resp, err := svc.Update(ctx, created.ID, dto.UpdateSongRequest{
			Title: &newTitle,
		}, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, "新標題", resp.Title)
	})

	t.Run("更新歌詞", func(t *testing.T) {
		created := createTestSong(t, svc, "更新歌詞測試", DemoUserID)

		newLyrics := []string{"新第一行", "新第二行", "新第三行"}
		resp, err := svc.Update(ctx, created.ID, dto.UpdateSongRequest{
			Lyrics: newLyrics,
		}, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, newLyrics, resp.Lyrics)
	})

	t.Run("更新不存在的歌曲回傳 nil", func(t *testing.T) {
		newTitle := "不存在"
		resp, err := svc.Update(ctx, uuid.New(), dto.UpdateSongRequest{
			Title: &newTitle,
		}, DemoUserID)
		assert.NoError(t, err)
		assert.Nil(t, resp)
	})

	t.Run("非擁有者更新回傳 ErrForbidden", func(t *testing.T) {
		created := createTestSong(t, svc, "擁有權測試", DemoUserID)
		otherUserID := uuid.New()

		newTitle := "被篡改"
		_, err := svc.Update(ctx, created.ID, dto.UpdateSongRequest{
			Title: &newTitle,
		}, otherUserID)
		assert.ErrorIs(t, err, ErrForbidden)
	})
}

func TestSongService_Delete(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSongService(client)
	ctx := context.Background()

	t.Run("刪除歌曲成功", func(t *testing.T) {
		created := createTestSong(t, svc, "待刪除", DemoUserID)

		err := svc.Delete(ctx, created.ID, DemoUserID)
		require.NoError(t, err)

		// 確認已刪除
		resp, err := svc.GetByID(ctx, created.ID)
		assert.NoError(t, err)
		assert.Nil(t, resp, "刪除後應查不到")
	})

	t.Run("刪除不存在的歌曲回傳 NotFound error", func(t *testing.T) {
		err := svc.Delete(ctx, uuid.New(), DemoUserID)
		assert.Error(t, err)
	})

	t.Run("非擁有者刪除回傳 ErrForbidden", func(t *testing.T) {
		created := createTestSong(t, svc, "禁止刪除", DemoUserID)
		otherUserID := uuid.New()

		err := svc.Delete(ctx, created.ID, otherUserID)
		assert.ErrorIs(t, err, ErrForbidden)
	})
}
