// Package service 測試播放清單服務的業務邏輯。
// 純函式（entPlaylistToDTO）可直接測試；需要 Ent Client 的方法標記為整合測試。
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
// PlaylistService CRUD 方法（需要 Ent Client + 資料庫的整合測試骨架）
// ─────────────────────────────────────────────────────────────────────────────

func TestPlaylistService_List(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestPlaylistService_Create(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestPlaylistService_Update(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestPlaylistService_Delete(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}
