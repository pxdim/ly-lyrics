// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義播放清單相關的請求與回應結構。
package dto

import (
	"time"

	"github.com/google/uuid"
)

// PlaylistResponse 播放清單 API 回應
type PlaylistResponse struct {
	ID        uuid.UUID   `json:"id"`
	Name      string      `json:"name"`
	SongIDs   []uuid.UUID `json:"songIds"`
	UserID    uuid.UUID   `json:"userId"`
	CreatedAt time.Time   `json:"createdAt"`
	UpdatedAt time.Time   `json:"updatedAt"`
}

// PlaylistListResponse 播放清單列表回應
type PlaylistListResponse struct {
	Data   []PlaylistResponse `json:"data"`
	Total  int                `json:"total"`
	Limit  int                `json:"limit"`
	Offset int                `json:"offset"`
}

// CreatePlaylistRequest 建立播放清單請求
type CreatePlaylistRequest struct {
	Name    string      `json:"name" validate:"required,max=255"`
	SongIDs []uuid.UUID `json:"songIds" validate:"required,min=1"`
}

// UpdatePlaylistRequest 更新播放清單請求
type UpdatePlaylistRequest struct {
	Name    *string     `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	SongIDs []uuid.UUID `json:"songIds,omitempty"`
}
