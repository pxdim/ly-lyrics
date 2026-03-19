// Package service 測試播放清單服務的業務邏輯。
// 純函式（entPlaylistToDTO）可直接測試；CRUD 方法使用 SQLite in-memory 整合測試。
package service

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// entPlaylistToDTO 純函式測試
// ─────────────────────────────────────────────────────────────────────────────

func TestEntPlaylistToDTO_BasicFields(t *testing.T) {
	t.Parallel()

	now := time.Now()
	playlistID := uuid.New()
	userID := uuid.New()
	songID1 := uuid.New()
	songID2 := uuid.New()

	p := &ent.Playlist{
		ID:        playlistID,
		Name:      "我的播放清單",
		UserID:    userID,
		CreatedAt: now,
		UpdatedAt: now,
	}
	songIDs := []uuid.UUID{songID1, songID2}

	resp := entPlaylistToDTO(p, songIDs)

	assert.Equal(t, playlistID, resp.ID)
	assert.Equal(t, "我的播放清單", resp.Name)
	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, now, resp.CreatedAt)
	assert.Equal(t, now, resp.UpdatedAt)
	require.Len(t, resp.SongIDs, 2)
	assert.Equal(t, songID1, resp.SongIDs[0])
	assert.Equal(t, songID2, resp.SongIDs[1])
}

func TestEntPlaylistToDTO_NilSongIDs(t *testing.T) {
	t.Parallel()

	p := &ent.Playlist{
		ID:        uuid.New(),
		Name:      "空播放清單",
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// 傳入 nil songIDs，應回傳空陣列而非 null
	resp := entPlaylistToDTO(p, nil)

	require.NotNil(t, resp.SongIDs, "SongIDs 不應為 nil（應為空陣列）")
	assert.Empty(t, resp.SongIDs, "SongIDs 應為空陣列")
}

func TestEntPlaylistToDTO_EmptySongIDs(t *testing.T) {
	t.Parallel()

	p := &ent.Playlist{
		ID:        uuid.New(),
		Name:      "空歌曲清單",
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	resp := entPlaylistToDTO(p, []uuid.UUID{})

	require.NotNil(t, resp.SongIDs, "SongIDs 不應為 nil")
	assert.Empty(t, resp.SongIDs, "SongIDs 應為空陣列")
}

func TestEntPlaylistToDTO_ManySongIDs(t *testing.T) {
	t.Parallel()

	p := &ent.Playlist{
		ID:        uuid.New(),
		Name:      "大量歌曲",
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// 建立 50 首歌曲 ID
	songIDs := make([]uuid.UUID, 50)
	for i := range songIDs {
		songIDs[i] = uuid.New()
	}

	resp := entPlaylistToDTO(p, songIDs)

	require.Len(t, resp.SongIDs, 50)
	// 確認順序一致
	for i, id := range songIDs {
		assert.Equal(t, id, resp.SongIDs[i], "第 %d 首歌曲 ID 不一致", i)
	}
}

func TestEntPlaylistToDTO_PreservesOrder(t *testing.T) {
	t.Parallel()

	p := &ent.Playlist{
		ID:        uuid.New(),
		Name:      "順序測試",
		UserID:    uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	id1 := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	id2 := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	id3 := uuid.MustParse("33333333-3333-3333-3333-333333333333")

	resp := entPlaylistToDTO(p, []uuid.UUID{id3, id1, id2})

	// 確認傳入的順序被保留
	assert.Equal(t, id3, resp.SongIDs[0])
	assert.Equal(t, id1, resp.SongIDs[1])
	assert.Equal(t, id2, resp.SongIDs[2])
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaylistService CRUD 整合測試（SQLite in-memory）
// ─────────────────────────────────────────────────────────────────────────────

// createTestSongsForPlaylist 建立多首測試歌曲並回傳其 ID 清單
func createTestSongsForPlaylist(t *testing.T, client *ent.Client, count int) []uuid.UUID {
	t.Helper()
	ctx := context.Background()
	svc := NewSongService(client)
	ids := make([]uuid.UUID, count)
	for i := 0; i < count; i++ {
		resp, err := svc.Create(ctx, dto.CreateSongRequest{
			Title:  fmt.Sprintf("歌曲%d", i+1),
			Lyrics: []string{"歌詞"},
		}, DemoUserID)
		require.NoError(t, err)
		ids[i] = resp.ID
	}
	return ids
}

func TestPlaylistService_Create(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewPlaylistService(client)
	ctx := context.Background()

	// 先建立歌曲供播放清單使用
	songIDs := createTestSongsForPlaylist(t, client, 3)

	t.Run("建立播放清單成功", func(t *testing.T) {
		resp, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "我的播放清單",
			SongIDs: songIDs[:2],
		}, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)

		assert.Equal(t, "我的播放清單", resp.Name)
		assert.Equal(t, DemoUserID, resp.UserID)
		require.Len(t, resp.SongIDs, 2)
		assert.Equal(t, songIDs[0], resp.SongIDs[0])
		assert.Equal(t, songIDs[1], resp.SongIDs[1])
	})

	t.Run("建立空歌曲清單的播放清單", func(t *testing.T) {
		resp, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "空清單",
			SongIDs: []uuid.UUID{},
		}, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, "空清單", resp.Name)
		assert.Empty(t, resp.SongIDs)
	})
}

func TestPlaylistService_List(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewPlaylistService(client)
	ctx := context.Background()

	// 建立歌曲和播放清單
	songIDs := createTestSongsForPlaylist(t, client, 2)
	for i := 0; i < 3; i++ {
		_, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    fmt.Sprintf("清單%d", i+1),
			SongIDs: songIDs,
		}, DemoUserID)
		require.NoError(t, err)
	}

	t.Run("列表分頁", func(t *testing.T) {
		userIDStr := DemoUserID.String()
		resp, err := svc.List(ctx, dto.PlaylistListParams{
			Limit:  2,
			Offset: 0,
			UserID: &userIDStr,
		})
		require.NoError(t, err)
		assert.Equal(t, 3, resp.Total)
		assert.Len(t, resp.Data, 2)
	})

	t.Run("列表包含歌曲 ID", func(t *testing.T) {
		userIDStr := DemoUserID.String()
		resp, err := svc.List(ctx, dto.PlaylistListParams{
			Limit:  10,
			Offset: 0,
			UserID: &userIDStr,
		})
		require.NoError(t, err)
		for _, pl := range resp.Data {
			assert.Len(t, pl.SongIDs, 2, "每個播放清單應有 2 首歌曲")
		}
	})
}

func TestPlaylistService_Update(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewPlaylistService(client)
	ctx := context.Background()

	songIDs := createTestSongsForPlaylist(t, client, 3)

	t.Run("更新名稱", func(t *testing.T) {
		created, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "舊名稱",
			SongIDs: songIDs[:1],
		}, DemoUserID)
		require.NoError(t, err)

		newName := "新名稱"
		resp, err := svc.Update(ctx, created.ID, dto.UpdatePlaylistRequest{
			Name: &newName,
		}, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, "新名稱", resp.Name)
		// 歌曲不變
		assert.Len(t, resp.SongIDs, 1)
	})

	t.Run("更新歌曲列表", func(t *testing.T) {
		created, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "更新歌曲",
			SongIDs: songIDs[:1],
		}, DemoUserID)
		require.NoError(t, err)

		newSongs := songIDs[1:]
		resp, err := svc.Update(ctx, created.ID, dto.UpdatePlaylistRequest{
			SongIDs: newSongs,
		}, DemoUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Len(t, resp.SongIDs, 2)
		assert.Equal(t, songIDs[1], resp.SongIDs[0])
		assert.Equal(t, songIDs[2], resp.SongIDs[1])
	})

	t.Run("更新不存在的播放清單回傳 nil", func(t *testing.T) {
		newName := "不存在"
		resp, err := svc.Update(ctx, uuid.New(), dto.UpdatePlaylistRequest{
			Name: &newName,
		}, DemoUserID)
		assert.NoError(t, err)
		assert.Nil(t, resp)
	})

	t.Run("非擁有者更新回傳 ErrForbidden", func(t *testing.T) {
		created, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "擁有權測試",
			SongIDs: []uuid.UUID{},
		}, DemoUserID)
		require.NoError(t, err)

		newName := "被篡改"
		_, err = svc.Update(ctx, created.ID, dto.UpdatePlaylistRequest{
			Name: &newName,
		}, uuid.New())
		assert.ErrorIs(t, err, ErrForbidden)
	})
}

func TestPlaylistService_Delete(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewPlaylistService(client)
	ctx := context.Background()

	songIDs := createTestSongsForPlaylist(t, client, 2)

	t.Run("刪除播放清單成功", func(t *testing.T) {
		created, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "待刪除",
			SongIDs: songIDs,
		}, DemoUserID)
		require.NoError(t, err)

		err = svc.Delete(ctx, created.ID, DemoUserID)
		assert.NoError(t, err)

		// 確認已刪除：列表不應包含此清單
		userIDStr := DemoUserID.String()
		resp, err := svc.List(ctx, dto.PlaylistListParams{
			Limit: 100, Offset: 0, UserID: &userIDStr,
		})
		require.NoError(t, err)
		for _, pl := range resp.Data {
			assert.NotEqual(t, created.ID, pl.ID, "已刪除的播放清單不應出現在列表中")
		}
	})

	t.Run("刪除不存在的播放清單回傳 error", func(t *testing.T) {
		err := svc.Delete(ctx, uuid.New(), DemoUserID)
		assert.Error(t, err)
	})

	t.Run("非擁有者刪除回傳 ErrForbidden", func(t *testing.T) {
		created, err := svc.Create(ctx, dto.CreatePlaylistRequest{
			Name:    "禁止刪除",
			SongIDs: []uuid.UUID{},
		}, DemoUserID)
		require.NoError(t, err)

		err = svc.Delete(ctx, created.ID, uuid.New())
		assert.ErrorIs(t, err, ErrForbidden)
	})
}
