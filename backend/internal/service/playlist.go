// Package service 實作業務邏輯層。
// 此檔案負責播放清單相關業務邏輯，包含列表查詢與建立（含歌曲關聯）。
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/ent/playlist"
	"github.com/raymondchen/ly-backend/internal/ent/playlistsong"
)

// PlaylistService 播放清單業務邏輯
type PlaylistService struct {
	client *ent.Client
}

// NewPlaylistService 建立 PlaylistService 實例
func NewPlaylistService(client *ent.Client) *PlaylistService {
	return &PlaylistService{client: client}
}

// List 取得播放清單列表（分頁）
func (s *PlaylistService) List(ctx context.Context, params dto.PlaylistListParams) (*dto.PlaylistListResponse, error) {
	q := s.client.Playlist.Query()

	// 依使用者 ID 過濾
	userID := DemoUserID
	if params.UserID != nil && *params.UserID != "" {
		parsed, err := uuid.Parse(*params.UserID)
		if err == nil {
			userID = parsed
		}
	}
	q = q.Where(playlist.UserID(userID))

	// 計算總數
	total, err := q.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("counting playlists: %w", err)
	}

	// 取得分頁資料，依 created_at 降序排列
	playlists, err := q.
		Order(ent.Desc(playlist.FieldCreatedAt)).
		Limit(params.Limit).
		Offset(params.Offset).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying playlists: %w", err)
	}

	// 轉換為 DTO，並為每個播放清單查詢其歌曲 ID
	data := make([]dto.PlaylistResponse, len(playlists))
	for i, p := range playlists {
		songIDs, err := s.getSongIDs(ctx, p.ID)
		if err != nil {
			return nil, fmt.Errorf("getting song IDs for playlist %s: %w", p.ID, err)
		}
		data[i] = entPlaylistToDTO(p, songIDs)
	}

	return &dto.PlaylistListResponse{
		Data:   data,
		Total:  total,
		Limit:  params.Limit,
		Offset: params.Offset,
	}, nil
}

// Create 建立播放清單（含歌曲關聯），userID 為播放清單擁有者
func (s *PlaylistService) Create(ctx context.Context, req dto.CreatePlaylistRequest, userID uuid.UUID) (*dto.PlaylistResponse, error) {
	// 若為 demo user，確保其存在（FK 約束）
	if userID == DemoUserID {
		if err := EnsureDemoUser(ctx, s.client); err != nil {
			return nil, fmt.Errorf("ensuring demo user: %w", err)
		}
	}

	// 使用交易確保播放清單與歌曲關聯的一致性
	tx, err := s.client.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("starting transaction: %w", err)
	}

	// 建立播放清單
	playlistEntity, err := tx.Playlist.Create().
		SetName(req.Name).
		SetUserID(userID).
		Save(ctx)
	if err != nil {
		if rerr := tx.Rollback(); rerr != nil {
			return nil, fmt.Errorf("rolling back: %v (original: %w)", rerr, err)
		}
		return nil, fmt.Errorf("creating playlist: %w", err)
	}

	// 建立 playlist_songs 關聯，依序設定 order_index
	for i, songID := range req.SongIDs {
		_, err := tx.PlaylistSong.Create().
			SetPlaylistID(playlistEntity.ID).
			SetSongID(songID).
			SetOrderIndex(i).
			Save(ctx)
		if err != nil {
			if rerr := tx.Rollback(); rerr != nil {
				return nil, fmt.Errorf("rolling back: %v (original: %w)", rerr, err)
			}
			return nil, fmt.Errorf("adding song to playlist: %w", err)
		}
	}

	// 提交交易
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("committing transaction: %w", err)
	}

	resp := entPlaylistToDTO(playlistEntity, req.SongIDs)
	return &resp, nil
}

// Update 更新播放清單（名稱及/或歌曲列表）
func (s *PlaylistService) Update(ctx context.Context, id uuid.UUID, req dto.UpdatePlaylistRequest) (*dto.PlaylistResponse, error) {
	// 確認播放清單存在
	p, err := s.client.Playlist.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting playlist: %w", err)
	}

	tx, err := s.client.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("starting transaction: %w", err)
	}

	// 更新名稱（如有提供）
	update := tx.Playlist.UpdateOneID(id)
	if req.Name != nil {
		update = update.SetName(*req.Name)
	}
	p, err = update.Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		return nil, fmt.Errorf("updating playlist: %w", err)
	}

	// 更新歌曲列表（如有提供）：先刪舊、再建新
	if req.SongIDs != nil {
		_, err = tx.PlaylistSong.Delete().
			Where(playlistsong.PlaylistID(id)).
			Exec(ctx)
		if err != nil {
			_ = tx.Rollback()
			return nil, fmt.Errorf("removing old songs: %w", err)
		}

		for i, songID := range req.SongIDs {
			_, err = tx.PlaylistSong.Create().
				SetPlaylistID(id).
				SetSongID(songID).
				SetOrderIndex(i).
				Save(ctx)
			if err != nil {
				_ = tx.Rollback()
				return nil, fmt.Errorf("adding song to playlist: %w", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("committing transaction: %w", err)
	}

	// 查詢最新的歌曲列表
	songIDs, err := s.getSongIDs(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("getting song IDs: %w", err)
	}
	resp := entPlaylistToDTO(p, songIDs)
	return &resp, nil
}

// Delete 刪除播放清單及其歌曲關聯
func (s *PlaylistService) Delete(ctx context.Context, id uuid.UUID) error {
	// 確認播放清單存在
	exists, err := s.client.Playlist.Query().Where(playlist.ID(id)).Exist(ctx)
	if err != nil {
		return fmt.Errorf("checking playlist: %w", err)
	}
	if !exists {
		return fmt.Errorf("playlist not found")
	}

	tx, err := s.client.Tx(ctx)
	if err != nil {
		return fmt.Errorf("starting transaction: %w", err)
	}

	// 先刪除關聯表的歌曲記錄
	_, err = tx.PlaylistSong.Delete().
		Where(playlistsong.PlaylistID(id)).
		Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("deleting playlist songs: %w", err)
	}

	// 刪除播放清單本體
	err = tx.Playlist.DeleteOneID(id).Exec(ctx)
	if err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("deleting playlist: %w", err)
	}

	return tx.Commit()
}

// getSongIDs 取得播放清單中的歌曲 ID 列表（依 order_index 排序）
func (s *PlaylistService) getSongIDs(ctx context.Context, playlistID uuid.UUID) ([]uuid.UUID, error) {
	playlistSongs, err := s.client.PlaylistSong.Query().
		Where(playlistsong.PlaylistID(playlistID)).
		Order(ent.Asc(playlistsong.FieldOrderIndex)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	songIDs := make([]uuid.UUID, len(playlistSongs))
	for i, ps := range playlistSongs {
		songIDs[i] = ps.SongID
	}
	return songIDs, nil
}

// entPlaylistToDTO 將 Ent Playlist entity 轉換為 DTO
func entPlaylistToDTO(p *ent.Playlist, songIDs []uuid.UUID) dto.PlaylistResponse {
	// 確保 songIDs 不為 nil，回傳空陣列而非 null
	if songIDs == nil {
		songIDs = []uuid.UUID{}
	}

	return dto.PlaylistResponse{
		ID:        p.ID,
		Name:      p.Name,
		SongIDs:   songIDs,
		UserID:    p.UserID,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}
}
