// Package service 實作業務邏輯層。
// 此檔案負責歌曲相關業務邏輯，包含 CRUD 操作與 JSON TEXT 欄位的序列化/反序列化。
package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/ent/song"
)

// SongService 歌曲業務邏輯
type SongService struct {
	client *ent.Client
}

// NewSongService 建立 SongService 實例
func NewSongService(client *ent.Client) *SongService {
	return &SongService{client: client}
}

// List 取得歌曲列表（分頁 + 搜尋）
func (s *SongService) List(ctx context.Context, params dto.SongListParams) (*dto.SongListResponse, error) {
	q := s.client.Song.Query()

	// 依使用者 ID 過濾
	userID := DemoUserID
	if params.UserID != nil && *params.UserID != "" {
		parsed, err := uuid.Parse(*params.UserID)
		if err == nil {
			userID = parsed
		}
	}
	q = q.Where(song.UserID(userID))

	// 搜尋過濾（ILIKE on title + artist）
	if params.Search != nil && *params.Search != "" {
		q = q.Where(
			song.Or(
				song.TitleContainsFold(*params.Search),
				song.ArtistContainsFold(*params.Search),
			),
		)
	}

	// 計算總數
	total, err := q.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("counting songs: %w", err)
	}

	// 取得分頁資料，依 created_at 降序排列
	songs, err := q.
		Order(ent.Desc(song.FieldCreatedAt)).
		Limit(params.Limit).
		Offset(params.Offset).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying songs: %w", err)
	}

	// 轉換為 DTO
	data := make([]dto.SongResponse, len(songs))
	for i, s := range songs {
		data[i] = entSongToDTO(s)
	}

	return &dto.SongListResponse{
		Data:   data,
		Total:  total,
		Limit:  params.Limit,
		Offset: params.Offset,
	}, nil
}

// GetByID 依 ID 取得單一歌曲，找不到時回傳 nil
func (s *SongService) GetByID(ctx context.Context, id uuid.UUID) (*dto.SongResponse, error) {
	songEntity, err := s.client.Song.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting song %s: %w", id, err)
	}
	resp := entSongToDTO(songEntity)
	return &resp, nil
}

// Create 建立新歌曲
func (s *SongService) Create(ctx context.Context, req dto.CreateSongRequest) (*dto.SongResponse, error) {
	// 確保 demo user 存在
	if err := EnsureDemoUser(ctx, s.client); err != nil {
		return nil, fmt.Errorf("ensuring demo user: %w", err)
	}

	// 將 lyrics 序列化為 JSON TEXT
	lyricsJSON, err := json.Marshal(req.Lyrics)
	if err != nil {
		return nil, fmt.Errorf("marshaling lyrics: %w", err)
	}

	builder := s.client.Song.Create().
		SetTitle(req.Title).
		SetLyrics(string(lyricsJSON)).
		SetUserID(DemoUserID).
		SetNillableArtist(req.Artist).
		SetNillableLanguage(req.Language)

	// 處理 lrc_timestamps（可選）
	if len(req.LrcTimestamps) > 0 {
		tsJSON, err := json.Marshal(req.LrcTimestamps)
		if err != nil {
			return nil, fmt.Errorf("marshaling lrc_timestamps: %w", err)
		}
		builder = builder.SetLrcTimestamps(string(tsJSON))
	}

	songEntity, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("creating song: %w", err)
	}

	resp := entSongToDTO(songEntity)
	return &resp, nil
}

// Update 更新歌曲，找不到時回傳 nil
func (s *SongService) Update(ctx context.Context, id uuid.UUID, req dto.UpdateSongRequest) (*dto.SongResponse, error) {
	builder := s.client.Song.UpdateOneID(id)

	if req.Title != nil {
		builder = builder.SetTitle(*req.Title)
	}

	if req.Artist != nil {
		builder = builder.SetArtist(*req.Artist)
	}

	if req.Lyrics != nil {
		lyricsJSON, err := json.Marshal(req.Lyrics)
		if err != nil {
			return nil, fmt.Errorf("marshaling lyrics: %w", err)
		}
		builder = builder.SetLyrics(string(lyricsJSON))
	}

	if req.LrcTimestamps != nil {
		tsJSON, err := json.Marshal(req.LrcTimestamps)
		if err != nil {
			return nil, fmt.Errorf("marshaling lrc_timestamps: %w", err)
		}
		builder = builder.SetLrcTimestamps(string(tsJSON))
	}

	if req.Language != nil {
		builder = builder.SetLanguage(*req.Language)
	}

	songEntity, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("updating song %s: %w", id, err)
	}

	resp := entSongToDTO(songEntity)
	return &resp, nil
}

// Delete 刪除歌曲
func (s *SongService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Song.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return err
		}
		return fmt.Errorf("deleting song %s: %w", id, err)
	}
	return nil
}

// entSongToDTO 將 Ent Song entity 轉換為 DTO
func entSongToDTO(s *ent.Song) dto.SongResponse {
	resp := dto.SongResponse{
		ID:        s.ID,
		Title:     s.Title,
		UserID:    s.UserID,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}

	// 解析 lyrics JSON TEXT → []string
	var lyrics []string
	if err := json.Unmarshal([]byte(s.Lyrics), &lyrics); err == nil {
		resp.Lyrics = lyrics
	}

	// 解析 lrc_timestamps JSON TEXT → []float64（nullable）
	if s.LrcTimestamps != nil && *s.LrcTimestamps != "" {
		var timestamps []float64
		if err := json.Unmarshal([]byte(*s.LrcTimestamps), &timestamps); err == nil {
			resp.LrcTimestamps = timestamps
		}
	}

	// nullable 欄位（pointer 類型，nil 時 omitempty 會省略）
	resp.Artist = s.Artist
	resp.Language = s.Language

	return resp
}
